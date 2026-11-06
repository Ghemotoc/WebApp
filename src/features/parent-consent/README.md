# Parental consent

A parent's or guardian's consent for an under-16 (story S1-E2-03; ADR 0011; GDPR art. 8).

- `api/parentConsent.ts`: reads `my_parental_consent()` and `parental_consent_request(token)`, and posts to our server (`/api/parent-consent/request` and `/answer`).
- `hooks/useMyParentConsent.ts`: the writer's side; `hooks/useConsentRequest.ts`: the parent's side, signed out, from the link's token.
- `components/ParentConsentPage.tsx` (`/parent-consent`): the writer asks, sees the deadline, sends again or changes the email; then "Your account is ready" or the withdrawn state. Uses `AskParentForm` and `ConsentSentPanel`.
- `components/ParentAnswerPage.tsx` (`/parent-consent/answer#<token>`): what the parent reads (`ParentAnswerDetails`), the guardian box and the two answers (`ParentAnswerForm`), then the outcome with "Withdraw my consent" (`ParentAnswerOutcome`) and `ContactLine`.
- `components/ParentConsentNotice.tsx`: "Ask a parent or guardian", shown by `AppLayout` while the account waits.
- `components/ParentSpotlightPage.tsx` (`/parent-consent/spotlight#<token>`, S1-E2-03b, LOOK-4c): the one question "May we suggest your child to other readers?", answered through `hooks/useSpotlightRequest.ts` and `/api/parent-consent/spotlight-answer`. The consent page's optional box (`ParentAnswerForm`) gives the same yes at the start.

The server side is in `server/parent-consent.ts`, `server/parent-consent/shared.ts`, `server/parent-consent/spotlight.ts` and `server/parent-consent/emails.ts`; the database side in the `…_s1_e2_03_parental_consent.sql` migration. The staff action is in `src/features/staff/` ("Withdraw parental consent" on the account page).
