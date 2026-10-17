> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E1 Foundations and delivery pipeline

**Back end and build order:** section 1.7, wave 0; pieces B01 to B04 and B12.

Goal: a safe base that every other story builds on. Nothing user-facing ships before E1-01 and E1-02.

##### S1-E1-01 Repository, environments and CI skeleton

As the founder, I want one GitHub repository with local, staging and production environments and an automatic test pipeline so that every change is checked before real users see it.

- **Priority:** Must · **Size:** M · **Depends on:** none
- **Acceptance criteria:**
  - Given a pull request, when it is opened, then GitHub Actions runs lint, type check, unit tests, database tests, the i18n key check and an accessibility smoke test, and blocks the merge if any fail.
  - Given a merge to `main`, when CI passes, then staging deploys automatically.
  - Given a tagged release, when the founder approves it in GitHub, then production deploys; production never deploys from an untagged commit.
  - Given the staging database, when it is seeded, then it holds synthetic data only and never a copy of production.
  - Given the backlog, when stories are tracked, then each story ID is one GitHub Issue in the organisation's repository (decided 16 Oct 2026, late evening, Q39).
- **Legal and compliance:** the accounts are opened in Robert's name now and moved to the company the week it is registered, following the transfer plan in section 1.11 (decided 16 Oct 2026, late evening, Q34), so the IP sits with the company (proposal: Robert's Q3 and Q104 answers left the owner open).

##### S1-E1-02 Database baseline with deny-by-default row-level security

As the founder, I want every table protected by row-level security from the first migration so that a bug in the app can't expose another user's data.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E1-01
- **Updated:** 16 Oct 2026 (late evening): the audit log, the account gate skeleton, the user ID rule, the types check and the seed personas move here so every later story can build on them (section 1.7). Watch the size; split off the seed personas as 02b if it grows past M.
- **Acceptance criteria:**
  - Given a new migration, when it creates a table in the `public` schema without RLS switched on and at least one policy, then CI fails.
  - Given a signed-out client, when it queries any table directly, then it receives only rows a public-read policy allows.
  - Given the database test suite, when it runs, then every policy has at least one "allowed" and one "denied" test.
  - Given the client app, when its bundle is scanned in CI, then it contains no service role key.
  - Given the first migrations, when they run, then they create the append-only `audit_log` (no update or delete for any role, the owner included) with `log_staff_action()`, the `reportable_type` enum, the `feature_flags` and `settings` tables and the skeleton of the account gate (`account_state()`, `is_active_member()`, `age_band()`, `is_staff()`, `has_aal2()`) that later stories fill in (section 1.7.8).
  - Given a new table for user content or user actions, when its migration is checked in CI, then it fails unless the table has a not-null `user_id` referencing `profiles.id` (section 1.6).
  - Given a schema change, when CI runs, then the TypeScript types are regenerated from the database and the build fails if they differ from the committed file (`npm run types:check`).
  - Given a fresh local or staging database, when it is seeded, then the seed personas in section 1.7.2 exist, with years of birth worked out from the current year.
- **Legal and compliance:** GDPR Art 25 (privacy by design) and Art 32 (security of processing).

##### S1-E1-03 Design tokens, themes and app shell

As a reader, I want a calm, consistent interface with a light and a night mode so that reading is comfortable at any hour.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E1-01
- **Acceptance criteria:**
  - Given the design direction, when tokens are defined, then they use paper #FAF8F5, purple #481C5F and #672786, ink #26142E, body #5C4965, gold #E6C24C never as small text (#815E18 when gold text is needed) and a darkened meta text colour that reaches at least 4.5:1 on paper.
  - Given any text and background token pair, when the contrast test runs in CI, then it meets WCAG 2.2 AA.
  - Given a user with "reduce motion" switched on, when the interface animates, then fades are removed.
  - Given night mode, when it is switched on, then every screen uses the dark tokens with the same contrast rules.
- **Legal and compliance:** WCAG 2.2 AA. Corner radius and shadow style are a proposal (4px and hairlines); confirm in iteration 1.

##### S1-E1-04 Romanian and English interface

As a Romanian or English speaker, I want the whole interface in my language so that I can use the platform comfortably.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E1-01
- **Acceptance criteria:**
  - Given a first visit with the device set to Romanian, when the app loads, then the interface is in Romanian; any other device language falls back to English.
  - Given a signed-in user, when they switch language in settings, then the choice is saved to their account and applies on every device.
  - Given a pull request, when a string key exists in one locale file and not the other, then CI fails.
  - Given Romanian text, when it is stored or shown, then the comma-below letters ș and ț are used, and cedilla forms (ş, ţ) are normalised on input.
  - Given the top bar and the footer, when anyone wants another language, then both offer a language drop-down (not a toggle) listing English and Română, on the website and in the app (decided 16 Oct 2026, late evening, Q11).
- **Legal and compliance:** terms, privacy notice and statements of reasons must be available in Romanian for Romanian users.

##### S1-E1-05 Error, offline and maintenance states

As any user, I want clear messages when something goes wrong so that I know what to do next.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E1-03, S1-E1-04
- **Acceptance criteria:**
  - Given a missing page, when a user opens it, then they see a 404 page with links to home and search.
  - Given the network drops, when the user is in the app, then an offline banner appears and unsaved editor text is kept locally.
  - Given maintenance mode switched on in admin, when a user opens the app, then they see a maintenance page while staff can still sign in.
  - Given an unexpected error, when it is reported to error tracking, then no email, IP address or user content is included.
- **Legal and compliance:** GDPR data minimisation in logs.

##### S1-E1-06 Move from Lovable's database to our own Supabase project

> **No longer needed (17 Oct 2026, 11:20).** Robert decided on our own Supabase project in the EU (West EU, Ireland, eu-west-1) from day one, with Claude Code building first. This replaces Q37, so there is no Lovable database to move from. The story stays for the record as Won't; do not build it.

As the founder, I want the app moved from Lovable's managed database to our own company-owned Supabase project in the EU so that we own the data and can leave the tool at any time.

- **Priority:** Won't (replaced by the 17 Oct 2026, 11:20 decision; was Must) · **Size:** M · **Depends on:** S1-E1-01, S1-E1-02
- **Added:** 16 Oct 2026, late evening (Q37: "first with Lovable and then move over"). **Replaced:** 17 Oct 2026, 11:20.
- **Acceptance criteria:**
  - Given the Lovable phase, when anyone changes the database, then the change is a migration file in `supabase/migrations/` in GitHub, never an edit in Lovable's or Supabase's dashboard, so the whole schema can be rebuilt from the repository.
  - Given our own Supabase project in an EU region, when the migrations run on it from empty, then the schema, row-level security policies, functions and seed personas match the Lovable database and every pgTAP test passes.
  - Given the move, when it happens, then Auth settings, storage buckets, edge function secrets and scheduled jobs are set up on the new project and the app points to it through environment variables only.
  - Given real accounts already exist (only if the move happens after the first real user), when they are moved, then users, their user IDs, stories and files arrive unchanged, the move is rehearsed on a copy first and users are told in advance.
  - Given the move is done, when it is checked, then the Lovable database is emptied and closed and the processor list is updated.
- **Legal and compliance:** proposal: move before the first real user, so no minors' data ever sits with Lovable and no transfer of real data is needed. If real data moves, Lovable needs a data processing agreement for the time it held it and the move goes in the record of processing. When to move was **OPEN** (section 5, question 9); closed on 17 Oct 2026 by the own-Supabase-from-day-one decision.

---
