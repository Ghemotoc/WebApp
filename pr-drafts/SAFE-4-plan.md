# SAFE-4 plan: picture check and safety round two

Bundle 1 of the full Stage 1 plan (`full-app-bundles.md`, Robert, 30 Oct 2026). Branch `claude/safe-4-pictures-appeals-mail`, cut from main at 1a57988. One pull request: "SAFE-4: Picture check, appeals, moderator mail, rate limits, safety contacts and the accessibility statement".

Stories:
- S1-E10-05 picture check (#87)
- S1-E10-03 part b: claiming, filters and search
- S1-E10-07 appeals
- S1-E10-11 moderator mail
- S1-E10-12 rate limits
- S1-E10-13b safety contacts editing and the monthly check
- S1-E10-QA round 2
- S1-E14-03 accessibility statement and the no-cookie check
- S1-E14-QA

Issue numbers are looked up when the PR is written.

What main already has, which this bundle doesn't redo:
- The queue already groups reports per item, shows tiers, deadlines and timers, and has `case_source = 'picture_check'` with seeded P-0001 and P-0002.
- Comments already have the hourly limit with the wait in minutes.
- Sign-up already needs the email confirmed before an account can write.
- `safety_contacts` and its gap log exist (13a).

## The "plug in at the end" rule for this bundle

The picture check sits behind one adapter in `server/picture-check/`:
- `PICTURE_CHECK=stub|real`.
- **The stub** behaves like the real services:
  - a file whose name ends `_fail` is flagged for nudity;
  - a name ending `_gore` is flagged for gore;
  - a name ending `_match` is an Arachnid Shield match;
  - a name ending `_down` means the service is unreachable;
  - everything else passes.
- **The real provider** calls Sightengine (`nudity-2.1,gore-2.0`) and Arachnid Shield (`/v1/media/`). Its tests run on recorded sample responses.
- The `picture_uploads` flag stays off on staging.
- GO-LIVE gets the Sightengine user and secret, the Arachnid Shield credentials, `PICTURE_CHECK_SECRET` (Cloudflare and Vault) and `PICTURE_CHECK=real`.

## 1. Database

**S1-E10-05 picture check** (`…_s1_e10_05_picture_check.sql`)
- **Table `picture_checks`**, one row per uploaded file:
  - Who and where: `user_id` (the uploader), `bucket`, `path`, `kind` (cover, avatar; later chapter_picture, drawing, quote_card, space_banner).
  - The result: `status` (pending, passed, held, approved, removed), `flags` (jsonb: what each service said, labels and scores only, never the picture), `provider`, `checked_at` and `attempts`.
  - Moderation: `case_id`.
  - Policies: the uploader reads their own rows; moderation staff read every row.
- **Buckets:**
  - `covers` (exists) and a new `avatars`, both private.
  - Reading a file: the owner, moderation staff, or anyone once its check has `passed` or `approved` (`picture_is_visible(bucket, path)`). A file without a check row is never visible.
  - Uploads only while `picture_uploads` is on.
- **`register_picture(bucket, path, kind)`:** the uploader records a new file as pending. A new avatar replaces the old one on the profile only once it passes.
- **`record_picture_check(payload, signature)`:** the Pages Function's signed result, HMAC with the Vault secret `picture_check_secret`, as `submit_public_notice` does.
  - A pass makes the picture visible.
  - A flag holds it and opens a `picture_check` case: tier `two_days`, or `same_day` with `is_safeguarding` for an Arachnid Shield match. The file is kept (preserve_until, six months) and the purge skips it.
  - A service error leaves it pending with `attempts + 1`.
- **Decisions:** `decide_case()` on a picture case.
  - `no_action` approves the picture, so it shows.
  - `remove` or `hide` removes it, and the uploader gets the statement of reasons.
  - The tools never approve or remove on their own.
- **`my_pending_pictures()`** lets the uploader's screen ask for the check again.
- **What the existing screens get:** the cover and the avatar each read their check through the story and profile JSON as `picture_state` (`visible`, `checking`, `waiting_for_person`, `removed`).
  - Readers see "Picture being checked" instead of the picture.
  - The owner sees the picture with "Waiting for a check" or "Waiting for a person".

**S1-E10-03b claiming, filters and search** (`…_s1_e10_03b_claiming.sql`)
- `cases.claimed_by_user_id` and `claimed_at`.
- `admin_claim_case(case_id)`: refused when someone else holds the claim, unless the claim is over `case_claim_minutes` (60) old. `admin_release_case(case_id)`.
- Every claim and release goes in the case log.
- `admin_moderation_queue()` gains the filters reason, source, claimed (mine, anyone, nobody) and a search by reference or handle, and returns who claimed each case.

**S1-E10-07 appeals** (`…_s1_e10_07_appeals.sql`)
- **Table `appeals`:**
  - The appeal: `user_id` (the person appealing), `statement_id`, `reference` (A-000001), `explanation`.
  - The decision: `status` (open, upheld, overturned), `decided_by_user_id`, `decision_note`, `message_to_person` and `decided_at`.
- **Policies:** the person reads their own; moderation staff read every appeal whose case they may see.
- **`submit_appeal(statement_reference, explanation)`:**
  - only the statement's owner, only before `appeal_until`, one open appeal per statement;
  - rate-limited.
- **`admin_appeals_queue()`** and **`admin_decide_appeal(appeal_id, outcome, note, message)`:**
  - The moderator who made the original decision is refused when another moderator with access exists ("a different moderator where possible").
  - Overturned:
    - the item is restored (`moderated_items` row cleared);
    - a sanction from the decision is lifted;
    - a raised rating stays (a writer can ask again).
  - The person gets an `appeal_decided` notification with the outcome.
  - Everything is logged.
- `my_statements()` returns each statement's appeal state.

**S1-E10-11 moderator mail** (`…_s1_e10_11_moderator_mail.sql`)
- **Tables:**
  - `moderator_mail_threads`: `user_id` (the member), `reference` (M-000001), `subject`, `status` (open, waiting, closed), `assigned_to_user_id`, an optional `statement_id`.
  - `moderator_mail_messages`: `user_id` (who wrote it), `thread_id`, `body`, `is_internal_note`, `from_team`.
- **Policies:** the member reads their own threads and every message that isn't an internal note; moderation staff read everything.
- **Member functions:** `send_moderator_mail(subject, body, statement_reference)`, `reply_moderator_mail(thread_id, body)`, `my_moderator_mail()`. All are rate-limited.
- **Staff functions:** `admin_moderator_mail_inbox(status, assigned)`, `admin_moderator_mail_thread(id)`, `admin_assign_mail(id, user)`, `admin_reply_mail(id, body, is_note)` and `admin_set_mail_status(id, status)`.
- A team reply notifies the member (`moderator_mail_reply`) and signs as "The moderation team", never a person.

**S1-E10-12 rate limits** (`…_s1_e10_12_rate_limits.sql`)
- Table `rate_limit_events`: `user_id`, `action`, `created_at`. Kept 2 days by a purge job, never readable by anyone through the API.
- `take_rate_limit(action)` reads `rate_limits` (settings jsonb: per action, the limit per hour for new and older accounts). It raises SQLSTATE `RL001` with the minutes to wait in the hint.
- Used by appeals, moderator mail, reports (alongside their own daily duplicate rule) and new spaces later.
- Comments keep their limit, and the screen now shows the wait from the hint.
- New accounts: `post_comment()` refuses a second link while the account is under `comment_new_account_hours` old (`new_account_max_links`, 1).
- Sign-up's accessible challenge is the emailed confirmation already in place. It is written down in the plan and the privacy notice draft, with no puzzle.

**S1-E10-13b safety contacts editing** (`…_s1_e10_13b_safety_contacts_admin.sql`)
- `safety_contacts` gains `last_checked_at` and `last_checked_by_user_id`.
- **Edit functions (staff with `settings` act):** `admin_save_safety_contact()`, `admin_remove_safety_contact()`, `admin_confirm_safety_contact()`. All are logged with before and after values.
- **Monthly check:** table `safety_contact_checks` (one row per launch country per month). `create_monthly_safety_checks()` runs on pg_cron at 06:00 on the 1st. A check closes when every contact in it is confirmed or changed.
  - The ticket in S1-E11-13 links to it later.
- `admin_safety_contact_warnings()` lists contacts unconfirmed for 45 days. The owner sees a warning in the staff shell.

**S1-E14-03 accessibility statement** (`…_s1_e14_03_accessibility_statement.sql`)
- A `legal_documents` row `accessibility` with no acceptance, and version 0.1 in ro and en from `content/legal/05-accessibility-statement.md` and its ro copy.

## 2. Server

- `server/picture-check/` holds the adapter: `stub.ts`, `sightengine.ts`, `arachnid.ts`, `index.ts`.
- `server/picture-check.ts` handles `POST /api/picture-check`:
  1. takes the uploader's token;
  2. reads the file with that token;
  3. runs both checks;
  4. signs the result;
  5. calls `record_picture_check`.
- Moderators get "Run the check again" through the same endpoint with their own token, allowed for staff.
- Nothing about the picture or the person is logged.

## 3. Screens

- **Pictures:**
  - Cover upload in New story and Settings, and an avatar upload in Settings › Profile, both behind `picture_uploads`.
  - The "Picture being checked" state on cards, the story page and the profile.
  - A picture case on the case page shows the picture, what was flagged, and Approve or Remove through the usual decision.
- **Queue:** Claim and Release, "Claimed by @x", filters (source, reason, claimed) and search.
- **Appeals:**
  - On My reports and decisions, "Appeal" opens a short form and then shows the appeal's state.
  - Staff get Moderation › Appeals (`/staff/moderation/appeals`) with a decide form.
- **Moderator mail:**
  - Members get `/moderator-mail` (list, new message, thread). "Contact the moderators" on My reports links there.
  - Staff get Moderation › Mail (`/staff/moderation/mail`): the inbox with filters, the thread, assign, internal note and reply as the team.
- **Rate limits:** every limit refusal says how long to wait (comments, reports, appeals, mail).
- **Safety contacts:** Staff › Safety contacts (`/staff/safety-contacts`) has the per-country list, edit, confirm, the monthly check list and the 45-day warning.
- **Accessibility statement:** `/legal/accessibility` in the Legal centre and the footer.

## 4. Checks

- **pgTAP:**
  - `164-picture-check`, `165-claiming`, `166-appeals`, `167-moderator-mail`, `168-rate-limits`, `169-safety-contacts-admin`, `170-accessibility-statement`.
  - Allowed and denied tests for every policy.
  - Updates to 021 and 003.
- **Unit:** the adapters (stub rules, Sightengine and Arachnid Shield sample responses, thresholds) and the signing.
- **e2e:**
  - `picture-check.spec.ts`, which turns the flag on for its own run.
  - `appeals.spec.ts`, `moderator-mail.spec.ts`, `safety-contacts-admin.spec.ts`, `accessibility-statement.spec.ts`.
  - `epic-s1-e10-round-2.spec.ts` and `epic-s1-e14.spec.ts`.
- **The no-cookie check:**
  - `scripts/check-third-party.ts` scans `dist` for script, style and connect origins outside an allow-list, so a new third-party origin fails `npm run checks`.
  - `e2e/no-cookies.spec.ts` visits the main pages and fails on any cookie, or any localStorage or sessionStorage key outside the reviewed list.

## 5. Decisions (rule 8)

- Pictures are served by signed URLs from private buckets, and only once passed or approved. A file nobody registered is never visible.
- The check runs in a Pages Function (as the report form does), signed with an HMAC secret. No service key.
- A failed service leaves the picture private and pending. The uploader's screen tries again on the next visit, and staff can retry from the case.
- Appeals: an overturned decision restores the item and lifts the sanction; a raised rating stays.
- Moderator mail lives inside our admin site until the helpdesk (S1-E11-13, ADMIN-2) arrives. The adapter for an outside helpdesk comes with that story.
- The monthly safety check creates check rows, not tickets, until S1-E11-13 exists.
- The rate-limit settings are seeded. Their admin screen arrives with S1-E11-03 in CMS-1.
