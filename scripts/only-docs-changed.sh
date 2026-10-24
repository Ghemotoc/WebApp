#!/usr/bin/env bash
# Says whether a pull request changes only documentation ("Tooling: run the long CI jobs only
# when they matter", 24 Oct 2026: GitHub Actions minutes).
#
# Who runs it: the "changes" job in .github/workflows/ci.yml, which pipes in the list of changed
# files from `git diff --name-only`. Its answer decides whether the database and e2e jobs run.
# What it does: reads one file path per line on standard input and prints "true" when every path
# is documentation, otherwise "false".
# Documentation means: anything under docs/ or prompts/, and any Markdown (*.md) file anywhere.
# Nothing the database tests, the end-to-end tests or the app build reads is in that list (checked
# 24 Oct 2026): the legal drafts in content/legal/*.md reach the database only through a generated
# .sql migration, and a change to that migration is not documentation.
# Errs on the side of testing: an empty list prints "false", so the full suite runs.
# Tests: scripts/only-docs-changed.test.ts.
set -euo pipefail

# Says whether one changed path counts as documentation. In a bash `case` pattern `*` also
# matches "/", so "*.md" covers Markdown files in every folder.
is_documentation_path() {
  case "$1" in
    docs/* | prompts/* | *.md) return 0 ;;
    *) return 1 ;;
  esac
}

# Reads the changed paths and prints the answer.
main() {
  local changed_path
  local saw_any_path=false
  while IFS= read -r changed_path; do
    # Blank lines (for example a trailing newline) are not files.
    [ -n "$changed_path" ] || continue
    saw_any_path=true
    # One file that isn't documentation is enough: the full suite must run.
    if ! is_documentation_path "$changed_path"; then
      echo "false"
      return 0
    fi
  done
  # Only documentation, and at least one file: the long jobs can be skipped.
  if [ "$saw_any_path" = true ]; then
    echo "true"
  else
    echo "false"
  fi
}

main
