# PRIVACY part g: S1-E13-QA epic check (plan)

- e2e/epic-s1-e13.spec.ts: journeys 1 to 4 across S1-E13-01 to 05 with kid_14_ok, kid_14_waiting, adult_writer and teen_17; journey 5 axe on the four Settings sections at 390, 768 and 1440 px, night, Romanian.
- supabase/tests/database/214-epic-s1-e13.test.sql: the same journeys through the functions, both kinds of copy purged when expired, a closed account's export purged after 14 days, and data_export_tables() and account_deletion_rules() naming the same tables.
- docs/epic-reports/S1-E13.md, docs/code-tour.md (one journey through the epic), docs/mocks.md (stale online status line removed).
- Then the bundle 8 full e2e run before merging.
