# Staging: load the seed personas

Written by S1-E1-02. Use it once after the first migrations reach staging, and again after a staging reset.

**Rule:** staging holds synthetic data only. Never copy production data or real people into it (S1-E1-01 acceptance criterion).

Supabase's GitHub integration applies `supabase/migrations/` to staging when `main` changes, but it doesn't run `supabase/seed.sql` on the staging project. So the personas are loaded by hand, once:

1. Check the migrations have reached staging: Supabase dashboard → project **ghemotoc-staging** → **Database** → **Migrations**. The newest `s1_e1_02_…` file should be listed.
2. Open **SQL Editor** → **New query**.
3. Open `supabase/seed.sql` from GitHub (the file on `main`), copy all of it and paste it into the editor.
4. Press **Run**. It should finish without errors and create 16 accounts.
5. Check: **Authentication** → **Users** lists 16 `@personas.test` accounts.

Every persona signs in with its email and the shared test password in `supabase/README.md`.

Staff work on staging uses the staff personas (`owner`, `admin`, `moderator`, `support`, `editor`): the `owner` persona already holds the owner role, so `bootstrap_first_owner()` refuses on staging and nobody makes a personal staff account there. That function is for production only (decided 18 Oct 2026).

**Running it twice** fails with "duplicate key", because the personas already exist. That's safe: nothing is changed. To start again, ask a developer to reset staging; never delete users by hand in production.

## Top-ups: when a later story changes the seed

Re-loading `supabase/seed.sql` on a staging project that already has the personas fails on duplicates, so a story that changes the seed in a way staging needs ships a **top-up** instead (decided 18 Oct 2026):

- It lives in `supabase/staging-topups/<story-id>.sql`, for example `S1-E3-01.sql`.
- It only adds or updates what the story changed (new columns on the personas, new seeded rows). It never creates accounts.
- It is safe to run twice: `insert … on conflict do nothing`, `update … where` the value is still missing, and so on.
- The pull request lists it under **By hand**.

To run one: SQL Editor → New query → paste the file from `main` → Run. Run the top-ups you haven't run yet in the order their stories merged. After a full staging reset, the seed alone is enough: it already holds everything the top-ups added.
