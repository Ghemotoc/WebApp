# Hand-over: Lane C (safety and admin), 24 Oct 2026

From the Lane C session to the new thread "Ghemotoc · Safety and admin". Nothing here is merged or
has a new pull request; GitHub Actions minutes are paused until 1 Nov (CTO, 24 Oct 2026).

## Where the work is

- **Full chain tip:** `claude/funny-einstein-pkv35k-chain-rebased-local` at `ef254ea`, rebased on
  `main` at `4d85da5` (after #167, #169 and #188). Pushed, no pull request, no CI.
- **Each story's rebased tip**, also pushed as `claude/funny-einstein-pkv35k-rebased-<story-id>`:

| Order | Story | Rebased tip | Open PR (old base, don't push to it before 1 Nov) |
| --- | --- | --- | --- |
| 1 | S1-E10-01 Report button on everything | `bbc83de` | Ghemotoc/WebApp#171 |
| 2 | S1-E10-13a Safety contacts (seeded) | `dd2026d` | Ghemotoc/WebApp#172 |
| 3 | S1-E10-03a Moderation queue with tiers | `db2c50f` | Ghemotoc/WebApp#174 |
| 4 | S1-E10-06 Sanctions and repeat offenders | `bd0e6a7` | Ghemotoc/WebApp#175 |
| 5 | S1-E14-04 Contact us | `c05e231` | Ghemotoc/WebApp#182 |
| 6 | S1-E10-QA Epic check | `e26808f` | Ghemotoc/WebApp#185 |
| 7 | S1-E11-QA Epic check | `0a685c4` | Ghemotoc/WebApp#186 |
| 8 | S1-E11-01b Pick the account when granting a role | `ef254ea` | none yet |

Also open: Ghemotoc/WebApp#193 (Tooling: CI fails on duplicate migration versions), branch
`claude/funny-einstein-pkv35k-migration-versions`; merges straight after #169; needs one CI run on
1 Nov. Already merged: #167 (S1-E11-01), #169 (S1-E11-17).

## What the rebase changed

- **Migrations on 25 Oct versions, in chain order** (three clashed with Lane A's numbers, and
  renumbering only those would have run 13a's seed before its table): `20261025100001` S1-E10-01,
  `20261025110001` and `…110002` S1-E10-13a, `20261025120001` S1-E10-03a, `20261025130001` and
  `…130002` S1-E10-06, `20261025140001` S1-E14-04 (contact page v0.2), `20261025150001` S1-E11-01b.
  Contents unchanged except the contract additions below.
- **pgTAP epic checks:** `094-epic-s1-e10`, `095-epic-s1-e11` (agreed numbering: Lane A 092, 093;
  S1-E6 096; S1-E5 097).
- **ADR:** the contact-form ADR is `0006` (Lane A also has an ADR 0004).
- **Shared contract (architecture 1.7.11), added on rebase because Lane A merged first:**
  `story` and `chapter` branches in `reportable_item_owner()` and `reportable_item_summary()`
  (published, undeleted items only); the story page uses `<ReportButton itemType="story">`
  (hidden from the owner, with its doodle); `content_is_held_for_moderation()` is true while an
  open case is about the item (S1-E10-03a); the real `is_moderated_away()` replaces Lane A's stub.
- **Sign-up trigger fix re-applied in S1-E10-06:** its copy of `handle_new_auth_user()` checks the
  banned email first and takes the invite place after the profile, with the new account's ID
  (`use_platform_invite(code, new.id)`, needed by S1-E11-17's `invite.redeemed` row). In the old
  chain this lived in a merge commit, which a rebase drops. The migration now matches #175's.

## Checks (local, from a clean start, on the chain tip `ef254ea`)

lint, typecheck, types:check, unit (67 files, 387 tests), `supabase test db` (PASS), i18n:check,
no duplicate migration versions, and the full browser suite: **527 passed**. Each story also passed
its fast checks and its own browser specs when rebased.

## 1 Nov catch-up

1. After Lane A's reader PRs (#191, #192 and the rest of S1-E4) merge: rebase the chain tip on
   `main`, story by story (`git rebase --onto <new previous> <old previous>`); take main's side of
   `src/lib/database.types.ts` and regenerate it per story (`npm run types:gen`).
2. Check for new clashes: migration versions (`npm run migrations:check` once #193 is in), pgTAP
   and ADR numbers; any new `reportable_type` value needs its branch in both functions (test 042);
   any Lane A copy of `handle_new_auth_user()` must keep the invite step after the profile.
3. Run every CLAUDE.md check locally, the full browser suite included. Before it, stop any
   leftover `vite preview` (the tests reuse a running one, and a stale build gives false failures).
4. Per the new plan the chain merges as **one bundle PR**; the CTO decides whether #171 to #186
   are closed in its favour. Update their descriptions or the bundle's from the existing ones
   (each has by-hand staging steps).

## Open questions

- Whether the content editor role stays (it has no area; OPEN since 17 Oct 2026).
- `report_hourly_limit`, `moderation_hours_*`, suspension lengths and `reporting_pause_days` are
  proposals stored as settings; editable once S1-E11-03 exists.
- Lawyer's list items L21 (banned email kept as a keyed hash) and L22 (Brevo for support emails).
- By hand on staging after merge: top-ups `S1-E10-13a.sql` then `S1-E10-03a.sql`; the Vault
  secret `banned_email_secret`; Brevo's API key, a verified sender and the Cloudflare rate-limit
  rule (`docs/runbooks/contact-form.md`).

## Unbuilt S1-E10 and S1-E11 stories in the March MVP

| Story | January demo? |
| --- | --- |
| S1-E10-02 Public report form and the authorities' contact point | No |
| S1-E10-04 Statements of reasons and "My reports" | No |
| S1-E10-05 Picture check | No (no uploads in the demo) |
| S1-E10-08 "Copied from a published work" fields | No |
| S1-E10-09 Removal orders and "Emergency disable" | No |
| S1-E10-10 Safeguarding workflow and evidence pack | No |
| S1-E11-02 User management | No |
| S1-E11-06 Website CMS and home page copy | No: Lane E builds S1-E5-08 on the B31 stub (CTO, 24 Oct) |
| S1-E11-10 Notice banners | No |
| S1-E11-12 Help pages and questions | No (same reason as S1-E11-06) |
| S1-E11-18 Edit interface text | No |
