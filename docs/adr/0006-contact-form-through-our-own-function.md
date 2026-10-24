# ADR 0006: Contact us posts through our own Pages Function and Brevo, with no helpdesk script

- **Date:** 23 October 2026
- **Status:** Accepted (Robert, chat, 23 Oct 2026, Q10 of the Lane C plan)

## Decision
The Contact us form (`/contact`, S1-E14-04) sends its message to `/api/contact`, a Cloudflare Pages Function (`functions/api/contact.ts`, logic in `server/contact.ts`). The function checks the message with the zod schema the form uses (`src/schemas/contact.ts`), makes a reference (`C-<year>-<4 digits>`) and sends two plain-text emails through Brevo's transactional HTTP API (a French company, EU hosting, a data processing agreement to sign): one to the support inbox with the message and, for a signed-in person, the username and user ID; one acknowledgement to the sender with the reference and "we reply within one month". Nothing is stored and nothing is logged: not the message, not the email, not the IP address. Locally and in the end-to-end tests the same handler sends into Mailpit, the local Supabase's mail catcher.

Abuse is kept down by a hidden honeypot field (a bot that fills it gets a reference and nothing is sent) and a Cloudflare rate-limit rule on `/api/contact`, set by hand (`docs/runbooks/contact-form.md`).

## Why
- The story asks for no tracking script or cookie on our pages (CLAUDE.md rule 7) and a helpdesk that hosts data in the EU; a ready-made helpdesk's web widget would add a script. Posting through our own function keeps the page clean, and the helpdesk (S1-E11-13, product OPEN) can read the support inbox or be connected later behind the same function.
- A reference the sender can quote (DSA art. 12, a user-friendly contact point) needs no table: the two emails carry it, and staff search the inbox by it. A list of past requests (the draft legal text's "Your support requests") was dropped (Q10g).
- Brevo is the architecture's recommended email provider (Q49) and the one Robert sets up for staging; its SMTP is on his by-hand list for Supabase Auth, and the API key `BREVO_API_KEY` joins it.

## Consequences
- Two secrets by hand on Cloudflare: `BREVO_API_KEY`; the brand variables `VITE_BRAND_SUPPORT_EMAIL` and `VITE_BRAND_NAME` are read by the function too, with today's values as the fallback.
- The privacy notice names Brevo as a processor for support emails (the lawyer's list).
- When a helpdesk is chosen (S1-E11-13), `server/contact.ts` gets a second `SendEmail` that creates a ticket through its API; the form and the reference don't change.
