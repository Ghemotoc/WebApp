# ADR 0003: Leaked passwords are checked through our own Cloudflare Pages Function

- **Date:** 17 October 2026
- **Status:** Accepted (Robert, chat, 19:43, Q3 of the epic S1-E2 plan)

## Decision
New passwords are checked against Have I Been Pwned's free range service through `/api/password-check`, a Cloudflare Pages Function (`functions/api/password-check.ts`, logic in `server/password-check.ts`): the browser sends only the first 5 characters of the password's SHA-1 hash, so neither the password nor the visitor's IP address leaves us, and no third-party script runs on our pages (CLAUDE.md rule 7). If the service can't be reached the password is let through. Supabase's own leaked-password protection is switched on as well once the project is on the Pro plan.
