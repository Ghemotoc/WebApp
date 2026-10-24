# Contact

"Write to us": the Contact us form for users and visitors, at `/contact`. Started by S1-E14-04 (decided 23 Oct 2026, Q10). No doodles (a contact and reporting screen, Definition of Done).

- `components/ContactPage.tsx`: the page, the "report content elsewhere" line and "Message sent" with the reference.
- `components/ContactForm.tsx`: topic chips, the message, the email for a visitor (a signed-in person's account email is used, Q10e), the hidden honeypot field (Q10d) and Send.
- `hooks/useContactForm.ts`, `api/contact.ts`: who is sending (from the session: email, username and user ID, never the year of birth), and `POST /api/contact`.
- `src/schemas/contact.ts`: the shared contract, checked in the browser and on the server.
- The server side: `server/contact.ts` (the two emails, the reference `C-<year>-<4 digits>` that is never stored, Brevo on Cloudflare, Mailpit locally) and `functions/api/contact.ts`; ADR 0004; the by-hand steps in `docs/runbooks/contact-form.md`.
