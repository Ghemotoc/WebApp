# Runbooks

Step-by-step instructions for things that go wrong or happen rarely. Created by S1-E1-01 as a list; each runbook is written by the story or task named next to it. Until a runbook exists, ask before acting.

| Runbook (file to write) | What it covers | Source |
| --- | --- | --- |
| `releasing-to-production.md` | Create the production Supabase and Cloudflare Pages projects, add the `production` environment with Robert as required reviewer, set `PRODUCTION_ENABLED`, tag a release | S1-E1-01 (workflow), before the first real user |
| `deploy-and-rollback.md` | How staging and pull request previews build on Cloudflare Pages, pausing automatic deploys, rolling back to an earlier deployment | S1-E1-01 follow-up |
| `branch-ruleset.md` | The ruleset on `main` that requires the three CI checks and a pull request. Created by Robert; not enforced while the repository is private on GitHub's Free plan (decided 17 Oct 2026, S1-E1-QA). Write this runbook when the plan changes and the ruleset starts to apply | S1-E1-01 follow-up |
| [`supabase-github-integration.md`](supabase-github-integration.md) (written) | How migrations reach staging when main changes, what to do when one fails, never pushing from a session | S1-E1-02 |
| [`staging-reset-and-seed.md`](staging-reset-and-seed.md) (written) | Resetting staging and loading the synthetic seed; never copying production | S1-E1-02 |
| `restore.md` | Quarterly restore drill into a scratch project from Supabase backups and the nightly `pg_dump` | architecture.md 1.12, before real users |
| `incident-and-breach.md` | Who decides, the GDPR 72-hour notice to ANSPDCP (Art 33) and telling users (Art 34) | architecture.md 1.9, before real users |
| `key-rotation.md` | Rotating the Supabase keys, Edge Function secrets and Cloudflare tokens | architecture.md 1.9, before real users |
| `removal-order.md` | Terrorist content removal within one hour of an authority order, on-call alert and "Emergency disable" | S1-E10-09 |
| `safeguarding.md` | Same-day safeguarding cases, evidence packs and who to contact by country | S1-E10-10, S1-E10-13 |
| `data-requests-by-email.md` | Answering access, correction and deletion requests by hand within a month during the March test | decided 17 Oct 2026, 12:44 |
| `account-transfer.md` | Moving every account from Robert's name to the company in week 1 after registration | architecture.md 1.11 (Q34), `docs/accounts.md` |
| `renaming-the-product.md` | Changing the name and domain: `src/config/brand.ts` or the `VITE_BRAND_*` variables, the locale files, the `settings` table and Edge Function secrets | S1-E1-01 follow-up, before the name is bought |
