#!/usr/bin/env python3
"""
pr_batch_big_picture - Automate diff generation for selected pull requests

This tool automates the process of creating git diffs for pull requests,
showing only the changes made in each PR, and collecting all comments
made on the pull requests.
"""

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
from datetime import datetime
from hashlib import sha1
from itertools import combinations
from pathlib import Path
from typing import Dict, List, Set, Tuple


EXPECTED_SELECTION_FORMAT = (
    'Expected format like "123-130,135,140-142" using positive integers.'
)


def build_selection_error(segment: str, selection: str, reason: str) -> ValueError:
    """Build a selection parsing error with helpful context."""
    message = (
        f"Invalid PR selection segment '{segment}' ({reason}) "
        f"in selection '{selection}'. {EXPECTED_SELECTION_FORMAT}"
    )
    return ValueError(message)


def parse_pr_selection(selection: str) -> List[int]:
    """Parse a selection string into a sorted list of unique PR numbers."""
    if selection is None:
        raise ValueError(
            "PR selection is required. "
            f"{EXPECTED_SELECTION_FORMAT}"
        )

    original = selection
    trimmed = selection.strip()
    if not trimmed:
        raise ValueError(
            f"PR selection cannot be empty. {EXPECTED_SELECTION_FORMAT}"
        )

    selected: Set[int] = set()
    for raw_segment in trimmed.split(","):
        segment = raw_segment.strip()
        if not segment:
            raise build_selection_error(raw_segment, original, "empty segment")

        compact = re.sub(r"\s+", "", segment)
        if not compact:
            raise build_selection_error(segment, original, "empty segment")

        if compact.count("-") > 1:
            raise build_selection_error(segment, original, "too many '-' characters")

        if "-" in compact:
            left_raw, right_raw = compact.split("-", 1)
            left_token = left_raw.lstrip("#")
            right_token = right_raw.lstrip("#")
            if not left_token or not right_token:
                raise build_selection_error(segment, original, "invalid range token")
            if not left_token.isdigit() or not right_token.isdigit():
                raise build_selection_error(segment, original, "range bounds must be integers")
            left = int(left_token)
            right = int(right_token)
            if left <= 0 or right <= 0:
                raise build_selection_error(segment, original, "PR numbers must be > 0")
            if left > right:
                raise build_selection_error(
                    segment,
                    original,
                    f"range start {left} exceeds end {right}",
                )
            selected.update(range(left, right + 1))
        else:
            token = compact.lstrip("#")
            if not token.isdigit():
                raise build_selection_error(segment, original, "PR number must be an integer")
            number = int(token)
            if number <= 0:
                raise build_selection_error(segment, original, "PR numbers must be > 0")
            selected.add(number)

    if not selected:
        raise ValueError(
            f"PR selection parsed to zero PRs. {EXPECTED_SELECTION_FORMAT}"
        )

    return sorted(selected)


def format_pr_selection(prs: List[int]) -> str:
    """Format a list of PRs into a canonical selection string."""
    if not prs:
        return ""

    sorted_prs = sorted(set(prs))
    ranges: List[str] = []
    start = sorted_prs[0]
    end = start

    for pr_num in sorted_prs[1:]:
        if pr_num == end + 1:
            end = pr_num
            continue

        if start == end:
            ranges.append(str(start))
        else:
            ranges.append(f"{start}-{end}")
        start = pr_num
        end = pr_num

    if start == end:
        ranges.append(str(start))
    else:
        ranges.append(f"{start}-{end}")

    return ",".join(ranges)


def format_pr_list_preview(
    prs: List[int],
    max_items: int = 20,
    preview_items: int = 5,
) -> Tuple[str, bool]:
    """Format PR list for output; returns preview string and if it's truncated."""
    if not prs:
        return "", False

    if len(prs) <= max_items:
        return ", ".join(str(pr) for pr in prs), False

    head = ", ".join(str(pr) for pr in prs[:preview_items])
    tail = ", ".join(str(pr) for pr in prs[-preview_items:])
    return f"{head}, ..., {tail}", True


