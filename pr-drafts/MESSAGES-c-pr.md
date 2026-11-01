<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E9-02 (Block and report inside messages). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 7 MESSAGES, part c: Block and Report in a chat, and a reported message reaches the team with up to 20 messages before it. Board: Messages 5.5.

## What changed

- **Database:** `20261112100001_s1_e9_02_block_and_report.sql`.
  - `message_with_context(message)` (internal): the reported message and up to the 20 messages before it in the same chat, oldest first, each with who wrote it and when (criterion 2).
  - `admin_case_message(case)`: the same for the case page, for moderation staff who may see the case (safeguarding cases need the permission). Staff read private messages only through a case about one, and every read is logged as `sensitive_read.case_message` (architecture 1.8.3).
  - `case_item_content()`: a message case now carries the context too, so the safeguarding evidence pack holds the same messages.
  - Blocking from a chat is the profile's `set_block()`: it ends the follows both ways, and part b's functions already refuse messages between a blocked pair both ways. Nothing is sent to the other person (criterion 1).
- **Screens:**
  - The chat header has Block and Report (the person's profile), as drawn.
  - Block opens "Block <name>?" with the board's words: "You won’t be able to message, mention or follow each other. <name> won’t be told.", Don’t block and Block <name>. After blocking, the reader is back on Messages and the chat is gone from both lists.
  - Reporting a message says "We’ll send this message and up to 20 messages before it, so the person who checks can see what happened." The reporter gets the usual "Report sent" with a reference.
  - The moderator's case page shows "The reported message and the 20 before it": who the chat is between, the messages oldest first, the reported one marked "Reported" in words and with a border, and a line that opening them is logged.
- **Text:** `messages.json` (block), `moderation.json` (message) and `reporting.json` (dialog.messageContext), in ro and en.
- **Docs:** `docs/code-tour.md`, `supabase/README.md`, `docs/retention.md` and `docs/board-fixes.md`.

## How it was tested

- **pgTAP `207-messages-block-and-report` (23 tests):**
  - a report from the chat; the case page gets 21 messages, the reported one last and marked, Message 1 oldest (so older ones fall outside), nothing sent after it, who wrote each one and the two people;
  - a case about something else has no messages; the read is logged as a sensitive read about the writer; the evidence pack holds the same 21; the first message of a chat has no context;
  - support staff, and the reporter themselves, can't read the case's copy; no screen can call `message_with_context()`;
  - after a block neither can message the other (the blocked person is only told there is nobody by that name), a follow silently does nothing or looks missing, the follows both ways are gone and no notification is sent.
- **e2e `messages-block-and-report.spec.ts`:** adult_writer reports teacher’s message from the chat and the moderator sees it with the messages before it; teacher blocks adult_writer from the chat ("Don’t block" first, then Block) and adult_writer can no longer open it; axe and no sideways scroll on the case page with the messages panel at 390, 768 and 1440 px, light and night, ro and en.
- **Screenshots:** checked by eye: the chat header, the block dialog, the report dialog's message line and the case page panel.

## Local check run

Run on Node 24.

- **Static checks:** prettier, lint, typecheck, types:check, i18n:check, migrations:check and third-party:check (after `npm run build`) all pass.
- **Unit tests:** `npx vitest run` passes 982 of 982.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 117 files, 2,642 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** `messages-block-and-report`, `messages`, `report-dialog`, `moderation-queue`, `epic-s1-e10`, `safeguarding` and `writer-profile`: 106 passed. The full run is at the end of the bundle (part d).

## By hand

- Nothing on staging: no SQL top-up and no new secret.

## Board mismatches

In `docs/board-fixes.md`:
- The Requests card's own Report: the request's message already has its Report beside it, like every message, so the card has no second one.
- The block dialog promises no mentions; there are no @mentions yet, so when they arrive they must respect blocks.

## Questions for Robert (OPEN or not in the story, built as proposals)

- The context is read from the chat when staff open the case, not copied when the report is sent. Messages can't be edited, so it is the same text; part d will keep a reported message and its 20 before it until the retention period ends, even if both people delete the chat.
- The blocked person's view: the chat disappears for them and the person looks missing, as a blocker's profile does (S1-E5-05). That hides who blocked whom only partly; the board says only "won’t be told".

## Follow-ups

- Part d (S1-E9-04): message settings, Delete chat, the clean-up job (keeping reported messages and their context), then the epic check and the bundle's full e2e run.
- @mentions, when they come, must ask `is_blocked_with()`.
- Story issues for S1-E9 once the Sync story issues job can run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
