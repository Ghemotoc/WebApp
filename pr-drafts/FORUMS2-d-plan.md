# FORUMS-2 part d: forum signatures (S1-E8-08, issue #74)

## Story
- Signature: at most 300 characters, three lines and one still picture; animated pictures refused (canvas 6.1).
- Hidden at phone width (Q25).
- A moderator flags an inappropriate signature or banner: the person is warned; it is removed if not changed within 24 hours (Q29).

## Database (`…_forums2_d_enums.sql`, `…_forums2_d_signatures.sql`)
- `profiles.signature` (check: 1 to 300 characters, at most 3 lines), `profiles.signature_picture_id`.
- `signature-pictures` bucket (1 MB), `signature_picture` kind, four storage policies, `register_signature_picture()`.
- `set_my_signature()`, `my_signature()`, `profile_signature()`, `signature_json()` (internal), `space_banner_change_request()`.
- `customisation_change_requests` with one select policy (own or staff); `admin_request_customisation_change()`; close-on-change triggers; `remove_unchanged_customisations()` on cron every 10 minutes; the `customisation_change_requested` notification (required).
- `forum_post_json()` adds `signature`. Data export and account deletion rows.
- Test 230 (38 tests), test 021 line.

## Screens
- Settings: "Forum signature" (#forum-signature): words with live counts, one still picture, the open request.
- Profile: the board 6.1 card.
- Thread: the signature line under each live post, `hidden md:block`.
- Notifications: the change request, linking to Settings or the space's settings.
- Staff: "Ask for a change" on the account page and on the space's banner card.
- Moving pictures: refused in the app (`isAnimatedPicture()`), held by the server check.

## Tests
- Database 230; unit: animated-picture, signatureLimits, picture-check, notificationText; e2e/forum-signatures.spec.ts.
