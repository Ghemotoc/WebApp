# ADMIN-2e2a plan: who may review pictures, and the alert when staff open one

Brief: bundle-12-pictures-bans-avatars-brief.md, section 5 (Robert, 2 Nov 2026, 08:29). Part e2 is split: e2a is section 5, e2b is section 4 (suspected child abuse images).

- Migrations: enum values `staff_permission.picture_review`, `notification_kind.picture_opened_by_staff`; table `staff_interns` (select own, select for roles viewers; writes only through `admin_set_intern()`); `is_picture_reviewer()`, `may_review_pictures()`, `require_picture_reviewer()`; `admin_set_permission()` refuses picture review for under-18s and interns; `admin_list_staff()` gains `is_intern`; `picture_reader_may_see()` lets only reviewers read waiting files; `picture_review_case()`, `admin_pictures_to_check()`, `admin_picture_reject_reasons()`, `admin_case_picture()` and `apply_picture_decision()` check the permission; `record_picture_opened()` logs and alerts; `admin_recent_picture_openings()` for the staff home; `notify()`, `notification_category()`, `email_delivery_for()` gain the kind (required).
- Setting `picture_open_alert_handles` (empty: owners only).
- Seed and staging top-up: owner, admin and moderator personas get picture review.
- Screens: Staff › Roles (Picture review and Intern boxes, refusal message), Pictures to check (refusal text, "opening is logged" note), case page ("only reviewers"), staff home panel, the notification and its email.
- Tests: database 249 (25), 021 updated; e2e picture-reviewers.spec.ts.
