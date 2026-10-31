# ACCOUNTS-2a plan: age check with Yoti on the web, against a stand-in (S1-E2-08a)

## Shape (follows the picture check and Canva: ADR 0010)
- The browser asks our Pages Function `/api/age-check/start` with the person's own sign-in. It asks the database which line to check (`my_age_check()`: 18 when the year of birth says 18 or over, otherwise 13), creates a Yoti session (API key and SDK ID only in Cloudflare secrets; a reference that is a random UUID, never stored), saves it through `begin_age_check()` signed with `AGE_CHECK_SECRET` (the same value in Vault as `age_check_secret`), and returns only the session ID, the SDK ID and Yoti's hosted page address.
- Yoti's hosted page lets the person choose facial estimation or an ID document; the stand-in page (`/api/age-check/stub/check`) offers Pass, Fail and Cancel with a method, only while `YOTI` isn't `"real"`.
- Yoti notifies `/api/age-check/webhook`: real mode verifies the RSA-PSS SHA-256 signature with Yoti's public key and fetches the session result from Yoti before saving; the stand-in's notification is signed with its own HMAC key. The result is saved by `record_age_check_result()` (anon may call it, but only a payload signed with the Vault secret counts), which stores only `age_check_result`, `age_checked_at` and `age_check_method` and deletes the session row.
- Yoti sends the person back to `/age-check/return`, which shows "Checking your age" until the result is stored, then the outcome. A "13 or over" result with an adult year of birth offers the ID document route (an 18 check).
- An expired or abandoned session leaves nothing behind: starting again deletes the old row, and an hourly job removes rows past `expires_at`.

## Files
- Migration `…_s1_e2_08a_age_check.sql`: `age_check_sessions` (user_id, yoti_session_id, threshold, expires_at) with RLS (the owner reads their own row), grants, `age_check_is_signed()`, `my_age_check()`, `begin_age_check()`, `record_age_check_result()`, `purge_expired_age_check_sessions()` and its cron job.
- pgTAP `199-age-check`.
- `src/schemas/ageCheck.ts`; `server/age-check.ts`, `server/age-check/{index,yoti,stub}.ts` with Vitest; `functions/api/age-check/[[path]].ts`; local route in `server/pages-functions-plugin.ts`.
- `src/features/age-check/` (api, hooks, AgeCheckPage, AgeCheckReturnPage, AgeCheckNotice in AppLayout), locale texts under `ageCheck` in `account.json`, ro and en, routes `/age-check` and `/age-check/return`.
- e2e `age-check.spec.ts` with a throwaway account.
- Docs: ADR 0010, mocks.md (Yoti stand-in), code-tour, supabase README, feature README (the processors list gains Yoti at GO-LIVE).

## OPEN points kept out of code (rule 13)
- The age buffer at the 13 gate and whether Yoti checks the 16 line: Yoti-side settings, left unset.
- Yoti cost and contract, and the manual check method (08b).
