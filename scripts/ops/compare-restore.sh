#!/usr/bin/env bash
# Checks a restored database against the one it came from (QA-8, finding H1; architecture 1.12,
# "a restore drill every quarter into a scratch project").
#
# Why: a backup is only proven once it has been restored and the restored copy holds the same
# data. This compares, table by table, the number of rows in every table of the public schema and
# in auth.users, and prints the first table that differs.
# Who runs it: the person doing the restore drill (docs/runbooks/restore.md), from their own
# machine. It only reads; it never writes to either database.
# Inputs: SOURCE_URL and TARGET_URL, two Postgres connection strings, for example the staging
#   project and the scratch project the backup went into. Neither is ever printed.
# Exit code: 0 when every table matches, 1 when one differs or a database can't be read.
set -euo pipefail

# Step 1: both addresses are needed; refuse to start without them.
if [ -z "${SOURCE_URL:-}" ] || [ -z "${TARGET_URL:-}" ]; then
  echo "compare-restore: set SOURCE_URL and TARGET_URL (Postgres connection strings)." >&2
  exit 1
fi

# The query: one line per table, "schema.table|rows", sorted so the two lists line up.
# It counts with a real count(*) (not the planner's estimate), so it is exact.
count_query=$(cat <<'SQL'
do $$
declare
  listed record;
  row_count bigint;
begin
  for listed in
    select table_schema, table_name from information_schema.tables
    where table_type = 'BASE TABLE'
      and (table_schema = 'public' or (table_schema = 'auth' and table_name = 'users'))
    order by 1, 2
  loop
    execute format('select count(*) from %I.%I', listed.table_schema, listed.table_name) into row_count;
    raise notice '%|%', listed.table_schema || '.' || listed.table_name, row_count;
  end loop;
end;
$$;
SQL
)

# Step 2: read both lists. The counts arrive as notices, so they are taken from stderr.
source_counts="$(mktemp)"
target_counts="$(mktemp)"
trap 'rm -f "$source_counts" "$target_counts"' EXIT
read_counts() {
  psql "$1" -X -q -v ON_ERROR_STOP=1 -c "$count_query" 2>&1 >/dev/null | sed -n 's/^NOTICE:  //p'
}
if ! read_counts "$SOURCE_URL" > "$source_counts"; then
  echo "compare-restore: could not read the source database." >&2
  exit 1
fi
if ! read_counts "$TARGET_URL" > "$target_counts"; then
  echo "compare-restore: could not read the restored database." >&2
  exit 1
fi

# Step 3: compare. Any difference (a missing table or a different count) fails the drill.
tables=$(wc -l < "$source_counts" | tr -d ' ')
if ! diff -u "$source_counts" "$target_counts" > /dev/null; then
  echo "compare-restore: the restored copy differs (source on the left, restored on the right):" >&2
  diff "$source_counts" "$target_counts" | head -20 >&2 || true
  exit 1
fi
echo "compare-restore passed: all $tables tables hold the same number of rows."
