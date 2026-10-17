# Supabase GitHub integration: how migrations reach staging

Written by S1-E1-02.

**How it works.** The staging Supabase project (**ghemotoc-staging**, West EU, Ireland) is connected to this repository through Supabase's GitHub integration (connected by Robert on 17 Oct 2026, ADR 0001). When a pull request merges into `main`, Supabase applies every new file in `supabase/migrations/` to staging, oldest first. Nothing else changes the staging schema: no dashboard edits (CLAUDE.md rule 3), and no Claude Code session ever pushes migrations.

**Before merging** a pull request with a migration, CI has already:
- started a fresh local database from all migrations (`npx supabase db start`);
- run the database tests (`npx supabase test db`);
- checked the generated types (`npm run types:check`).

**If a migration fails on staging** (Supabase dashboard → project → **Database** → **Migrations** shows it as failed, or Supabase emails a failure):
1. Don't edit the staging database by hand.
2. Open an issue naming the migration file and paste Supabase's error message.
3. The fix is a new migration in a new pull request (never edit a migration that already ran on staging).

**Seed data** is not applied by the integration: see `staging-reset-and-seed.md`.
