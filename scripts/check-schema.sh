#!/usr/bin/env bash
# The current-schema file behind `npm run schema:gen` and `npm run schema:check` (QA-4, finding R2).
#
# Why: 190 SQL functions are redefined in several migrations (one 21 times), so the live version
# of a function was only knowable by reading every file. supabase/schema.sql is the whole public
# schema as the migrations leave it, generated from the local database: search it to see what is
# live now. It is never applied anywhere; migrations stay the only way the database changes
# (CLAUDE.md rule 3).
# Who runs it: you after a migration (`npm run schema:gen`, then commit supabase/schema.sql), and
# `npm run checks` and CI's database job (`npm run schema:check`), which fail when it is stale.
# What it calls: `supabase db dump --local` (pg_dump in the Supabase database container, so its
# version matches the server). Needs the local database (`npx supabase start`) with every
# migration applied (`npx supabase db reset`).
set -euo pipefail

mode="${1:-check}"
committed_file="supabase/schema.sql"
fresh_file="$(mktemp)"
# Remove the temporary file however the script ends.
trap 'rm -f "$fresh_file"' EXIT

# Step 1: dump the public schema of the running local database (no data).
if ! npx supabase db dump --local --schema public --file "$fresh_file" > /dev/null 2>&1; then
  echo "schema:$mode failed: could not read the local database. Start it with: npx supabase start" >&2
  exit 1
fi

# Step 2: gen writes the file; check compares it with the committed one.
if [ "$mode" = "gen" ]; then
  cp "$fresh_file" "$committed_file"
  echo "schema:gen wrote $committed_file."
  exit 0
fi
if ! diff -q "$committed_file" "$fresh_file" > /dev/null; then
  diff -u "$committed_file" "$fresh_file" | head -60 || true
  echo "schema:check failed: $committed_file is out of date. Run: npx supabase db reset && npm run schema:gen, then commit it." >&2
  exit 1
fi
echo "schema:check passed: $committed_file matches the database."
