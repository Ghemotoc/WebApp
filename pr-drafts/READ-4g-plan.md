# READ-4g plan: S1-E11-04 Metrics and compliance logs (#102)

Branch `claude/read-4g-metrics-compliance-log`. Board AdminMetrics (8.7). Builds on S1-E15-02 (admin_march_numbers) and S1-E10-03a (cases, tiers).

## Database (`…_s1_e11_04_metrics_and_compliance_log.sql`)
- Staff area `compliance_log`: owner and admin act (architecture 1.8.3, Metrics and logs).
- Settings: `launch_date` ("" until set), `ancom_notice_days` 45 (Law 50/2024), `tier_numbers_days` 30.
- `compliance_log_entries` (kind: staff; user_id = who logged it): reference LR-001, entry_kind (authority_order, legal_request, launch_notice), authority, received_at, content, action_taken, completed_at, completed_by_user_id. Select policy for the area; no write grants.
- `admin_metrics_overview()`: sign-ups by age group from year of birth (13 to 15, 16 to 17, 18 or over, not given), age checks (passed, failed, not finished; appealed is null until S1-E2-08 adds manual checks), cases by tier in the last 30 days with how many were handled within the tier's time limit. Totals only.
- `admin_compliance_log(for_export)`: the log entries plus the removal orders from the public form (TCO-…), newest first, and the launch task (launch date, due date, the logged ANCOM notice). An export writes the audit log.
- `admin_log_compliance_entry()`, `admin_complete_compliance_entry()`, `admin_set_launch_date()`: each logged with before and after values. A completed entry can't be changed (it is proof).
- Test 184: allowed and denied for the policy; moderators and support refused; tier maths; age bands; export logged; completed entries locked.

## Front end (`src/features/staff/components/metrics/`)
- Sign-ups by age, Age checks, Reports by tier (table with SLA share), Product analytics (status from the analytics config; event catalogue count), Compliance log (table, Log a request form, Mark done, Export CSV), Launch task (ANCOM), Transparency reports card.
- Not built, noted in board-fixes: top events (they live in the provider's dashboard, Q49 OPEN), the retention panel (docs/retention.md is the one source; a run log comes with S1-E13-04), the readers-per-day chart (S1-E15-02 already lists days).

## Tests
- Unit: compliance CSV builder, overview parsing.
- e2e: `staff-metrics-compliance.spec.ts`: admin logs a request, marks it done, export CSV; numbers sections show; axe and widths 390, 768, 1440; moderator refused.
