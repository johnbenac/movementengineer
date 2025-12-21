#!/usr/bin/env python3
"""
pr_batch_big_picture - Automate diff generation for ranges of pull requests

This script is intended to be run within GitHub Actions to produce per-PR
diffs (against a base branch) and a master comparison file. It also
aggregates all issue and review comments for each PR so reviewers can see
code changes and discussion in a single artifact.

Usage:
    pr_batch_big_picture.py START_PR END_PR [--base main] [--no-cleanup]

Environment:
    GITHUB_TOKEN      - Required for GitHub API access
    GITHUB_REPOSITORY - owner/repo slug, automatically provided in Actions
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Optional
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


GITHUB_API = "https://api.github.com"


def run_command(cmd: str, check: bool = True) -> str:
    """Run a shell command and return stdout."""
    result = subprocess.run(
        cmd,
        shell=True,
        text=True,
        capture_output=True,
        check=check,
    )
    return result.stdout.strip()


def ensure_base_branch(base_branch: str) -> None:
    """Ensure the current branch matches the configured base branch."""
    current_branch = run_command("git branch --show-current")
    if current_branch != base_branch:
        print(
            f"Error: Currently on branch '{current_branch}'. "
            f"This tool requires starting from '{base_branch}'."
        )
        sys.exit(1)
    print(f"✓ Starting from {base_branch} branch")


def checkout_main(base_branch: str) -> None:
    """Checkout the base branch."""
    print(f"Checking out {base_branch} branch...")
    run_command(f"git checkout {base_branch}")
    print(f"✓ Checked out {base_branch} branch")


def fetch_remote_branches(remote: str = "origin") -> None:
    """Fetch latest remote branches."""
    print(f"Fetching remote branches from {remote}...")
    run_command(f"git fetch {remote}")
    print("✓ Fetched remote branches")


def _api_request(path: str, params: Optional[Dict[str, str]] = None) -> object:
    """Make an authenticated GitHub API request."""
    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY")
    if not token or not repo:
        raise RuntimeError("GITHUB_TOKEN and GITHUB_REPOSITORY must be set")

    url = f"{GITHUB_API}{path}"
    if params:
        url = f"{url}?{urlencode(params)}"

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    try:
        with urlopen(Request(url, headers=headers)) as resp:
            return json.load(resp)
    except HTTPError as exc:
        detail = exc.read().decode() if hasattr(exc, "read") else str(exc)
        raise RuntimeError(f"GitHub API request failed for {url}: {detail}") from exc


def _paginate(path: str, params: Optional[Dict[str, str]] = None) -> Iterable[object]:
    """Iterate through paginated API responses."""
    page = 1
    params = params.copy() if params else {}
    params.setdefault("per_page", 100)

    while True:
        params["page"] = page
        data = _api_request(path, params)
        if not data:
            break
        if not isinstance(data, list):
            yield data
            break
        for item in data:
            yield item
        if len(data) < params["per_page"]:
            break
        page += 1


def get_pr_info(pr_number: int) -> Optional[Dict[str, str]]:
    """Get branch name and title for a specific PR."""
    try:
        data = _api_request(f"/repos/{os.environ['GITHUB_REPOSITORY']}/pulls/{pr_number}")
        return {
            "number": pr_number,
            "branch": data["head"]["ref"],
            "title": data["title"],
        }
    except Exception as exc:  # noqa: BLE001
        print(f"Error getting info for PR #{pr_number}: {exc}")
        return None


def get_pr_changed_files(pr_number: int) -> List[str]:
    """Get list of changed files for a specific PR."""
    files: List[str] = []
    try:
        for item in _paginate(
            f"/repos/{os.environ['GITHUB_REPOSITORY']}/pulls/{pr_number}/files"
        ):
            path = item.get("filename")
            if path:
                files.append(path)
    except Exception as exc:  # noqa: BLE001
        print(f"Error getting changed files for PR #{pr_number}: {exc}")
    return files


def get_pr_comments(pr_number: int) -> List[Dict[str, str]]:
    """Collect both issue comments and review comments for a PR."""
    comments: List[Dict[str, str]] = []
    repo = os.environ["GITHUB_REPOSITORY"]

    def _consume(path: str, comment_type: str) -> None:
        try:
            for item in _paginate(path):
                comments.append(
                    {
                        "type": comment_type,
                        "user": (item.get("user") or {}).get("login", "unknown"),
                        "created_at": item.get("created_at", ""),
                        "body": item.get("body", "").strip(),
                        "url": item.get("html_url", ""),
                    }
                )
        except Exception as exc:  # noqa: BLE001
            print(f"Error getting {comment_type} comments for PR #{pr_number}: {exc}")

    _consume(f"/repos/{repo}/issues/{pr_number}/comments", "issue")
    _consume(f"/repos/{repo}/pulls/{pr_number}/comments", "review")

    comments.sort(key=lambda c: c["created_at"])
    return comments


def filter_existing_files(files: List[str]) -> List[str]:
    """Filter list of files to only those that exist on current branch."""
    existing_files: List[str] = []
    deleted_files: List[str] = []

    for file_path in files:
        if os.path.exists(file_path):
            existing_files.append(file_path)
        else:
            deleted_files.append(file_path)

    if deleted_files:
        print(f"Skipping {len(deleted_files)} deleted file(s): {', '.join(deleted_files)}")

    return existing_files


def checkout_pr_branch(branch_name: str, remote: str = "origin") -> None:
    """Checkout a specific PR branch."""
    try:
        run_command(f"git checkout {branch_name}")
        print(f"✓ Checked out existing branch: {branch_name}")
        return
    except subprocess.CalledProcessError:
        pass

    run_command(f"git checkout -b {branch_name} {remote}/{branch_name}")
    print(f"✓ Created and checked out branch: {branch_name}")


def run_big_picture(
    pr_info: Dict[str, object],
    files: List[str],
    comments: List[Dict[str, str]],
    output_file: str,
    base_branch: str,
) -> bool:
    """Generate a git diff for the PR instead of full files."""
    print(f"Creating diff compilation for PR #{pr_info['number']}...")

    if not files:
        print(f"Warning: No files found for PR #{pr_info['number']}")
        return False

    files_arg = " ".join(f'"{f}"' for f in files)
    cmd = f"git diff {base_branch}...{pr_info['branch']} -- {files_arg}"

    try:
        diff_output = run_command(cmd)

        with open(output_file, "w", encoding="utf-8") as f:
            f.write(f"# PR #{pr_info['number']}: {pr_info['title']}\n")
            f.write(f"# Branch: {pr_info['branch']}\n")
            f.write(f"# Base: {base_branch}\n")
            f.write(f"# Changed files: {len(files)}\n")
            f.write(f"# Files: {', '.join(files)}\n\n")

            f.write("# Comments\n")
            if comments:
                for comment in comments:
                    f.write(
                        f"- [{comment['type']}] {comment['user']} at {comment['created_at']}\n"
                    )
                    if comment["url"]:
                        f.write(f"  Link: {comment['url']}\n")
                    if comment["body"]:
                        for line in comment["body"].splitlines():
                            f.write(f"  {line}\n")
                    f.write("\n")
            else:
                f.write("- No comments found\n\n")

            f.write("=" * 80 + "\n")
            f.write(diff_output if diff_output else "# No differences found\n")

        print(f"✓ Created diff: {output_file}")
        return True
    except subprocess.CalledProcessError as exc:
        print(f"Error generating diff for PR #{pr_info['number']}: {exc}")
        return False


def create_master_comparison(
    pr_infos: List[Dict[str, object]],
    start_pr: int,
    end_pr: int,
    output_file: str,
) -> bool:
    """Create a master comparison file combining all individual PR diff files."""
    print("Creating master comparison file...")

    pr_files = []
    for pr_info in pr_infos:
        pr_file = f"/tmp/pr-{pr_info['number']}-implementation.txt"
        if os.path.exists(pr_file):
            pr_files.append((pr_info, pr_file))

    if not pr_files:
        print("Warning: No individual PR files found for master comparison")
        return False

    try:
        with open(output_file, "w", encoding="utf-8") as outf:
            outf.write(f"# Master Comparison: PRs {start_pr}-{end_pr}\n")
            outf.write(f"# Total PRs: {len(pr_files)}\n")
            outf.write(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            outf.write("=" * 80 + "\n\n")

            for idx, (pr_info, pr_file) in enumerate(pr_files, 1):
                outf.write("\n" + "=" * 80 + "\n")
                outf.write(f"# PR {idx}/{len(pr_files)}\n")
                outf.write("=" * 80 + "\n\n")

                with open(pr_file, "r", encoding="utf-8") as inf:
                    outf.write(inf.read())

                outf.write("\n\n")

        print(f"✓ Created master comparison: {output_file}")
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"Error creating master comparison: {exc}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Automate diff generation for ranges of pull requests",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s 30 33    # Process PRs 30, 31, 32, 33
  %(prog)s 34 37    # Process PRs 34, 35, 36, 37
        """,
    )
    parser.add_argument("start_pr", type=int, help="Starting PR number")
    parser.add_argument("end_pr", type=int, help="Ending PR number (inclusive)")
    parser.add_argument(
        "--base",
        dest="base_branch",
        default="main",
        help="Base branch used for comparison (default: main)",
    )
    parser.add_argument(
        "--no-cleanup",
        action="store_true",
        help="Don't return to the base branch at the end",
    )

    args = parser.parse_args()

    if args.start_pr > args.end_pr:
        print("Error: Start PR must be less than or equal to end PR")
        sys.exit(1)

    ensure_base_branch(args.base_branch)

    try:
        fetch_remote_branches()

        print(f"Collecting info for PRs {args.start_pr} to {args.end_pr}...")
        pr_infos: List[Dict[str, object]] = []

        for pr_num in range(args.start_pr, args.end_pr + 1):
            pr_info = get_pr_info(pr_num)
            if pr_info:
                pr_infos.append(pr_info)
                print(f"  PR #{pr_num}: {pr_info['title']}")
            else:
                print(f"  PR #{pr_num}: Not found or inaccessible")

        if not pr_infos:
            print("Error: No valid PRs found in the specified range")
            sys.exit(1)

        successful_prs: List[Dict[str, object]] = []

        for pr_info in pr_infos:
            print(f"\n--- Processing PR #{pr_info['number']}: {pr_info['title']} ---")

            all_files = get_pr_changed_files(int(pr_info["number"]))
            if not all_files:
                print(f"No changed files found for PR #{pr_info['number']}")
                continue

            print(f"Total changed files: {len(all_files)}")

            try:
                checkout_pr_branch(str(pr_info["branch"]))
            except subprocess.CalledProcessError:
                print(f"Failed to checkout branch for PR #{pr_info['number']}")
                continue

            existing_files = filter_existing_files(all_files)
            if not existing_files:
                print(
                    f"No existing files to process for PR #{pr_info['number']} "
                    "(all files were deleted)"
                )
                continue

            comments = get_pr_comments(int(pr_info["number"]))
            print(f"Files to process ({len(existing_files)}): {', '.join(existing_files)}")
            print(f"Total comments collected: {len(comments)}")

            output_file = f"/tmp/pr-{pr_info['number']}-implementation.txt"
            if run_big_picture(
                pr_info,
                existing_files,
                comments,
                output_file,
                args.base_branch,
            ):
                successful_prs.append(pr_info)

        if successful_prs:
            master_output = f"/tmp/pr-comparison-{args.start_pr}-{args.end_pr}.txt"
            create_master_comparison(successful_prs, args.start_pr, args.end_pr, master_output)

            print(f"\n✓ Successfully processed {len(successful_prs)} PRs")
            print("✓ Individual files: /tmp/pr-{num}-implementation.txt")
            print(f"✓ Master comparison: {master_output}")
        else:
            print("\nNo PRs were successfully processed")

    except KeyboardInterrupt:
        print("\nInterrupted by user")
    except Exception as exc:  # noqa: BLE001
        print(f"Unexpected error: {exc}")
        sys.exit(1)
    finally:
        if not args.no_cleanup:
            try:
                checkout_main(args.base_branch)
                print(f"✓ Returned to {args.base_branch} branch")
            except subprocess.CalledProcessError:
                print("Warning: Failed to return to base branch")


if __name__ == "__main__":
    main()
