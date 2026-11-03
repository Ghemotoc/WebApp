<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #111

Bundle 13 CONTESTS, part a1: the landing pages core (S1-E11-14 criteria 1 to 4, 9, 11 and 12). Pictures, featured stories, Remind me and the link preview follow in part a2.

## What changed

- **Landing pages at `/c/<name>`.** An admin starts a page with its address and type (contest, campaign or information). The address must be 2 to 60 lowercase letters, numbers and hyphens, not a reserved name and not used before, archived pages included. `c` joins the reserved names so no username can take the address.
- **Fixed blocks, both languages side by side.** Hero, Text, Key dates, Who can enter, Prize, How to enter, Rules, and Questions and answers. No free HTML and no colours of the admin's own: one of four brand themes from the pill tints. Every field has a counter with the same limit the database checks.
- **Up and Down, never dragging.** Blocks move with buttons, so the keyboard does everything. The hero is fixed at the top, so the page always has one h1.
- **Preview** at phone or desktop width, in Romanian or English, drawn with the same component visitors see.
- **Publishing checks.** Refused until there is a hero first, every required field is filled in both languages, the dates are in order, and a contest page has a Key dates block and a Rules link. Each problem names the block, the language and the field ("Block 3: Rules, English: Link text: fill this in").
- **Show from, take down, restore, archive.** A version goes live at 00:00 Romanian time on its date. From the take-down date the page stays up and says it has ended. Restore brings an earlier version back as the draft; Archive takes the address down for good, after asking once more. All four actions are in the audit log; publish keeps the before and after words.
- **Records:** decisions (a builder proposal row), the code tour, the feature's README.

## How it was tested

- Database test 261 (29 tests): who reads (pages and versions; admin and owner allowed, moderator and member denied) and who writes (moderator, content editor and member refused); addresses (trimmed and lowercased, taken, reserved, malformed, bad type, `c` reserved); a draft never shown; an empty page, a contest without rules, an empty English title and a hero not first all refused with the list; publishing from today; visitors read both languages in any letter case; a scheduled version waits; restore; the audit log; ended from the take-down date; archived pages gone. Test 021 lists the two new tables as invisible to visitors.
- Unit tests for adding, moving and removing blocks and questions (`lib/blocks.test.ts`, 9 tests).
- e2e `e2e/landing-pages.spec.ts`: an admin builds a contest page (adds, moves and removes blocks), Publish names the missing English link text, the page goes live and visitors read it in English and Romanian, the ended note, Not found for an unknown address, a moderator kept out, and axe on the public page and the editor at 390, 768 and 1440 px, light and night, ro and en.

## Local check run

LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- Nothing.

## Board mismatches

- None: no board draws landing pages yet.

## Questions for Robert

None blocking. Please read the new Romanian text in `src/locales/ro/landingPages.json`, and the four theme names (Prună, Auriu, Salvie, Cer).

## Follow-ups

- Ad-network ads on landing pages stay OPEN; none are built (the network is bundle 14d).
- The Sponsor block waits for approved sponsor campaigns (bundle 14b).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
