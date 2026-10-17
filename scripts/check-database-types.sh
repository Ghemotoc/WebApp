#!/usr/bin/env bash
# The generated-types check behind `npm run types:check` (story S1-E1-01; CLAUDE.md rule 14).
#
# Who runs it: you after a migration, and CI on every pull request (the "database" job).
# What it does: regenerates src/lib/database.types.ts from the local database and fails if the
# result differs from the committed file. That catches a migration whose types were not
# regenerated, and a hand-edited types file (types that mirror the database are never written by hand).
# Needs: the local database running (`npx supabase start` or `npx supabase db start`).
set -euo pipefail

committed_file="src/lib/database.types.ts"
fresh_file="$(mktemp)"
# Remove the temporary file however the script ends.
trap 'rm -f "$fresh_file"' EXIT

# Step 1: generate the types from the running local database into a temporary file.
if ! npx supabase gen types typescript --local --schema public > "$fresh_file"; then
  echo "types:check failed: could not read the local database. Start it with: npx supabase start" >&2
  exit 1
fi

# Step 2: format it the same way `npm run types:gen` does, so only real differences count.
npx prettier --stdin-filepath "$committed_file" < "$fresh_file" > "$fresh_file.formatted"
mv "$fresh_file.formatted" "$fresh_file"

# Step 3: compare with the committed file.
if ! diff -u "$committed_file" "$fresh_file"; then
  echo "types:check failed: $committed_file is out of date. Run: npm run types:gen, then commit it." >&2
  exit 1
fi
echo "types:check passed: $committed_file matches the database."
