We are working on story S1-E1-02 (Database baseline with deny-by-default row-level security) only. S1-E1-01 is merged.

Read first: CLAUDE.md, docs/architecture.md (sections 1.6, 1.7 and 1.10), docs/definition-of-done.md and the story S1-E1-02 in docs/stories/.

Follow "contract first" (architecture 1.7.2): migrations, then pgTAP tests, then generated types, then seed.

STEP 1, PLAN ONLY. Give me:
1. The migrations: tables, enums, functions (audit_log with log_staff_action(), reportable_type, feature_flags, settings, and the account gate skeleton account_state(), is_active_member(), age_band(), is_staff(), has_aal2()).
2. Every RLS policy: who can select, insert, update or delete, and why.
3. The CI checks: no table without RLS and a policy, no user-content table without a not-null user_id, no service role key in the bundle, types:check.
4. The seed personas from architecture 1.7.2, with years of birth worked out from the current year.
5. A table mapping each acceptance criterion to its test.
6. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build, run every check (including `npx supabase test db`), push the branch story/S1-E1-02-db-baseline and give me the summary, the check results, how I can see the tables and the test accounts locally, and the pull request description.
