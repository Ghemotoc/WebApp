# class-points

Class points in a private class space (bundle CLASS-POINTS, part 1; stories S1-E8-13, S1-E8-14 and
S1-E8-16; Robert, 13 Nov 2026). A teacher turns them on for their class. Pupils then get a weekly
budget (10 points, at most 3 to one chapter) to give to classmates' chapters, the teacher gives
their own points with an optional private note, and nobody is ranked.

Who sees what is decided in the database, never here: a pupil sees only the points their own
chapters received, the teacher sees each pupil's two numbers, and only our moderators ever see
who gave points. Nothing in `api/classPoints.ts` carries a giver, so no screen can show one.

- `api/classPoints.ts`: the calls for pupils and the teacher (`class_chapter_points()`,
  `give_class_points()`, `set_teacher_points()`, `class_thread_teacher_points()`), with refusals
  as `ClassPointsError`; `api/classPointsSummary.ts`: the class page's summary and the switch
  (`class_points_summary()`, with the class's week totals since BOOKS-8b, and
  `set_class_points()`).
- `api/classPointsTable.ts`: the teacher's table and the report on one pupil's points
  (`class_points_table()`, `report_pupil_class_points()`; BOOKS-8b, board G09).
- `api/classPointsStaff.ts`: the moderators' calls (`admin_class_point_flags()`,
  `admin_class_gifts()`, `admin_remove_class_gift()`, `admin_close_class_point_flag()`).
- `hooks/useClassPoints.ts` and `hooks/useClassPointsStaff.ts`: the reads and changes. After a
  change every class points read is fetched again, so the class page, the chapter and the table
  agree.
- `lib/classPointsDates.ts`: the day a week ends, in words, and its weekday alone; `lib/sortPupils.ts`: the teacher's
  table by name or by either number (never a rank).
- On a class page: `ClassPointsCard` (board G03, BOOKS-8: a meter and "7 of 10 left", the
  chapters the pupil gave points to this week with Move, from `class_points_summary()`'s `given`;
  for the teacher, the link to the table). In the class's settings: `ClassPointsSettingsCard` (the
  switch). On the teacher's class page: `ClassWeekCard`, "This week", totals for the class only
  (BOOKS-8b, board G08).
- At the end of a chapter shared with the class: `ChapterClassPointsWhenNear` fetches
  `ChapterClassPoints` once the reader is near it. A classmate gets "Give class points" with
  `GivePointsForm` and "How class points work" (BOOKS-8, board G05), the writer "Points this
  chapter received" with `ReceivedPoints` (two figures, `TeacherNoteCard` and the classmates'
  notes, each with a Report button) and "About these points" (board G06), the teacher
  `TeacherPointsForm` with `TeacherPointsStepper` (0 to 10 with − and +, BOOKS-8b, board G10).
- Under a pupil's reply in a class thread: `ReplyTeacherPoints` (the teacher's form, or
  `TeacherPointsShown` for the pupil who wrote the reply).
- `ClassPointsPage` (`/spaces/:spaceSlug/points`, BOOKS-8b, board G09) with `ClassPointsTable`
  (pages of 20 pupils), `PupilPointsReport` ("Report points" on one pupil: a reason and an
  optional note) and `ClassPointsSettingsSection` (the switch and the week's rules at the foot).
- `staff/StaffClassPointsPage` (Staff › Schools › Class points) with `StaffFlagCard` and
  `StaffGiftRow`: open flags, who gave what, removing a gift with a reason, closing a flag.
- Texts: the `classPoints` namespace (`src/locales/*/classPoints.json`), registered by
  `registerClassPointsTranslations.ts` when a class points screen first renders.
- Tests: `api/classPoints.test.ts`, `lib/sortPupils.test.ts`, `lib/classPointsDates.test.ts`,
  `supabase/tests/database/377-class-points.test.sql`, `378-class-points-safety.test.sql` and
  `416-class-teacher-pages.test.sql`,
  `e2e/class-points.spec.ts`.
