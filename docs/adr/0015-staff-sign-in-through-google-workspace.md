# ADR 0015: Staff powers need a Google Workspace sign-in, switched on by one Vault secret

- **Date:** 5 November 2026
- **Status:** Built by the builder in bundle 17 CHECK (story S1-E2-07b). Off until GO-LIVE: it starts working only when an owner sets the Vault secret `staff_email_domain` (GO-LIVE step 7.2).

## Decision
- **One place decides.** `is_staff_session()` (S1-E2-07a, S1-E11-01) now also asks `workspace_sign_in_holds()`. Every staff policy and `admin_*` function reaches it through `staff_may()`, so nothing else changed.
- **The rule.** Once the secret is set, a staff session must come from a provider sign-in (`"oauth"` in the token's `amr` list) on an account linked to a Google identity whose `hd` claim is the staff domain, whose email is on that domain and verified. Google sets `hd` only for Google Workspace accounts, so a personal Google account made with a work address never counts.
- **The second factor is Google's.** Google's 2-Step Verification, enforced in the Workspace admin console, protects the sign-in. We don't use Supabase's own two-factor level (aal2) for staff (decided 17 Oct 2026, 11:53; architecture 1.8.3).
- **Roles follow the same rule.** `admin_grant_role()` refuses an account with no Workspace identity on the domain (`check_violation`), so a personal writer account never holds a staff role (criterion 3).
- **The admin shell explains it.** `my_staff_sign_in()` tells the shell when a staff member has to sign in with Google and whether the account is linked yet. The page `StaffWorkspaceSignIn` then offers one "Continue with Google" button: it connects the account first (the Settings › Ways to log in flow), then signs in with it. The domain is only ever told to someone who holds a staff role.
- **Where the domain lives.** In the Vault secret `staff_email_domain`, read by `staff_email_domain()`. It is never written in code or SQL (CLAUDE.md, "Names and domains are settings"). Spaces, capitals and a leading "@" are forgiven.

## Why
- The architecture asks for a staff session from the company's Google Workspace only (1.8.1, 1.8.3, 1.9), and the minors' launch gate needs it before the first under-18 joins (1.7.8).
- A secret instead of a setting row: the staff domain isn't sensitive, but a row in `settings` is editable from Staff › Settings, and a slip there would lock every staff member out of the screen that fixes it. The Vault is only reachable from the SQL editor, by an owner.
- Off until it is set: March is invited adults only, with staff on the normal log-in (decided 17 Oct 2026, 12:44). Nothing changes for them until GO-LIVE.

## Consequences
- **Lock-out is the failure mode, and it is safe.** If Supabase doesn't store the `hd` claim, or Google sign-in isn't set up, nobody gets staff powers: no one gets in by mistake. The fix is to delete the secret in the SQL editor, which brings the March log-in back at once (`docs/runbooks/staff-sign-in.md`).
- **It needs Google sign-in set up first:** the Google provider in Supabase Auth and the `social_login` flag on (GO-LIVE step 5), and every staff member's Google account connected before the secret is set.
- **Not built yet (follow-ups):** a fresh Google sign-in before the most sensitive actions (architecture 1.8.3, a proposal), and redirecting a staff member straight back to `/staff` after Google sends them back.
