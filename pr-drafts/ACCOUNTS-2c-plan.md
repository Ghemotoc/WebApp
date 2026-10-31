# ACCOUNTS-2c plan: parental consent for under-16s (S1-E2-03)

## Shape (mirrors the age check: our server signs what the database stores)
- Order of the gate: an under-16 does the age check first (age_check_pending now comes before the consent step), then, while the `parental_consent` flag is on and no consent is agreed, the account is `awaiting_parental_consent` (read-only).
- The writer, on `/parent-consent`, gives a parent's or guardian's email and the email's language. Our Pages Function `POST /api/parent-consent/request` makes a random token (32 bytes), stores only its SHA-256 through `begin_parental_consent()` (as the writer, signed with `PARENTAL_CONSENT_SECRET` = Vault `parental_consent_secret`, so the writer never learns the token) and emails the parent the link `/parent-consent/answer/<token>`. Send again and Change the email make a new token; the old link stops working.
- The parent opens the link (no account): `parental_consent_request(token)` (anon, the token is the secret) shows the board 2.4 page: the writer's email and username, year of birth, the age check passed, what we keep, how under-18s are protected, the privacy notice and terms versions, the guardian box, I agree and I don't agree, and the deadline.
- `POST /api/parent-consent/answer` signs `answer_parental_consent(token, decision)`:
  - agree: the consent record keeps who (the parent's email), when, the notice and terms versions and the guardian box; the account becomes active; the writer gets a notification; the parent gets a confirmation email with the same link to withdraw later;
  - refuse: the writer gets an email, then the account's personal data is erased (as the 14-day clean-up does);
  - withdraw (from the confirmation email's link): the account goes read-only again, the writer gets a notification and the parent an email. What happens next is on the lawyer's list, so a withdrawn account is not erased automatically.
- Staff: "Withdraw parental consent" on Staff › Users › an account (owner, admin, moderator), with a reason, for a parent who writes to us; logged.
- No answer within 14 days of the age check pass (or sign-up): the nightly clean-up erases the account (08b's job, extended).
- The `parental_consent` flag is on; turning it off is owner-only and logged (admin_set_flag).
- Templates: the three parent emails and the writer's refusal email in `email.json` (ro and en), admin-editable with locked placeholders.

## Files
- Migrations `…_s1_e2_03_enums.sql` (notification kinds), `…_s1_e2_03_parental_consent.sql` (flag, table with RLS and grants, functions, account_state, the clean-up, admin_set_flag, notification category).
- pgTAP `201-parental-consent`; updates to `020`, `021`.
- Seed: kid_14_ok agreed, kid_14_waiting waiting; `supabase/staging-topups/S1-E2-03.sql`.
- `src/schemas/parentConsent.ts`; `server/parent-consent.ts` with Vitest; `functions/api/parent-consent/[[path]].ts`; local route.
- `src/features/parent-consent/`; staff action; notifications texts; locale texts.
- e2e `parent-consent.spec.ts` (adults_only off for the spec, as country.spec does).
- Docs: ADR 0011, retention, mocks (none), code-tour, supabase README, feature README, GO-LIVE secret.

## OPEN (rule 13)
- How the parent or guardian is verified (email alone is weak): only the email and the guardian box are recorded.
- What happens to an account after a withdrawal: it goes read-only and stays.
