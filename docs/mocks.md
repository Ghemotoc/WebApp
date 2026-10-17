# Mocks still switched on

A story is not Done while its mock is still on for staging (CLAUDE.md rule 17).

| Mock | Replaces | Story that removes it | Flag on staging |
| --- | --- | --- | --- |
| No mocks are switched on for staging. Every screen and test runs against the real local Supabase (Docker); unit tests use small stand-ins inside the test files only | | | |
| Emails go to Mailpit (the local mail catcher) | the email provider, Brevo (decided 17 Oct 2026, 19:43) | Robert's SMTP set-up (S1-E2-01 by-hand list); on staging until then, Supabase's built-in sender, which only mails the project team | none |
| `PASSWORD_CHECK_STUB=1` in the end-to-end tests: the leaked-password check answers from a fixed list (`server/pages-functions-plugin.ts`) | Have I Been Pwned's range service | stays for tests only; staging and production use the real service through `functions/api/password-check.ts` | none |

## Stubs and stand-ins still in place (epic S1-E1, checked by S1-E1-QA)

These are not mocks of an outside service: they are the safe, simple version of a piece that a later story finishes. Each one fails safe (it refuses rather than allows).

| Stub | What it does today | Story that finishes it | On staging |
| --- | --- | --- | --- |
| `is_staff_session()` | true for any staff-role session, from the normal login | S1-E2-07b (Google Workspace sign-in) | same |
| `account_state()`: parental consent | under-16s are always `awaiting_parental_consent` (or `minor_not_admitted` while `adults_only` is on) | S1-E2-03 | same |
| `account_state()`: sanctions | no suspensions or bans are checked yet | S1-E10-06 | same |
| `account_state()`: age check | while `adults_only` is on, adults are active without a Yoti check | S1-E2-08 | same |
| Invites | four test codes seeded by `supabase/seed.sql`; no screen makes new ones yet | S1-E11-17 (admin screen and `admin_create_invite()`) | loaded with the seed (`docs/runbooks/staging-reset-and-seed.md`) |
| Signing in | e2e tests sign personas in from code (`e2e/support/personas.ts`); there is no sign-in screen | S1-E2-05 | no sign-in on staging yet |
| Legal texts | version 0.1 of the terms, privacy notice and guidelines are drafts, in English and in a Romanian draft translation, marked as such in the Legal centre | the lawyer's review, then a new version made with `scripts/build-legal-migration.ts` (S1-E14-01) | same |
| "After the invited test" labels | lines of the legal drafts that start only after the March test carry a label (`content/legal/after-the-invited-test.json`) | the version published when sign-up opens to the public | same |
| `reportable_type` | holds `profile` only | each user-content story adds its value (S1-E3-01 first) | same |
| ş and ţ on save | corrected as people type, in the shared text fields; not yet on the server | S1-E3-02 (zod schemas) | same |
