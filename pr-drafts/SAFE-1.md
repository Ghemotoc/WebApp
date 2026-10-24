# SAFE-1: opened as Ghemotoc/WebApp#197 (24 Oct 2026); the body below is what was posted

Closes #85
Closes #90
Closes #132
Part of #97
Part of #87
Part of #98
Part of #116

(S1-E10-13a, 03a and the two epic checks are parts of their stories, so their issues stay open.
S1-E11-01b's story entry is in `docs/stories/s1-e11-admin-site.md` on this branch (commit
`b57f61a`); it gets its issue when "Sync story issues" runs after the merge, see By hand. That
issue then closes by hand, because it is created after this PR merges.)

Includes the work of Ghemotoc/WebApp#171, #172, #174, #175, #182, #185, #186 and #193 (Lane C's
chain and the migration check), rebased on `main` after TOOL-1 (#195) and READ-1 (#196). Those
PRs stay open until the CTO decides with Robert.

## What changed

| Story | What it builds | Migration | pgTAP |
| --- | --- | --- | --- |
| S1-E10-01 Report button on everything | One `<ReportButton>` and native `<dialog>` with 13 reasons; `reports`, `report_item()` (read-only accounts can report, 24 h dedupe, hourly limit); references R-000123. The shared reportable-items contract (architecture 1.7.11): `reportable_item_owner()` and `reportable_item_summary()` with `story` and `chapter` branches (published, undeleted only); the story page uses the shared Report button | `20261025100001` | 042 |
| S1-E10-13a Safety contacts (seeded) | 81 contacts (10 countries plus the international directories) seeded from `content/safety-contacts.json`; the "Is someone in danger right now?" block in the dialog and on `/legal/contact`; a country with no row falls back to the directories and is counted in `safety_contact_gaps` | `20261025110001`, `…110002` | 043 |
| S1-E10-03a Moderation queue with tiers | One case per item (`attach_report_to_case()`), tiers (1 h for authority orders only, same day, 48 h, 7 days), deadlines from the first report, safeguarding hidden without the permission; `/staff/moderation`, the case page, `admin_decide_case()` (action and note required, audited); `content_is_held_for_moderation()`; 20 seeded cases | `20261025120001` | 044 |
| S1-E10-06 Sanctions and repeat offenders | Warn, suspend (1, 7 or 30 days), ban (Supabase ban, sessions ended, keyed hash of the email blocks sign-up), hide or remove; reporting pause; lift and restore with a reason; the member's notice; the real `is_moderated_away()` replaces Lane A's stub. Its copy of `handle_new_auth_user()` checks the banned email first and takes the invite place after the profile (`use_platform_invite(code, new.id)`) | `20261025130001`, `…130002` | 045 |
| S1-E14-04 Contact us | `/contact` form through a Pages Function and Brevo (two emails, nothing stored or logged), honeypot, Cloudflare rate-limit rule; legal contact page v0.2; ADR 0006 | `20261025140001` | (e2e) |
| S1-E11-01b Pick the account when granting a role | Roles are granted by picking an account from a search by username, pen name or a complete email; emails masked, revealing one is a logged sensitive read; each refusal names its own problem; last-owner guard tested directly | `20261025150001` | 046 |
| S1-E10-QA, S1-E11-QA Epic checks | `e2e/epic-s1-e10.spec.ts`, `e2e/epic-s1-e11.spec.ts`, `docs/epic-reports/S1-E10.md` and `S1-E11.md`; fixes an account-language race in the axe specs | none | 094, 095 |
| Tooling (was #193) | `npm run migrations:check` fails on two migrations sharing a version or a bad file name; runs in the CI "checks" job and in `npm run checks` (TOOL-1's one-command list); CLAUDE.md check list and `supabase/README.md` updated | none | (Vitest) |

Numbering moved on the rebase (the old PRs said otherwise): migrations on 25 Oct versions after
Lane A's (READ-1 ends at `20261025090001`), epic checks 094 and 095 (not 092, 093), contact-form ADR
0006 (not 0004).

Rebase on READ-1: `docs/mocks.md` keeps READ-1's rows and drops the "Report this story" e-mail
stand-in this bundle replaces; `docs/code-tour.md` keeps both epic sections; the dev-server
plugin serves both `/s/…` (link previews) and `/api/contact`; `e2e/usernames.spec.ts` keeps
TOOL-1's language fix; the generated types were regenerated once from every migration.

## Local check run (the merge gate; GitHub Actions minutes are used up for October)

Commit `7ca7997` (branch `claude/peaceful-ritchie-cte5ho`), rebased on `main` at `7505053` (after
#195 and #196), 24 Oct 2026. Clean start: `npm ci`, `supabase stop --no-backup`, `supabase start`,
`supabase db reset` before the database tests.

| Check | Result |
| --- | --- |
| `npm run lint` (ESLint and Prettier) | pass |
| `npm run typecheck` | pass |
| `npm run types:check` | pass (regenerated once after the rebase, commit `0392a4a`) |
| `npm test` (Vitest) | 77 files, 461 tests, pass |
| Database tests (pgTAP) | 48 files, 972 tests, pass |
| `npm run i18n:check` | pass |
| `npm run migrations:check` | pass, no duplicate versions |
| `npm run build` | pass |
| `npx wrangler pages functions build --outdir /tmp/pages-fn` | "Compiled Worker successfully" |
| `npm run test:e2e`, run 1 | 523 passed, 1 failed, 23 not run (the rest of that serial group), 1 skipped |
| `npm run test:e2e`, run 2 | 543 passed, 1 failed, 3 not run, 1 skipped |
| `e2e/story-settings.spec.ts` alone, 3 runs | 28 of 28 passed each time |

**The one e2e failure is the same both times and is not this bundle's:** an axe colour-contrast
check in `e2e/story-settings.spec.ts` (S1-E3-05, Lane A), on `/write/s/…/settings` in run 1 and
`/s/…` in run 2. axe read in-between colours (eyebrow `#94763b`, between the light `#815e18` and
the night `#e6c24c`; surface `#fefefd`), so it caught the page during the theme transition. Lane A
saw the same failure on READ-1 ("an S1-E3-05 axe view, passes 28/28 alone"). Every test that did not
run in the full runs is in that spec, which passes in full on its own. Fix proposed as a follow-up
for the shared e2e support code (wait for the theme's transitions before axe), outside this bundle.

The database tests ran through `prove` with psql against the local database: Docker Hub
rate-limited the `pg_prove` image that `npx supabase test db` pulls. Same files, same TAP harness.

Screenshots: not taken for this bundle (built before 24 Oct's quality-pass rule; each story's
specs check 390, 768 and 1440 px with axe).

## By hand on staging after merge (in this order)

1. Once: `select vault.create_secret('<40+ random characters>', 'banned_email_secret');` and keep
   the value in the password manager (the S1-E10-06 top-up and every ban need it).
2. Run the top-ups: `supabase/staging-topups/S1-E10-13a.sql`, then `S1-E10-03a.sql` (expect
   `open_cases 14`, `decided_cases 6`), then `S1-E10-06.sql` (applies the seeded cases'
   sanctions; changes nothing if they are already there). Each is safe to run twice and adds no
   accounts.
3. Contact us (`docs/runbooks/contact-form.md`): set the `BREVO_API_KEY` Cloudflare secret, make the
   support address a verified Brevo sender, redeploy; add the WAF rate-limit rule (`/api/contact`,
   POST, 5 requests per 10 min per IP, block 10 min).
4. Actions › "Sync story issues" › Run workflow (untick "Only list") to create the S1-E11-01b
   issue; the workflow runs only by hand. Then close that issue as done by this PR.
5. Check the two international directory links in the safety block (Child Helpline International,
   INHOPE).

## Needs the lawyer's review before launch

This bundle handles reports from minors, safeguarding cases and sanctions. Before minors join:
L21 (a banned person's email kept as a keyed hash) and L22 (Brevo as processor for support
emails) in `docs/for-the-lawyer.md`.

## Design notes

Board mismatches already in `docs/board-fixes.md` (self-hosted fonts, plum focus ring). Queue
uses cards instead of the board's 6-column table; claim, search and the side panel are S1-E10-03b.
One Suspend chip with a length instead of the sanction ladder; Restrict waits for S1-E11-08. There
is no Contact board: `/contact` follows NoticeForm 7.3 without the right-hand column. Staff
screens: plain components, no doodles.

## Follow-ups

- Settings stored as proposals, editable once S1-E11-03 exists: `report_hourly_limit` (20),
  `moderation_hours_*`, `suspension_day_choices`, `suspension_default_days`,
  `reporting_pause_days`.
- A warning is only a record for now; the sanction ladder comes later.
- Safety contacts: opening hours and some labels are English in the research file (part b adds
  Romanian); Telefonul Copilului is listed twice for Romania.
- Brevo joins the processor list and privacy notice once the lawyer answers L22.
- Deferred legs: "See my reports" (S1-E10-04), the report confirmation notification (S1-E7-01),
  the "copied from a published work" fields (S1-E10-08). S1-E10-02, 04, 05, 08, 09, 10 and
  S1-E11-02 each add their leg to the epic specs and 094/095.
- Whether the content editor role stays (OPEN since 17 Oct 2026).
- The theme-transition flake in the axe checks above (shared e2e support, outside this bundle).
- Rule 7: the old name for "the demo" still appears in files already on `main` from other lanes
  (`docs/decisions.md`, `docs/code-tour.md`, `docs/epic-reports/S1-E3.md`,
  `docs/stories/s1-e04-reading.md`, `supabase/staging-topups/README.md`, the S1-E3-01 covers
  migration's comment, `scripts/build-demo-content.ts`, `content/`); this bundle reworded only its
  own three.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WsVKSRL1AJLAY7CY81gyau
