# ACCOUNTS-2b plan: manual age checks, the 18 invitation and the 14-day clean-up (S1-E2-08b)

## Shape
- **Attempt history.** `record_age_check_result()` also writes one `age_check_attempts` row (line, outcome, method, time): what staff see for a manual check (criterion 8). Kept 6 months, like Yoti's own results, then purged by the hourly job.
- **Ask for a manual check.** After a failed check, the return page and /age-check offer "Ask for a manual check" (`request_manual_age_check()`): one open request per account; the account stays read-only meanwhile. The page then says a person replies within 5 working days.
- **Staff decide.** Users › Manual age checks (`/staff/users/age-checks`, owner, admin and moderator: `staff_may('users')`): each open request with the username, year of birth and age group, the attempt history and the 5-working-day deadline; never a picture. `admin_manual_age_checks()` logs the read of the years of birth; `admin_decide_manual_age_check(id, outcome, reason)` stores "13 or over", "18 or over" or a refusal with method `manual`, writes the audit log and notifies the person (`age_check_decided`). How staff verify is OPEN (rule 13), so the screen records a decision and a reason only.
- **Invitation at 18.** A daily job notifies once anyone whose year now says 18 or over and who holds only "13 or over" (`age_check_18_invite`); under-18 protections stay on until an "18 or over" result (criterion 10).
- **14-day clean-up.** A daily job finds accounts still waiting for a check (`account_state()` age_check_pending or age_check_failed) 14 days after sign-up with no open manual check, and deletes their personal data: the year and month of birth, names, bio and birthday on the profile (marked deleted), and on the login the email, password, identities and sessions. Seed personas are left alone. Rows other tables keep go with the account deletion story (S1-E13-03). `birth_year` may be empty only on a deleted profile.
- **Numbers.** Metrics' "Appealed" counts manual checks.

## Files
- Migrations `…_s1_e2_08b_enums.sql` (two notification kinds) and `…_s1_e2_08b_manual_age_checks.sql`.
- pgTAP `200-manual-age-checks`; `021` gains the two tables.
- `src/features/age-check/` (manual check panel, return page, steps line), notifications text for the two kinds, staff page under `src/features/staff/components/age-checks/` with its API and hook, Users tab.
- e2e `manual-age-check.spec.ts`.
- Docs: ADR 0010 consequences, mocks.md, code-tour, supabase README, docs/retention.md.
