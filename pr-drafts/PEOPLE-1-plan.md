# PEOPLE-1 plan: writer profile with report and block, follow a writer or a story

Builder thread, 24 Oct 2026. Stories: S1-E5-05 (#issue found at PR time), S1-E6-05. Branch
`claude/people-1-profiles-follows`, cut from `main` at `cd46a85` (after SAFE-1 #197).

## Files

| Area | Files |
| --- | --- |
| Migrations | `20261026100001_s1_e5_05_profiles_and_blocks.sql`, `20261026110001_s1_e6_05_follows.sql` |
| pgTAP | `143-writer-profile-and-blocks.test.sql`, `144-follows.test.sql` |
| Seed | `supabase/seed.sql`: blocker blocks blocked; bios for adult_writer and blocker; adult_writer follows nobody, teen_17 follows adult_writer and one story. Staging top-up `supabase/staging-topups/PEOPLE-1.sql` (idempotent, no accounts) |
| Front end | `src/features/profiles/` (README, api, hooks, components: WriterProfilePage, ProfileHeader, ProfileStats, ProfileStories, ProfileSafetyCard, BlockDialog, FollowersDialog, BioEditor in Settings), `src/features/follows/` (FollowButton, api, hook), route `/u/:handle`, story page writer card gets "See profile", follower count and Follow, story header gets "Follow story" |
| Locales | `src/locales/{ro,en}/profiles.json` (new namespace), additions to `reading.json` |
| e2e | `e2e/writer-profile.spec.ts`, `e2e/follows.spec.ts` (axe at 390, 768, 1440) |
| Docs | `docs/code-tour.md`, `docs/mocks.md` (blocks stub removed; avatar stays initials), `docs/analytics-events.md` (candidates), `src/features/*/README.md` |

## Migrations, RLS and tests

- `profiles.bio` (text, at most 300 characters, plain text, trimmed, ș/ț normalised) and
  `profiles.shows_online_status` (boolean, default false; nothing shows online status in March).
  `set_my_bio(bio)`: `is_active_member()`.
- `blocks (id, user_id → profiles, blocked_user_id → profiles, created_at)`, unique pair, no
  self-block. Policy `blocks_select_own` (the blocker reads their own blocks). Grants: select to
  authenticated. Writes only through `set_block(handle, should_block)` (any signed-in account,
  even read-only: blocking is a safety tool). Blocking also removes follows both ways.
- Real `is_blocked_with(other)` replaces the stub (either direction). `get_story_page()` now
  also hides a story whose writer and reader block each other.
- `get_writer_profile(handle)`: null for an unknown, deleted or moderated-away profile and when
  the writer blocked the caller. Answers handle, display name, pen name, bio, joined month,
  counts (stories, published chapters, reads, followers), `is_me`, `i_follow`, `i_blocked`, and
  the stories the caller may read (rating, blocks, moderation). Never: user ID, birth year,
  age check, email, online status.
- `follows_users (user_id, followed_user_id)`, `follows_stories (user_id, story_id)`, unique
  pairs, `*_select_own` policies, grants select to authenticated. `follow_writer(handle,
  should_follow)`, `follow_story(story_slug, should_follow)`: `is_active_member()`; a blocked
  pair answers `{following:false}` with no error; self-follow refused. `my_followers()`: the
  writer's own list only. Counts public through the profile and `get_story_page()`.
- pgTAP: allowed and denied for `blocks_select_own`, `follows_users_select_own`,
  `follows_stories_select_own`; grants test 003 still passes.

## Criteria to tests

| Criterion | Test |
| --- | --- |
| E5-05 profile shows name, avatar (initials), bio ≤300, stories, follow, report, block | 143 shape; e2e writer-profile |
| E5-05 never shows birth year, age check, email, online status | 143 (keys absent); e2e |
| E5-05 avatar upload with picture check | stubbed: `picture_uploads` off, initials only; lands with SAFE-4 (S1-E10-05) |
| Blocks respected everywhere | 143 (profile, story page, chapter); e2e blocker/blocked |
| E6-05 follow and unfollow at any time | 144; e2e follows |
| E6-05 count public, list writer-only | 144 (`my_followers()` and policy denied); e2e |
| E6-05 blocked follow fails silently | 144; e2e |

## i18n

New namespace `profiles` (ro and en): page title, eyebrow, joined, stats with plurals, empty
states, block dialog, followers dialog, bio editor. `reading`: follow story, see profile.

## Stubs

Rank chip (S1-E8-09), Message (S1-E9), forum posts, certificates, ad slot: not shown in March.
Avatar: initials until the picture check. Online status: stored opt-in, off, never shown.
