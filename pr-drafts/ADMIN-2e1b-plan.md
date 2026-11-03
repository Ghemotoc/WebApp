# ADMIN-2e1b plan: Moderation › Pictures to check (bundle 12, part e1, second half)

Source: /mnt/project-files/builder/bundle-12-pictures-bans-avatars-brief.md, sections 2 and 3.

## Changes
- Migration 20261220100002: case_source value picture_review (own file: a new enum value can't be used in its own transaction).
- Migration 20261220100003: picture_reject_reasons setting (staff); picture_needs_person(); open_picture_review_case(); record_picture_check() holds passed pictures that need a person; stories_send_pictures_to_review trigger on lowering to All ages or 13+; statement_ground_for_case() treats picture_review like picture_check; admin_pictures_to_check(), admin_picture_reject_reasons(), admin_approve_picture() (green, yellow through raise_rating_for_picture() and admin_raise_story_rating()), admin_reject_picture() (statement first, then decide_case remove, audit picture.rejected).
- Front end: /staff/pictures (PicturesToCheckPage, PictureToCheckCard, PictureDecisionButtons, RaiseRatingForm, RejectPictureForm), lib/pictureRaiseOptions.ts, CrossIcon, menu entry, two settings in Staff › Settings groups.

## Tests
- DB 248 (22); 185 updated (the clean picture waits, then a moderator approves).
- Unit: pictureRaiseOptions.
- E2E: pictures-to-check (reject with reason, approve, axe at every width), plus the picture specs.