def selection_header_lines(
    selection_requested: str,
    selection_canonical: str,
    selected_prs: List[int],
    max_expanded_items: int = 20,
) -> List[str]:
    """Build header lines describing the PR selection."""
    lines = [
        f"# PR selection (requested): {selection_requested}",
        f"# PR selection (canonical): {selection_canonical}",
    ]
    if not selected_prs:
        lines.append("# Expanded PRs: none")
        return lines

    preview, truncated = format_pr_list_preview(
        selected_prs, max_items=max_expanded_items
    )
    count = len(selected_prs)
    min_pr = selected_prs[0]
    max_pr = selected_prs[-1]
    if truncated:
        lines.append(
            f"# Expanded PRs: count={count} min={min_pr} max={max_pr} preview={preview}"
        )
    else:
        lines.append(f"# Expanded PRs (count={count}): {preview}")
    return lines


def selection_tag_from_prs(selected_prs: List[int]) -> str:
    """Create a stable selection tag based on the canonical PR list."""
    selection_canonical = format_pr_selection(selected_prs)
    selection_hash = sha1(selection_canonical.encode("utf-8")).hexdigest()[:8]
    return f"{len(selected_prs)}prs-{selection_hash}"


def run_selection_self_test() -> None:
    """Lightweight self-test for selection parsing and formatting."""
    cases = [
        ("1-10", list(range(1, 11)), "1-10"),
        ("1,2,3", [1, 2, 3], "1-3"),
        ("1-5,6-10", list(range(1, 11)), "1-10"),
        ("1,5,7-9", [1, 5, 7, 8, 9], "1,5,7-9"),
        (" 1 , 5 , 7 - 9 ", [1, 5, 7, 8, 9], "1,5,7-9"),
        ("#1,#3-#5", [1, 3, 4, 5], "1,3-5"),
    ]
    invalid_cases = ["a", "1-b", "5-3", "", "0", "-1"]

    for selection, expected_list, expected_canonical in cases:
        parsed = parse_pr_selection(selection)
        if parsed != expected_list:
            raise AssertionError(
                f"Expected {expected_list} for '{selection}', got {parsed}"
            )
        canonical = format_pr_selection(parsed)
        if canonical != expected_canonical:
            raise AssertionError(
                f"Expected canonical '{expected_canonical}' for '{selection}', got {canonical}"
            )

    for selection in invalid_cases:
        try:
            parse_pr_selection(selection)
        except ValueError:
            continue
        raise AssertionError(f"Expected failure for invalid selection '{selection}'")

    print("✓ PR selection self-test passed")


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


def get_pr_checks(pr_number: int) -> List[Dict[str, str]]:
    """Get status check results for a specific PR."""
    checks_json = run_command(
        f"gh pr view {pr_number} --json statusCheckRollup"
    )
    data = json.loads(checks_json)

    checks: List[Dict[str, str]] = []
    for check in data.get("statusCheckRollup") or []:
        checks.append(
            {
                "name": check.get("name")
                or check.get("context")
                or check.get("title")
                or "unknown check",
                "status": check.get("status")
                or check.get("state")
                or "unknown",
                "conclusion": check.get("conclusion")
                or check.get("state")
                or "unknown",
                "detailsUrl": check.get("detailsUrl")
                or check.get("targetUrl")
                or "",
                "title": check.get("title") or "",
                "summary": check.get("summary") or check.get("text") or "",
            }
        )

    return checks


def extract_actions_run_id(details_url: str | None) -> str | None:
    """Extract the GitHub Actions run ID from a details URL."""
    if not details_url:
        return None
    match = re.search(r"/actions/runs/(\d+)", details_url)
    return match.group(1) if match else None


