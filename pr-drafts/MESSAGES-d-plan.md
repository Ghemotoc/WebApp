# MESSAGES-d plan: S1-E9-04 message settings and retention, then S1-E9-QA

- Database `20261113100001_s1_e9_04_message_settings_and_retention.sql`: `set_message_audience()`, `conversation_members.deleted_at` with `delete_conversation()`, `chat_cleared_at()` used by `my_conversations()`, `conversation_messages_json()` and the `messages_select_member` policy; `held_message_ids()` and the nightly `purge_deleted_chats()`; setting `reported_messages_keep_days` (180, proposal).
- pgTAP `208`: settings, Delete chat for one person, the clean-up, reported messages kept then deleted, declined request kept, the cron job.
- Screens: Settings › Messages (MessageSettingsSection), "Message settings" and "Change" links, Delete chat with a confirmation; the adults switch moves from What you like to Messages.
- e2e `message-settings.spec.ts`; epic check `epic-s1-e9.spec.ts` (four journeys with adult_writer, teen_17, kid_14_ok, kid_14_waiting, blocker, moderator); the bundle's full e2e run.
