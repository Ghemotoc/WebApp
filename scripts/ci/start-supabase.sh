#!/usr/bin/env bash
# Starts the local Supabase in GitHub CI, trying up to three times (QA-9, 8 Nov 2026).
#
# Why: the database job and the four end-to-end shards pull the Supabase images at the same
# moment, and the image registry sometimes answers "Rate exceeded". The Supabase CLI then retries
# on its own but trips over the container its first try left half-started ("failed to bind host
# port 0.0.0.0:54322: address already in use"), and the job dies before any test runs. Twice on
# 8 Nov 2026 (PR #396 shard 3, PR #393 shard 1). A failed try is now cleaned up with
# `supabase stop` and retried after a short, growing wait, so the shards drift apart.
# Who calls it: .github/workflows/ci.yml, in the database job ("db start") and in each
# end-to-end shard ("start -x …"). It takes the same arguments as `npx supabase`.
# Exit code: 0 once Supabase is up; 1 after three failed tries (a real failure, shown in the log).
set -uo pipefail

maximum_tries=3

for try_number in $(seq 1 "$maximum_tries"); do
  # Step 1: start Supabase with the arguments the workflow gave.
  if npx supabase "$@"; then
    exit 0
  fi
  echo "start-supabase: try ${try_number} of ${maximum_tries} failed." >&2
  if [ "$try_number" -eq "$maximum_tries" ]; then
    break
  fi
  # Step 2: remove whatever the failed try left running, so its ports are free again. Nothing is
  # kept: CI's database is rebuilt from the migrations and the seed on every start.
  npx supabase stop --no-backup || true
  # Step 3: wait longer each time (20 s, then 40 s), so jobs that failed together don't retry
  # together and hit the registry's limit again.
  sleep $((try_number * 20))
done

echo "start-supabase: Supabase didn't start after ${maximum_tries} tries." >&2
exit 1
