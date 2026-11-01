# FORUMS-1e plan: sticky, locked and Don't bump (S1-E8-05, #71)

- Migration `20261129100001_forums1_e_sticky_and_locked.sql`:
  - columns `is_sticky`, `locked_at`, `locked_by_user_id`, `lock_reason` and `bumped_at`;
  - the functions `forum_thread_for_moderation()`, `admin_set_forum_thread_sticky()`, `admin_lock_forum_thread()` and `admin_unlock_forum_thread()`, which check moderation staff, need a reason and write the audit log;
  - `reply_to_forum_thread(…, bump)`, which refuses a locked thread;
  - updated `forum_thread_summary_json()`, `forum_thread_list()` (sticky first, ordered by `bumped_at`) and `forum_thread_header_json()` (lock, `can_reply`, `can_moderate`).
- Test 225: criteria 1 to 3, staff-only, the reason and the audit log.
- Screens:
  - Pinned and Locked pills in ThreadRow;
  - LockedThreadNote in place of ReplyForm;
  - ThreadModeration in the side column;
  - the "Don't bump" tick box;
  - a `locked` failure.
- e2e: `forum-sticky-and-locked.spec.ts`.
- Docs: code-tour, README and board-fixes.
