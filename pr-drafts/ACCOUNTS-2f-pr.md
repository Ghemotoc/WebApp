<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E2-11 (Teacher badge). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 6 ACCOUNTS-2, part f, the last part: S1-E2-11, then the S1-E2 epic check and the bundle's full e2e run. Adults get an optional step 3, "Are you a teacher?", and staff get Schools › Verify teachers.

## What changed

- **Database:** `20261109100001_s1_e2_11_enums.sql` (notification kinds `teacher_check_decided`, `teacher_badge_removed`) and `20261109100002_s1_e2_11_teacher_badge.sql`.
  - `teacher_checks` (kind user_action; the owner reads their own): the way, the school address's **domain only**, a hash of the link's token, the status, the reason and the dates. `profiles.teacher_badge_since` holds the badge.
  - Who may ask (`teacher_check_can_ask()`): a live, active adult (age band `18_plus`) without the badge and with nothing waiting for staff.
  - School email: `begin_teacher_email_check()` is signed by our server with the new Vault secret `teacher_check_secret` (ADR 0011's pattern), refuses the board's personal domains and allows one link a minute. `confirm_teacher_email(token)` gives the badge at once for a `.edu.ro` domain; any other domain waits for staff. The link works for `teacher_link_hours` (48, a proposal).
  - Proof: a private `teacher-proofs` bucket (10 MB; JPEG, PNG, WebP or PDF; a proposal) and `submit_teacher_proof()`. The person can upload but never read it back; only staff with Schools access can open or delete it.
  - Staff: `admin_teacher_checks()`, `admin_teachers()`, `admin_open_teacher_proof()` (a logged sensitive read), `admin_decide_teacher_check()` (refused while the proof file still exists, so the file is always deleted first) and `admin_remove_teacher_badge()`. Each needs a reason the person reads, writes the audit log and sends a notification. Owner, admin and moderators with the `teacher_checks` permission.
  - `get_writer_profile()` gains `is_teacher`; `notification_category()` puts both kinds under the moderation team.
- **Server:** `server/teacher-check.ts` (`POST /api/teacher-check/link`): makes the token, stores the signed hash and the domain as the person, and emails the link (`/teacher-check/confirm#<token>`) to the school address in the person's language, with admin wording overrides. `functions/api/teacher-check/[[path]].ts` reads `TEACHER_CHECK_SECRET`.
- **Screens:**
  - Onboarding step 3 for adults (board Onboarding 2.5, step-3-teacher): the two ways as radio cards, the school address with the board's live status line, or the proof with "What we do with it"; "Not a teacher? Skip this" and "Go to Discover" both finish setup. The intro now says "Three short steps" for everyone.
  - Settings › Teacher badge: the same form, the badge, a waiting request or the reason for a "Not yet" or a removal.
  - `/teacher-check/confirm`: the emailed link, signed in or not.
  - The "Teacher" pill on the writer's profile, and "Teacher badge · pending" while waiting.
  - Staff › Schools › Verify teachers (`/staff/schools/teachers`, board AdminSchools 8.9): a card per waiting request with "Open the proof" (opens for a minute, logged), "Approve teacher" and "Not yet", each with a reason; then the teachers, each with "Remove badge".
- **Text:** `account.json`, `staff.json`, `notifications.json` and `email.json`, in ro and en.
- **Seed:** the `teacher` persona has the badge from an approved `.edu.ro` check, and the `moderator` persona holds the teacher checks permission; `supabase/staging-topups/S1-E2-11.sql` does the same on staging.
- **Docs:** `docs/retention.md`, `docs/code-tour.md`, `supabase/README.md`, `docs/board-fixes.md` and the teacher-badge, onboarding and staff READMEs.

## How it was tested

- **pgTAP `204-teacher-badge` (48 tests):**
  - who may ask: an adult yes; a 17-year-old and someone who already has the badge no; skipping stores nothing;
  - the signed link: an unsigned request and a personal domain are refused and leave nothing; only the domain is stored; a second link within a minute is refused; a `.edu.ro` link gives the badge at once and works only once; another domain waits for staff;
  - the staff side: support is refused; a decision needs a reason; "Not yet" lets the person ask again; decisions and the opening of a proof are in the audit log; staff remove a badge with a reason;
  - the proof: `teacher_proofs_insert_own`, `teacher_proofs_select_staff` and `teacher_proofs_delete_staff` allowed and denied (a 17-year-old can't upload, the person can't read it back, support can't read or delete it), and a decision is refused while the file is still there;
  - `teacher_checks_select_own` allowed and denied; `get_writer_profile()` says `is_teacher`.
  - `021-signed-out-reads` gains `teacher_checks`; `027-staff-roles` now clears the moderator's seeded teacher checks permission in its set-up.
- **Unit:** `server/teacher-check.test.ts` (5 tests): only the domain and a signed hash reach the database, the link goes after "#" to the school address, refusals map to the screen's reasons, nothing is sent without the secret.
- **e2e `teacher-badge.spec.ts` (28 tests):** step 3 with a refused personal address and a `.edu.ro` link through Mailpit giving the badge and the profile pill; another school address that staff answer "Not yet" with a reason shown in Settings; a proof uploaded from Settings, opened by the moderator (logged), approved and deleted; a badge removed with its reason; axe and no sideways scroll on step 3 and Verify teachers at 390, 768 and 1440 px, light and night, ro and en.
- **Epic check S1-E2:** every S1-E2 spec (`sign-up`, `sign-in`, `ways-to-log-in`, `year-of-birth`, `usernames`, `onboarding`, `country`, `age-check`, `manual-age-check`, `parent-consent`, `birthday`, `email-change`, `staff-roles`, `teacher-badge`, `epic-s1-e2`) passes, with axe at every width; the ones caught by the parallel races passed when run again alone.
- `onboarding.spec.ts`, `staff-shell.spec.ts` and `epic-s1-e11.spec.ts` updated for the third adult step and the Schools menu item. `checkScreen()` gains an optional step to reach a screen inside a page.
- **Screenshots:** checked by eye: step 3 at 390 (both ways) and 1440, and Verify teachers at 1440 in Romanian.

## Local check run

Run on Node 24.

- **Static checks:** prettier, lint, typecheck, types:check, i18n:check, migrations:check and third-party:check (after `npm run build`) all pass.
- **Unit tests:** `npx vitest run` passes 980 of 980.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 114 files, 2,550 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **Full e2e run for bundle 6:** three shards plus `legal.spec.ts` alone, 1,358 tests. 43 failed in the parallel run; after a reset, the 26 files with a failure were run again alone (330 tests) and all pass except `reader-performance` "first paragraph within 2 seconds", which fails on main too. Three were real and are fixed here:
  - `staff-compliance-log` still expected "Not yet" for appealed age checks, which are counted since part b (S1-E2-08b); the card's note also still said they weren't, and now says what is counted;
  - `birthday` broke on the 1st to 9th of a month, because its date helper padded the day ("01");
  - `epic-s1-e11` needed the new Schools menu item.

## By hand

- Staging: run `supabase/staging-topups/S1-E2-11.sql` once (safe to run twice; adds no accounts).
- Added to the GO-LIVE list: a new random secret as `TEACHER_CHECK_SECRET` in Cloudflare Pages (preview and production) and the same value in Vault as `teacher_check_secret` on staging and production. Until then the school email way answers "We couldn’t send it" and the proof way still works.

## Board mismatches

- Onboarding (2.5): the step line is "Step 3 of 3 · for adults (18+) · optional", and the badge can also be asked for later in Settings › Teacher badge, which the board doesn't draw.
- Onboarding (2.5): the proof hint says "up to 10 MB", the bucket's proposed limit.
- Onboarding (2.5): a `.edu.ro` link gives the badge at once; any other school address waits for staff (criterion 4).
- AdminSchools (8.9): the cards show the school's domain or "A letter or staff card from the school", not a school name and initials avatar: only the domain is stored.
- All four are in `docs/board-fixes.md`, and the old line saying adults have two steps is gone.

## Questions for Robert (OPEN in the story, built as proposals)

- How long the link works (`teacher_link_hours`, 48) and the proof size limit (10 MB).
- How staff confirm a school address that isn't `.edu.ro`: the screen records only the outcome and a reason.
- Rule 19: proofs are seen only by staff (as the picture check already lets moderation staff see unchecked pictures), so they don't go through Sightengine and Arachnid Shield. Should they?
- Re-checking a teacher after a time: nothing is built.

## Follow-ups

- A PDF proof keeps its own metadata (pictures lose their location data); stripping PDF metadata needs a library.
- A proof uploaded but never submitted (the tab closed between the two steps) stays in the bucket; a nightly clean-up of files no request names, and removing proofs when an account is deleted (S1-E13-05).
- The class space option for teachers is S1-E8-11.
- Story issues for S1-E2 once the Sync story issues job can run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
