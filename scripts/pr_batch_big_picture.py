#!/usr/bin/env python3
"""
pr_batch_big_picture - Automate diff generation for ranges of pull requests

This tool automates the process of creating git diffs for consecutive
pull requests, showing only the changes made in each PR, and collecting
all comments made on the pull requests.
"""

import argparse
import json
import os
import shlex
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple


def parse_pr_number(value: str) -> int:
    """Parse PR numbers allowing float strings with no fractional component."""
    try:
        number = float(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"Invalid PR number: {value}") from exc

    if not number.is_integer():
        raise argparse.ArgumentTypeError(f"PR number must be an integer: {value}")

    return int(number)


def run_command(cmd: str, check: bool = True, capture_output: bool = True) -> str:
    """Run a shell command and return the result."""
    result = subprocess.run(
        cmd,
        shell=True,
        check=check,
        capture_output=capture_output,
        text=True,
    )
    return result.stdout.strip() if capture_output else ""


def check_current_branch(expected_branch: str) -> None:
    """Ensure we're starting from the expected base branch."""
    current_branch = run_command("git branch --show-current")
    if current_branch != expected_branch:
        print(
            f"Error: Currently on branch '{current_branch}'. "
            f"This tool requires starting from '{expected_branch}' branch."
        )
        sys.exit(1)
    print(f"✓ Starting from {expected_branch} branch")


def checkout_base_branch(base_branch: str) -> None:
    """Checkout the base branch."""
    print(f"Checking out {base_branch} branch...")
    run_command(f"git checkout {shlex.quote(base_branch)}")
    print(f"✓ Checked out {base_branch} branch")


def fetch_remote_branches(remote: str) -> None:
    """Fetch latest remote branches."""
    print(f"Fetching remote branches from {remote}...")
    run_command(f"git fetch {shlex.quote(remote)} --prune --tags")
    print("✓ Fetched remote branches")


def get_pr_info(pr_number: int) -> Dict[str, str]:
    """Get branch name, title, and metadata for a specific PR."""
    pr_info = run_command(
        "gh pr view "
        f"{pr_number} "
        "--json headRefName,title,baseRefName,body,author,createdAt,url"
    )
    data = json.loads(pr_info)

    return {
        "number": pr_number,
        "branch": data["headRefName"],
        "title": data["title"],
        "base": data["baseRefName"],
        "body": data.get("body") or "",
        "author": (data.get("author") or {}).get("login") or "unknown",
        "createdAt": data.get("createdAt") or "",
        "url": data.get("url") or "",
    }


def get_pr_changed_files(pr_number: int) -> List[str]:
    """Get list of changed files for a specific PR."""
    files_json = run_command(f"gh pr view {pr_number} --json files")
    data = json.loads(files_json)
    return [file_info["path"] for file_info in data.get("files", [])]


def normalize_comment_entry(comment: Dict[str, str], comment_type: str) -> Dict[str, str]:
    """Normalize a comment structure to a consistent shape."""
    author = (comment.get("author") or {}).get("login") or "unknown"
    return {
        "type": comment_type,
        "author": author,
        "createdAt": comment.get("createdAt") or "",
        "url": comment.get("url") or "",
        "body": comment.get("body") or "",
    }


def get_pr_comments(pr_number: int) -> List[Dict[str, str]]:
    """Get all comments (issue + review threads) for a specific PR."""
    comments_json = run_command(
        f"gh pr view {pr_number} --json comments,reviewThreads"
    )
    data = json.loads(comments_json)

    normalized: List[Dict[str, str]] = []
    for comment in data.get("comments", []):
        normalized.append(normalize_comment_entry(comment, "issue"))

    for thread in data.get("reviewThreads", []):
        for review_comment in thread.get("comments", []):
            normalized.append(normalize_comment_entry(review_comment, "review"))

    normalized.sort(key=lambda c: c.get("createdAt") or "")
    return normalized


def filter_existing_files(files: List[str]) -> Tuple[List[str], List[str]]:
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

    return existing_files, deleted_files


