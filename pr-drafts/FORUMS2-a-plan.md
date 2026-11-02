# FORUMS-2a plan: spaces people create (S1-E8-06, #72)

- **Enums migration** `20261201100001_forums2_a_enums.sql`: reportable_type 'space'.
- **Migration** `20261201100002_forums2_a_spaces.sql`:
  - types space_age_group (under_16, 16_plus), space_readers (members, everybody), space_posting (anyone, members), space_joining (approve, open), space_banner (plum, night, forest, gold), space_member_status (pending, active), space_member_role (owner, member; moderator comes in part b);
  - tables `spaces` (owner user_id, slug, name, name_key, description, rules, the four settings, banner, forum_id) and `space_members`, RLS own-rows only, explicit grants;
  - `forums.space_id`: every space owns one hidden forum (slug "space-<slug>"), so threads, posts, quotes, read marks, sticky, lock and search work unchanged. Space forums leave forum_index(), admin_list_forums() and the public forums/forum_names policies;
  - forum_thread_is_shown() adds the space read rule; triggers on forum_threads and forum_posts refuse writers the space doesn't take; forum_thread_header_json() adds space and a space-aware can_reply;
  - functions: space_age_group_of(), space_may_read(), space_card_visible(), space_may_post(), space_json(), create_space(), update_space(), space_page(), space_list(), join_space(), leave_space(), space_join_requests(), decide_space_join_request(), space_name_available();
  - reporting branches for 'space', case content, notification address; data export and account deletion rows; rate limit space_create.
- **Database test 227**: the age rules (criteria 2, 3, 6, 7), reading, posting, joining and approval, policies allowed and denied, no user ID.
- **Screens**: /spaces (list), /spaces/new (create form, board 5.3), /spaces/:slug (space page with threads), /spaces/:slug/new (new thread), /spaces/:slug/settings (owner), join requests panel; Spaces card on the forum index.
- **Seed**: two spaces (16+ and under-16) plus a staging top-up.
- **e2e**: `spaces.spec.ts`.
- **Docs**: code-tour, README, board-fixes, decisions OPEN note.
