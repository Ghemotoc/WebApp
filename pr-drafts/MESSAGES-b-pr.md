<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E9-01 (One-to-one private messages). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 7 MESSAGES, part b: private chats and message requests, on the rule from part a (`can_message()`, S1-E9-03). Board: Messages 5.5.

## What changed

- **Database:** `20261111100001_s1_e9_01_enums.sql` (`reportable_type` gains `message`; `conversation_status`) and `20261111100002_s1_e9_01_private_messages.sql`.
  - `conversations` (one per pair: who started it, who it went to, request, accepted or declined), `conversation_members` (each person's last read) and `messages` (text only, 1 to 2,000 characters, kind user_content, reportable). Each person reads only their own rows; every write goes through the functions.
  - `send_message(handle, words)`: a new chat asks `can_message()` and never goes to a staff account (members write to the team through moderator mail). It starts accepted when the recipient follows the sender, otherwise it is a request and the sender can't send more until it is accepted (criterion 2). An accepted chat asks again only what must never lapse: the sender is active, no block either way, the ages still allow it. So turning 18 or changing a setting never cuts off a chat already going (S1-E9-03 criterion 6). Every refusal is the same neutral "isn't taking messages right now".
  - `answer_message_request()`: accept, or delete (it leaves the recipient's lists; the sender is never told and still waits). Writing back to a request accepts it.
  - `my_conversations()`, `conversation_with(handle)`, `mark_conversation_read()`, `unread_message_count()` and `my_message_settings()` (the reader's own setting and age group only).
  - Hourly limits `new_conversation` (20) and `message` (200), the same for new accounts (Q61).
  - Reporting (rule 6): the `message` branches of `reportable_item_owner()` (only the two people in the chat can report, so a message's existence never leaks), `reportable_item_summary()` ("Private message from @…: …"), `case_item_content()` and `notification_item_json()`. A hidden or removed message is gone for the other person; its writer still sees a hidden one.
- **Screens:**
  - `/messages` and `/messages/:handle` (the other person's username, never an ID): "Your messages", the Chats list with + (start a chat by username), All chats and Requests with the waiting count, the notice about who may message you (with the age rule for under-18s), the chat with its bubbles and day lines, and About this chat (the profile link, who follows whom, your setting, messages from adults for 16 and 17-year-olds, who can read messages). From 1024 px three columns; narrower, one at a time.
  - The bottom of a chat is the message box, Accept request and Delete request, "Your message is waiting in …'s requests", or the neutral note.
  - Each message from the other person has Report (the shared dialog).
  - The top bar shows Messages with the number of chats with new messages while signed in.
  - The profile shows Message when the visitor may write.
- **Text:** `messages.json` (new), `common.json`, `people.json`, `reporting.json` and `notifications.json`, in ro and en.
- **Seed:** one accepted chat between `teacher` and `adult_writer`; `supabase/staging-topups/S1-E9-01.sql` adds it on staging.
- **Docs:** `docs/code-tour.md`, `supabase/README.md`, `docs/retention.md`, `docs/board-fixes.md`, and the messages and people READMEs.

## How it was tested

- **pgTAP `206-private-messages` (43 tests):**
  - a request: it waits in the recipient's requests and counts as unread, the sender can't send more, accepting lets both write;
  - deleting a request: it leaves the recipient's lists, the sender's view still says it waits and they still can't write; writing back to a request accepts it;
  - a first message to someone who follows the sender starts accepted; an adult can't write to a 14-year-old, the refusal never says why and nothing is stored; a staff account can't be written to;
  - an accepted chat carries on after the recipient chooses "nobody"; a block stops it and hides it from both lists;
  - empty and over-long messages, an unknown username and writing to the table directly are refused; unread and mark-read;
  - `conversations_select_member`, `conversation_members_select_own` and `messages_select_member` allowed and denied; a hidden message is gone for the other person and still there for its writer;
  - reporting: the recipient can, someone outside the chat can't, the queue's summary.
  - `021-signed-out-reads` gains the three tables.
- **e2e `messages.spec.ts` (28 tests):** the seeded chat, a new message reaching teacher with the top bar count; a request from the profile's Message button that waits until accepted; a deleted request; no Message on a 14-year-old's profile and the neutral note in the chat; Report beside the other person's messages; axe and no sideways scroll on `/messages` and a chat at 390, 768 and 1440 px, light and night, ro and en.
- **Screenshots:** checked by eye: a chat at 1440, 768 and 390 px, the list at 390 and the profile's Message button.

## Local check run

Run on Node 24.

- **Static checks:** prettier, lint, typecheck, types:check, i18n:check, migrations:check and third-party:check (after `npm run build`) all pass.
- **Unit tests:** `npx vitest run` passes 982 of 982.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 116 files, 2,619 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** `messages`, `messaging-rules`, `writer-profile`, `follows`, `library`, `sign-in`, `report-dialog`, `staff-shell` and `notifications`: 167 passed. The Romanian Message button's accessible name first didn't start with its visible word (axe, label-content-name-mismatch); fixed and `writer-profile` passes again. The full run is at the end of the bundle (part d).

## By hand

- Staging: run `supabase/staging-topups/S1-E9-01.sql` once (safe to run twice; adds no accounts). No new secret.

## Board mismatches

All in `docs/board-fixes.md`:
- Under 1024 px one column at a time instead of the three columns stacked.
- The chat header shows the name and @username, not the writer's latest story.
- Report is the shared text button, not a flag icon; Block in a chat, the report's context, the settings' "Change" links and Delete chat come with parts c and d.
- A request shows as the chat itself with Accept request and Delete request under it.

## Questions for Robert (OPEN or not in the story, built as proposals)

- Images in messages are OPEN: off, as the story proposes.
- A deleted request: the sender is never told and can't send another to that person. Is that right, or should they be able to try again after some time?
- Writing back to a request accepts it, as Accept does.
- Staff accounts can't be written to; members reach the team through moderator mail.
- The hourly limits: 20 new chats and 200 messages, the same for new accounts (Q61).

## Follow-ups

- Part c (S1-E9-02): Block in a chat and up to 20 messages of context in a message report. Part d (S1-E9-04): message settings, Delete chat and the clean-up job.
- Realtime instead of asking again every few seconds, once more people use Messages.
- An email or notification for a new message (none today; the top bar shows the count).
- Story issues for S1-E9 once the Sync story issues job can run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
