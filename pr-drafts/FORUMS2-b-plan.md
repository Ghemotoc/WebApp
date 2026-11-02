# FORUMS2-b plan: space moderators (S1-E8-07, issue #73)

Scope narrowed from the bundle's part b: moderators, their powers, the space log and the platform
override. Join notifications, banner pictures, the search filter by space and the space-forum
guard on admin_save_forum move to part c.

- Migrations: `20261202100001_forums2_b_enums.sql` (space_member_role 'moderator'),
  `20261202100002_forums2_b_space_moderators.sql` (space_power enum, space_members.powers,
  space_moderation_log with RLS and its policy, space_may_act(), log_space_action(),
  set_space_moderator(), space_moderators(), space_member_list(), space_log(),
  remove_space_member(); requests, update_space and thread pin/lock use the powers; export and
  deletion rows).
- Tests: 228-space-moderators (38), 227 and 021 updated; unit spaceModeration.test.ts;
  e2e space-moderators.spec.ts.
- Screens: Moderators card on settings, SpaceRunsCard lists moderators, SpaceToolLinks,
  /spaces/:slug/members, /spaces/:slug/log.
