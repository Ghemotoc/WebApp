# ADR 0010: The Yoti age check goes through our server, and only the result is kept

- **Date:** 5 November 2026
- **Status:** Proposed by the builder (ACCOUNTS-2a, S1-E2-08a). Runs against a stand-in until GO-LIVE sets `YOTI=real`.

## Decision
A signed-in person checks their age on Yoti's hosted page. Our server talks to Yoti; the browser only follows links, and the database keeps only the result, its date and its method.

- **Start, as the person.** "Continue with Yoti" calls `POST /api/age-check/start` with the person's own sign-in. Our server asks the database which line to check (`my_age_check()`: 18 when the year of birth says 18 or over, otherwise 13), creates a Yoti session with our API key and SDK ID (Cloudflare secrets only) and a random `reference_id` that is never stored, and links the session to the person through `begin_age_check()`, signed with `AGE_CHECK_SECRET`. The browser gets only the session ID, the SDK ID and the page to open (criterion 1).
- **Both methods on Yoti's page.** The session allows facial age estimation and an ID document, nothing else (criterion 2). The person chooses on Yoti's page, so our page explains both rather than asking.
- **The result comes from Yoti, signed.** Yoti notifies `/api/age-check/webhook`. Our server checks Yoti's RSA-PSS SHA-256 signature over the raw body with Yoti's public key, refusing anything unsigned before doing anything else, then fetches the session's result from Yoti itself (criterion 4). It stores it through `record_age_check_result()`, which a visitor may call but which only acts on a payload signed with the Vault secret `age_check_secret` (the same value as `AGE_CHECK_SECRET`). No service key is used (CLAUDE.md rule 2).
- **Only three things are kept.** `age_check_result`, `age_checked_at` and `age_check_method` on the profile (criterion 5; CLAUDE.md rule 5). Never a photo, a document or an estimated age. The `age_check_sessions` row is deleted when the result arrives; an abandoned one is replaced by the next start or removed by the hourly `purge-expired-age-check-sessions` job after 30 minutes (criterion 11).
- **The return page reads, never writes.** Yoti sends the person back to `/age-check/return`, which reads `my_age_check()` every 2 seconds until the result is stored, then says what happened. Nothing in its address counts as a result.
- **A "13 or over" result with an adult year** is offered the ID document route to an "18 or over" result (criterion 6).
- **A stand-in until there is a Yoti contract.** While `YOTI` isn't `"real"`, `/api/age-check/stub/check` is our own page with "Pass with a selfie", "Pass with an ID document", "Fail" and "Cancel". Its notifications are signed with a fixed stand-in key that the real service never accepts, and its pages answer 404 in real mode.

## Why
- Yoti's API key must never reach a browser, and the result must never be something a browser can claim; a Pages Function with a Vault-checked signature is the pattern the picture check and Canva already use.
- Fetching the result from Yoti, instead of trusting the notification's body, means a replayed or forged notification can't change anyone's age.
- The stand-in lets the whole road be built and tested end to end before the company and the Yoti contract exist (architecture 1.7.8).

## Open points kept out of the code (CLAUDE.md rule 13)
- The age buffer at the 13 line and whether Yoti also checks the 16 line (story S1-E2-08): Yoti-side settings, left unset.
- Yoti's price and contract (Q55 and question 4a).
- How staff verify an age by hand (story S1-E2-08): part 08b records only the outcome and the reason the person reads; the method is for Robert and the lawyer.

## Consequences
- The stand-in lets anyone pass. It must never be on where minors can join: GO-LIVE sets `YOTI=real` before `adults_only` goes off.
- GO-LIVE: sign Yoti's contract and data processing agreement, set `YOTI=real`, `YOTI_API_KEY`, `YOTI_SDK_ID`, `YOTI_NOTIFICATION_PUBLIC_KEY` and `AGE_CHECK_SECRET` in Cloudflare and the same `AGE_CHECK_SECRET` in Vault as `age_check_secret`, register `/api/age-check/webhook` as the notification address, and add Yoti to the privacy notice and the record of processing.
- Part 08b keeps one row per finished check (`age_check_attempts`: the line, the outcome and the method, for 6 months) so a moderator deciding a manual check sees what Yoti said, and a manual request (`manual_age_checks`) with the decision and its reason. Who decided is only in the audit log, so the person never sees a staff name.
- An account still waiting 14 days after sign-up, with no manual check open, loses its personal data every night (`erase_unchecked_accounts()`): the profile is marked deleted, the year and month of birth, pen name, bio and birthday are erased, the email is replaced and the login is shut. Deleting the row itself waits for the account deletion story (S1-E13-05), because other tables point to profiles.
- Yoti's addresses, request fields, signature header and salt length were written from Yoti's documentation and must be checked against it, in Yoti's sandbox, before go-live.
