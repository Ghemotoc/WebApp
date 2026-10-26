# SAFE-3 plan: statements of reasons, removal orders and safeguarding

Stories: S1-E10-04 (statements of reasons, and telling the reporters and notifiers the outcome), S1-E10-09 (terrorist content removal orders), S1-E10-10 (safeguarding escalation). Issues #88, #93 and #94, no comments. Branch `claude/safe-3-reasons-orders-safeguarding`, cut from main after PEOPLE-4 merges. One pull request: "SAFE-3: Statements of reasons, removal orders and safeguarding (S1-E10-04, S1-E10-09, S1-E10-10)".

S1-E10-07 (appeals) stays after March. Until then the statement's "How to challenge this" points to Contact us with the statement's reference filled in, and says the reply comes from a different moderator where possible.

## 1. Database

**`20261030100001_s1_e10_04_enums.sql`** (own file, because new enum values can't be used in the transaction that adds them)
- `notification_kind` gains `report_outcome`.
- `statement_action` (new enum): `hide`, `remove`, `restrict`, `warn`, `suspend`, `ban`, `public_note`, `reporting_pause`, `rating_raised`, `ai_label_added`, `removal_order`.

**`20261030100002_s1_e10_04_statements_of_reasons.sql`**
- Table `statements_of_reasons`, one row per statement. This is the stored copy (criterion 3).
  - `user_id`: the account told (rule 15).
  - Links: `case_id`, `sanction_id` and `story_id`, each null when it doesn't apply.
  - What was decided: `reference` (S-000123), `action`, `item_type` and `item_summary` (a copy made at the time), `facts` (what the person reads, written by staff).
  - The ground: `ground_kind` (terms or law) and `ground_key` (the report reason, `authority_order` or `copyright`).
  - Automated means: `automated_detection` (true for a picture-check case), `automated_decision` (always false).
  - `restriction_ends_at`, `language` and `appeal_until` (six months).
  - Timestamps: `issued_at` and `created_at`.
  - Append-only: no update or delete grant.
- Policies:
  - `statements_of_reasons_select_own`: the person reads their own.
  - `statements_of_reasons_select_moderation`: moderation staff read a statement whose case they may see (`may_see_case()`), or any statement without a case.
- `issue_statement_of_reasons(...)` (internal) writes the row and the required notification, which now carries `statement_id`.
- `admin_decide_case` takes a new `message_to_person` argument, required for every action except `no_action`. Two changes in order: the action is carried out and the statement issued before the case is marked decided, so the decision's notification already links to the statement. An internal `decide_case()` holds the steps, so Emergency disable can reuse them.
- `admin_apply_sanction` takes a new `message_to_person` argument, required outside a case. A sanction from a case gets its statement from the case, so a person never gets two.
- A trigger on `jobs` turns `statement_of_reasons_needed` (a raised rating, the undisclosed-AI label) into a statement at once, with the audit row's reason as the facts.
- Reporters are told the outcome:
  - `notify_case_decided` also tells each reporter (`report_outcome`).
  - The outcome is "removed", "acted on" or "no breach found". It never names a warning, suspension or ban on someone else.
- Notifiers on the web form are emailed:
  - `admin_due_decision_emails()` gives moderation staff the decided notices still waiting for an email.
  - `admin_mark_decision_emails_sent(ids)` marks them sent.
- `my_statement(reference)` returns the statement page's content, readable by its owner only.
- `notification_json` adds `statement` {reference} and, for `report_outcome`, `outcome`.

**`20261030100003_s1_e10_09_removal_orders.sql`**
- On-call rota:
  - Table `on_call_rota`: `user_id` (the person on call), `starts_at`, `ends_at`, `created_by_user_id`.
  - Shifts never overlap (a trigger check). The person must hold the on-call permission.
  - Policy `on_call_rota_select_staff`: any staff member reads it.
  - `admin_set_on_call_shift` and `admin_remove_on_call_shift` are open to the `roles` area (owner and admin) and logged. `admin_on_call_rota()` lists the shifts and the gaps in the next 14 days.
- On-call alerts:
  - `on_call_alerts` gains `on_call_user_id`, `alerted_at`, `escalated_at` and `acknowledged_by_user_id`.
  - The alert names whoever is on call when the order arrives. The phone alert is still a logging stub (`docs/mocks.md`).
  - `escalate_on_call_alerts()` runs every minute through pg_cron. An alert not acknowledged after `on_call_escalation_minutes` (15) is marked escalated, which stands for alerting the rest of the founding team (a stub).
  - `admin_acknowledge_on_call_alert(id)`.
- Emergency disable:
  - `admin_emergency_disable(case_id, note, message_to_person, tell_uploader)` is for staff with the on-call permission, on an authority-order case only.
  - One action removes the item everywhere (moderated `removed`), decides the case and sets `cases.disabled_at` and `cases.preserve_until` (six months).
  - It issues the statement only when `tell_uploader` (TCO art. 11(3) lets an order forbid telling).
  - Every timestamp goes in the audit row.
- Preservation: `content_is_kept_for_moderation()` also keeps anything under a live `preserve_until`, so no purge job deletes it (TCO art. 6).
- `admin_order_timeline(case_id)` returns the times: received, alerted, acknowledged, escalated, disabled, authority told.

**`20261030100004_s1_e10_10_safeguarding.sql`**
- Table `safeguarding_referrals`:
  - The staff member who referred is `user_id`; the other columns are `case_id`, `authority_name`, `authority_reference`, `note`, `evidence_built_at` and `referred_at`.
  - Policy `safeguarding_referrals_select_safeguarding`: only staff with the safeguarding permission read it.
- `admin_mark_safeguarding(case_id, reason)`: moderation staff move any case into the safeguarding lane, logged. Moving a case out isn't offered.
- `admin_case_support_contacts(case_id)` returns the child helpline and emergency numbers for the item owner's country, with Romania's as the fallback. A country with no row is noted as a gap.
- `admin_build_evidence_pack(case_id, reason)`: content, account data and timestamps as JSON, for safeguarding staff only. It is logged as a sensitive read.
- `admin_log_referral(case_id, authority, reference, note)`, logged.

**Tests**
- `161-statements-of-reasons.test.sql`
- `162-removal-orders.test.sql`
- `163-safeguarding.test.sql`
- Updates to `021` (tables), `003` (grants), and every earlier test that calls `admin_decide_case` or `admin_apply_sanction` (they get the message).
- Seed and staging top-up: `owner` (…08) gets the on-call permission and a 30-day shift. `supabase/staging-topups/SAFE-3.sql`.

## 2. Server

- `functions/api/decision-emails.ts` and `server/decision-emails.ts`:
  - Who calls it: the case page, right after a decision, with the staff member's own sign-in token. A "Send waiting decision emails" button on the queue is the backup.
  - It reads the due emails through the staff RPC, sends each in the notifier's language and marks them sent.
  - An authority's email confirms the removal and its time (TCO art. 3(6)).
  - Never logged.
- Draft ro and en text sits beside the acknowledgement texts. It moves into the admin-editable templates with S1-E11-19 (CMS-1).

## 3. Front end

- New `src/features/statements/` folder:
  - `StatementPage` at `/decisions/:reference`, built from these parts: what we did, about what, why (the facts), the rule or law, automated means, how long, how to challenge it.
  - api, hook, README.
  - New `statements.json` locale namespace.
- Moderation:
  - DecisionForm and the account actions get a "What we tell the person" field.
  - The case page shows the stored statement (`CaseStatement`) and sends the decision emails.
  - Removal-order cases get `RemovalOrderPanel`: Emergency disable, the "Tell the uploader" checkbox and the timeline.
  - Safeguarding cases get `SafeguardingPanel`: the checklist, the helplines, "Build the evidence pack" (downloads JSON) and "Log a referral".
  - Any other case gets a "Move to safeguarding" action.
  - The queue lets staff acknowledge an alert.
- Staff: `/staff/on-call`, the rota page (owner and admin edit, other staff read), in the staff menu.
- Notifications:
  - A decision links to its statement.
  - `report_outcome` gets its own line.
- e2e:
  - `statements.spec.ts`: decide, the person reads the statement, the reporter sees the outcome.
  - `removal-orders.spec.ts`
  - `safeguarding.spec.ts`
  - The accessibility loops use personas no other spec touches.
- Docs:
  - the code tour, mocks (the decision notification row is real now; the phone alert is still a stub), retention (statements 6 months after the appeal window, referrals 3 years, preserved items 6 months)
  - `docs/runbooks/removal-orders.md` and `docs/runbooks/safeguarding.md`
  - for-the-lawyer: TCO 12-hour first-order notice; Law 50/2024 art. 31; what the evidence pack contains

## 4. Decisions I'll take (the brief says not to stop for these)

- The reporter learns only the kind of outcome, never another person's sanction.
- The decision email is sent from the moderator's browser through a Pages Function with their own token, because Pages has no scheduler. A queue button catches any that fail.
- Emergency disable doesn't ask for a fresh sign-in. That belongs to Google staff sign-in (S1-E2-07b, after March) and is a follow-up.
- The evidence pack is a JSON download for March. Storing it in the private `evidence` bucket waits for SAFE-4's storage work.
- The safeguarding checklist is interface text, so admins can edit it (S1-E11-18).
