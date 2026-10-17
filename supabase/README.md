# supabase/

The database side of the app: schema changes, database tests, seed data and (later) edge functions. Built by S1-E1-01 (folder) and S1-E1-02 (database baseline).

- `config.toml`: local Supabase settings. Supabase's GitHub integration applies `migrations/` to the staging project when `main` changes; never push migrations from a session (CLAUDE.md).
- `migrations/`: every schema change, oldest first (`npx supabase migration new <name>`). The only way the database changes (rule 3).
- `tests/database/`: pgTAP tests, run with `npx supabase test db`.
- `seed.sql`: the synthetic seed personas. Never real data.
- `functions/`: edge functions (Deno), the only code that may hold secrets. None yet.

## Conventions every migration follows

1. **RLS on every table, with at least one policy.** Test `001` fails otherwise.
2. **Every table declares its kind** in its table comment, on the first line:
   `kind: identity | user_content | user_action | staff | platform`, and for user content `; reportable: <reportable_type value>`.
   - `user_content`, `user_action` and `staff` tables need `user_id uuid not null references public.profiles (id)` (rule 15). Other people in a row get role names such as `reporter_user_id`.
   - `user_content` tables add their value to the `reportable_type` enum in the same migration (rule 6).
   - Test `002` checks all of this.
3. **Every policy has a comment** saying who it allows and why, and **an allowed and a denied test**. A test's description contains `allowed: <policy_name>` or `denied: <policy_name>`; `scripts/check-policy-tests.ts` (run by `npm test`) fails when either is missing. Policy names start with the table name, so they are unique.
4. **Functions** use `set search_path = ''` and name every schema. Functions that could reveal other people's data are not executable by `anon` or `authenticated`.
5. After a migration: `npm run types:gen`, and commit `src/lib/database.types.ts`. CI's `types:check` fails if you forget.

## Functions the app calls

| Function | Does | Who may call it | Story |
| --- | --- | --- | --- |
| `set_my_locale(new_locale)` | saves `ro` or `en` as the caller's own interface language (`profiles.locale`) | any signed-in person, read-only accounts included; never signed-out visitors | S1-E1-04 |
| `log_staff_action(...)` | writes one audit log row for the signed-in staff member | staff sessions only | S1-E1-02 |

Why `set_my_locale()` and not an update policy on `profiles`: a policy would let a person change every column of their own row through the API, their year of birth too. The function changes one column. Test: `tests/database/014-profile-locale.test.sql`.

## The account gate (architecture 1.7.8)

| Function | Answers | Filled in later by |
| --- | --- | --- |
| `age_band()` | the signed-in user's age group (`under_13`, `13_to_15`, `16_to_17`, `18_plus`, `unknown`) | S1-E2-02 (sign-up), S1-E2-08 (Yoti) |
| `is_active_member()` | may the signed-in user publish, comment, post or message | S1-E2-03 (consent), S1-E10-06 (sanctions) |
| `account_state(user_id)` | why not (internal; clients can't call it) | same |
| `is_staff(role)` | does the signed-in user hold that staff role (any role when empty) | S1-E2-07a (role hierarchy, permissions) |
| `is_staff_session()` | may this session use staff powers (March: any staff role) | S1-E2-07b (Google Workspace sign-in) |

While the `adults_only` flag is on (the March test), under-18s are `minor_not_admitted` and adults are active once their email is confirmed, without the age check.

## Seed personas

Every persona signs in with `<persona>@personas.test` and the shared test password **`Persona-Test-2026!`** (synthetic accounts only; the same locally and on staging, decided 17 Oct 2026). Years of birth are worked out from the current year.

| ID (ends in) | Persona | Age group now | State now | State added later by |
| --- | --- | --- | --- | --- |
| …0001 | adult_writer | 18 plus | active | |
| …0002 | teen_17 | 16 to 17 | not admitted while `adults_only` is on | |
| …0003 | kid_14_ok | 13 to 15 | not admitted / waiting for a parent | consent agreed: S1-E2-03 |
| …0004 | kid_14_waiting | 13 to 15 | not admitted / waiting for a parent | consent pending: S1-E2-03 |
| …0005 | pending_check | 18 plus | active in March; age check pending after | 14-day clean-up: S1-E2-08 |
| …0006 | failed_check | 18 plus | read-only, age check failed | manual check: S1-E2-08b |
| …0007 | teacher | 18 plus | active | Teacher badge: S1-E2-11 |
| …0008 to …0012 | owner, admin, moderator, support, editor | 18 plus | active, with their staff role | Google sessions: S1-E2-07b |
| …0013, …0014 | suspended_user, banned_user | 18 plus | active | sanctions: S1-E10-06 |
| …0015, …0016 | blocker, blocked | 18 plus, 16 to 17 | active, not admitted | the block: S1-E5-05 |

Full IDs are `00000000-0000-4000-8000-0000000000NN`. Tests sign a persona in by setting the role and the JWT claims, as in `tests/database/010-profiles.test.sql`.
