#!/usr/bin/env python3
"""
pr_batch_big_picture - Automate diff generation for ranges of pull requests

This tool automates the process of creating git diffs for consecutive pull
requests, showing only the changes made in each PR, and collects all PR
comments.

Usage:
    pr_batch_big_picture START_PR END_PR [--base-branch main] [--remote origin] [--output-dir artifacts]

Outputs:
    - Individual diff files: <output-dir>/pr-<num>-implementation.txt
    - Master comparison file: <output-dir>/pr-comparison-<start>-<end>.txt
"""

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def run_command(cmd: str, check: bool = True, capture_output: bool = True) -> str:
    """Run a shell command and return stdout."""
    result = subprocess.run(
        cmd,
        shell=True,
        check=check,
        capture_output=capture_output,
        text=True,
    )
    return result.stdout.strip() if capture_output else ""


def get_repo_info() -> Tuple[str, str]:
    """Return (owner, repo) using env when available, otherwise parsing git remote."""
    if os.environ.get("GITHUB_REPOSITORY"):
        owner, repo = os.environ["GITHUB_REPOSITORY"].split("/", 1)
        return owner, repo

    remote_url = run_command("git remote get-url origin")
    if remote_url.endswith(".git"):
        remote_url = remote_url[:-4]

    if remote_url.startswith("git@"):
        _, path = remote_url.split(":", 1)
    elif remote_url.startswith("https://") or remote_url.startswith("http://"):
        path = urllib.parse.urlparse(remote_url).path.lstrip("/")
    else:
        raise RuntimeError("Unable to determine repository owner/name from remote URL.")

    owner, repo = path.split("/", 1)
    return owner, repo


def github_api_request(path: str, token: str, params: Optional[Dict[str, str]] = None) -> Tuple[List[dict], Optional[str]]:
    """Perform a GitHub API GET request and return JSON plus next page URL if any."""
    url = f"https://api.github.com{path}"
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"

    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "pr-batch-big-picture",
        },
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            link_header = resp.headers.get("Link", "")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise RuntimeError(f"GitHub API request failed: {exc.code} {exc.reason}: {detail}") from exc

    next_url = None
    for link in link_header.split(","):
        if 'rel="next"' in link:
            next_url = link[link.find("<") + 1 : link.find(">")]
            break

    return data, next_url


def github_api_paginated(path: str, token: str, params: Optional[Dict[str, str]] = None) -> List[dict]:
    """Fetch all pages for a GitHub API endpoint."""
    items: List[dict] = []
    next_url: Optional[str] = None
    current_path = path
    current_params = dict(params or {})

    while True:
        data, next_url = github_api_request(current_path, token, current_params)
        if isinstance(data, list):
            items.extend(data)
        else:
            items.append(data)

        if not next_url:
            break
        current_path = next_url.replace("https://api.github.com", "")
        current_params = None  # already encoded in next_url

    return items


def get_pr_info(owner: str, repo: str, token: str, pr_number: int) -> Optional[Dict[str, str]]:
    """Return PR metadata."""
    try:
        data, _ = github_api_request(f"/repos/{owner}/{repo}/pulls/{pr_number}", token)
        return {
            "number": pr_number,
            "branch": data["head"]["ref"],
            "title": data["title"],
            "base": data["base"]["ref"],
        }
    except Exception as exc:  # pragma: no cover - defensive logging
        print(f"Error getting info for PR #{pr_number}: {exc}")
        return None


def get_pr_changed_files(owner: str, repo: str, token: str, pr_number: int) -> List[str]:
    """Return list of changed file paths."""
    files = github_api_paginated(
        f"/repos/{owner}/{repo}/pulls/{pr_number}/files", token, params={"per_page": 100}
    )
    return [f["filename"] for f in files]


def get_pr_comments(owner: str, repo: str, token: str, pr_number: int) -> Dict[str, List[dict]]:
    """Return PR issue comments, review comments, and reviews."""
    issue_comments = github_api_paginated(
        f"/repos/{owner}/{repo}/issues/{pr_number}/comments", token, params={"per_page": 100}
    )
    review_comments = github_api_paginated(
        f"/repos/{owner}/{repo}/pulls/{pr_number}/comments", token, params={"per_page": 100}
    )
    reviews = github_api_paginated(
        f"/repos/{owner}/{repo}/pulls/{pr_number}/reviews", token, params={"per_page": 100}
    )
    return {
        "issue_comments": issue_comments,
        "review_comments": review_comments,
        "reviews": reviews,
    }


