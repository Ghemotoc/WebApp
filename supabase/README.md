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
4. **Table grants are explicit.** The hosted projects grant nothing on a new table to `anon` or `authenticated`, and `config.toml` sets `auto_expose_new_tables = false` so local matches. Grant exactly the role and command each policy names, for example:
   ```sql
   grant select on public.stories to anon, authenticated;  -- stories_select_public
   ```
   Never grant `truncate`, `references`, `trigger` or `maintain` (RLS doesn't cover them). Test `003` fails when a policy lacks its grant, a grant lacks a policy, or a new table starts with any privileges. Without the grant the API answers 401 "permission denied for table".
5. **Functions** use `set search_path = ''` and name every schema. Functions that could reveal other people's data are not executable by `anon` or `authenticated`. A function the app calls is granted by name (`grant execute on function … to authenticated`), never left to a default.
6. After a migration: `npm run types:gen`, and commit `src/lib/database.types.ts`. CI's `types:check` fails if you forget.

## Functions the app calls

| Function | Does | Who may call it | Story |
| --- | --- | --- | --- |
| `set_my_locale(new_locale)` | saves `ro` or `en` as the caller's own interface language (`profiles.locale`) | any signed-in person, read-only accounts included; never signed-out visitors | S1-E1-04 |
| `log_staff_action(...)` | writes one audit log row for the signed-in staff member | staff sessions only | S1-E1-02 |
| `check_invite(code)` | answers `valid`, `ended` or `unknown` for a platform invite code, never the invite itself | anyone, signed out included (the sign-up form) | S1-E2-01 |
| `sign_up_age_outcome(birth_year, birth_month)` | what sign-up says about a year (and month): `ok`, `year_needed`, `month_needed`, `under_13` or `adults_only`; stores nothing | anyone, signed out included (the sign-up form) | S1-E2-02 |
| `check_handle(candidate)` | whether a username is allowed for the caller: `ok`, `too_short`, `too_long`, `invisible_characters`, `spaces`, `looks_like_staff`, `reserved`, `not_allowed` or `taken`; never says who has a name | any signed-in person (setup and Settings) | S1-E2-04 |
| `check_pen_name(candidate)` | the same for a pen name (no `taken`: pen names needn't be unique) | any signed-in person | S1-E2-04 |
| `set_my_handle(new_handle)`, `set_my_pen_name(new_pen_name)` | save the caller's own name, or answer why not (also `too_soon` within 30 days of the last change; the first choice doesn't count); the old name goes to the audit log | any signed-in person with a live profile | S1-E2-04 |
| `admin_approve_username(target_user_id, name_kind, approved_name, reason_given)` | a moderator approves one exact name the word checks refused by mistake; logged | owner, admin and moderator with a staff session | S1-E2-04 (button in S1-E11-02) |
| `sign_in_pause_until(email_hash)`, `record_sign_in_failure(email_hash)` | the log-in pause: when it ends, and noting a wrong try (5 in 15 minutes pause logging in; both are settings). They take a SHA-256 hash of the email, never the email, and answer the same for any address | anyone, signed out included (the log-in screen) | S1-E2-05 |
| `clear_my_sign_in_failures()` | forgets the caller's wrong tries after a log-in or a new password | any signed-in person | S1-E2-05 |
| `list_my_sessions()`, `end_my_session(target_session_id)` | the caller's own devices from Supabase's `auth.sessions` (browser, start, last active, this device; never the IP), and logging one out | any signed-in person, own sessions only | S1-E2-05 |
| `staff_may(area, access)` | may the caller use this admin area (`view` or `act`): role and permission from `staff_role_areas` (architecture 1.8.3) AND `is_staff_session()`. Every staff policy and `admin_*` function uses it | any signed-in person (answers about themselves) | S1-E2-07a |
| `admin_grant_role()`, `admin_remove_role()`, `admin_set_permission()` | change someone else's staff role or permission, with a reason; logged. Owner: any role; admin: moderator, support, content editor; never your own; never the last owner | owner and admin in a staff session | S1-E2-07a |
| `admin_list_staff()`, `admin_user_id_for_handle(handle)` | the staff list with roles and permissions; an account's user ID by username (no longer used by the screen since S1-E11-01b) | owner and admin in a staff session | S1-E2-07a |
| `admin_find_accounts(text)`, `admin_reveal_email(user_id)` | existing accounts by username start, pen name or whole email (email masked; an email match logged as `sensitive_read.account_found_by_email`); one account's whole email, logged as `sensitive_read.email_revealed` | owner and admin in a staff session | S1-E11-01b |
| `bootstrap_first_owner(user_id)` | makes the first owner, once, on a database without the seed (production) | only from the SQL editor, never through the API | S1-E2-07a |
| `sign_up_market_outcome(country_code, birth_year, birth_month)` | what sign-up says about a country and age: `ok`, `market_closed` or `under_market_age`; always `ok` while `invite_only` and `adults_only` are both on (Q6) | anyone, signed out included (the sign-up form) | S1-E2-10 |
| `my_legal_documents_to_accept()` | the caller's own legal documents waiting for acceptance after an important change | any signed-in person | S1-E14-01 |
| `report_client_error(error_name, error_message, route_path, app_version, browser_family)` | stores one browser error in `client_errors` after trimming and scrubbing it again (no emails, tokens, IDs, quoted text, long numbers, query strings); answers the row's ID, or null over the shared limit (`client_errors_per_minute`, 60) | anyone, signed out included (the app's error reporter) | S1-E1-05 |
| `admin_list_client_errors(since, max_rows)` | the newest browser errors (default: the last 7 days, 200 rows) | owner and admin in a staff session | S1-E1-05 |
| `accept_current_legal_versions(document_slugs, reading_language)` | records the caller's acceptance of the current versions, in the language they read | any signed-in person, at any age (16 and 17-year-olds without a parent) | S1-E14-01 |

