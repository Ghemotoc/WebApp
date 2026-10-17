# ADR 0002: Sign-up is checked in one database trigger

- **Date:** 17 October 2026
- **Status:** Accepted (epic S1-E2 plan, approved by Robert, 17 Oct 2026, 19:43)

## Context
Sign-up must refuse some people and keep nothing about them: no invite while `invite_only` is on (S1-E2-01, S1-E11-17), under-13s and, while `adults_only` is on, under-18s (S1-E2-02), closed markets once sign-up opens to the public (S1-E2-10). It must also record which terms and privacy notice versions the person accepted (Q15) and create the profile whose `id` is the Supabase Auth user ID (architecture 1.6). A check that only runs in the browser can be skipped by calling Supabase Auth directly.

## Decision
The sign-up form sends its answers as Supabase sign-up data (`raw_user_meta_data`). One trigger on `auth.users`, `handle_new_auth_user()`, checks everything and creates the profile and the consent records in the same transaction as the account. Any refusal raises an error, so Postgres undoes the insert and nothing is kept. The form asks read-only questions first (`check_invite()`, the legal versions) so people see a plain message instead of Supabase's generic "Database error saving new user". Seed personas carry `seed_persona` in their app metadata, which only the server can write, and make their own profiles.

## Consequences
- Every rule lives in one SQL function, in migrations, tested with pgTAP (`supabase/tests/database/023`); S1-E2-02 and S1-E2-10 add their checks to the same trigger.
- No edge function or extra service is needed, and it works on the free Supabase plan.
- Supabase's error to the browser is generic, by design; the form's pre-checks carry the real explanations.
- Accounts can't be made by hand in the Supabase dashboard without the sign-up data; that is intended (people join through invites).
