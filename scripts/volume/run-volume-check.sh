#!/usr/bin/env bash
# The volume check: copies the local database's schema into a throwaway database, fills it with
# 50,000 synthetic accounts and times the main read paths against their budgets (independent QA
# check, 5 Nov 2026, findings S1 and S2; fix bundle QA-2).
#
# Who runs it: a developer, by hand, after a change to a list, search or card function:
#   npx supabase start && bash scripts/volume/run-volume-check.sh
# It is not part of `npm run checks`: the seed takes several minutes. What it calls next:
# pg_dump of the local schema, scripts/volume/seed-volume.sql, then
# scripts/volume/time-read-paths.sql, which ends with an error when a path is over budget.
# It touches only the database qa_volume on the local Supabase stack, which it drops first.
set -euo pipefail

# Step 1: where the local Supabase database is (the CLI's defaults).
export PGHOST="${PGHOST:-127.0.0.1}" PGPORT="${PGPORT:-54322}" PGUSER="${PGUSER:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"
here="$(cd "$(dirname "$0")" && pwd)"

# Step 2: a fresh throwaway database with the same schema, grants and reference rows as the
# local one (the local seed personas come along; they are synthetic too). A few objects can't be
# copied into a second database (pg_cron lives only in "postgres"); those errors are expected and
# hidden, and the timings below fail loudly if anything they need is missing.
psql -d postgres -qc 'drop database if exists qa_volume' -c 'create database qa_volume'
# pg_dump runs inside the Supabase database container, so its version always matches the server's
# (a pg_dump older than the server refuses to run).
project_id="$(sed -n 's/^project_id = "\(.*\)"/\1/p' "$here/../../supabase/config.toml")"
container="${SUPABASE_DB_CONTAINER:-supabase_db_${project_id}}"
docker exec "$container" pg_dump -U postgres --no-owner -d postgres \
  | psql -q -d qa_volume > /dev/null 2>&1 || true

# Step 3: the volume, then the timings.
echo 'Seeding 50,000 accounts (a few minutes)…'
psql -q -d qa_volume -v ON_ERROR_STOP=1 -f "$here/seed-volume.sql"
psql -d qa_volume -v ON_ERROR_STOP=1 -f "$here/time-read-paths.sql"
