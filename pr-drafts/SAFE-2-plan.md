# SAFE-2 plan: the public report form, "copied from a published work" and user management

Stories: S1-E10-02 (one web form for all reports, the removal-order contact point), S1-E10-08 ("copied from a published work" report), S1-E11-02 (user management, with Invites as its tab). Branch `claude/safe-2-notices-users`, cut from main after PEOPLE-1 merges. One pull request: "SAFE-2: Public report form, copied-work reports and user management (S1-E10-02, S1-E10-08, S1-E11-02)".

The gap review's cut proposals 7 and 8 (fold S1-E10-08 into S1-E10-02, a small S1-E11-02) are proposals, not decisions, so the full stories are built.

## 1. Files

**Database**

- `supabase/migrations/20261026120001_s1_e10_02_public_notices.sql`
- `supabase/migrations/20261026130001_s1_e10_08_copied_work.sql`
- `supabase/migrations/20261026140001_s1_e11_02_user_management.sql`
- `supabase/tests/database/145-public-notices.test.sql`, `146-copied-work-reports.test.sql`, `147-user-management.test.sql`; `021` (new tables, alphabetical), `003` (grants)
- `supabase/seed.sql`: one copied-work report case with a passage and a pasted source; one unmatched web notice
- `supabase/staging-topups/SAFE-2.sql`: the same rows, idempotent

**Server (Cloudflare Pages Functions, same pattern as Contact us, ADR 0006)**

- `functions/api/notice.ts` and `server/notice.ts`: validate with the shared zod schema, check the honeypot and the time-to-fill (never for an authority order), sign the payload with the notice secret, call `submit_public_notice()`, send the acknowledgement email (Brevo on Cloudflare, Mailpit locally) with the reference and the time of receipt
- `src/schemas/notice.ts` (+ unit test)

**Front end**

- `src/features/notices/` (new): `NoticePage` (`/report`, board NoticeForm), `NoticeKindPicker` (report content, or "I'm a competent authority sending a removal order"), `NoticeForm`, `RemovalOrderForm`, `NoticeReceived`, `InDangerBlock` (reuses the S1-E10-13a safety contacts), api, hooks, README, `registerNoticeTranslations.ts`
- `src/features/reporting/`: the "Copied from a published work" fields in the shared report form (title, author, ISBN or URL, matching passage, all optional, "Even just a title helps"); the selected passage attached automatically when the report starts from the chapter reader
- `src/features/moderation/`: the case page shows web notices beside reports, the side-by-side "Reported passage / Published source" panel, "Ask for more details", the "Public note" decision, unmatched notices and the logged on-call alert on the queue page
- `src/features/staff/components/users/`: `UsersPage` (`/staff/users`, search), `AccountPage` (`/staff/users/:accountKey`), `AccountSummary` (label rows), `AccountActions` (suspend, ban, warn, reset pen name, sign out everywhere, approve a username), `AccountSanctions`, `AccountOpenCases`, `ShortUserId` (short form plus Copy), `UsersTabs` (Accounts, Invites). Invites moves to `/staff/users/invites`; `/staff/invites` redirects
- `src/features/staff/staffAreas.ts`: the Users area replaces the Invites entry
- Locales: `notices.json` (new namespace, registered lazily), additions to `reporting.json`, `moderation.json`, `staff.json`; `common.json` footer link "Report content"
- e2e: `public-notice.spec.ts`, `copied-work-report.spec.ts`, `user-management.spec.ts`; `invite-links.spec.ts` (new address)
- Docs: code tour, mocks, retention, analytics candidates, `docs/runbooks/notice-form.md` (by-hand steps)

## 2. Migrations

