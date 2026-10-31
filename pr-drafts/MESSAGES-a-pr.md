<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E9-03 (Who may message whom). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 7 MESSAGES, part a: the one rule every later messaging part asks before a conversation or a message request starts, plus the neutral note on a profile (board Messages 5.5, "What an adult sees on your profile").

## What changed

- **Database:** `20261110100001_s1_e9_03_messaging_rules.sql`.
  - `message_audience` enum (`everyone`, `people_i_follow`, `nobody`) and `profiles.messages_from` (empty means the age group's default). The settings screen comes with part d (S1-E9-04).
  - `can_message(sender, recipient)`, internal: two different live profiles; the sender is active; no block either way; the age rules; the recipient's setting.
  - The age rules (Q6, Q13): an under-16 and an adult never, teachers included, whatever the settings; a 16 or 17-year-old and an adult only with the teen's "Let adults message me" on (S1-E2-06); under-18s with each other and adults with each other follow the normal rules. An age we can't work out counts as under 16.
  - `get_writer_profile()` gains `can_message` for the signed-in visitor: true or false on someone else's profile, null signed out or on one's own. It never says why.
- **Screen:** the profile header shows "<name> isn’t taking messages right now." when `can_message` is false (and the visitor hasn't blocked them). The same words for an age rule, a setting or a block, so nothing tells an adult anyone's age.
- **Text:** `people.json` in ro and en.
- **Docs:** `docs/retention.md`, `docs/code-tour.md`, `supabase/README.md` and the people README.

## How it was tested

- **pgTAP `205-messaging-rules` (26 tests):** the defaults; a teen and an adult in both directions with the switch off and on, and the teen's own setting still counting; an under-16 and an adult never, even with the switch on, a follow or "everyone"; under-18s with each other; nobody, people I follow, a block either way, a suspended sender, oneself; the profile carries only `can_message`, never an age or the reason, and nothing signed out or on one's own.
- **e2e `messaging-rules.spec.ts` (15 tests):** an adult sees the note on a 14-year-old's and a 17-year-old's profile and not on another adult's; the note goes once the teen turns the switch on and follows the adult; a signed-out visitor sees nothing; axe at 390, 768 and 1440 px, light and night, ro and en.
- `writer-profile`, `follows`, `onboarding` and `epic-s1-e5` run again unchanged.

## Local check run

Run on Node 24.

- **Static checks:** prettier, lint, typecheck, types:check, i18n:check, migrations:check and third-party:check (after `npm run build`) all pass.
- **Unit tests:** `npx vitest run` passes 980 of 980.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 115 files, 2,576 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** `messaging-rules`, `writer-profile`, `follows`, `onboarding` and `epic-s1-e5`: 67 passed. The full run is at the end of the bundle (part d).

## By hand

- Nothing: no staging top-up and no new secret.

## Board mismatches

- None. The board's note is drawn on a 14-year-old's profile; it shows the same way for every reason.

## Questions for Robert (OPEN or not in the story, built as proposals)

- The teen's switch counts both ways: with it off, a 16 or 17-year-old can't start a chat with an adult either, so they can't open a conversation an adult then answers in. Is that right?
- Adults take messages from everyone unless they choose otherwise (the story only sets the under-18 default, people they follow). Should adults default to people they follow too?
- An age we can't work out counts as under 16, the safest reading.

## Follow-ups

- The Message button and conversations are part b (S1-E9-01); the settings to change `messages_from` are part d (S1-E9-04).
- Story issues for S1-E9 once the Sync story issues job can run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