def fetch_remote_branches(remote: str) -> None:
    """Fetch latest refs from remote."""
    print(f"Fetching remote branches from {remote}...")
    run_command(f"git fetch {remote}")
    print("✓ Remote branches fetched")


def fetch_pr_ref(remote: str, pr_number: int) -> str:
    """Fetch PR head into refs/pr/<num> and return ref name."""
    ref_name = f"refs/pr/{pr_number}"
    run_command(f"git fetch {remote} pull/{pr_number}/head:{ref_name}")
    return ref_name


def generate_comments_section(comments: Dict[str, List[dict]]) -> str:
    """Format comments into a readable section."""
    lines = []
    issue_comments = comments.get("issue_comments", [])
    review_comments = comments.get("review_comments", [])
    reviews = comments.get("reviews", [])

    def _format_comment(prefix: str, comment: dict) -> None:
        author = comment.get("user", {}).get("login", "unknown")
        created = comment.get("created_at", "unknown time")
        body = comment.get("body", "").strip()
        lines.append(f"- [{prefix}] {author} @ {created}")
        if body:
            for line in body.splitlines():
                lines.append(f"    {line}")
        else:
            lines.append("    <no content>")

    if issue_comments:
        lines.append("## Issue comments")
        for comment in issue_comments:
            _format_comment("issue", comment)
        lines.append("")

    if review_comments:
        lines.append("## Review inline comments")
        for comment in review_comments:
            prefix = f"review:{comment.get('path', '')}:{comment.get('original_line', '')}"
            _format_comment(prefix, comment)
        lines.append("")

    if reviews:
        lines.append("## Review summaries")
        for review in reviews:
            state = review.get("state", "UNKNOWN")
            prefix = f"review-summary:{state}"
            _format_comment(prefix, review)
        lines.append("")

    if not lines:
        return "## Comments\nNo comments found.\n\n"

    return "## Comments\n" + "\n".join(lines) + "\n\n"


def run_big_picture(pr_info: Dict[str, str], files: List[str], output_file: Path, base_ref: str, pr_ref: str) -> bool:
    """Generate a git diff for the PR."""
    print(f"Creating diff compilation for PR #{pr_info['number']}...")
    if not files:
        print(f"Warning: No files found for PR #{pr_info['number']}")
        return False

    files_arg = " ".join(f'"{f}"' for f in files)
    cmd = f"git diff {base_ref}...{pr_ref} -- {files_arg}"
    try:
        diff_output = run_command(cmd)
    except subprocess.CalledProcessError as exc:
        print(f"Error generating diff for PR #{pr_info['number']}: {exc}")
        return False

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with output_file.open("w", encoding="utf-8") as f:
        f.write(f"# PR #{pr_info['number']}: {pr_info['title']}\n")
        f.write(f"# Branch: {pr_info['branch']}\n")
        f.write(f"# Base: {base_ref}\n")
        f.write(f"# Changed files: {len(files)}\n")
        f.write(f"# Files: {', '.join(files)}\n\n")
        f.write("=" * 80 + "\n")
        f.write(diff_output if diff_output else "# No differences found\n")

    print(f"✓ Created diff: {output_file}")
    return True


def append_comments_to_file(output_file: Path, comments_text: str) -> None:
    """Append comments section to an existing file."""
    with output_file.open("a", encoding="utf-8") as f:
        f.write("\n" + "=" * 80 + "\n")
        f.write(comments_text)