Why `set_my_locale()` and not an update policy on `profiles`: a policy would let a person change every column of their own row through the API, their year of birth too. The function changes one column. Test: `tests/database/014-profile-locale.test.sql`.

## The account gate (architecture 1.7.8)

| Function | Answers | Filled in later by |
| --- | --- | --- |
| `age_band()` | the signed-in user's age group (`under_13`, `13_to_15`, `16_to_17`, `18_plus`, `unknown`) | S1-E2-02 (sign-up), S1-E2-08 (Yoti) |
| `is_active_member()` | may the signed-in user publish, comment, post or message; false until a new important version of the terms or privacy notice is accepted (`legal_acceptance_required`, S1-E14-01) | S1-E2-03 (consent), S1-E10-06 (sanctions) |
| `account_state(user_id)` | why not (internal; clients can't call it) | same |
| `is_staff(role)` | does the signed-in user hold that staff role (any role when empty) | S1-E2-07a (role hierarchy, permissions) |
| `is_staff_session()` | may this session use staff powers (March: any staff role) | S1-E2-07b (Google Workspace sign-in) |

While the `adults_only` flag is on (the March test), under-18s are `minor_not_admitted` and adults are active once their email is confirmed and a username chosen (`handle_missing` until then, S1-E2-04), without the age check.

## Country and markets (S1-E2-10)

- **`markets`** lists each country: open or not, its minimum age (16 in Australia, Q19) and its languages (BCP 47). Romania is open; GB, IE, US, CA, AU and NZ are closed until their legal check. Anyone may read it; it changes by migration until S1-E11-05.
- **`profiles.country_code`** is the two-letter code of the connection at sign-up, never asked and never the IP address.
- **The token:** the sign-up form gets `{ country, token }` from our Pages Function; the trigger trusts the country only when `verified_signup_country()` finds a valid HMAC-SHA256 signature made with the Vault secret `signup_context_secret` (the same value as Cloudflare's `SIGNUP_CONTEXT_SECRET`) and the token is at most 10 minutes old. Without the secret, every country counts as unknown.
- **The rules:** while `invite_only` and `adults_only` are both on, a valid invite admits any country, unknown included (Q6b, Q6c). Once sign-up is public, a closed or unknown country is refused and the form shows `/not-open`; an under-16 in a 16-and-over market is refused.

## Error log and maintenance mode (S1-E1-05)

- **Error log.** `client_errors` keeps what broke in a browser, never who: the error's name, a scrubbed message, the route pattern (`/join/:code`), the app version, the browser family and the time. It has no `user_id` on purpose. Rows arrive only through `report_client_error()` and are deleted after 30 days by the pg_cron job `purge-old-client-errors` (03:17 UTC every night; `client_errors_keep_days`, a proposal). Owner and admin read it with `select * from public.admin_list_client_errors();` (or the table, in the SQL editor) until the admin site (S1-E11-01) gives it a screen. This migration also switches on pg_cron (`create extension if not exists pg_cron`).
- **Maintenance mode.** Until the settings screen (S1-E11-03), switch it in the SQL editor:

  ```sql
  update public.feature_flags set is_enabled = true where key = 'maintenance_mode';   -- on
  update public.feature_flags set is_enabled = false where key = 'maintenance_mode';  -- off
  ```

  Open pages notice within a minute. Everyone except a staff session sees the maintenance page; log in, the password pages and the Legal centre stay open, so staff can still sign in. It is a notice, not a lock: the database's rules don't change while it is on.

## Staff roles (S1-E2-07a)

- **Roles and areas:** `staff_role_areas` holds architecture 1.8.3 row by row (area, role, `view` or `act`, and the permission a row needs). `staff_permissions` holds who has `safeguarding`, `teacher_checks` or `on_call`. Member roles are not stored: every account is a "user", and `space_moderator` will belong to space membership (S1-E8-07).
- **Website CMS and interface text** are owner and admin only, so the content editor role has no area for now; whether to keep it is OPEN (decided 17 Oct 2026, 19:19).
- **One check:** `staff_may()` combines the role, the permission and `is_staff_session()`. Every earlier staff policy now uses it (same names, same reach), so S1-E2-07b only changes `is_staff_session()`.
- **Staff accounts are read-only as members:** `account_state()` answers `staff_account` for anyone with a staff role (decided 17 Oct 2026, 19:43, Q14a). Staff keep a separate writer account if they write.
- **The first owner:** only for production, or any database without the seed. After signing up there, run `select public.bootstrap_first_owner('<user id>');` in the SQL editor; it refuses once an owner exists. **Not on staging or locally:** the seed already gives the `owner` persona the owner role, so the function refuses there. **Personal staff accounts on staging:** Robert's own staging account, on the staff Google Workspace domain (`STAFF_EMAIL_DOMAIN`), gets the owner role from the `owner` persona at /staff/roles, the same way any staff role is granted there (Robert, 18 Oct 2026).

## The admin shell (S1-E11-01)

- **Sessions end after 12 hours** (a proposal, decided 23 Oct 2026): `is_staff_session()` now also reads the session's start from Supabase's own `auth.sessions` (through the token's `session_id`) and refuses once it is older than the setting `staff_session_hours`. Signing in again starts a new session. A token without a `session_id` (only the forged claims of the database tests) is not time-limited.
- **A fresh sign-in for role changes** (decided 23 Oct 2026): `staff_signed_in_recently()` reads the newest sign-in time from the token's `amr` claim and compares it with `staff_fresh_sign_in_minutes` (15). `require_role_change_allowed()` refuses with SQLSTATE 28000 ("Sign in again") when it is older; the roles page shows the link. A refreshed token keeps the original sign-in time, so only a new sign-in counts. Database tests that change roles put a fresh `amr` in their claims.
- **The menu:** `my_staff_areas()` returns the areas the caller's roles allow (architecture 1.8.3); the app shows only those that have a page. The server still refuses on its own.
- **Sensitive reads:** `log_sensitive_read(kind, table, row, user)` with the kinds architecture 1.8.3 lists; later screens call it before showing the thing.
- **Search and export:** `admin_search_audit_log()` (one page of up to 100, usernames and an 8-character target ID, never a full ID) and `admin_export_audit_log()` (up to 10,000 rows, logged as `audit_log.exported` with the filters), both owner and admin only.

## Invite links (S1-E11-17)

- **Making one:** `admin_create_invite(admits, valid_days, private_note)` (owner and admin): 1 to 50 people, 1 to 90 days, a note of at most 80 characters with no "@". It returns the code once; the table keeps only its SHA-256 hash, so nobody can read a code back. The screen builds the link from the brand config: `<site>/join/<code>`.
- **The list:** `admin_list_invites()` gives the note, uses, expiry, status (active, used_up, expired, revoked) and the maker's username. An invite never records who used it.
- **Revoking:** `admin_revoke_invite(id, reason)`; a second revoke changes nothing.
- **The last place:** `use_platform_invite()` (S1-E2-01) is still one conditional UPDATE inside the sign-up transaction, so two sign-ups at the same moment can't both take it; it now takes the new account's user ID and writes `invite.redeemed` with that account as the actor (its user ID only, never its email) and the invite as the target; when that was the last place it adds `invite.used_up` with the system as the actor (CTO, 24 Oct 2026: never on behalf of the admin).
- **System rows in the audit log:** `audit_log.actor` is `person` (user_id acted) or `system` (the platform acted on its own, user_id empty). The constraint `audit_log_actor_matches_user_id` allows an empty user_id only on system rows; test 002 checks it. The Audit log screen shows "System" for them, and a short user ID for an account without a username yet.
- **Test clean-ups:** an account the audit log names can't be deleted (the log is append-only), so e2e clean-ups leave such accounts; test addresses are unique per run.
- **Class spaces** (S1-E8-11a) reuse the same table and functions with `purpose = 'class_space'`.

## Reports (S1-E10-01)

- **One way in:** `report_item(item_type, item_reference, reason, details)`, for any signed-in account whatever its state (reporting is the one action the account gate always allows, architecture 1.7.8). It refuses one's own item, a missing item and details over 2,000 characters; past `report_hourly_limit` (20 an hour, proposal) it answers `54000`; the same item reported again within 24 hours gives the first reference back.
- **Who reads:** moderation staff only (`reports_select_moderation`). A reporter never reads rows: for a profile the item is a user ID (rule 15). "My reports" (board 6.5) will be a view without IDs.
- **The shared contract** (architecture 1.7.11): `reportable_item_owner()` and `reportable_item_summary()` have one branch per `reportable_type` value; test `042` fails when one is missing.
- **Kept:** reports stay 3 years after they close (canvas comment, 17 Oct 2026); the purge job is S1-E13-04. The details text is never logged.

## The moderation queue (S1-E10-03a)

- **One case per item:** `report_item()` ends by calling `attach_report_to_case()`: a new report opens a case referenced like the report (R-000123) or joins the item's open case (decided 23 Oct 2026, Q4). The case keeps the report count, whether any reporter was under 18, the most urgent reason and the earliest deadline, counted from the first report. Nobody inserts a case directly; an authority order (S1-E10-09, `TCO-0001`) and a picture check (S1-E10-05, `P-0001`) will insert theirs with their `source`.
- **Tiers** (`report_reason_tiers`, decided 23 Oct 2026, Q5): same day (24 h) for self-harm, sexual content involving a minor, a threat to a minor (all three safeguarding; the threat added by the CTO on 24 Oct 2026) and terrorist content from a member; 48 h for other illegal content, copyright and copied work; 7 days for the rest, insults included (with harassment, CTO 24 Oct 2026). Database test 044 fails when a reason has no tier. The one-hour tier is for authority orders only (TCO regulation (EU) 2021/784, art. 3(3)); a constraint refuses it for a reason. The hours are settings (`moderation_hours_*`); the one-hour value is the law's.
- **Who sees a case:** `may_see_case()`: owner, admin and moderator; a safeguarding case needs the safeguarding permission as well (Q6). The seed gives it to the owner and moderator personas, not to admin, so both sides can be tested. `reports_select_moderation` now follows the case's rule too.
- **The decision:** `admin_decide_case(case, action, note)` needs an action (`moderation_action`: no_action, remove, restrict, warn, suspend, ban) and a note; it writes `case_actions`, closes the case and its reports and logs `case.decided` with the values before and after. A decided case can't be decided again (appeals are S1-E10-07). Carrying the action out is S1-E10-06, the statement of reasons S1-E10-04; both hook in at the function's end.
- **Reading:** `admin_moderation_queue(tier, status, under_18, source, case_id)` (usernames and age groups, never a birth year), `admin_case_reports(case)` (with what each reporter wrote), `admin_case_actions(case)`.
- **Seed:** 20 cases across the tiers (14 open, 6 decided; `supabase/seed.sql`, end of file), made through `report_item()` as each reporter; the staging top-up `staging-topups/S1-E10-03a.sql` adds the same.

## Sanctions (S1-E10-06)

- **What a decision does:** `admin_decide_case(case, action, note, suspension_days)` closes the case (S1-E10-03a) and then carries the action out: `warn` a warning row, `suspend` a suspension of 1, 7 or 30 days (`suspension_day_choices`; null means `suspension_default_days`, 7), `ban` a ban, `hide` or `remove` a `moderated_items` row (decided 23 Oct 2026, Q3). `restrict` is refused (`0A000`) until S1-E11-08.
- **A suspension** makes `account_state()` answer `suspended`, so `is_active_member()` is false and every write policy refuses; signing in, reading and downloading data still work. **A ban** answers `banned`, sets Supabase's own `auth.users.banned_until` (sign-in refused with `user_banned`), ends every session and keeps the email's keyed hash in `banned_email_hashes`; `handle_new_auth_user()` refuses a sign-up with that email (Q8). **A reporting pause** (30 days, `reporting_pause_days`) makes `report_item()` refuse the reporter with `55000`.
- **The keyed hash:** `banned_email_hash()` is HMAC-SHA256 with the Vault secret `banned_email_secret`. Set it by hand on each environment: `select vault.create_secret('<a long random value>', 'banned_email_secret');` in the SQL editor (never in a migration). The local seed sets a local-only value. Without the secret a ban still works, but the email isn't blocked.
- **Staff functions:** `admin_apply_sanction(user, kind, days, case, note)`, `admin_lift_sanction(id, reason)` (a lifted ban clears Supabase's ban and the hash), `admin_pause_reporting(handle, case, note)`, `admin_account_sanctions(user)`, `admin_restore_item(id, reason)`; owner, admin and moderator (`user_sanctions` and `moderation` areas). A staff account can't be sanctioned. Every action is logged (`sanction.applied`, `sanction.lifted`, `item.hidden`, `item.removed`, `item.restored`).
- **Members:** `my_sanctions()` gives the caller's own live sanctions (kind and dates, never the note).
- **The shared contract** (architecture 1.7.11): `is_moderated_away(type, id)` is true for a live hidden or removed row; `moderated_state_of(type, id)` says which.
- **Seed:** the decided cases of S1-E10-03a now apply their actions: suspended_user is suspended for 7 days, banned_user is banned (and its email hashed), kid_14_ok's profile is removed. The staging top-up `staging-topups/S1-E10-06.sql` applies the two sanctions when the S1-E10-03a top-up ran before this story merged.

## The contact page, version 0.2 (S1-E14-04)

`…_s1_e14_04_contact_v0_2.sql` (generated) replaces the draft's "Your support requests" list with the reference the emails carry (decided 23 Oct 2026, Q10g) and says "we reply within one month"; not an important change, so nobody accepts again. The form itself keeps nothing in the database: `server/contact.ts` and ADR 0004.

## Safety contacts (S1-E10-13a)

- **Where the numbers come from:** `content/safety-contacts.json` (research G4, checked 17 Oct 2026) through `scripts/build-safety-contacts-migration.ts`, which writes the seed migration. Never a number typed from memory; every row keeps its official link, the check date and the research's confidence. Adult-only lines are left out (decided 23 Oct 2026, Q9a). To change a contact before the editing screen (S1-E10-13b): change the JSON, run `npx tsx scripts/build-safety-contacts-migration.ts supabase/migrations/<timestamp>_s1_e10_13a_safety_contacts_seed.sql` for a new migration (the old rows are replaced by a `delete` at its top: see the generated file).
- **Who reads:** everyone, signed out included (`safety_contacts_select_public`); nobody writes from the app.
- **Gaps:** `note_safety_contact_gap(code)` counts a country asked for with no row; owner, admin and moderator read `safety_contact_gaps`. No user is recorded.
- **International fallback:** country code `ZZ` is reserved for the Child Helpline International and INHOPE directory links (decided 23 Oct 2026, Q9c); seeded by a later migration once Robert has checked the two links online.

## Logging in (S1-E2-05)

- **The pause** works through our screens: the log-in form asks `sign_in_pause_until()` before trying and calls `record_sign_in_failure()` after Supabase says no. Direct, scripted calls to Supabase Auth are held back by Supabase's own per-address limits; a true per-account lock needs a paid-plan Auth hook (decided 17 Oct 2026, 19:43, Q12). Rows hold an email hash and a time only, and are removed after 24 hours by `record_sign_in_failure()` itself.
- **Devices** are Supabase's own sessions (Q13). Logging a device out removes its session, so it can't renew its access; a token it already holds lasts until it expires (at most an hour), as with Supabase's own "sign out other devices".
- **Emails:** `recovery.html` (the reset link, to `/reset-password`) and `password_changed.html` (Supabase's security notice) are generated like the others (`npm run emails:build`).

## Usernames and pen names (S1-E2-04)

- **Rules:** 3 to 30 characters in any script, emoji included; no invisible or control characters, no spaces. Staff and brand words of 6 letters or more are refused anywhere, shorter ones as a word of the name; the app's own addresses (`settings`, `legal`…) only as the whole username. Swearwords of 4 letters or more are refused anywhere, shorter ones (and entries marked `=` in the list) only as a word. Everything is compared after folding case, accents, look-alike letters (Unicode TR39, `confusable_characters`) and digits used as letters.
- **Where the lists live:** `reserved_names` (staff titles and app addresses, in `…_s1_e2_04_name_rules.sql`), the settings row `reserved_brand_words` (the one migration allowed to hold brand names, `…_s1_e2_04_brand_words.sql`), `username_word_lists` (generated from `content/username-word-lists/`) and `confusable_characters` (generated from Unicode's list, version 10.0.0 for now). Change a list with a new migration until the settings screen (S1-E11-03).
- **Uniqueness:** `profiles.handle_skeleton` is unique, so "lia" and "IIa" can't both exist; `handle_slug` is the web-address form. A deleted account's username stays taken, so nobody can pick it up to fake its owner.
- **False hits:** a moderator approves the exact name with `admin_approve_username()`; the person then saves it themselves.

## Seed personas

Every persona's username is its persona name (for example `adult_writer`); adult_writer's pen name is `Lia Scrie`.

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
| …0013, …0014 | suspended_user, banned_user | 18 plus | suspended (7 days), banned | from the decided seed cases (S1-E10-06) |
| …0015, …0016 | blocker, blocked | 18 plus, 16 to 17 | active, not admitted | the block: S1-E5-05 |

Full IDs are `00000000-0000-4000-8000-0000000000NN`. Tests sign a persona in by setting the role and the JWT claims, as in `tests/database/010-profiles.test.sql`.

## Sign-up (S1-E2-01, ADR 0002)

Supabase Auth inserts a row into `auth.users`; the trigger `handle_new_auth_user()` then, in the same transaction, checks the year of birth and, only when the year leaves the age unclear at 13 or 16, the month (S1-E2-02: under 13 refused; under 18 refused while `adults_only` is on), creates the `profiles` row (its `id` is the user ID), takes a place on the invite (while `invite_only` is on; after the profile since S1-E11-17, so the audit row can name the account) and records the accepted terms and privacy notice in `consents`. Any refusal undoes the whole sign-up, so nothing is kept. Seed personas carry `"seed_persona": true` in their app metadata and make their own profiles.

**Test invite codes** (seeded by `seed.sql`, local and staging only, never production):

| Code | State |
| --- | --- |
| `PERSONAS-TEST-INVITE` | works (1,000 places, no practical expiry): use `/join/PERSONAS-TEST-INVITE` |
| `EXPIRED-TEST-INVITE` | expired |
| `USED-UP-TEST-INVITE` | used up |
| `REVOKED-TEST-INVITE` | revoked |

Codes are stored only as SHA-256 hashes (`invite_code_hash()`); letter case, spaces and dashes don't matter.

**Emails:** sign-up confirmation and log-in links use our templates in `supabase/templates/`, generated by `npm run emails:build` from `src/locales/*/email.json` and the brand config. Locally they arrive in Mailpit (http://127.0.0.1:54324).

