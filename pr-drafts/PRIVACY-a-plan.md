# PRIVACY-a plan: privacy settings (S1-E13-01)

Story: Settings › Privacy with profile visibility, who can message me, online status (off by default) and library visibility; under-18s start on the most private value of each (GDPR art. 25(2)).

## Database (one migration, 2026111410000x)
- Enums `profile_audience` (everyone, members, people_i_follow) and `library_audience` (only_me, people_i_follow, everyone).
- profiles: `profile_visible_to profile_audience` (null = the age group's default: everyone for adults, people_i_follow under 18), `library_visible_to library_audience not null default 'only_me'`, `last_active_at timestamptz` (kept only while online status is on).
- Internal helpers: `profile_audience_of(profiles)`, `profile_is_open_to(profiles, viewer)`, `library_is_open_to(profiles, viewer)`, `bio_for_caller(profiles)`.
- `my_privacy_settings()`, `set_profile_audience()`, `set_library_audience()`, `set_shows_online_status()` (off clears last_active_at).
- `note_i_am_online()` (only when switched on) and `who_is_online(handles)`: someone shows as online to the people they follow, active within 5 minutes, no block either way.
- `get_writer_profile` redefined: limited view (no bio, no join month) when the profile isn't open to the visitor; `library_open` and, on one's own profile, `library_audience`.
- `get_story_page` and `search_writers` redefined so the bio follows the same choice.
- List kind `reader_library` (key: the username) in `list_holds_story` and `is_story_list_kind`, for the profile's library shelf and its See all page at /u/<username>/library.
- Nightly: clear last_active_at older than a day.
- No new tables, so no new policies; pgTAP 209 covers every function and the defaults.

## Screens
- New feature folder `src/features/privacy` (api, hooks, components, README, privacy.json in ro and en).
- `PrivacySettingsSection` (id "privacy") on /settings before Notifications: profile radios, a "Who can message you" line with Change (#messages), "Show when I'm online" switch, library radios; under-18 note; "Default for under 18" pills.
- `PresenceHeartbeat` in AppLayout: calls note_i_am_online every minute while the tab is visible and the switch is on.
- `OnlineDot` + `useOnlineHandles`: on the profile header, the chat header and the chat list.
- Profile: limited-view note; `ProfileLibrary` shelf when open, with a "Who can see this" line on one's own.
- /u/:readerHandle/library See all page through StoryListPage.
- Library page: "Who can see your library: Only me · Change" (board-fixes row for 3.7).

## Tests
- pgTAP 209; e2e privacy-settings.spec.ts (criteria 1 and 2, the profile limits, library shelf, online dot) with axe on /settings#privacy at every view; vitest for the api mapping.

## Docs
- code-tour, supabase README, retention (last_active_at), board-fixes (Privacy tab as a panel, "Where you are" left out, library line), privacy README.