def checkout_pr_branch(pr_info: Dict[str, str], remote: str) -> str:
    """Checkout a specific PR branch, falling back to PR refs when needed."""
    branch_name = pr_info["branch"]
    print(f"Attempting to checkout branch {branch_name}...")

    try:
        run_command(f"git checkout {shlex.quote(branch_name)}")
        print(f"✓ Checked out existing branch: {branch_name}")
        return branch_name
    except subprocess.CalledProcessError:
        pass

    try:
        run_command(
            f"git checkout -b {shlex.quote(branch_name)} "
            f"{shlex.quote(remote)}/{shlex.quote(branch_name)}"
        )
        print(f"✓ Created and checked out branch: {branch_name}")
        return branch_name
    except subprocess.CalledProcessError:
        print(f"Branch {branch_name} not found on {remote}, trying PR ref...")

    fallback_branch = f"pr-{pr_info['number']}"
    try:
        run_command(
            f"git fetch {shlex.quote(remote)} pull/{pr_info['number']}/head:{shlex.quote(fallback_branch)}"
        )
        run_command(f"git checkout {shlex.quote(fallback_branch)}")
        print(f"✓ Checked out PR ref as {fallback_branch}")
        return fallback_branch
    except subprocess.CalledProcessError as exc:
        print(f"Error: Could not checkout branch for PR #{pr_info['number']}")
        raise exc


def generate_file_descriptions(files: List[str]) -> List[str]:
    """Generate descriptive names for files in the big_picture compilation."""
    file_args: List[str] = []

    for file_path in files:
        path = Path(file_path)
        desc = path.name

        if "backend" in path.parts:
            if path.name == "app.py":
                desc = "FastAPI app with endpoints and middleware"
            elif path.name == "auth.py":
                desc = "Authentication module"
            elif path.name == "test_api.py":
                desc = "API tests"
            elif path.name == "users.json":
                desc = "User credentials JSON"
            elif path.name == "requirements.txt":
                desc = "Backend requirements"
            else:
                desc = f"Backend {path.name}"
        elif "frontend" in path.parts:
            if "components" in path.parts:
                desc = f"{path.stem} component"
            elif path.name == "App.jsx":
                desc = "React main app component"
            elif path.name == "main.jsx":
                desc = "Frontend entry point"
            elif "auth" in path.parts:
                desc = f"Auth {path.stem} component"
            else:
                desc = f"Frontend {path.name}"

        file_args.append(f"{file_path}:{desc}")

    return file_args


def run_big_picture(
    pr_info: Dict[str, str],
    files: List[str],
    comments: List[Dict[str, str]],
    output_file: str,
    base_branch: str = "main",
    local_branch: str | None = None,
) -> bool:
    """Generate a git diff for the PR instead of full files."""
    branch_for_diff = local_branch or pr_info["branch"]
    print(f"Creating diff compilation for PR #{pr_info['number']}...")

    if not files:
        print(f"Warning: No files found for PR #{pr_info['number']}")
        return False

    files_arg = " ".join(shlex.quote(f) for f in files)
    cmd = f"git diff {shlex.quote(base_branch)}...{shlex.quote(branch_for_diff)} -- {files_arg}"

    diff_output = run_command(cmd)

    summary_text = " ".join(pr_info.get("body", "").split()) or "(no summary provided)"

    with open(output_file, "w", encoding="utf-8") as diff_file:
        diff_file.write(f"# PR #{pr_info['number']}: {pr_info['title']}\n")
        diff_file.write(f"# Branch: {branch_for_diff}\n")
        diff_file.write(f"# Base: {base_branch}\n")
        diff_file.write(f"# Author: {pr_info.get('author', 'unknown')}\n")
        diff_file.write(f"# Created: {pr_info.get('createdAt', '')}\n")
        diff_file.write(f"# URL: {pr_info.get('url', '')}\n")
        diff_file.write(f"# Summary: {summary_text}\n")
        diff_file.write(f"# Changed files: {len(files)}\n")
        diff_file.write(f"# Files: {', '.join(files)}\n\n")
        diff_file.write("=" * 80 + "\n")
        diff_file.write(diff_output if diff_output else "# No differences found\n")
        diff_file.write("\n\n")
        diff_file.write("=" * 80 + "\n")
        diff_file.write(f"Comments ({len(comments)}):\n")

        if not comments:
            diff_file.write("# No comments found\n")
        else:
            for comment in comments:
                timestamp = comment.get("createdAt") or "unknown time"
                author = comment.get("author") or "unknown author"
                comment_type = comment.get("type") or "comment"
                url = comment.get("url") or ""
                heading = f"- [{timestamp}] {author} ({comment_type})"
                if url:
                    heading += f" [{url}]"
                diff_file.write(heading + "\n")
                body = comment.get("body") or ""
                lines = body.splitlines() or ["(no content)"]
                for line in lines:
                    diff_file.write(f"    {line}\n")
                diff_file.write("\n")

    print(f"✓ Created diff: {output_file}")
    return True


