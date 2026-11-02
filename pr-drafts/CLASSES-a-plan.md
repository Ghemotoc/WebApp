# CLASSES-a plan (S1-E8-11, part a of 2; issue #77)

Split: a = the database for class spaces, invite codes, the invite card and the join page; b = the class option on the space form for teachers with the three-step help, class stories, archiving, no ads, and the staff pilot set-up; c = certificates (S1-E8-12) and the forums epic check.

- Migrations: `space_kind` enum; `spaces.kind`; constraints (class is members-only; the 16+ read-by-everybody rule excepts class); `invites.space_id`; redefined `space_may_read`, `space_card_visible`, `space_may_join`, `space_may_post`, `space_viewer_json`, `space_json`, `join_space`; new `create_class_space`, `make_class_invite`, `end_class_invite`, `class_invite`, `class_invite_preview`, `join_class_space` and helpers.
- Tests: 232 (41), 228 updated; unit `classSpaces.test.ts`; e2e `class-spaces.spec.ts`.
- Screens: `ClassInviteCard` on settings; `JoinClassPage` at `/class/:code`; the class note on the form, the class pill, the waiting note and the log actions.
