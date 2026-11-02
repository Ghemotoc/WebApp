# CLASSES-b plan: the class option, the lock at the end of the school year, the waiting list and typing a code (S1-E8-11)

Part of #77. Branch `claude/classes-b-class-option`.

## Files
- Migration `supabase/migrations/20261207100001_classes_b_class_tools.sql`: `spaces.locks_at`, `next_class_lock_at()`, `space_is_locked()`, `set_class_lock()`, `class_waiting_members()`, `refuse_locked_space_edit()` trigger, redefined `space_may_post`, `refuse_space_writer`, `class_space_for_invites`, `class_invite_preview`, `join_class_space`, `space_json`, `create_class_space`.
- pgTAP `233-class-tools.test.sql` (24 tests).
- Types regenerated.
- Front end: `api/classTools.ts`, `hooks/useClassTools.ts`, `ClassLockCard`, `ClassWaitingCard`, `ClassAboutCard`, `ClassCodeForm`; edits to `NewSpacePage`, `SpaceSettingsPage`, `SpacePage`, `SpacePills`, `SpacesCard`, `SpacesPage`, `JoinClassPage`, `spaceLogText`, `spaces.ts`, `classSpaces.ts`, `forumWrites.ts`, router (`/class`).
- Locales: spaces and forums, en and ro.
- Tests: `classTools.test.ts`, `e2e/class-tools.spec.ts`.
- Docs: code-tour, spaces README, board-fixes.

## Acceptance
- Criterion 1: a teacher with the badge starts a class from the form (e2e).
- Criterion 5: a student types the code; the teacher sees who waits and why (e2e, pgTAP).
- End of school year: lock stops posts, edits, joins and codes; members still read (pgTAP, e2e).