**S1-E10-02 `public_notices`**: one row per notice or order sent through the web form. Columns: `kind` (notice or removal_order), `reason` (report_reason; null for an order), `content_url`, the matched `item_type`, `item_id` and `owner_user_id` (null when the address isn't one of ours), `explanation` (2,000 max), `notifier_name`, `notifier_email` (optional only for child sexual content and for nobody else), `good_faith_confirmed` (required for notices), `authority_name` and `order_reference` (orders), `language` (ro or en), `reference` (N-000123, or TCO-0001 for an order), `case_id`, `received_at`, `acknowledged_at`, `closed_at`.
- No `user_id`: the person may have no account. Rule 15 covers members' content and actions; a signed-in member's report goes through the Report button. The matched owner is `owner_user_id`.
- RLS on. One policy, `public_notices_select_moderation`: moderation staff who may see the linked case (`may_see_case()`), so a notice about a child is visible only with the safeguarding permission. No insert, update or delete grants.
- `submit_public_notice(payload jsonb, signature text)`: granted to anon and authenticated, but works only with the HMAC of the payload under the Vault secret `public_notice_secret` (the sign-up country token pattern), so only the Pages Function can call it. It matches the address (`/s/<story>`, `/s/<story>/<chapter>`, `/u/<username>`), opens or joins a case (a notice uses the reason's tier; an order opens a `one_hour` case with source `authority_order`) and logs the on-call alert for an order. It returns the reference and the time of receipt.
- `on_call_alerts`: (kind, case_id, created_at, acknowledged_at). It's the stub alert, which only logs until S1-E10-09. Policy `on_call_alerts_select_moderation`. It holds no personal data.
- `admin_case_notices(case_id)` lists a case's notices for the case page. `admin_unmatched_notices()` lists notices whose address matched nothing (orders first, with their one-hour deadline).
- pgTAP 145: each policy has an allowed test (moderator, owner) and a denied test (support, editor, a member, a visitor, and a moderator without safeguarding on a child-safety notice). It also covers: a wrong signature is refused, an email is required except for child sexual content, a notice needs good faith, an order opens a one-hour case and an alert, and a matched address joins the open case.

**S1-E10-08 copied work**
- `reports` gets `copy_source_title`, `copy_source_author`, `copy_source_reference` (ISBN or URL), `copy_source_passage` and `reported_passage` (all optional, length-limited, only allowed with the reason `copied_published_work`; check constraint). `public_notices` gets the same for the web form.
- `report_item()` gets an optional `copy_details jsonb`. Old calls keep working.
- `report_detail_requests` (case_id, report_id, message, requested_by_user_id, created_at, answered_at, answer): this is "Ask for more details". Policies: `report_detail_requests_select_moderation` (staff on the case) and `report_detail_requests_select_own_report` (the reporter reads requests on their own report, through `my_report_detail_requests()` without IDs). The answer goes through `answer_report_detail_request()`.
- `moderation_action` gets `public_note`. `admin_decide_case()` with it writes `copied_work_notes` (story_id, case_id, note_kind). The note shows only after a decision. Policy `copied_work_notes_select_public`: anyone, for a story they may see.
- `get_story_page()` gets `copiedWorkNote: boolean`.
- pgTAP 146: the fields are refused with another reason, the writer sees nothing before the decision, the note shows after it, and the detail requests have allowed and denied tests for each policy.

**S1-E11-02 user management**
- `admin_user_lookup(search_text)`: owner, admin, moderator and support. It searches by username, pen name, a whole email (logged as a sensitive read), a full user ID, or the 8-character short ID. The editor is refused.
- `admin_user_account(target_user_id)` returns: username, pen name, short and full user ID, account status, age group, the age check result and its date (never the year of birth), joined date, staff roles, the masked email, the sanctions history and open cases (visible only to staff who may see each case). Viewing an account is logged as a sensitive read.
- `admin_reveal_email()` now also works for moderator and support (architecture 1.8.3; it's logged).
- `admin_reset_pen_name(target, reason)` (owner, admin, moderator): the old pen name goes to the audit log only.
- `admin_sign_out_everywhere(target, reason)` (owner, admin, moderator): audited.
- `admin_approve_username()` already exists (S1-E2-04). The account page calls it.
- There are no new tables, so there are no new policies. pgTAP 147 has an allowed and a denied test for every role on each function: support can view but is refused on sanctions, reset and sign-out, and the editor is refused on look-up.

## 3. Criteria and tests

| Criterion | Tests |
| --- | --- |
| E10-02: no account, every kind of report, a separate authority path | e2e public-notice "a visitor sends a notice", "an authority sends an order"; unit schema |
| E10-02: URL, explanation, name and email (optional for child sexual content), good faith | unit `notice.test.ts`; db 145; e2e error messages |
| E10-02: the page says it's the contact point under 2021/784 and accepts en and ro | e2e text check in both languages |
| E10-02: an order opens a tier-1 case, starts the clock, alerts on call, and the acknowledgement gives the time of receipt | db 145; e2e owner sees TCO case first and the logged alert; Mailpit email |
| E10-02: every notifier gets an acknowledgement and later the decision | e2e Mailpit; the decision email is queued (`decision_ready_at`), and S1-E10-04 sends it (stub in mocks.md) |
| E10-02: the bot check is accessible and never blocks an order | unit server tests (honeypot and time check skipped for orders); e2e keyboard-only send |
| E10-08: optional source fields, selected passage attached, "even just a title" | e2e copied-work "adult_writer reports with only a title"; db 146 |
| E10-08: ask the reporter for more details | db 146; e2e moderator asks, reporter's request listed |
| E10-08: side by side | e2e case page; axe 12 views |
| E10-08: note or removal after confirmation, nothing before | db 146; e2e teen_17 sees nothing, then the note |
| E11-02: search by handle, email or ID; status, age result and date, sanctions, open cases, short ID with Copy | db 147; e2e user-management |
| E11-02: suspend, ban, reset pen name, sign out everywhere (export and deletion after March) | db 147; e2e moderator suspends suspended_user |
| E11-02: private messages only when part of a report | No messages exist until S1-E9 (after March); the account page reads no message table (asserted in db 147 by the function's output keys) |
| Roles 1.8.3 | db 147 role matrix; e2e editor refused |

## 4. i18n, analytics, moderation hooks

- New `notices` namespace (ro and en); additions in reporting, moderation and staff. I'll list every new Romanian line in the PR for Robert.
- Analytics candidates, all without personal data: `notice_submitted` (kind), `report_details_requested` and `account_action_taken` (action).
- Moderation: notices join the same cases. The public note is a new decision. The statement-of-reasons hook stays where S1-E10-04 (SAFE-3) picks it up.

## 5. Stubs and decisions (rule 8: decided, not asked)

- **Bot check:** a honeypot field plus a minimum time to fill, with no puzzle. Orders skip both. Rate limiting is a Cloudflare rule on `/api/notice`, set by hand like Contact us. No IP addresses are stored.
- **The on-call alert** is a logged row (`on_call_alerts`) that staff see on the queue. The real phone alert comes with S1-E10-09 (SAFE-3).
- **The decision email** to a notifier is queued and sent by S1-E10-04 (SAFE-3).
- **"Ask for more details":** a stored request the reporter reads in "My reports". Until S1-E10-04 and S1-E7-01 land it's stubbed, and docs/mocks.md lists it. A web-form notifier is asked by email.
- **Public note wording** (Robert to read): "Moderators found that parts of this story copy a published work." / "Moderatorii au constatat că unele părți ale acestei povești copiază o operă publicată."
- **"Is someone in danger right now?"** shows the S1-E10-13a contacts for the visitor's country.
- **Retention:** notices are kept for 3 years after they close (docs/retention.md). The purge job is S1-E13-04.
- **Needs the lawyer's review before launch:** the contact point wording, which authority sends orders, whether a web form alone is enough, and notices about children.
