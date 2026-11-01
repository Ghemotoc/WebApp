<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E9-04 (Message settings and retention) and S1-E9-QA (Epic check: Private messages). The story issues don't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 7 MESSAGES, part d, the last: message settings, Delete chat and how long messages are kept, then the epic check over all four messaging stories and the bundle's full e2e run. Board: Messages 5.5.

## What changed

- **Database:** `20261113100001_s1_e9_04_message_settings_and_retention.sql`.
  - `set_message_audience()`: everyone, people I follow or nobody (criterion 1). Adults start on everyone and under-18s on people they follow (proposal); anyone may pick any of the three and the age rules still apply on top. "Let adults message me" stays `set_adults_may_message()` (16 and 17 only).
  - Delete chat: `delete_conversation(handle)` stamps `conversation_members.deleted_at` for the caller only. The chat leaves their list and its messages are gone for them (in `my_conversations()`, `conversation_with()` and the `messages_select_member` policy, through `chat_cleared_at()`). If someone writes again the chat comes back with only the new messages. The other person isn't told. A request waiting for the caller's answer keeps its own Delete request.
  - The clean-up (criterion 2): `purge_deleted_chats()`, nightly by pg_cron (`purge-deleted-chats`, 03:35 UTC), permanently deletes every message sent before both people deleted the chat, then the empty chat. A declined request is kept, so its sender still can't write again.
  - Reported messages (criterion 3): `held_message_ids()` keeps a reported message and the 20 before it while the case is open, while an authority order preserves it, and for `reported_messages_keep_days` (180, a proposal) after the decision; the next clean-up deletes them.
- **Screens:**
  - Settings › Messages: "Who can message you" as three radio buttons saved at once, the age rule for under-18s, "Let adults message me" for 16 and 17-year-olds, and how Delete chat works. The switch moved here from What you like, so Settings has it once.
  - /messages has "Message settings", and the notice over the list and About this chat have "Change" links to it.
  - About this chat has Delete chat, with "Delete this chat?" first; afterwards the reader is back on Messages.
- **Text:** `messages.json` (settings, deleteChat), in ro and en.
- **Docs:** `docs/code-tour.md`, `supabase/README.md`, `docs/retention.md`, `docs/board-fixes.md` and the messages README.

## How it was tested

- **pgTAP `208-message-settings-and-retention` (31 tests):**
  - starting settings by age; "nobody" saved and stopping a new chat; an empty choice, an adult's adults switch and a signed-out change refused; a 17-year-old's switch saved;
  - Delete chat: gone from the caller's list and chat; `messages_select_member` allowed (the other person still reads all) and denied (the caller no longer reads what came before); a new message brings the chat back with only that message, unread;
  - the clean-up: nothing while only one deleted it; once both did, the earlier messages and then the empty chat are deleted;
  - a reported message and its 20 before it stay with the case open and 10 days after the decision, and go after 180 days; a declined request is kept; the cron job exists.
- **e2e `message-settings.spec.ts` (15 tests):** "Message settings" to Settings › Messages, "Nobody" and its notice, no Message for another adult; a 17-year-old's switch letting adult_writer write; Delete chat for one person only; axe and no sideways scroll on Settings › Messages at 390, 768 and 1440 px, light and night, ro and en.
- **Screenshots:** checked by eye: Settings › Messages for an adult and a 17-year-old, About this chat with Change and Delete chat, the confirmation, at 1440 and 390 px.

## Epic report (S1-E9-QA)

`e2e/epic-s1-e9.spec.ts` walks four journeys across the stories with `adult_writer`, `teen_17`, `kid_14_ok`, `kid_14_waiting`, `blocker` and `moderator`:
1. teen_17 turns on "Let adults message me" in Settings; adult_writer's first message starts the chat (teen_17 follows them) and both write, with the top bar count (S1-E9-03 × S1-E9-04 × S1-E9-01).
2. teen_17 reports a message, the moderator reads it with its context, then teen_17 blocks adult_writer from the chat and it is gone for both (S1-E9-02 × S1-E10).
3. no Message on kid_14_waiting's profile; kid_14_waiting, waiting for a parent, can't write; kid_14_ok writes to teen_17, who follows them (S1-E9-03 × S1-E2-03).
4. blocker and adult_writer both delete their chat and the clean-up deletes it for good (S1-E9-04).

- **What works:** all four journeys; axe on /messages, a chat, the case page and Settings › Messages in every view; every policy on `conversations`, `conversation_members` and `messages` has allowed and denied tests (`206`, `208`); `docs/code-tour.md` covers the epic.
- **Known gaps:**
  - no Realtime (chats ask again every few seconds);
  - no notification or email for a new message;
  - images in messages are off (OPEN);
  - kid_14_ok's profile is hidden by a seeded moderation case, so nobody can open a chat with them, though they can write and appear in the other person's list. That matches what a hidden profile does elsewhere.
- **Stubs or mocks:** none for messaging (`docs/mocks.md` unchanged).

## Local check run

On Node 24, locally:

- Static checks (lint, typecheck, types:check, i18n:check, migrations:check, Prettier, the third-party build check) all pass.
- Vitest: 982 of 982 pass.
- Database (pgTAP): 118 files, 2,673 tests, all pass, including the new `208-message-settings-and-retention` (31 tests).
- Wrangler compiles the Pages Function.
- This part's end-to-end files (`message-settings`, `epic-s1-e9`, `onboarding`, `messages`): 75 passed.
- Full end-to-end run for the bundle: the three parallel shards raced each other (one shard's maintenance-mode test showed "Actualizăm …" to the others), so the 87 files with failures were re-run one at a time: 1,287 passed, 4 failed. Those four were `reader-performance` "first paragraph within 2 seconds" (fails on main too), `email-change` and `notifications` (the disk filled up for a moment) and the `settings-admin` axe check at 390 px. After `npx supabase db reset`, those three files pass on their own (31 passed).
- Screenshots of Settings › Messages (adult and 17-year-old), About this chat and the Delete chat dialog at 1440 and 390 px were checked by eye.

## By hand

- Nothing on staging: no SQL top-up and no new secret. The nightly job is created by the migration.

## Board mismatches

In `docs/board-fixes.md`:
- The settings hint: the board says under-18s "can also pick Nobody", but the story lets anyone pick any of the three, so the hint says where they start and what Nobody does.
- Delete chat asks for confirmation first.

## Questions for Robert (OPEN or not in the story, built as proposals)

- How long a reported message and its context are kept after the decision: 180 days (the reports' own retention is OPEN).
- Under-18s start on "People you follow", adults on "Everyone", and anyone may pick any of the three.
- A declined request is never cleaned up, so its sender can't write to that person again.
- A reported message in a chat that neither person deleted stays part of the chat; the clean-up only acts on chats both deleted.

## Follow-ups

- Realtime and a new-message notification once more people use Messages.
- @mentions, when they come, must respect blocks.
- Story issues for S1-E9 once the Sync story issues job can run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
