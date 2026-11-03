<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of bundle 12 ADMIN-2, part f2, from Robert's brief of 2 Nov 2026 (`bundle-12-pictures-bans-avatars-brief.md`, section 6): "When a new sign-up shares a scrambled IP with an account banned in the last 30 days, flag it for moderator review. Never block it automatically: schools share IPs." Part f1 (#297) closed banned accounts for good.

## What changed

- **The sign-up's scrambled IP.** `/api/signup-context` now also returns `ipToken` (`server/signup-ip.ts`): the visitor's address scrambled with `IP_SCRAMBLE_SECRET` under this month's key and last month's (the key changes monthly and the window is 30 days), signed with `SIGNUP_CONTEXT_SECRET` like the country token, valid 10 minutes. The address itself is never stored or logged. The sign-up form passes it on; the sign-up trigger checks the signature (`verified_signup_ips()`) and keeps the two scrambled values in the new staff table `sign_up_ips`.
- **The flag.** When either value matches a sign-up IP or a picture-upload IP of an account banned in the last 30 days (setting `returning_user_window_days`), `flag_possible_returning_user()` opens a "Possible returning user" case (`U-` reference, 48-hour tier) on the new profile and links the two accounts in the new staff table `case_account_links`. The sign-up always goes ahead. A lifted or older ban flags nothing. A statement of reasons from such a case says automated means found it (DSA art. 17(3)(c)).
- **The case page.** On a profile case, a "Possible returning user" panel lists the linked accounts (to their staff page, with "Banned since …"), where each link came from, "Remove the link to @…" and "Link another account" (username and reason). Both actions need a reason and are in the audit log (`moderation.returning_user_linked`, `…_unlinked`). en and ro.
- **Retention.** `blank_old_scrambled_ips()` also deletes `sign_up_ips` rows after 30 days (Q48).
- **Records:** retention, decisions, code tour, the moderation README and the privacy notice drafts (en and ro, [lawyer to check]).

## How it was tested

- Database test 252 (27 tests): the token is trusted only when signed, recent and well formed; a sign-up keeps both scrambled values and is never blocked; a match with a banned sign-up IP, or a picture IP under last month's key, opens a 48-hour `returning_user` case with the link; an older or lifted ban flags nothing; retention after 30 days; allowed and denied tests for both read policies; members can't link; a moderator links by username, can't link twice or an unknown name, unlinks with a reason; both are logged; the statement's automated flag. Test 021 covers the two new tables.
- Unit tests for the token (`server/signup-ip.test.ts`) and the sign-up context.
- e2e `e2e/returning-users.spec.ts`: a sign-up through the form from a banned account's connection (CF-Connecting-IP standing in for Cloudflare) goes ahead and is flagged; the moderator sees it, links @blocker with a reason and removes it again, both logged; axe at 390, 768 and 1440 px in light and night, ro and en. Panel checked by eye at 1440 and 390 px.

## Local check run

LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- Cloudflare Pages needs `IP_SCRAMBLE_SECRET` (already set for the picture check in part e2b) and `SIGNUP_CONTEXT_SECRET` (S1-E2-10) on staging; without either, sign-ups simply keep no IP and nothing is flagged.
- Ask the lawyer about the privacy notice sentence on the returning-user check.

## Board mismatches

None: the case page (8.3) has no drawing of this panel; it uses the same card and reason pattern as the sanctions panel.

## Questions for Robert

None.

## Follow-ups

- A banned account with no sign-up or picture IP in the last 30 days can't be matched, because we keep no longer copy of IPs (Q48). That is the trade-off the 30-day rule makes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
