<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E2-03 (parental consent for under-16s). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 6 ACCOUNTS-2, part c: S1-E2-03, a parent's or guardian's consent through an emailed link (ADR 0011; GDPR art. 8).

## What changed

- **Database:** `20261106100001_s1_e2_03_enums.sql` (two notification kinds) and `20261106100002_s1_e2_03_parental_consent.sql`.
  - Flag `parental_consent` (on; only the owner may turn it off).
  - `parental_consents`: the parent's email, the email's language, the SHA-256 of the link's token, the status (waiting, agreed, refused, withdrawn, replaced), the guardian box, the privacy notice and terms versions, and the dates. One live row per account. The writer reads their own; nobody writes it directly.
  - `account_state()`: an under-16 does the age check first, then is `awaiting_parental_consent` until a parent agrees (only while the flag is on).
  - `begin_parental_consent()` and `answer_parental_consent()` act only on payloads our server signed with the Vault secret `parental_consent_secret`. The writer's own email is refused, and a resend waits a minute.
  - `my_parental_consent()` (the writer) and `parental_consent_request(token)` (the parent's page, signed out).
  - A no erases the account at once; a withdrawal makes it read-only and notifies the writer.
  - `admin_withdraw_parental_consent()` (owner, admin, moderator) with a reason, the audit log and a notification.
  - `erase_unchecked_accounts()` also erases an account still waiting 14 days after the later of sign-up and the age check. A withdrawn consent is never erased automatically.
- **Server:** `server/parent-consent.ts` behind `functions/api/parent-consent/[[path]].ts` and the local plugin. `POST request` (the writer's sign-in) makes a 32-byte token, stores only its hash and emails the parent `/parent-consent/answer#<token>`; the token sits after "#", so it reaches no server log or Referer. `POST answer` signs the parent's yes, no or withdrawal and sends the email that follows (a confirmation with the link to withdraw, or the writer's "won't be activated"). Emails are `parentConsent` in `email.json`, admin-editable.
- **Writer screen:** `/parent-consent`: the email and the email's language, then "We emailed your parent or guardian" with the deadline, Send again and Change the email; then "Your account is ready" or the withdrawn state. `ParentConsentNotice` in `AppLayout` links there.
- **Parent screen:** `/parent-consent/answer#<token>`, signed out, in the email's language: who asked (email, username, year of birth, the age check), what we keep, how we protect under-18s, the privacy notice and terms with their versions, "I'm this child's parent or legal guardian", I agree and I don't agree; then the outcome, with "Withdraw my consent" and a confirm step after a yes.
- **Staff:** "Withdraw parental consent" on the account page, offered for an active 13-to-15.
- **Text:** `account.json`, `email.json`, `notifications.json` and `staff.json`, ro and en.
- **Docs:** ADR 0011, `docs/retention.md`, `docs/code-tour.md`, `supabase/README.md`, the new feature README and the staff README. Seed: kid_14_ok's parent agreed, kid_14_waiting's hasn't answered.
- **Unrelated fix:** `e2e/user-management.spec.ts` still expected moderators to have no tabs on Users; since #242 they have Accounts and Manual age checks.

## How it was tested

- **pgTAP `201-parental-consent` (41 tests):** the gate order and flag; the policy allowed and denied; no direct writes; unsigned and wrongly signed payloads refused; own email and quick resend refused; a new email replaces the waiting one; the parent's read gives no user ID; agree, refuse (erasure) and withdraw, each once; staff withdraw with a reason, logged and notified, members refused; the flag off is owner-only; the 14-day erasure skips withdrawn consents. `020` and `021` updated.
- **Unit `server/parent-consent.test.ts` (10 tests):** only a signed hash is stored and the token reaches only the email; signed-out, wrong email, own email, too soon and no secret answered plainly; a yes needs the guardian box; the follow-up emails and their language; the dates in Romania's time.
- **e2e `parent-consent.spec.ts` (30 tests):** with `adults_only` off, a throwaway 14-year-old is refused their own email, then asks a parent; the parent opens the Mailpit link signed out, can't agree without the box, agrees and gets the confirmation; the account is active and the writer is told; the parent withdraws from the same link; a second parent says no and that account is erased and its writer emailed; a moderator withdraws a third consent; axe and no sideways scroll on both pages at 390, 768 and 1440 px, light and night, ro and en.
- **Screenshots:** checked by eye: the parent's page at 390 (light, with the guardian error) and 1440 (night), in Romanian. They showed the protection and document lists without bullets; fixed.

## Local check run

Run on Node 24.

- **Static checks:** prettier, lint, typecheck, types:check, i18n:check, migrations:check and third-party:check (after `npm run build`) all pass.
- **Unit tests:** `npx vitest run` passes 966 of 966.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 111 files, 2,447 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** with `--workers=1`, `parent-consent`, `age-check`, `manual-age-check` and `country` pass 101 of 101; `user-management` 28 of 28; `epic-s1-e2` and `sign-up` pass. The full run comes at the end of the bundle (part f).

## By hand

- On staging, run `supabase/staging-topups/S1-E2-03.sql` once (the two seed personas' consent rows; safe to run twice).
- GO-LIVE (before minors join): set `PARENTAL_CONSENT_SECRET` in Cloudflare and the same value in Vault as `parental_consent_secret`; add the parent's email to the privacy notice and the record of processing.

## Board mismatches (ParentConsent 2.4)

- After a no, the board's parent sees "we'll delete it and its data"; the account is erased at that moment, so the page says "we've deleted it and its data".

## Follow-ups

- OPEN (rule 13, kept out of the code): how a parent is verified (only the email and the guardian box are recorded), and what happens to an account after a withdrawal (read-only today, never erased automatically). Both are on the lawyer's list.
- The consent notifications are in-app only for the writer; their emails come with the shared sender's templates (S1-E11-19).
- Story issues for S1-E2 once the Sync story issues job can run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
