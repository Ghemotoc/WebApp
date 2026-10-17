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

**Running it twice** fails with "duplicate key", because the personas already exist. That's safe: nothing is changed. To start again, ask a developer to reset staging; never delete users by hand in production.
