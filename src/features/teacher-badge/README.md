# Teacher badge

The person's side of the Teacher badge (story S1-E2-11; board Onboarding 2.5, step 3 for adults). An adult shows they teach in one of two ways, and the badge then shows as "Teacher" on their profile. Class spaces (S1-E8-11) will ask for it.

- `api/teacherBadge.ts`: `my_teacher_check()`, the school email link (`POST /api/teacher-check/link`, `server/teacher-check.ts`, which emails the link and keeps only the domain), `confirm_teacher_email(token)` and the proof (prepared without location data, uploaded to the private `teacher-proofs` bucket under a random name, then `submit_teacher_proof()`).
- `hooks/useMyTeacherCheck.ts`: the badge and both ways; `hooks/useTeacherEmailConfirm.ts`: opening the link, once per token.
- `components/TeacherStep.tsx`: onboarding step 3 ("Are you a teacher?"), with "Not a teacher? Skip this" and "Go to Discover".
- `components/TeacherBadgeSection.tsx`: Settings › Teacher badge (`#teacher-badge`, where the notifications link).
- `components/TeacherBadgePanel.tsx`: what both show: `TeacherBadgeStatus` (the badge, a waiting request, a reason), then `TeacherBadgeForm` (`WayPicker`, `SchoolEmailWay` or `ProofWay`) and `SentNote`.
- `components/TeacherConfirmPage.tsx` (`/teacher-check/confirm#<token>`): the emailed link, signed in or not.
- `components/TeacherBadgePill.tsx`: "Teacher" (sage) or "Teacher badge · pending" (gold), also on the writer's profile.

The staff side is `src/features/staff/components/schools/`. The database side is the `…_s1_e2_11_teacher_badge.sql` migration (supabase/README.md, "The Teacher badge"); a .edu.ro address gives the badge at once, anything else waits for staff.
