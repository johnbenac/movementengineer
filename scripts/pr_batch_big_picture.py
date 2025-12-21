#!/usr/bin/env python3
"""Generate big-picture diffs for a range of PRs.

This script is designed to run inside CI to mirror the workflow described in
the legacy `pr_batch_big_picture` helper. It will:

1. Validate the requested PR range.
2. Fetch PR metadata (title, branch) along with all timeline comments and
   review thread comments.
3. Check out each PR locally using `gh pr checkout` so we can compute a
   `git diff` against the base branch.
4. Save individual per-PR reports and a combined master comparison file.

The script expects `gh` to be authenticated via `GH_TOKEN`/`GITHUB_TOKEN` and
requires a repository checkout with full history available.
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, List, Optional


class CommandError(RuntimeError):
    """Raised when a shell command fails."""


def run_command(cmd: str, *, check: bool = True, capture_output: bool = True) -> str:
    """Run a shell command and return stdout.

    Args:
        cmd: Command to execute.
        check: Whether to raise on non-zero exit codes.
        capture_output: Whether to capture stdout/stderr.

    Returns:
        The stripped stdout content.

    Raises:
        CommandError: If the command fails when ``check`` is True.
    """

    result = subprocess.run(
        cmd,
        shell=True,
        check=False,
        capture_output=capture_output,
        text=True,
    )

    if check and result.returncode != 0:
        raise CommandError(f"Command failed ({result.returncode}): {cmd}\n{result.stderr}")

    return (result.stdout or "").strip()


@dataclass
class Comment:
    author: str
    created_at: str
    body: str
    url: Optional[str] = None
    source: str = "comment"


@dataclass
class PullRequestInfo:
    number: int
    title: str
    head_ref: str
    base_ref: str
    files: List[str]
    comments: List[Comment]


def ensure_base_branch(base_branch: str) -> None:
    """Check out the base branch with the latest remote state."""

    run_command(f"git fetch origin {shlex.quote(base_branch)}", check=True)
    run_command(f"git checkout {shlex.quote(base_branch)}", check=True)
    run_command(f"git pull origin {shlex.quote(base_branch)}", check=True)


def remove_local_branch(branch_name: str) -> None:
    """Delete a local branch if it exists."""

    try:
        run_command(f"git branch -D {shlex.quote(branch_name)}", check=False)
    except CommandError:
        # Branch might not exist; ignore
        pass


def get_pr_info(pr_number: int) -> PullRequestInfo:
    """Fetch PR metadata, changed files, and comments using the GitHub CLI."""

    info_json = run_command(
        f"gh pr view {pr_number} --json headRefName,baseRefName,title,files,comments,reviewThreads",
        check=True,
    )
    data = json.loads(info_json)

    comments: List[Comment] = []

    for item in data.get("comments", []):
        comments.append(
            Comment(
                author=(item.get("author") or {}).get("login", "unknown"),
                created_at=item.get("createdAt", ""),
                body=item.get("body", "").strip(),
                url=item.get("url"),
                source="comment",
            )
        )

    for thread in data.get("reviewThreads", []):
        for item in thread.get("comments", []):
            comments.append(
                Comment(
                    author=(item.get("author") or {}).get("login", "unknown"),
                    created_at=item.get("createdAt", ""),
                    body=item.get("body", "").strip(),
                    url=item.get("url"),
                    source="review",
                )
            )

    comments.sort(key=lambda c: c.created_at or "")

    files = [f.get("path") for f in data.get("files", []) if f.get("path")]

    return PullRequestInfo(
        number=pr_number,
        title=data.get("title", ""),
        head_ref=data.get("headRefName", ""),
        base_ref=data.get("baseRefName", ""),
        files=files,
        comments=comments,
    )


def checkout_pr_branch(pr_number: int, branch_name: str) -> str:
    """Check out the PR using ``gh pr checkout`` into a local branch.

    Returns the name of the local branch that was created/checked out.
    """

    local_branch = f"pr-{pr_number}-head"
    remove_local_branch(local_branch)
    run_command(f"gh pr checkout {pr_number} --b {shlex.quote(local_branch)}", check=True)
    return local_branch


def format_comments(comments: Iterable[Comment]) -> str:
    """Create a human-friendly comment transcript."""

    if not comments:
        return "No comments found for this PR."

    lines: List[str] = []
    for comment in comments:
        header = f"- [{comment.created_at}] {comment.author} ({comment.source})"
        if comment.url:
            header += f" — {comment.url}"
        lines.append(header)
        if comment.body:
            for body_line in comment.body.splitlines():
                lines.append(f"    {body_line}")
    return "\n".join(lines)


def write_pr_report(pr: PullRequestInfo, *, base_branch: str, reports_dir: Path, local_branch: str) -> Path:
    """Generate the diff and comment report for a single PR."""

    reports_dir.mkdir(parents=True, exist_ok=True)
    output_path = reports_dir / f"pr-{pr.number}-implementation.txt"

    files_arg = " ".join(shlex.quote(path) for path in pr.files)
    diff_cmd = f"git diff {shlex.quote(base_branch)}...{shlex.quote(local_branch)}"
    if files_arg:
        diff_cmd += f" -- {files_arg}"

    diff_output = run_command(diff_cmd, check=True)

    with output_path.open("w", encoding="utf-8") as f:
        f.write(f"# PR #{pr.number}: {pr.title}\n")
        f.write(f"# Base branch: {base_branch}\n")
        f.write(f"# Head branch: {pr.head_ref}\n")
        f.write(f"# Files changed: {len(pr.files)}\n")
        f.write(f"# Generated: {datetime.utcnow().isoformat()}Z\n")
        f.write("=" * 80 + "\n\n")
        f.write("Comments\n")
        f.write("-" * 80 + "\n")
        f.write(format_comments(pr.comments))
        f.write("\n\n" + "=" * 80 + "\n\n")
        f.write("Diff\n")
        f.write("-" * 80 + "\n")
        f.write(diff_output if diff_output else "# No differences found\n")

    return output_path


def write_master_report(pr_reports: List[Path], pr_infos: List[PullRequestInfo], start_pr: int, end_pr: int, *, reports_dir: Path) -> Path:
    """Combine all per-PR reports into a single comparison file."""

    output_path = reports_dir / f"pr-comparison-{start_pr}-{end_pr}.txt"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8") as master:
        master.write(f"# Master Comparison for PRs {start_pr}-{end_pr}\n")
        master.write(f"# Generated: {datetime.utcnow().isoformat()}Z\n")
        master.write(f"# Total PRs: {len(pr_reports)}\n")
        master.write("=" * 80 + "\n\n")

        for info, report in zip(pr_infos, pr_reports):
            master.write("\n" + "=" * 80 + "\n")
            master.write(f"# PR #{info.number}: {info.title}\n")
            master.write("=" * 80 + "\n\n")
            master.write(report.read_text(encoding="utf-8"))
            master.write("\n\n")

    return output_path


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate comparison reports for a range of PRs")
    parser.add_argument("start_pr", type=int, help="Starting PR number (inclusive)")
    parser.add_argument("end_pr", type=int, help="Ending PR number (inclusive)")
    parser.add_argument("--base-branch", default="main", help="Base branch to diff against")
    parser.add_argument("--reports-dir", default="./pr-comparison", help="Directory to write reports into")
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)

    if args.start_pr > args.end_pr:
        raise SystemExit("Start PR must be less than or equal to end PR")

    reports_dir = Path(args.reports_dir)

    ensure_base_branch(args.base_branch)

    pr_infos: List[PullRequestInfo] = []
    pr_reports: List[Path] = []

    for pr_number in range(args.start_pr, args.end_pr + 1):
        print(f"Processing PR #{pr_number}...")
        info = get_pr_info(pr_number)
        local_branch = checkout_pr_branch(pr_number, info.head_ref)
        info.head_ref = local_branch  # Use local branch name for diffs

        report_path = write_pr_report(info, base_branch=args.base_branch, reports_dir=reports_dir, local_branch=local_branch)
        pr_infos.append(info)
        pr_reports.append(report_path)

        ensure_base_branch(args.base_branch)
        remove_local_branch(local_branch)

    master_report = write_master_report(pr_reports, pr_infos, args.start_pr, args.end_pr, reports_dir=reports_dir)
    print(f"Master report written to: {master_report}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CommandError as exc:  # pragma: no cover - CLI reporting
        print(exc, file=sys.stderr)
        sys.exit(1)