def get_failed_check_logs(check: Dict[str, str]) -> str | None:
    """Retrieve raw logs for failed GitHub Actions checks."""
    conclusion = (check.get("conclusion") or "").lower()
    if conclusion in {"success", "neutral", "skipped"}:
        return None

    run_id = extract_actions_run_id(check.get("detailsUrl") or "")
    if not run_id:
        return None

    try:
        print(
            f"Fetching logs for failed check '{check.get('name', 'unknown check')}' "
            f"(run {run_id})"
        )
        return run_command(f"gh run view {shlex.quote(run_id)} --log")
    except subprocess.CalledProcessError as exc:
        print(f"Warning: Failed to fetch logs for run {run_id}: {exc}")
        return None


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
    checks: List[Dict[str, str]],
    output_file: str,
    include_logs: bool = False,
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
        diff_file.write(f"Checks ({len(checks)}):\n")

        if not checks:
            diff_file.write("# No checks found\n")
        else:
            for check in checks:
                name = check.get("name") or "unknown check"
                status = check.get("status") or "unknown"
                conclusion = check.get("conclusion") or "unknown"
                details_url = check.get("detailsUrl") or ""
                log_output = check.get("logOutput") or ""
                heading = f"- {name}: status={status}, conclusion={conclusion}"
                if details_url:
                    heading += f" [{details_url}]"
                diff_file.write(heading + "\n")

                summary_text = check.get("summary") or check.get("title") or ""
                if summary_text:
                    for line in summary_text.splitlines():
                        diff_file.write(f"    {line}\n")
                if include_logs and log_output:
                    diff_file.write("    Logs:\n")
                    for line in log_output.splitlines():
                        diff_file.write(f"    {line}\n")

        diff_file.write("\n")
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
    selection_requested: str,
    selection_canonical: str,
    selected_prs: List[int],
    output_file: str,
    include_logs: bool = False,
) -> bool:
    """Create a master comparison file combining all individual PR diff files."""
    print("Creating master comparison file...")

    if not pr_files:
        print("Warning: No individual PR files found for master comparison")
        return False

    with open(output_file, "w", encoding="utf-8") as outf:
        log_note = " (with logs)" if include_logs else ""
        outf.write(f"# Master Comparison{log_note}\n")
        for line in selection_header_lines(
            selection_requested, selection_canonical, selected_prs
        ):
            outf.write(f"{line}\n")
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
    selection_requested: str,
    selection_canonical: str,
    selected_prs: List[int],
    output_file: str,
    master_comparison_file: str | None = None,
    include_logs: bool = False,
) -> bool:
    """Create a compilation of unique touched files from the base branch."""
    print("Creating touched files compilation...")

    if not touched_files:
        print("Warning: No touched files available for compilation")
        return False

    sorted_files = sorted(touched_files)

    with open(output_file, "w", encoding="utf-8") as outf:
        log_note = " (with logs)" if include_logs else ""
        outf.write(f"# Touched Files{log_note} (base branch)\n")
        for line in selection_header_lines(
            selection_requested, selection_canonical, selected_prs
        ):
            outf.write(f"{line}\n")
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
    selection_requested: str,
    selection_canonical: str,
    selected_prs: List[int],
    output_file: str,
    include_logs: bool = False,
) -> bool:
    """Create a concise summary document for all processed PRs."""
    print("Creating summary compilation file...")

    if not pr_files:
        print("Warning: No PRs available to summarize")
        return False

    with open(output_file, "w", encoding="utf-8") as outf:
        log_note = " (with logs)" if include_logs else ""
        outf.write(f"# PR Summary Compilation{log_note}\n")
        for line in selection_header_lines(
            selection_requested, selection_canonical, selected_prs
        ):
            outf.write(f"{line}\n")
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


