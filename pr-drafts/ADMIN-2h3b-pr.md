<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #111

Bundle 12 ADMIN-2, part h3b: canned replies for support tickets (S1-E11-13 criterion 8). Part h4 follows: merge, Convert to report, Open data request, spam, retention and the export.

## What changed

- **Canned replies page** at Staff › Support tickets › Manage canned replies (`/staff/support/canned`): owner, admin and support add, change and delete ready answers, each with a title and its words in Romanian and English. Every change is in the audit log with the before and after words; Delete asks once more in place.
- **On a ticket**, a "Canned reply" drop-down and an Insert button above the reply box. Inserting picks the ticket's language and fills `{{name}}` (the person's pen name, or username) and `{{number}}`, then puts the words in the box (after anything already typed) and moves the focus there to edit. Nothing is sent by inserting. For someone who wrote only by email, the name is left out with the comma before it ("Hi,").
- **Three starting replies** in draft Romanian and English: "Thanks, we’re looking into it", "Resetting a password" and "Reporting goes through Report".
- `admin_support_ticket()` now gives the person's display name; the staff ticket reads its language.
- **Records:** decisions, the code tour and the support README.

## How it was tested

- Database test 257 (14 tests): support reads the replies, a moderator and a member read none (both sides of the policy); the starting replies use `{{name}}` in both languages; add (trimmed), change, an empty title and over-long words refused, an unknown reply refused, delete; the three audit lines and the deleted words kept; a moderator can't add one; the ticket's display name.
- Unit tests: filling in Romanian and English, an email-only ticket without a name, an unknown placeholder left alone, inserting into an empty or written box.
- e2e `e2e/support-canned-replies.spec.ts`: add, change and delete a reply; insert one on a Romanian ticket and find the name and number in the box with nothing sent; axe on the page at 390, 768 and 1440 px, light and night, ro and en.

## Local check run

LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- Nothing.

## Board mismatches

- None new (no board draws the support screens yet).

## Questions for Robert

None. Please read the Romanian of the three starting replies and the new screen text (`staff.canned` in `src/locales/ro/support.json`).

## Follow-ups

- Part h4: merge, Convert to report, Open data request, spam, retention and the export.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
