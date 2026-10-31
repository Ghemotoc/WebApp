# ADR 0011: Parental consent goes through a signed link that only the parent holds

- **Date:** 6 November 2026
- **Status:** Proposed by the builder (ACCOUNTS-2c, S1-E2-03). On from launch through the `parental_consent` flag; it only matters once `adults_only` is off and under-16s can join.

## Context
GDPR art. 8 and Romania's choice of 16 mean an under-16's consent counts only with a parent's or guardian's agreement. The writer must not be able to agree for themselves, the parent has no account, and a parent must be able to withdraw as easily as they agreed (art. 7(3)). How a parent is verified is OPEN (architecture section 6, the lawyer's list).

## Decision
- **Order.** An under-16 does the age check first (S1-E2-08), then asks a parent. `account_state()` says `age_check_pending` before `awaiting_parental_consent`, and the second applies only while the `parental_consent` flag is on and `has_parental_consent()` is false. Turning the flag off is owner-only.
- **The writer asks through our server.** "Send the email" calls `POST /api/parent-consent/request` with the writer's own sign-in. Our server makes a random 32-byte token, stores only its SHA-256 through `begin_parental_consent()` signed with `PARENTAL_CONSENT_SECRET` (the same value in Vault as `parental_consent_secret`) over `consent|<user>|<email>|<language>|<hash>`, and emails the parent `/parent-consent/answer#<token>`. The writer never sees the token. The writer's own email is refused, and a new email waits a minute.
- **The token sits after "#".** Browsers never send the part after "#" to a server, so the token reaches no server log and no Referer header. The page reads it and calls `parental_consent_request(token)` (signed out) for what the parent needs to see.
- **The parent answers through our server.** `POST /api/parent-consent/answer` signs `answer|<hash>|<decision>` for `answer_parental_consent()`. A yes needs "I'm this child's parent or legal guardian" ticked, records the privacy notice and terms versions shown, and emails the parent a confirmation with the same link to withdraw. A no erases the account at once (`erase_unchecked_account()`) after reading the writer's email so they can be told. A withdrawal makes the account read-only again and tells the writer.
- **Staff withdraw too.** When a parent asks by email, owner, admin or moderator use "Withdraw parental consent" on the account page (`admin_withdraw_parental_consent()`, a reason, the audit log, a notification to the writer).
- **The deadline.** If nobody agrees within 14 days of the later of sign-up and the age check, `erase_unchecked_accounts()` erases the account. A withdrawn consent is not erased automatically.
- **Kept:** the parent's email, the email's language, the token's hash, the status, whether the guardian box was ticked, the document versions and the dates (`parental_consents`, docs/retention.md). No name and no proof of identity.

## Consequences
- No service key is used; the database acts only on payloads signed with the Vault secret.
- What happens to an account after a withdrawal (read-only today) and how a parent is verified are on the lawyer's list; both are OPEN and not decided here.
- GO-LIVE: set `PARENTAL_CONSENT_SECRET` in Cloudflare and the same value in Vault as `parental_consent_secret`, and add the parent's email to the privacy notice and the record of processing.
