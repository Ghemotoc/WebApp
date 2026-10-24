#!/usr/bin/env bash
# The whole local check list in one command, behind `npm run checks` (TOOL-1; CLAUDE.md, Commands).
#
# Who runs it: you, before saying a branch is done. CI runs the same checks as separate jobs
# (.github/workflows/ci.yml), with the database tests before e2e.
# What it does: runs, in order and stopping at the first failure: lint, type check, the
# generated-types check, unit tests, a reset of the local database, the database tests, e2e and
# the i18n key check.
# Why the reset: the database tests expect the seed's state (for example
# supabase/tests/database/014-profile-locale.test.sql: "every account starts with Romanian"), and
# an earlier e2e run or a hand test can leave accounts changed. Resetting right before them makes
# their result independent of what ran before (CTO, 24 Oct 2026). It wipes local data only.
# Needs: the local Supabase running (`npx supabase start`).
set -euo pipefail

# Runs one check, printing its name first so a failure is easy to find in the output.
run_check() {
  echo
  echo "==> $*"
  "$@"
}

run_check npm run lint
run_check npm run typecheck
run_check npm run types:check
run_check npm test
# Back to migrations plus seed, so the database tests start from the seed's state.
run_check npx supabase db reset
run_check npx supabase test db
run_check npm run test:e2e
run_check npm run i18n:check

echo
echo "All checks passed."
