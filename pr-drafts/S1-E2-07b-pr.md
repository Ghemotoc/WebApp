<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #15

Story S1-E2-07b, found missing by bundle 17 CHECK: staff powers only after a Google Workspace sign-in on the staff domain. S1-E2-07a (merged earlier) is the March part; this is the last part of S1-E2-07. It is on the minors' launch gate (architecture 1.7.8).

**Nothing changes until GO-LIVE.** The rule switches on only when an owner sets the Vault secret `staff_email_domain`. While it is missing, staff sign in as in March.

## What changed

- **Migration `…_s1_e2_07b_workspace_sign_in.sql`:**
  - `staff_email_domain()` reads the Vault secret (trimmed, lower case, no "@"). The domain is never in code (CLAUDE.md, "Names and domains are settings").
  - `has_workspace_account()`: a Google identity whose `hd` claim is the domain, with a verified email on it. Google sets `hd` only for Workspace accounts, so a personal Google account made with a work address doesn't count.
  - `workspace_sign_in_holds()`: true while the secret is missing; then only for a provider sign-in (`"oauth"` in the token's `amr`) on such an account.
  - `is_staff_session()` now also asks it. Every staff policy and `admin_*` function reaches it through `staff_may()`, so this is the one place the rule changes.
  - `my_staff_sign_in()` tells the admin shell when a staff member must sign in with Google, and whether the account is connected yet. The domain is only given to someone with a staff role.
  - `admin_grant_role()` refuses an account without a Workspace identity on the domain (criterion 3: a personal writer account never holds a staff role), with the hint `no_workspace_account` so the Roles page explains it.
- **Admin shell:** `StaffWorkspaceSignIn` replaces the staff frame when the server asks. One "Continue with Google" button connects the account first (the Settings › Ways to log in flow), then signs in with it. A plain line shows when Google sign-in can't start.
- **Docs:** ADR 0015, the runbook `docs/runbooks/staff-sign-in.md` (switching on, a SQL check that Supabase kept the `hd` claim, recovery by deleting the secret), `docs/mocks.md`, `docs/code-tour.md`, `supabase/README.md` and the staff README.

## Acceptance criteria

| Criterion | Test |
| --- | --- |
| 07b: staff sign in only through Google Workspace SSO on the staff domain | database 291 (sections 2 and 3), e2e `staff-workspace-sign-in` |
| Any session that isn't a Google sign-in on the domain: every staff action denied | database 291: password session, another Workspace domain, a personal Google account, a provider sign-in without Google |
| A personal writer account never holds a staff role | database 291 section 4 |
| Recovery: deleting the secret brings the March sign-in back | database 291 section 5 |

## Tests

- Database test `291-staff-workspace-sign-in` (22 tests).
- `staffAccess.test.ts` (new, 4 tests) and one more case in `staffRoles.test.ts`.
- e2e `staff-workspace-sign-in.spec.ts`: the page for a staff member not connected yet and a connected one, the error line, and axe at 390, 768 and 1440 px, light and night, ro and en. The server's answer is faked with the shape `my_staff_sign_in()` returns, because setting the real secret would lock every other staff test out.

## Local check run

LOCALRUN

## By hand

GO-LIVE step 7.2 in `by-hand-for-robert.md`, before minors go live: enforce 2-Step Verification in the Workspace admin console, set up Google sign-in (step 5), have every staff member connect their work Google account, run the runbook's `hd` check, then set the secret. If anything goes wrong, deleting the secret undoes it.

## Follow-ups

- A fresh Google sign-in before the most sensitive actions (architecture 1.8.3, a proposal). Today role changes ask for a sign-in from the last 15 minutes, of any kind.
- After Google sends a staff member back, they land on the usual page, not `/staff`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
