# MESSAGES-b plan: S1-E9-01 one-to-one private messages

Bundle 7 MESSAGES, part b. Builds on part a's `can_message()` (S1-E9-03).

## Choices
- Tables: `conversations` (one per pair, status request/accepted/declined), `conversation_members` (last_read_at; part d adds Delete chat), `messages` (text only, 1–2,000 chars, reportable `message`). No separate `message_requests` table: a request is a conversation's status.
- A first message to someone who doesn't follow the sender is a request; the sender can't send more until accepted. Delete request = declined; sender never told and still waits (proposal). The recipient writing back accepts (proposal).
- An accepted chat keeps going after setting changes; blocks, age rules and the sender's state are asked every time. Turning 18 never cuts a chat.
- Staff accounts can't be written to (members use moderator mail).
- Limits: new_conversation 20/h and message 200/h, the same for new accounts (Q61; proposals).
- Reportable from b (rule 6): owner/summary/content/notification branches. Part c adds Block in a chat and the 20 messages of context.
- Polling (5 s chat, 15 s list, 60 s top bar), as the bell (READ-3); Realtime later.
- URLs use the other person's username, never an ID.

## Files
- migrations `20261111100001_s1_e9_01_enums.sql`, `20261111100002_s1_e9_01_private_messages.sql`; test `206-private-messages` (43); `021` gains the three tables.
- `src/features/messages/` (page, list, chat, composer, request actions, about, nav link, api, hooks, texts); TopBar `navigationEnd`; router; profile Message button.
- seed chat teacher ↔ adult_writer; `staging-topups/S1-E9-01.sql`.
- docs: code-tour, supabase README, retention, board-fixes, READMEs.
- e2e `messages.spec.ts` (28).
