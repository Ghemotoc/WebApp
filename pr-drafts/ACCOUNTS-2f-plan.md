# ACCOUNTS-2f plan: Teacher badge (S1-E2-11), the S1-E2 epic check and the bundle's full run

Branch `claude/accounts-2f-teacher-badge`. Story: docs/stories/s1-e02-accounts-age-gate-and-onboarding.md, S1-E2-11. Boards: Onboarding.dc.html `step-3-teacher` (lines 214 to 292), AdminSchools.dc.html "Verify teachers" (lines 196 to 234).

## Choices (proposals behind settings, OPEN points flagged)

- **Who can ask:** a live account that may write (`account_state()` active) and is 18 or over (`age_band_from_birth()` gives `18_plus`). In March that is every invited adult, as the account gate already treats them.
- **Domain only (proposal in the story):** for the school email way we keep only the domain (`school_domain`), never the address. The server holds the address just long enough to send the link.
- **Link expiry (OPEN):** a setting, `teacher_link_hours`, 48 by default.
- **.edu.ro:** the badge is granted as soon as the link is opened. Any other school domain waits for staff, who see the domain. How staff confirm a domain is OPEN, so the decision only records approve or reject and a reason.
- **Personal domains:** the board's list (gmail.com, googlemail.com, yahoo.com, yahoo.ro, outlook.com, hotmail.com, live.com, icloud.com, proton.me, protonmail.com). The database refuses them (hint `personal_address`) and the screen shows the board's live status.
- **Proof way:**
  - JPG, PNG or PDF, up to 10 MB (OPEN; proposal);
  - private `teacher-proofs` bucket under a random name;
  - only staff with Schools access (owner, admin, moderator with the teacher checks permission) can open or delete it;
  - JPG and PNG go through `preparePicture()` (location data out, longest side 2400 px); a PDF is sent as it is (follow-up: PDF metadata).
- **Rule 19:** a proof is never seen by anyone but staff. That matches the picture check's own rule that moderation staff may see an unchecked picture (`picture_reader_may_see()`). Flagged for Robert: should proof pictures also go through the vendors' check?
- **Deleting the proof:** the staff screen deletes the file through Storage, then calls `admin_decide_teacher_check()`. The database refuses the decision while the file is still there (hint `proof_not_deleted`), so a decision always means the proof is gone. Only the way, the decision, the date and (in the audit log) the staff member are kept.
- **Re-review timing (OPEN):** none built.
- **Badge removal:** staff remove a badge with a reason. It is logged and the person is notified.
- **Signed link:** the pattern of ADR 0011. A new Vault secret `teacher_check_secret` is the same value as Cloudflare's `TEACHER_CHECK_SECRET`. The server makes the token and the database keeps only its SHA-256. Opening the link calls `confirm_teacher_email(token)` straight from the page, because the token is the key.
- **Notifications:** in-app only, under the moderation team's chip:
  - `teacher_check_decided` (approved or rejected, links to Settings › Teacher badge, where the reason shows);
  - `teacher_badge_removed`.

## Files

**Migrations:**
- `…_s1_e2_11_enums.sql`: the two notification kinds.
- `…_s1_e2_11_teacher_badge.sql`:
  - the setting and `profiles.teacher_badge_since`;
  - `teacher_checks` (kind user_action, owner reads own);
  - the bucket and its policies;
  - `teacher_check_is_signed`, `is_personal_email_domain`, `teacher_check_can_ask`, `my_teacher_check`, `begin_teacher_email_check`, `confirm_teacher_email` and `submit_teacher_proof`;
  - `admin_teacher_checks`, `admin_teachers`, `admin_open_teacher_proof` (logs `teacher_proof_opened`), `admin_decide_teacher_check` and `admin_remove_teacher_badge`;
  - `get_writer_profile` gains `is_teacher`;
  - `notification_category` and `erase_unchecked_account` (also clears teacher checks).

**Tests:**
- `supabase/tests/database/204-teacher-badge.test.sql`, plus `021-signed-out-reads` (`teacher_checks`).
- `e2e/teacher-badge.spec.ts`, and `epic-s1-e2.spec.ts` gains the teacher step.

**Seed:** the teacher persona's badge, plus `supabase/staging-topups/S1-E2-11.sql`.

**Server:**
- `src/schemas/teacherCheck.ts`;
- `server/teacher-check.ts` with its test and `server/teacher-check/emails.ts`;
- `functions/api/teacher-check/[[path]].ts`;
- the plugin entry and the Playwright environment.

**Front end:**
- `src/features/teacher-badge/`: api, hook, TeacherBadgeForm, SchoolEmailWay, ProofWay, TeacherStep (onboarding step 3 for adults), TeacherBadgeSection (Settings), TeacherConfirmPage (`/teacher-check/confirm`) and TeacherBadgePill;
- the profile header's "Teacher" pill;
- staff: `api/teacherChecks.ts`, `hooks/useTeacherChecks.ts` and `components/schools/` (TeacherChecksPage, TeacherCheckCard, TeacherDecisionForm, TeachersList), with the Schools area in staffAreas and the router;
- notification texts;
- ro and en locales (account, staff, notifications, email).

**Docs:** retention, code-tour, supabase README, board-fixes (the line about adults having two steps goes), the feature README, by-hand and GO-LIVE lines (the secret, and Vault on staging and production).

## Criteria to tests

| Criterion | Test |
| --- | --- |
| Step 3 for adults, skip stores nothing | e2e teacher-badge "an adult gets step 3 and can skip it"; db 204 skip has no row |
| Personal address refused | db 204 `personal_address`; vitest schema; e2e live status |
| .edu.ro link gives the badge at once | db 204; e2e through Mailpit |
| Other domain waits for staff, staff approve | db 204; e2e |
| Proof upload, staff open (logged), decide, proof deleted | db 204 (policies allowed and denied, `proof_not_deleted`, audit rows); e2e |
| Pending pill | e2e |
| Notification with outcome and reason | db 204 notify; e2e Settings shows the reason |
| Badge on profile | db 204 `get_writer_profile`; e2e |
| Staff remove a badge, logged | db 204; e2e |
| Only adults and only staff with Schools access | db 204 denied tests |

Epic check S1-E2: run every S1-E2 spec together with axe, and report in the PR.
