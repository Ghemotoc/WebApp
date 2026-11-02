# CLASSES-f plan: the forums epic check (S1-E8-QA, #79)

- e2e/epic-s1-e8.spec.ts: two browser journeys as March runs them (adults_only on):
  1. thread, quote, an under-16 who reads but can't post, New for you (8-02, 8-03, 8-04, gate);
  2. class thread, waiting student, outsider, certificate through the notification (8-11, 8-02, 8-12, 7-01).
- supabase/tests/database/237-epic-s1-e8.test.sql: three journeys with adults_only off and parental
  consent on (every age), 30 tests.
- docs/epic-reports/S1-E8.md; docs/code-tour.md "One journey through the whole epic (S1-E8-QA)".
- The bundle's full e2e run before merging.