def create_round_robin_comparisons(
    processed_prs: List[Dict[str, object]],
    output_dir: str,
    selection_requested: str,
    selection_canonical: str,
    selected_prs: List[int],
) -> List[str]:
    """Create pairwise comparison files for every PR combination."""
    print("Creating round-robin comparisons...")

    if len(processed_prs) < 2:
        print("Warning: Not enough PRs for round-robin comparisons")
        return []

    output_files: List[str] = []

    for left, right in combinations(processed_prs, 2):
        left_info = left["info"]
        right_info = right["info"]
        left_branch = left["local_branch"]
        right_branch = right["local_branch"]
        left_files = left["files"]
        right_files = right["files"]

        if not isinstance(left_info, dict) or not isinstance(right_info, dict):
            continue
        if not isinstance(left_branch, str) or not isinstance(right_branch, str):
            continue
        if not isinstance(left_files, list) or not isinstance(right_files, list):
            continue

        left_number = left_info.get("number")
        right_number = right_info.get("number")
        if left_number is None or right_number is None:
            continue

        output_file = os.path.join(
            output_dir, f"pr-{left_number}-versus-{right_number}.txt"
        )

        combined_files = sorted(set(left_files) | set(right_files))
        files_arg = " ".join(shlex.quote(f) for f in combined_files)
        diff_cmd = (
            f"git diff {shlex.quote(left_branch)} {shlex.quote(right_branch)}"
        )
        if files_arg:
            diff_cmd += f" -- {files_arg}"

        diff_output = run_command(diff_cmd)

        left_summary = " ".join(left_info.get("body", "").split()) or "(no summary provided)"
        right_summary = " ".join(right_info.get("body", "").split()) or "(no summary provided)"

        with open(output_file, "w", encoding="utf-8") as outf:
            outf.write(
                f"# PR #{left_number} vs PR #{right_number}: "
                f"{left_info.get('title', '')} ↔ {right_info.get('title', '')}\n"
            )
            for line in selection_header_lines(
                selection_requested, selection_canonical, selected_prs
            ):
                outf.write(f"{line}\n")
            outf.write(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            outf.write(f"# Left branch: {left_branch}\n")
            outf.write(f"# Right branch: {right_branch}\n")
            outf.write(f"# Left author: {left_info.get('author', 'unknown')}\n")
            outf.write(f"# Right author: {right_info.get('author', 'unknown')}\n")
            outf.write(f"# Left URL: {left_info.get('url', '')}\n")
            outf.write(f"# Right URL: {right_info.get('url', '')}\n")
            outf.write(f"# Left summary: {left_summary}\n")
            outf.write(f"# Right summary: {right_summary}\n")
            outf.write(f"# Files compared: {len(combined_files)}\n")
            outf.write(f"# Files: {', '.join(combined_files)}\n\n")
            outf.write("=" * 80 + "\n")
            outf.write(diff_output if diff_output else "# No differences found\n")
            outf.write("\n\n")

        output_files.append(output_file)

    print(
        f"✓ Created {len(output_files)} round-robin comparison file(s) "
        "for the selected PRs"
    )
    return output_files


def create_round_robin_summary(
    output_files: List[str],
    output_file: str,
    selection_requested: str,
    selection_canonical: str,
    selected_prs: List[int],
    processed_prs: List[Dict[str, object]],
) -> bool:
    """Create a summary file for round-robin comparisons."""
    if not output_files:
        return False

    processed_numbers: List[int] = []
    for pr in processed_prs:
        info = pr.get("info")
        if not isinstance(info, dict):
            continue
        number = info.get("number")
        if isinstance(number, int):
            processed_numbers.append(number)
    processed_numbers = sorted(set(processed_numbers))

    with open(output_file, "w", encoding="utf-8") as outf:
        outf.write("# Round Robin Comparisons\n")
        for line in selection_header_lines(
            selection_requested, selection_canonical, selected_prs
        ):
            outf.write(f"{line}\n")
        outf.write(f"# Processed PRs: {len(processed_numbers)}\n")
        if processed_numbers:
            outf.write(f"# Processed PR list: {', '.join(map(str, processed_numbers))}\n")
        outf.write(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        outf.write("=" * 80 + "\n\n")
        outf.write("Files:\n")
        for path in output_files:
            outf.write(f"- {path}\n")

    print(f"✓ Created round-robin summary: {output_file}")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Automate diff generation for selected pull requests",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "pr_selection",
        nargs="?",
        help=(
            "PR selection string like "
            '"123-130,135,140-142" or "123,125,127-129"'
        ),
    )
    parser.add_argument(
        "--prs",
        dest="prs",
        help=(
            "Alias for PR selection string, e.g. "
            '"123-130,135,140-142"'
        ),
    )
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
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="Run selection parsing self-test and exit",
    )

    args = parser.parse_args()

    if args.self_test:
        run_selection_self_test()
        return

    selection_requested = args.prs or args.pr_selection
    if not selection_requested:
        parser.error(
            "PR selection is required. "
            f"{EXPECTED_SELECTION_FORMAT}"
        )

    try:
        selected_prs = parse_pr_selection(selection_requested)
    except ValueError as exc:
        parser.error(str(exc))

    selection_canonical = format_pr_selection(selected_prs)
    selection_tag = selection_tag_from_prs(selected_prs)
    preview, truncated = format_pr_list_preview(selected_prs)
    expanded_label = f"count={len(selected_prs)}"
    if selected_prs:
        expanded_label += f" min={selected_prs[0]} max={selected_prs[-1]}"
    if truncated:
        expanded_label += f" preview={preview}"
    else:
        expanded_label += f" list={preview}"

    print("PR selection:")
    print(f"  Requested: {selection_requested}")
    print(f"  Canonical: {selection_canonical}")
    print(f"  Expanded: {expanded_label}")

    check_current_branch(args.base_branch)

    try:
        fetch_remote_branches(args.remote)

        print(f"Collecting info for PR selection: {selection_requested}...")
        pr_infos: List[Dict[str, str]] = []
        touched_files: Set[str] = set()

        for pr_num in selected_prs:
            try:
                pr_info = get_pr_info(pr_num)
                pr_infos.append(pr_info)
                print(f"  PR #{pr_num}: {pr_info['title']}")
            except (subprocess.CalledProcessError, json.JSONDecodeError, KeyError) as exc:
                print(f"  PR #{pr_num}: Not found or inaccessible ({exc})")

        if not pr_infos:
            print("Error: No valid PRs found in the specified selection")
            sys.exit(1)

        successful_prs: List[Tuple[Dict[str, str], str]] = []
        successful_prs_with_logs: List[Tuple[Dict[str, str], str]] = []
        processed_prs: List[Dict[str, object]] = []
        processed_prs_with_logs: List[Dict[str, object]] = []

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

            try:
                checks_with_logs: List[Dict[str, str]] = []
                checks = get_pr_checks(pr_info["number"])
            except (subprocess.CalledProcessError, json.JSONDecodeError, KeyError) as exc:
                print(f"Failed to retrieve checks for PR #{pr_info['number']}: {exc}")
                checks = []
                checks_with_logs = []
            else:
                for check in checks:
                    check_copy = dict(check)
                    logs = get_failed_check_logs(check_copy)
                    if logs:
                        check_copy["logOutput"] = logs
                    checks_with_logs.append(check_copy)

            output_file = os.path.join(
                args.output_dir, f"pr-{pr_info['number']}-implementation.txt"
            )
            output_file_with_logs = os.path.join(
                args.output_dir, f"pr-{pr_info['number']}-implementation-with-logs.txt"
            )
            if run_big_picture(
                pr_info,
                existing_files,
                comments,
                checks,
                output_file,
                include_logs=False,
                base_branch=args.base_branch,
                local_branch=local_branch,
            ):
                successful_prs.append((pr_info, output_file))
                processed_prs.append(
                    {
                        "info": pr_info,
                        "file": output_file,
                        "local_branch": local_branch,
                        "files": existing_files,
                    }
                )
            if run_big_picture(
                pr_info,
                existing_files,
                comments,
                checks_with_logs,
                output_file_with_logs,
                include_logs=True,
                base_branch=args.base_branch,
                local_branch=local_branch,
            ):
                successful_prs_with_logs.append((pr_info, output_file_with_logs))
                processed_prs_with_logs.append(
                    {
                        "info": pr_info,
                        "file": output_file_with_logs,
                        "local_branch": local_branch,
                        "files": existing_files,
                    }
                )

        if successful_prs:
            master_output = os.path.join(
                args.output_dir, f"pr-comparison-{selection_tag}.txt"
            )
            create_master_comparison(
                successful_prs,
                selection_requested,
                selection_canonical,
                selected_prs,
                master_output,
            )

            summary_output = os.path.join(
                args.output_dir, f"pr-summaries-{selection_tag}.txt"
            )
            create_summary_compilation(
                successful_prs,
                selection_requested,
                selection_canonical,
                selected_prs,
                summary_output,
            )

            touched_output = os.path.join(
                args.output_dir, f"pr-touched-files-{selection_tag}.txt"
            )
            create_touched_files_compilation(
                touched_files,
                args.base_branch,
                selection_requested,
                selection_canonical,
                selected_prs,
                touched_output,
                master_output,
            )
            round_robin_outputs = create_round_robin_comparisons(
                processed_prs,
                args.output_dir,
                selection_requested,
                selection_canonical,
                selected_prs,
            )
            round_robin_output = os.path.join(
                args.output_dir, f"pr-round-robin-{selection_tag}.txt"
            )
            create_round_robin_summary(
                round_robin_outputs,
                round_robin_output,
                selection_requested,
                selection_canonical,
                selected_prs,
                processed_prs,
            )

            processed_numbers = sorted(
                {pr_info["number"] for pr_info, _ in successful_prs}
            )
            missing_prs = sorted(set(selected_prs) - set(processed_numbers))

            print(f"\n✓ Successfully processed {len(successful_prs)} PR(s) (without logs)")
            print(f"✓ Individual files: {args.output_dir}/pr-{{num}}-implementation.txt")
            print(f"✓ Master comparison: {master_output}")
            print(f"✓ Summary compilation: {summary_output}")
            print(f"✓ Touched files compilation: {touched_output}")
            if round_robin_outputs:
                print(
                    "✓ Round-robin comparisons: "
                    f"{args.output_dir}/pr-{{left}}-versus-{{right}}.txt"
                )
                print(f"✓ Round-robin summary: {round_robin_output}")
            print(
                f"✓ Requested PRs: {len(selected_prs)} | "
                f"Processed PRs: {len(processed_numbers)}"
            )
            if missing_prs:
                print(f"⚠ Missing PRs: {', '.join(map(str, missing_prs))}")
        else:
            print("\nNo PRs were successfully processed (without logs)")

        if successful_prs_with_logs:
            master_output_with_logs = os.path.join(
                args.output_dir, f"pr-comparison-{selection_tag}-with-logs.txt"
            )
            create_master_comparison(
                successful_prs_with_logs,
                selection_requested,
                selection_canonical,
                selected_prs,
                master_output_with_logs,
                include_logs=True,
            )

            summary_output_with_logs = os.path.join(
                args.output_dir, f"pr-summaries-{selection_tag}-with-logs.txt"
            )
            create_summary_compilation(
                successful_prs_with_logs,
                selection_requested,
                selection_canonical,
                selected_prs,
                summary_output_with_logs,
                include_logs=True,
            )

            touched_output_with_logs = os.path.join(
                args.output_dir, f"pr-touched-files-{selection_tag}-with-logs.txt"
            )
            create_touched_files_compilation(
                touched_files,
                args.base_branch,
                selection_requested,
                selection_canonical,
                selected_prs,
                touched_output_with_logs,
                master_output_with_logs,
                include_logs=True,
            )

            print(f"\n✓ Successfully processed {len(successful_prs_with_logs)} PR(s) (with logs)")
            print(f"✓ Individual files (with logs): {args.output_dir}/pr-{{num}}-implementation-with-logs.txt")
            print(f"✓ Master comparison (with logs): {master_output_with_logs}")
            print(f"✓ Summary compilation (with logs): {summary_output_with_logs}")
            print(f"✓ Touched files compilation (with logs): {touched_output_with_logs}")
        else:
            print("\nNo PRs were successfully processed (with logs)")

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