def create_master_comparison(pr_files: List[Tuple[Dict[str, str], Path]], start_pr: int, end_pr: int, output_file: Path) -> bool:
    """Create a master comparison file combining all individual PR diff files."""
    print("Creating master comparison file...")
    if not pr_files:
        print("Warning: No individual PR files found for master comparison")
        return False

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with output_file.open("w", encoding="utf-8") as outf:
        outf.write(f"# Master Comparison: PRs {start_pr}-{end_pr}\n")
        outf.write(f"# Total PRs: {len(pr_files)}\n")
        outf.write(f"# Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
        outf.write("=" * 80 + "\n\n")

        for idx, (pr_info, pr_file) in enumerate(pr_files, 1):
            outf.write("\n" + "=" * 80 + "\n")
            outf.write(f"# PR {idx}/{len(pr_files)} - #{pr_info['number']}: {pr_info['title']}\n")
            outf.write("=" * 80 + "\n\n")
            outf.write(pr_file.read_text(encoding="utf-8"))
            outf.write("\n\n")

    print(f"✓ Created master comparison: {output_file}")
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Automate diff generation for ranges of pull requests with comments",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s 30 33
  %(prog)s 34 37 --base-branch main --remote origin
""",
    )
    parser.add_argument("start_pr", type=int, help="Starting PR number")
    parser.add_argument("end_pr", type=int, help="Ending PR number (inclusive)")
    parser.add_argument("--base-branch", default="main", help="Base branch to diff against")
    parser.add_argument("--remote", default="origin", help="Remote to fetch from")
    parser.add_argument("--output-dir", default="artifacts", help="Directory to write output files")
    return parser.parse_args()


def ensure_token() -> str:
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise RuntimeError("GITHUB_TOKEN is required to call the GitHub API.")
    return token


def main() -> None:
    args = parse_args()
    if args.start_pr > args.end_pr:
        print("Error: Start PR must be less than or equal to end PR")
        sys.exit(1)

    token = ensure_token()
    owner, repo = get_repo_info()

    base_ref = args.base_branch
    output_dir = Path(args.output_dir)

    print(f"Repository: {owner}/{repo}")
    print(f"Base branch: {base_ref}")
    print(f"Output directory: {output_dir}")

    try:
        fetch_remote_branches(args.remote)
    except subprocess.CalledProcessError:
        print(f"Error: Unable to fetch from remote '{args.remote}'")
        sys.exit(1)

    pr_infos: List[Dict[str, str]] = []
    print(f"Collecting info for PRs {args.start_pr} to {args.end_pr}...")
    for pr_num in range(args.start_pr, args.end_pr + 1):
        pr_info = get_pr_info(owner, repo, token, pr_num)
        if pr_info:
            pr_infos.append(pr_info)
            print(f"  PR #{pr_num}: {pr_info['title']}")
        else:
            print(f"  PR #{pr_num}: Not found or inaccessible")

    if not pr_infos:
        print("Error: No valid PRs found in the specified range")
        sys.exit(1)

    successful_prs: List[Tuple[Dict[str, str], Path]] = []
    for pr_info in pr_infos:
        print(f"\n--- Processing PR #{pr_info['number']}: {pr_info['title']} ---")
        try:
            files = get_pr_changed_files(owner, repo, token, pr_info["number"])
            comments = get_pr_comments(owner, repo, token, pr_info["number"])
        except RuntimeError as exc:
            print(f"Failed to fetch PR #{pr_info['number']} metadata: {exc}")
            continue

        print(f"Total changed files: {len(files)}")

        try:
            pr_ref = fetch_pr_ref(args.remote, pr_info["number"])
        except subprocess.CalledProcessError as exc:
            print(f"Failed to fetch branch for PR #{pr_info['number']}: {exc}")
            continue

        output_file = output_dir / f"pr-{pr_info['number']}-implementation.txt"
        if run_big_picture(pr_info, files, output_file, base_ref, pr_ref):
            append_comments_to_file(output_file, generate_comments_section(comments))
            successful_prs.append((pr_info, output_file))

    if successful_prs:
        master_output = output_dir / f"pr-comparison-{args.start_pr}-{args.end_pr}.txt"
        create_master_comparison(successful_prs, args.start_pr, args.end_pr, master_output)
        print(f"\n✓ Successfully processed {len(successful_prs)} PRs")
        print(f"✓ Individual files saved under: {output_dir}")
        print(f"✓ Master comparison: {master_output}")
    else:
        print("\nNo PRs were successfully processed")
        sys.exit(1)


if __name__ == "__main__":
    main()
