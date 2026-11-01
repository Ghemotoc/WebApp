# Messages

One-to-one private messages and message requests. Built by S1-E9-01 (bundle MESSAGES, part b) on the rule from S1-E9-03 (`can_message()`). Board: `design/boards/Messages.dc.html` (5.5).

- `components/MessagesPage.tsx`: `/messages` and `/messages/:handle` (the other person's username). Three columns from 1024 px (`ChatList`, `ChatPanel`, `AboutChatPanel`); one at a time below that.
- `components/ChatList.tsx`: "Chats", the + (`NewChatButton`, opens a chat by username), All chats and Requests, `MessagesRulesNotice` and the rows (`ChatListItem`, `ChatAvatar`).
- `components/ChatPanel.tsx`: one chat: `ChatMessages` (bubbles, Report beside the other person's), then `RequestActions` for a request to the reader, `MessageComposer` when they may write, or a note ("waiting in their requests", or the neutral "isn't taking messages right now").
- `components/MessagesNavLink.tsx`: Messages in the top bar with the number of chats with new messages, while signed in (passed to `TopBar` as `navigationEnd`).
- `api/messages.ts` and `hooks/useMessages.ts`: `my_conversations()`, `conversation_with()`, `send_message()`, `answer_message_request()`, `mark_conversation_read()`, `unread_message_count()` and `my_message_settings()`. New messages arrive by asking again (5 s in a chat, 15 s for the list, 1 minute for the top bar).
- Text: `src/locales/{ro,en}/messages.json`, loaded with the page (`registerMessagesTranslations.ts`); the top bar's words are in `common.json`.
- The database side: `supabase/migrations/…_s1_e9_01_private_messages.sql`; tests `206` and `e2e/messages.spec.ts`.
- `components/ChatHeader.tsx` and `ChatBlockDialog.tsx`: Block and Report in the chat header (S1-E9-02); the moderator reads a reported message with up to 20 before it in `src/features/moderation/components/CaseMessagePanel.tsx`.
- `components/MessageSettingsSection.tsx`: Settings › Messages: who may start a chat (everyone, people you follow, nobody) and, for 16 and 17-year-olds, "Let adults message me" (S1-E9-04). `MessageSettingsLink.tsx` is the "Change" and "Message settings" link to it.
- `components/DeleteChatControl.tsx`: Delete chat in About this chat, for the reader only (S1-E9-04). `hooks/useMessageSettings.ts` holds the settings and Delete chat hooks.
- The clean-up: `purge_deleted_chats()`, nightly, deletes the messages of chats both people deleted, keeping reported ones while needed (`…_s1_e9_04_message_settings_and_retention.sql`; tests `208`, `e2e/message-settings.spec.ts`). The epic check is `e2e/epic-s1-e9.spec.ts`.
