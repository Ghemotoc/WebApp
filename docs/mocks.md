# Mocks still switched on

A story is not Done while its mock is still on for staging (CLAUDE.md rule 17).

| Mock | Replaces | Story that removes it | Flag on staging |
| --- | --- | --- | --- |
| No mocks are switched on. Every screen and test in epic S1-E1 runs against the real local Supabase (Docker); unit tests use small stand-ins inside the test files only | | | |

## Stubs and stand-ins still in place (epic S1-E1, checked by S1-E1-QA)

These are not mocks of an outside service: they are the safe, simple version of a piece that a later story finishes. Each one fails safe (it refuses rather than allows).

| Stub | What it does today | Story that finishes it | On staging |
| --- | --- | --- | --- |
| `is_staff_session()` | true for any staff-role session, from the normal login | S1-E2-07b (Google Workspace sign-in) | same |
| `account_state()`: parental consent | under-16s are always `awaiting_parental_consent` (or `minor_not_admitted` while `adults_only` is on) | S1-E2-03 | same |
| `account_state()`: sanctions | no suspensions or bans are checked yet | S1-E10-06 | same |
| `account_state()`: age check | while `adults_only` is on, adults are active without a Yoti check | S1-E2-08 | same |
| `profiles` rows | created by `supabase/seed.sql` only; sign-up doesn't create one yet | S1-E2-01 (the sign-up trigger) | personas loaded by hand (`docs/runbooks/staging-reset-and-seed.md`) |
| Signing in | e2e tests sign personas in from code (`e2e/support/personas.ts`); there is no sign-in screen | S1-E2-05 | no sign-in on staging yet |
| `reportable_type` | holds `profile` only | each user-content story adds its value (S1-E3-01 first) | same |
| ş and ţ on save | corrected as people type, in the shared text fields; not yet on the server | S1-E3-02 (zod schemas) | same |
