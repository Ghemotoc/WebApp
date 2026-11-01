<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E13-01 (Privacy settings). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 8 PRIVACY, part a: Settings › Privacy, with who can see your profile, who can message you, "Show when I'm online" (off by default) and who can see your library. Under-18s start on the most private value of each (GDPR art. 25(2)). Board: Settings 6.3, the Privacy tab.

## What changed

- **Database:** `20261114100001_s1_e13_01_privacy_settings.sql`. There is no new table, so no new policy; every read and write goes through functions.
  - New columns on `profiles`:
    - `profile_visible_to`: everyone, people with an account, or people the owner follows. When empty, it means the age group's default: everyone for adults, people they follow for under-18s.
    - `library_visible_to`: only me (everyone starts here), people I follow, or everyone.
    - `last_active_at`: kept only while "Show when I'm online" is on.
  - `my_privacy_settings()` reads the choices with the defaults already filled in. `set_profile_audience()`, `set_library_audience()` and `set_shows_online_status()` save them. Read-only accounts can change them too, because hiding yourself is a protection. Switching online status off clears the last active time.
  - Limited profiles: `get_writer_profile()` answers a visitor who isn't allowed the whole profile with no bio and no join month, and says so (`is_limited`). The pen name, stories and numbers still show. `get_story_page()` and `search_writers()` use the same rule for the bio (`bio_for_caller()`).
  - The library on the profile: a new story list, `reader_library` (its key is the username), answers only visitors the owner allows. The profile says whether the visitor may see it (`library_open`).
  - The online dot:
    - `note_i_am_online()` records nothing unless the switch is on.
    - `who_is_online(handles)` answers who shows as online to the caller: the person turned it on, was active in the last 5 minutes, follows the caller, and neither blocks the other.
    - The nightly job `forget-old-activity` clears last active times more than a day old.
- **Screens:**
  - **Settings › Privacy** (`src/features/privacy/`), as a panel like the others:
    - radio buttons for the profile and the library, saved at once, with the "Default for under 18" pill on the under-18 default;
    - a "Who can message you" line with a Change link to Settings › Messages, which still owns that choice, so the two can never disagree;
    - the online switch;
    - for under-18s, the note "every setting here started at its most private choice".
  - **The profile:**
    - a limited view says "<name> shares the rest of their profile with fewer people";
    - when the owner allows it, a library shelf "<name>'s library" shows, with "View more" to `/u/<username>/library`;
    - on your own profile, the shelf has a "Who can see this … Change" line.
  - **The online dot** appears by the name on the profile, in the chat header and in the chat list. It has the word "Online" for screen readers, so colour isn't the only sign. A heartbeat in the app shell sends a beat every minute, only while the switch is on and the tab is in front.
  - **The Library page:** the "Private" note now follows the choice ("Private", "Shared" or "Public") and has the Change link that was left out until this story.
- **Text:** new `privacy.json`; additions to `people.json` and `discovery.json`; the old `private` note moves out of `library.json`. All in ro and en.
- **Docs:**
  - `docs/code-tour.md`, `supabase/README.md`, `docs/retention.md` (rows for the last active time and the choices) and `docs/board-fixes.md`;
  - `docs/runbooks/scheduled-jobs.md`, which also gains the missing `purge-deleted-chats` row from part 7d;
  - READMEs for privacy and people.

## How it was tested

- **pgTAP `209-privacy-settings` (43 tests):**
  - **Defaults:** an adult's starting values; an under-18 on the most private value of every setting (criterion 2).
  - **Refusals:** signed out, and an empty choice for each setter.
  - **Profile visibility:**
    - "members" gives a signed-out visitor the limited profile (no bio, no join month, pen name kept, no bio on the story page), while a member sees everything;
    - "people I follow" limits a non-followed member everywhere, search included, until the owner follows them;
    - the owner always sees their own.
  - **Library visibility:** only me (others see an empty list), people I follow and everyone, signed-out visitors included.
  - **Online status:**
    - nothing is kept while the switch is off;
    - the dot shows only to people the person follows, goes after 5 minutes away and never shows across a block;
    - switching off forgets the time;
    - the nightly job clears old times and is scheduled.
- **e2e `privacy-settings.spec.ts`:**
  - an adult's four settings, then "Only people with an account", and a signed-out visitor gets the limited profile without the bio (criterion 1);
  - teen_17 on the most private values with the under-18 note (criterion 2);
  - teacher's library shown to everyone appears on the Library page note, on the profile and on its See all page;
  - blocker's dot shows to adult_writer, whom they follow, and not to teacher;
  - axe and no sideways scroll on Settings › Privacy at 390, 768 and 1440 px, light and night, ro and en.
- **Vitest:** `privacy.test.ts` checks how the answers are mapped and the errors the screen relies on.
- **Screenshots:** checked by eye: Settings › Privacy for an adult and a 17-year-old, the limited profile, the profile's library shelf and the online dot, at 1440 and 390 px.

## Local check run

On Node 24, locally:

- Static checks (lint, typecheck, types:check, i18n:check, migrations:check, Prettier, the third-party build check) all pass.
- Vitest: 989 of 989 pass.
- Database (pgTAP): 119 files, 2,716 tests, all pass, including the new `209-privacy-settings` (43 tests).
- Wrangler compiles the Pages Function.
- End to end (`privacy-settings`, `writer-profile`, `library`, `messages`, `message-settings`, `epic-s1-e5`): 68 passed and 1 failed on the first run. The under-18 test looked for "People you follow" as the whole line, but it shared a line with Change. The words are now in their own span, and `privacy-settings` passes in full (16 passed).
- Screenshots of Settings › Privacy (adult and 17-year-old), the limited profile, teacher's library shelf and the online dot at 1440 and 390 px were checked by eye.

## By hand

- Nothing on staging: no SQL top-up and no new secret. The nightly job is created by the migration.

## Board mismatches

In `docs/board-fixes.md`:
- Privacy is a panel, not a tab. "Who can message you" is a line with Change, because the radios and "Let adults message me" live in the Messages panel.
- "Where you are" isn't in the Privacy panel: the county is in What you like, and the country comes from the connection.
- The library hint names the three shelves, because there are no reading lists yet.
- The profile hint says "your bio and the month you joined", because there is no public followers list or forum yet.

## Questions for Robert (OPEN or not in the story, built as proposals)

- **What a limited profile hides:** the bio and the join month. The pen name, avatar, stories and numbers still show, because they appear on published work anyway.
- **Library default:** "Only me" for everyone, adults included (the board only marks it as the under-18 default). Until now the library was always private.
- **Who sees the online dot:** the people you follow, as the board says, and only for 5 minutes after you were last active.
- **Teenagers:** under-18s may switch the online dot on and widen their profile or library themselves (criterion 2 only sets where they start).

## Follow-ups

- Followers lists and forum activity must follow `profile_is_open_to()` when they arrive (S1-E8).
- Data export (part b) should include these choices.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
