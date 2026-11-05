# Squashing the migrations into one baseline

Written by QA-4 (independent QA check, 5 Nov 2026, finding R2). Not done yet: this is the plan for
the first engineer, with the steps that keep staging working.

**Why not yet (CTO decision, 5 Nov 2026, QA-4).** Squashing rewrites about 245 migration files that
staging has already applied. Supabase's GitHub integration compares the files in
`supabase/migrations/` with the versions staging has recorded, so after a squash staging must be
told, by hand, which old versions are gone and that the new baseline is already applied
(`supabase migration repair`). That is a step on the staging project that no Claude Code session may
take (CLAUDE.md: migrations reach staging only through the integration) and that is hard to undo if
it goes wrong. Until then two things give most of the benefit with nothing to undo:
- `supabase/schema.sql` is the whole current schema, generated from the migrations (`npm run
  schema:gen`), and checked by `npm run schema:check`. Search it to see the live version of any
  function, table or policy instead of reading every migration.
- `npm run migrations:check` refuses a new migration dated before the newest one on main, and
  `npm run migration:new -- <name>` picks a version that passes (finding R1).

**When to do it.** Before production exists (a squash is simplest while only staging holds the
history), with the engineer and Robert both available, and with no other pull request open that
adds a migration.

**Steps.**
1. On a branch, with the local stack running: `npx supabase db reset`, then
   `npx supabase migration squash --local`. The CLI writes one file under the newest version.
2. Move the old files to `supabase/migrations-archive/` (kept in git for history; the CLI ignores
   that folder), run `npx supabase db reset`, `npx supabase test db`, `npm run types:check` and
   `npm run schema:check`. Nothing may change: the schema file is the proof.
3. Before merging, on staging (the engineer, from their own machine, signed in to the Supabase CLI):
   `npx supabase migration list --linked` to see what staging has recorded, then
   `npx supabase migration repair --status reverted <each old version>` for every version that is
   no longer a file. The squashed file keeps the newest version, which staging already has as
   applied, so it is not run again.
4. Merge. The integration finds nothing new to apply. Check the dashboard's Migrations page.
5. Seed top-ups (`supabase/staging-topups/`) are unaffected.

**If it goes wrong.** `migration repair --status applied <version>` puts a version back; the old
files are still in the archive folder and in git.
