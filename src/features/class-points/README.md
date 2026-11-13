# class-points

Class points in a private class space (bundle CLASS-POINTS, part 1; stories S1-E8-13, S1-E8-14 and
S1-E8-16; Robert, 13 Nov 2026). A teacher turns them on for their class. Pupils then get a weekly
budget (10 points, at most 3 to one chapter) to give to classmates' chapters, the teacher gives
their own points with an optional private note, and nobody is ranked.

Who sees what is decided in the database, never here: a pupil sees only the points their own
chapters received, the teacher sees each pupil's two numbers, and only our moderators ever see
who gave points. Nothing in `api/classPoints.ts` carries a giver, so no screen can show one.

- `api/classPoints.ts`: the calls for pupils and the teacher (`class_points_summary()`,
  `set_class_points()`, `class_chapter_points()`, `give_class_points()`, `set_teacher_points()`,
  `class_thread_teacher_points()`), with refusals as `ClassPointsError`.
- `api/classPointsTable.ts`: the teacher's table and report (`class_points_table()`,
  `report_class_points()`).
- `api/classPointsStaff.ts`: the moderators' calls (`admin_class_point_flags()`,
  `admin_class_gifts()`, `admin_remove_class_gift()`, `admin_close_class_point_flag()`).
- `hooks/useClassPoints.ts` and `hooks/useClassPointsStaff.ts`: the reads and changes. After a
  change every class points read is fetched again, so the class page, the chapter and the table
  agree.
- `lib/classPointsDates.ts`: the day a week ends, in words; `lib/sortPupils.ts`: the teacher's
  table by name or by either number (never a rank).
- On a class page: `ClassPointsCard` ("7 of 10 points left", the points received and, for the
  teacher, the link to the table). In the class's settings: `ClassPointsSettingsCard` (the
  switch).
- At the end of a chapter shared with the class: `ChapterClassPointsWhenNear` fetches
  `ChapterClassPoints` once the reader is near it. A classmate gets `GivePointsForm`, the writer
  `ReceivedPoints` (with a Report button on each line and on the teacher's note), the teacher
  `TeacherPointsForm`.
- Under a pupil's reply in a class thread: `ReplyTeacherPoints` (the teacher's form, or
  `TeacherPointsShown` for the pupil who wrote the reply).
- `ClassPointsPage` (`/spaces/:spaceSlug/points`) with `ClassPointsTable` and
  `ReportPointsControl`: the teacher's table and "Report these points".
- `staff/StaffClassPointsPage` (Staff › Schools › Class points) with `StaffFlagCard` and
  `StaffGiftRow`: open flags, who gave what, removing a gift with a reason, closing a flag.
- Texts: the `classPoints` namespace (`src/locales/*/classPoints.json`), registered by
  `registerClassPointsTranslations.ts` when a class points screen first renders.
- Tests: `api/classPoints.test.ts`, `lib/sortPupils.test.ts`, `lib/classPointsDates.test.ts`,
  `supabase/tests/database/377-class-points.test.sql` and `378-class-points-safety.test.sql`,
  `e2e/class-points.spec.ts`.
