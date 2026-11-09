# People

Writer profiles, blocks and follows. Built by PEOPLE-1: S1-E5-05 (writer profile page and blocks) and S1-E6-05 (follow a writer or a story).

- `components/WriterProfilePage.tsx`: screen 6.1 at `/u/:handle` (ProfileHeader, ProfileStories, ProfileSafetyCard). Board: `design/boards/Profile.dc.html`.
- `components/ProfileLibrary.tsx`: the person's library shelf on their profile when they let the reader see it, with "Who can see this" on their own (S1-E13-01; the choice is in `src/features/privacy/`). Since S1-E13-01 `ProfileHeader` shows the limited profile's note and the online dot.
- `components/FollowButton.tsx`: `<FollowButton target={{ kind: 'writer', handle }} | {{ kind: 'story', slug }} targetLabel />`, used on the profile and on the story page (writer card and header).
- `components/BlockDialog.tsx`, `ProfileSafetyCard.tsx`: Report (the shared ReportButton) and Block; Unblock when the reader already blocks the person.
- `components/FollowersDialog.tsx`: the writer's own followers, only on their own profile (Q50).
- `components/PeopleDialog.tsx`: the native `<dialog>` frame both dialogs use.
- `registerPeopleTranslations.ts`: the `people` text namespace and `usePeopleTranslation()`, added when a people component first renders (kept out of the main bundle).
- `hooks/`, `api/`: one file per database call: `get_writer_profile()`, `writer_follow_state()` / `story_follow_state()`, `follow_writer()` / `follow_story()`, `my_followers()`, `set_block()`, `my_blocked_accounts()`.
- `lib/formatting.ts`: the join month, the short numbers and the avatar's initials.
- Settings' bio field and "Blocked accounts" list are in `src/features/account/components/` and use this folder's hooks.
- The database side: `supabase/migrations/…_s1_e5_05_profiles_and_blocks.sql` and `…_s1_e6_05_follows.sql`; tests `143` and `144`.
- Who may message whom (S1-E9-03): `get_writer_profile()` answers `can_message` for the signed-in visitor, and `ProfileHeader` shows the neutral "isn’t taking messages right now" note when it is false, whatever the reason. The rule is `can_message()` in `…_s1_e9_03_messaging_rules.sql`; test `205`.
- Message (S1-E9-01): `ProfileHeader` links to `/messages/:handle` when `can_message` is true (`src/features/messages/`).
- Reader levels (G7a): `components/ReaderLevelPill.tsx` (beside the writing rank above the name), `ReaderLevelPanel.tsx` with `ReaderLevelLadder` and `ReaderLevelProgressBar` (the Reading level card), `lib/readerLevels.ts`, `api/readerLevel.ts` and `hooks/useReaderLevel.ts` read `profile_reader_level()`. The switch is in `src/features/privacy/`. The database side: `…_g7a_reader_levels.sql`; tests `314` and `e2e/reader-levels.spec.ts`.