def create_master_comparison(
    pr_files: List[Tuple[Dict[str, str], str]],
    start_pr: int,
    end_pr: int,
    output_file: str,
) -> bool:
    """Create a master comparison file combining all individual PR diff files."""
    print("Creating master comparison file...")

    if not pr_files:
        print("Warning: No individual PR files found for master comparison")
        return False

    with open(output_file, "w", encoding="utf-8") as outf:
        outf.write(f"# Master Comparison: PRs {start_pr}-{end_pr}\n")
        outf.write(f"# Total PRs: {len(pr_files)}\n")
        outf.write(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        outf.write("=" * 80 + "\n\n")

        for idx, (pr_info, pr_file) in enumerate(pr_files, 1):
            outf.write("\n" + "=" * 80 + "\n")
            outf.write(f"# PR {idx}/{len(pr_files)} - #{pr_info['number']}: {pr_info['title']}\n")
            outf.write("=" * 80 + "\n\n")

            with open(pr_file, "r", encoding="utf-8") as inf:
                outf.write(inf.read())

            outf.write("\n\n")

    print(f"✓ Created master comparison: {output_file}")
    return True


def create_touched_files_compilation(
    touched_files: Set[str],
    base_branch: str,
    start_pr: int,
    end_pr: int,
    output_file: str,
    master_comparison_file: str | None = None,
) -> bool:
    """Create a compilation of unique touched files from the base branch."""
    print("Creating touched files compilation...")

    if not touched_files:
        print("Warning: No touched files available for compilation")
        return False

    sorted_files = sorted(touched_files)

    with open(output_file, "w", encoding="utf-8") as outf:
        outf.write(f"# Touched Files (base branch) for PRs {start_pr}-{end_pr}\n")
        outf.write(f"# Total unique files: {len(sorted_files)}\n")
        outf.write(f"# Source branch: {base_branch}\n")
        outf.write(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        outf.write("=" * 80 + "\n\n")

        for file_path in sorted_files:
            ref_path = f"{base_branch}:{file_path}"
            try:
                file_contents = run_command(f"git show {shlex.quote(ref_path)}")
            except subprocess.CalledProcessError:
                print(
                    f"Skipping {file_path} because it does not exist on {base_branch}"
                )
                continue

            outf.write("=" * 80 + "\n")
            outf.write(f"# File: {file_path}\n")
            outf.write(f"# Source: {base_branch}\n\n")
            outf.write(file_contents)
            if not file_contents.endswith("\n"):
                outf.write("\n")
            outf.write("\n\n")

        if master_comparison_file and os.path.exists(master_comparison_file):
            outf.write("=" * 80 + "\n")
            outf.write(
                "# Appended master comparison (diffs and summaries)\n\n"
            )
            with open(master_comparison_file, "r", encoding="utf-8") as master_file:
                outf.write(master_file.read())

    print(f"✓ Created touched files compilation: {output_file}")
    return True


def create_summary_compilation(
    pr_files: List[Tuple[Dict[str, str], str]],
    start_pr: int,
    end_pr: int,
    output_file: str,
) -> bool:
    """Create a concise summary document for all processed PRs."""
    print("Creating summary compilation file...")

    if not pr_files:
        print("Warning: No PRs available to summarize")
        return False

    with open(output_file, "w", encoding="utf-8") as outf:
        outf.write(f"# PR Summary Compilation: PRs {start_pr}-{end_pr}\n")
        outf.write(f"# Total PRs: {len(pr_files)}\n")
        outf.write(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        outf.write("=" * 80 + "\n\n")

        for idx, (pr_info, pr_file) in enumerate(pr_files, 1):
            summary_text = " ".join(pr_info.get("body", "").split()) or "(no summary provided)"

            outf.write(f"## PR {idx}/{len(pr_files)} - #{pr_info['number']}: {pr_info['title']}\n")
            outf.write(f"- Author: {pr_info.get('author', 'unknown')}\n")
            outf.write(f"- Created: {pr_info.get('createdAt', '')}\n")
            outf.write(f"- URL: {pr_info.get('url', '')}\n")
            outf.write(f"- Summary: {summary_text}\n")
            outf.write(f"- Detailed file: {pr_file}\n")
            outf.write("\n")

    print(f"✓ Created summary compilation: {output_file}")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Automate diff generation for ranges of pull requests",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("start_pr", type=parse_pr_number, help="Starting PR number")
    parser.add_argument("end_pr", type=parse_pr_number, help="Ending PR number (inclusive)")
    parser.add_argument(
        "--base-branch",
        default="main",
        help="Base branch to diff against (default: main)",
    )
    parser.add_argument(
        "--remote",
        default="origin",
        help="Remote name to fetch PR branches from (default: origin)",
    )
    parser.add_argument(
        "--output-dir",
        default="/tmp",
        help="Directory where output files will be written (default: /tmp)",
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

    check_current_branch(args.base_branch)

    try:
        fetch_remote_branches(args.remote)

        print(f"Collecting info for PRs {args.start_pr} to {args.end_pr}...")
        pr_infos: List[Dict[str, str]] = []
        touched_files: Set[str] = set()

        for pr_num in range(args.start_pr, args.end_pr + 1):
            try:
                pr_info = get_pr_info(pr_num)
                pr_infos.append(pr_info)
                print(f"  PR #{pr_num}: {pr_info['title']}")
            except (subprocess.CalledProcessError, json.JSONDecodeError, KeyError) as exc:
                print(f"  PR #{pr_num}: Not found or inaccessible ({exc})")

        if not pr_infos:
            print("Error: No valid PRs found in the specified range")
            sys.exit(1)

        successful_prs: List[Tuple[Dict[str, str], str]] = []

        for pr_info in pr_infos:
            print(f"\n--- Processing PR #{pr_info['number']}: {pr_info['title']} ---")

            try:
                all_files = get_pr_changed_files(pr_info["number"])
            except (subprocess.CalledProcessError, json.JSONDecodeError, KeyError) as exc:
                print(f"Failed to retrieve files for PR #{pr_info['number']}: {exc}")
                continue

            if not all_files:
                print(f"No changed files found for PR #{pr_info['number']}")
                continue

            print(f"Total changed files: {len(all_files)}")

            try:
                local_branch = checkout_pr_branch(pr_info, args.remote)
            except subprocess.CalledProcessError:
                print(f"Failed to checkout branch for PR #{pr_info['number']}")
                continue

            existing_files, deleted_files = filter_existing_files(all_files)
            if not existing_files and deleted_files:
                print(
                    f"No existing files to process for PR #{pr_info['number']} "
                    "(all files were deleted)"
                )
                continue

            print(
                f"Files to process ({len(existing_files)}): "
                f"{', '.join(existing_files)}"
            )
            touched_files.update(existing_files)

            try:
                comments = get_pr_comments(pr_info["number"])
            except (subprocess.CalledProcessError, json.JSONDecodeError, KeyError) as exc:
                print(f"Failed to retrieve comments for PR #{pr_info['number']}: {exc}")
                comments = []

            output_file = os.path.join(
                args.output_dir, f"pr-{pr_info['number']}-implementation.txt"
            )
            if run_big_picture(
                pr_info,
                existing_files,
                comments,
                output_file,
                base_branch=args.base_branch,
                local_branch=local_branch,
            ):
                successful_prs.append((pr_info, output_file))

        if successful_prs:
            master_output = os.path.join(
                args.output_dir, f"pr-comparison-{args.start_pr}-{args.end_pr}.txt"
            )
            create_master_comparison(
                successful_prs, args.start_pr, args.end_pr, master_output
            )

            summary_output = os.path.join(
                args.output_dir, f"pr-summaries-{args.start_pr}-{args.end_pr}.txt"
            )
            create_summary_compilation(
                successful_prs, args.start_pr, args.end_pr, summary_output
            )

            touched_output = os.path.join(
                args.output_dir, f"pr-touched-files-{args.start_pr}-{args.end_pr}.txt"
            )
            create_touched_files_compilation(
                touched_files,
                args.base_branch,
                args.start_pr,
                args.end_pr,
                touched_output,
                master_output,
            )

            print(f"\n✓ Successfully processed {len(successful_prs)} PR(s)")
            print(f"✓ Individual files: {args.output_dir}/pr-{{num}}-implementation.txt")
            print(f"✓ Master comparison: {master_output}")
            print(f"✓ Summary compilation: {summary_output}")
            print(f"✓ Touched files compilation: {touched_output}")
        else:
            print("\nNo PRs were successfully processed")

    except KeyboardInterrupt:
        print("\nInterrupted by user")
    finally:
        if not args.no_cleanup:
            try:
                checkout_base_branch(args.base_branch)
                print(f"✓ Returned to {args.base_branch} branch")
            except subprocess.CalledProcessError:
                print(f"Warning: Failed to return to {args.base_branch} branch")


if __name__ == "__main__":
    main()
