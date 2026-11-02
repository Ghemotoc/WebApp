# FORUMS2-c plan: banner pictures, join notifications, search by space

Stories: S1-E8-06 (banner, "You'll get a notification when you're in"), S1-E8-07 follow-ups, S1-E8-10 ("filter by space").

- Migration 1 (enums): picture_kind 'space_banner'; notification_kind 'space_join_request', 'space_join_approved'.
- Migration 2: spaces.banner_picture_id; picture_checks bucket/kind constraints; private bucket space-banners (5 MB); space_banner_upload_allowed(); storage policies insert (settings power), select visible, select uploader and staff, delete own; register_space_banner(); set_space_banner_picture() (logged); space_json() gains banner_picture; notifications.space_id; notify(), notification_json(), notification_category() redefined; trigger space_members_notify; trigger forums_refuse_space_forum_change.
- Tests: database 229 (33 tests, each new storage policy allowed and denied); unit tests for notification words and the space filter; e2e space-banners-and-notifications.
- Screens: SpaceBannerBand on the header, SpaceBannerPictureCard on settings (behind picture_uploads), notification rows for the two kinds, "Space: <name>" in the forum search filter, the lock hint names the space's log in a space.
- Docs: code tour, spaces README, board fixes.
