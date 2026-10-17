# Every prompt to give Claude Code

One story per cloud session. The table below is the March build order; every story's prompt follows it, grouped by epic. Start each session on the WebApp repository in **Plan** mode, paste the prompt, read the plan, then switch to **Accept edits**. After the pull request, run the review prompt at the end of this file in a fresh session.

Generated on 17 October 2026 from docs/ (CTO pack sections 1.7.4, 1.7.6 and 1.13). The order follows the build waves, then is adjusted so no story comes before an MVP story it depends on (17 Oct 2026); the Wave column shows the story's wave in architecture 1.7.6. Only hard dependencies set the order; a dependency the story marks after a semicolon (for example "S1-E10-05 for uploaded covers") is built against a stub, and the story's prompt names it. Sizes are estimates: S about 3 hours, M about 12, L about 30.

## Files: nothing for you to upload

Everything Claude Code needs is already in the repository (Ghemotoc/WebApp), pushed on 17 October 2026:

| Folder | What it holds |
| --- | --- |
| `CLAUDE.md` | The rules Claude Code reads at the start of every session |
| `docs/` | Architecture, Definition of Ready and Done, every story, decisions, open questions, the lawyer's list, ADR 0001 |
| `design/boards/` | The HTML source of all 64 canvas boards, plus `canvas.json` |
| `design/renders/` | A desktop picture of every board and a phone picture of every product screen |
| `design/assets/` | Every picture the boards use (doodles, covers, photos) |
| `content/` | Draft legal texts, safety contacts by country and the public-domain classics lists |
| `prompts/` | This file, the first three session prompts, the story template and the review prompt |
| `docs/history/` | How everything was made, including every brief Claude used (a record, not instructions) |

What stays out of the repository, on purpose: passwords, the Supabase database password and API keys. They live in your password manager, and in GitHub or Supabase secret stores if a session asks for them.

**When the canvas changes:** ask Claude (in the WattPad Better Be Gone project) to refresh `design/` in the repository, so Claude Code always builds from the latest boards.


**March MVP: 54 stories.**

| # | Story | Title | Priority | Size | Wave |
| --- | --- | --- | --- | --- | --- |
| 1 | S1-E1-01 | Repository, environments and CI skeleton | Must | M | Wave 0: Foundations |
| 2 | S1-E1-03 | Design tokens, themes and app shell | Must | M | Wave 0: Foundations |
| 3 | S1-E1-02 | Database baseline with deny-by-default row-level security | Must | M | Wave 0: Foundations |
| 4 | S1-E1-04 | Romanian and English interface | Must | M | Wave 0: Foundations |
| 5 | S1-E14-01 | Terms, privacy notice and community guidelines | Must | M | Wave 1: Identity |
| 6 | S1-E2-01 | Sign up with email | Must | M | Wave 1: Identity |
| 7 | S1-E2-02 | Year of birth at sign-up | Must | M | Wave 1: Identity |
| 8 | S1-E2-04 | Username and optional pen name | Must | M (was S; the word lists and look-alike checks add work) | Wave 1: Identity |
| 9 | S1-E2-05 | Sign in, sessions and account recovery | Must | S | Wave 1: Identity |
| 10 | S1-E2-07 | Staff roles with mandatory two-factor sign-in | Must | M | Wave 1: Identity |
| 11 | S1-E2-10 | Country from the connection at sign-up | Should | S | Wave 1: Identity |
| 12 | S1-E14-02 | Contact points and company details | Must | S | Wave 1: Identity |
| 13 | S1-E2-08 (08a, then 08b) | Age check with Yoti | Must | L (split before building: 08a hosted check, deep link and webhook; 08b retries, manual check and appeal) | Wave 1b: Age gate (critical) |
| 14 | S1-E2-03 | Parental consent for under-16s | Must | M | Wave 1b: Age gate (critical) |
| 15 | S1-E3-01 | Create a story | Must | M | Wave 2: Write and read |
| 16 | S1-E3-02 | Chapter editor with autosave | Must | L | Wave 2: Write and read |
| 17 | S1-E3-03 | Publish, unpublish and schedule chapters | Must | M | Wave 2: Write and read |
| 18 | S1-E3-04 | Manage chapters | Must | M | Wave 2: Write and read |
| 19 | S1-E3-05 | Story status and settings | Must | S | Wave 2: Write and read |
| 20 | S1-E3-06 | Ratings and labels: age rating, fan fiction, parody and AI assistance | Must | S | Wave 2: Write and read |
| 21 | S1-E4-01 | Chapter reader | Must | L | Wave 2: Write and read |
| 22 | S1-E4-04 | Web teaser for shared links | Must | M | Wave 2: Write and read |
| 23 | S1-E4-06a | Copy protection and traceability | Should (06a Must for March) | L (split: 06a the web, S, in the March MVP; 06b the apps, after March) | Wave 2: Write and read |
| 24 | S1-E5-05 | Writer profile page | Must | M | Wave 2: Write and read |
| 25 | S1-E10-01 | Report button on everything | Must | M | Wave 3: Safety and staff |
| 26 | S1-E11-01 | Admin shell with protected access | Must | M | Wave 3: Safety and staff |
| 27 | S1-E10-03a | Moderation queue with priority tiers | Must | L (split: 03a one queue with tiers, deadlines and a decision with a note, M, in the March MVP; 03b grouping, claiming and visible timers, after March) | Wave 3: Safety and staff |
| 28 | S1-E10-02 | One web form for all reports, including authority removal orders | Must | M | Wave 3: Safety and staff |
| 29 | S1-E10-06 | Sanctions and repeat offenders | Must | M | Wave 3: Safety and staff |
| 30 | S1-E10-09 | Terrorist content removal orders | Must | M | Wave 3: Safety and staff |
| 31 | S1-E10-10 | Safeguarding escalation | Must | M | Wave 3: Safety and staff |
| 32 | S1-E10-05 | Picture check on upload | Must | M | Wave 3: Safety and staff |
| 33 | S1-E10-08 | "Copied from a published work" report | Must | M | Wave 3: Safety and staff |
| 34 | S1-E10-13 | Country-specific emergency and safety contacts | Must | M | Wave 3: Safety and staff |
| 35 | S1-E11-02 | User management | Must | M | Wave 3: Safety and staff |
| 36 | S1-E5-01 | Browse by category and tag | Must | M | Wave 4: Social and discovery |
| 37 | S1-E6-01 | Comment on a chapter | Must | M | Wave 4: Social and discovery |
| 38 | S1-E6-02 | Emoji reactions on comments | Must | S | Wave 4: Social and discovery |
| 39 | S1-E6-03 | Like a chapter | Must | S | Wave 4: Social and discovery |
| 40 | S1-E6-04 | Private downvote | Must | S | Wave 4: Social and discovery |
| 41 | S1-E6-05 | Follow a writer or a story | Must | S | Wave 4: Social and discovery |
| 42 | S1-E7-01 | In-app notifications | Must | M | Wave 4: Social and discovery |
| 43 | S1-E10-04 | Statements of reasons | Must | M | Wave 3: Safety and staff |
| 44 | S1-E13-02 | Download my data | Must | M | Wave 5: Rights, numbers and shipping |
| 45 | S1-E11-09a | Data requests and story export | Must (GDPR) | L (split before building: 09a the request log, identity check, deadline, the machine-readable copy and the Word files, in the March MVP; 09b the PDF files, after March) | Wave 5: Rights, numbers and shipping |
| 46 | S1-E13-03 | Delete my account in the app | Must | M | Wave 5: Rights, numbers and shipping |
| 47 | S1-E13-04 | Retention schedule and log minimisation | Must | M | Wave 5: Rights, numbers and shipping |
| 48 | S1-E13-05 | Download my stories | Should | S | Wave 5: Rights, numbers and shipping |
| 49 | S1-E14-04 | Contact us with a ready-made EU helpdesk | Must | S | Wave 5: Rights, numbers and shipping |
| 50 | S1-E15-02 | First-party metrics for the March test | Must | M | Wave 5: Rights, numbers and shipping |
| 51 | S1-E5-03 | Popularity ranking | Must | M | Wave 4: Social and discovery |
| 52 | S1-E5-02 | Sort options | Must | S | Wave 4: Social and discovery |
| 53 | S1-E5-09 | See all page for a shelf | Must | S | Wave 4: Social and discovery |
| 54 | S1-E5-08 | Public website home page | Should (proposal: for the March test a short version is enough, with the hero, the safety lines, the questions and the download buttons; the live rows can follow) | M | Wave 4: Social and discovery |

## Prompts for every Stage 1 story

Every story has its own prompt below, grouped by epic and ordered by story ID. Build them in the March order in the table above first; after March, follow docs/architecture.md section 1.13. Won't stories have no prompt. Large stories that must be split have one prompt per part. In every prompt, "run every check in CLAUDE.md" includes checking that the code follows the Readable code section of CLAUDE.md (decided 17 Oct 2026, 12:26).

## S1-E1 Foundations and delivery pipeline

### S1-E1-01 Repository, environments and CI skeleton
Must · M · March MVP (wave 0) · Depends on: none

```text
We are working on story S1-E1-01 (Repository, environments and CI skeleton) only.
This is the first session: the repository holds only the starter kit (CLAUDE.md, docs/, design/, prompts/). There is no app code yet.

Read first: CLAUDE.md, docs/architecture.md (sections 1.5, 1.7, 1.11 and 1.12), docs/definition-of-done.md, and the story S1-E1-01 in docs/stories/.

What I want from this session:
- A React + Vite + TypeScript (strict) app skeleton with Tailwind, shadcn/ui, React Router, TanStack Query and i18next (ro and en), and an empty home route that says "Ghemotoc" in both languages.
- The Supabase CLI as a dev dependency, `supabase init`, and the npm scripts CLAUDE.md lists (lint, typecheck, types:gen, types:check, test, test:e2e, i18n:check), each working, even if some only run an empty suite for now.
- GitHub Actions:
  1. On every pull request: lint, typecheck, unit tests, database tests against a local Supabase (`supabase db start`), the i18n key check and a Playwright + axe smoke test of the home page. A failing check blocks the merge.
  2. Database changes: Supabase's GitHub integration is connected to the staging project and applies supabase/migrations when main changes. Don't add a GitHub Actions job that also pushes migrations; make sure the supabase/ folder and config work with that integration.
  3. The web deploy step exists but is switched off: the hosting provider is OPEN (Q38).
- A SessionStart hook that runs `npm ci` only when package-lock.json changed, so cloud sessions start ready. Merge it into the existing .claude/settings.json and keep its deny rules.
- docs/runbooks/README.md with one line per runbook still to write.
- docs/code-tour.md, written for a junior developer: where the app starts, how a click travels from a screen to a database table and back, where things live (src/features, src/lib, supabase/migrations, supabase/functions, supabase/tests, e2e, docs) and a "start here" reading order. Every later story updates it (Definition of Done, Readable code).

Production deploys and tagged releases: write the workflow but leave it disabled until a production project exists.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. The files you will create.
2. A table mapping each acceptance criterion of S1-E1-01 to the check or test that proves it, plus one row for docs/code-tour.md (it exists and covers the four parts above).
3. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check, fix failures, push your working branch (in a cloud session, the branch the session was given) and open the pull request titled "S1-E1-01: Repository, environments and CI skeleton", then give me:
- a summary of what changed and the check results,
- step-by-step instructions for me, a non-developer on a Mac, to run the app locally and see it,
- the pull request description using .github/pull_request_template.md.
```

### S1-E1-02 Database baseline with deny-by-default row-level security
Must · M · March MVP (wave 0) · Depends on: S1-E1-01

```text
We are working on story S1-E1-02 (Database baseline with deny-by-default row-level security) only. S1-E1-01 is merged.

Read first: CLAUDE.md, docs/architecture.md (sections 1.6, 1.7 and 1.10), docs/definition-of-done.md and the story S1-E1-02 in docs/stories/.

Follow "contract first" (architecture 1.7.2): migrations, then pgTAP tests, then generated types, then seed.

STEP 1, PLAN ONLY. Give me:
1. The migrations: tables, enums, functions (audit_log with log_staff_action(), reportable_type, feature_flags, settings, and the account gate skeleton account_state(), is_active_member(), age_band(), is_staff(), is_staff_session()).
2. Every RLS policy: who can select, insert, update or delete, and why.
3. The CI checks: no table without RLS and a policy, no user-content table without a not-null user_id, no service role key in the bundle, types:check.
4. The seed personas from architecture 1.7.2, with years of birth worked out from the current year.
5. A table mapping each acceptance criterion to its test.
6. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build, run every check (including `npx supabase test db`), push your working branch (in a cloud session, the branch the session was given), open the pull request titled "S1-E1-02: ..." and give me the summary, the check results, how I can see the tables and the test accounts locally, and the pull request description.
```

### S1-E1-03 Design tokens, themes and app shell
Must · M · March MVP (wave 0) · Depends on: S1-E1-01

```text
We are working on story S1-E1-03 (Design tokens, themes and app shell) only. S1-E1-01 is merged.

Read first: CLAUDE.md, docs/definition-of-done.md (all the design rules), the story S1-E1-03 in docs/stories/, design/README.md, and these boards' HTML in design/boards/: Discover, Story, Reader, Search, Settings, AdFormats, AdminSponsors and AdminUsers. Look at the matching pictures in design/renders/ too.

What I want from this session:
- Design tokens taken from the boards' HTML, not guessed: colours (light and night), the four fonts (Bricolage Grotesque headings, Inter body, Cutive eyebrows at 14 px in sentence case, Shadows Into Light Two handwriting), type sizes, spacing, radii, borders and focus rings.
- The app shell: the floating top bar from the public boards, the staff bar from the admin boards, the footer, light and night mode, and "reduce motion" respected.
- A /design route that shows every component on one page, built to match the boards: buttons, links, pills and chips (every state), the drop-down with the tmc-sel rule and the 14 px chevron, inputs, cards and story cards, shelves with scroll arrows that only show when the row overflows (no visible scrollbar), label rows with fine lines (tmc-rows), notices, the ad slots (wide banner, portrait, side box, in-list card, each labelled "Ad" or "Sponsored"), and an empty state.
- A CI contrast test for every text and background token pair (WCAG 2.2 AA), and axe on /design.

If this is too big for one pull request, propose a split into S1-E1-03a (tokens, themes, shell) and S1-E1-03b (the /design components page) in your plan.

STEP 1, PLAN ONLY. Give me the files, a table mapping each acceptance criterion and each design rule to its test or check, and anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build, run every check, push your working branch (in a cloud session, the branch the session was given), open the pull request titled "S1-E1-03: ..." and give me the summary, the check results, the steps to open /design on my Mac next to the canvas pictures, and the pull request description.
```

### S1-E1-04 Romanian and English interface
Must · M · March MVP (wave 0) · Depends on: S1-E1-01

```text
We are working on story S1-E1-04 (Romanian and English interface) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e01-foundations-and-delivery-pipeline.md.

CONTEXT:
- Already merged: S1-E1-01 (S1-E1-02 and S1-E1-03 come before this in the March order, so they should be merged too).
- Decisions that apply:
  - The interface opens in Romanian for everyone, whatever the device language; English is one choice away in the language menu (17 Oct 2026, 11:48). This replaces "falls back to English".
  - The language picker is a drop-down, not a toggle, in the top bar and in the footer, listing English and Română (Q11).
  - Romanian uses ș and ț with the comma below; cedilla forms (ş, ţ) are normalised on input (CLAUDE.md rule 4).
- Designs: no board of its own. The drop-down sits in the top bar and footer of design/boards/Discover.dc.html (design/renders/desktop/Discover.jpg, design/renders/phone/Discover.jpg) and follows the one drop-down style in docs/definition-of-done.md and the /design page from S1-E1-03. Match at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: saving the choice to the account needs profiles.locale (B05, architecture 1.6), which architecture 1.7.3 builds in S1-E2-01. If profiles or that column isn't merged yet, stop and ask me whether to add the column here or keep the choice on the device until S1-E2-01 (check with Robert). Nothing to mock.
- Watch-outs: the terms, privacy notice and statements of reasons must be available in Romanian for Romanian users; this story builds the language plumbing, not those texts. The i18n key check may already exist from S1-E1-01: confirm it fails on a key missing from either locale and extend it if not. No OPEN points in the story.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations, if any (the locale column), with RLS policies (a user reads and updates only their own locale) and their allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it, including the ş/ţ normalisation unit test and a Playwright test that a browser set to English still opens in Romanian.
4. New i18n keys (ro and en) and any analytics events (object_action, for docs/analytics-events.md). No moderation hooks expected.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E1-04: Romanian and English interface". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: open the app in a browser set to English and see Romanian; switch language from the top bar, then from the footer; sign in as adult_writer, switch to English, sign in again in a second browser and see English (if sign-in isn't built yet, tell me which step I can't do by hand yet),
- the pull request description from .github/pull_request_template.md.
```

### S1-E1-05 Error, offline and maintenance states
Should · S · After March · Depends on: S1-E1-03, S1-E1-04

```text
We are working on story S1-E1-05 (Error, offline and maintenance states) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e01-foundations-and-delivery-pipeline.md.

CONTEXT:
- Already merged: S1-E1-03, S1-E1-04. "Staff can still sign in" needs the staff sign-in from S1-E2-07; tell me if it isn't merged.
- Decisions that apply: Romanian is the default interface language, with English in the menu (17 Oct 2026, 11:48). Never log emails, IP addresses or user content (CLAUDE.md rule 12). No third-party scripts without an ADR (rule 7).
- Designs: design/boards/States.dc.html (screen 7.4), design/renders/desktop/States.jpg and design/renders/phone/States.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces (architecture 1.7.3 and 1.7.4, group G):
  - Real: B12, the maintenance_mode flag read through get_client_config().
  - Mocked: the flag is seeded. The admin settings screen (S1-E11-03) comes later, so for now the flag changes by migration (architecture 1.7.9). The story says "switched on in admin": stop and ask me whether the migration route is enough for this story (check with Robert).
  - B32 error tracking stays switched off locally. Architecture 1.5 suggests Sentry (EU data region) "or similar"; no vendor is decided. Stop and ask me before adding one; a new processor also needs a data processing agreement and an ADR.
- Watch-outs:
  - GDPR data minimisation: error reports carry no email, IP address or user content. Prove it with a test of the scrubbing.
  - Unsaved editor text kept on the device when offline: if the editor (S1-E3-02) isn't merged, build a shared offline banner and a small local-draft helper the editor will use, and say so in the PR (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change (404 page with links to home and search, offline banner, maintenance page, error boundary, scrubbing).
2. Migrations, if any, with RLS policies and their allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en) and analytics events (object_action, for docs/analytics-events.md). No moderation hooks expected.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E1-05: Error, offline and maintenance states". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: open a page that doesn't exist; as adult_writer, switch the browser offline and see the banner; switch maintenance mode on locally and see the maintenance page, then sign in as the admin staff persona and get in,
- the pull request description from .github/pull_request_template.md.
```

### S1-E1-06 Move from Lovable's database to our own Supabase project
Won't · M · Not built · Depends on: S1-E1-01, S1-E1-02

No prompt: replaced on 17 Oct 2026 (11:20) by the decision to use our own Supabase project in the EU (Ireland) from day one, so there is no Lovable database to move from.

## S1-E2 Accounts, age gate and onboarding

### S1-E2-01 Sign up with email
Must · M · March MVP (wave 1) · Depends on: S1-E1-02, S1-E1-04, S1-E14-01 (its table; a seeded version stands in until the final text exists)

```text
We are working on story S1-E2-01 (Sign up with email) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e02-accounts-age-gate-and-onboarding.md.

CONTEXT:
- Already merged: S1-E1-02, S1-E1-04, S1-E14-01 (legal documents with one seeded version of content/legal/01-terms-of-use.md and content/legal/02-privacy-notice.md). This story stores which versions the new account accepted and links them from the form.
- Decisions that apply:
  - Consent is the legal basis (Q15): store which terms and privacy notice versions were accepted, with a timestamp; withdrawing must be as easy as giving.
  - Every account gets an automatic, permanent user ID: the Supabase Auth UUID becomes profiles.id, never changes, is never reused and never appears on a public screen, URL, link preview, share card or public view (16 Oct 2026, late evening; architecture 1.6).
  - Data minimisation: email, handle, optional pen name, year of birth (month only where needed), country code and age check result only.
  - The headline is "Write stories. Get read." (Q5). Username and pen name come in setup after the age check, not here.
- Designs: design/boards/Main.dc.html (2.1 Sign up), design/renders/desktop/Main.jpg, design/renders/phone/Main.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces (architecture 1.7.3 and 1.7.4, group B):
  - Real before building: B05 with the user ID trigger (refuses any change to profiles.id or an owner column), the B02 skeleton, one seeded legal version (B06).
  - Mocked: B09 email goes to the local mail catcher (Mailpit); the email provider is OPEN (Q49). Google, Apple and Microsoft buttons belong to S1-E2-09: hide them with the social_login flag (B12).
- Watch-outs:
  - Until the email is verified the account can read but not publish, comment, post or message (is_active_member()).
  - Tell me in the plan how you will check passwords against known breached ones and whether that needs an outside service (a new processor needs my OK).
  - WCAG 2.2 criterion 3.3.8. The year of birth field is S1-E2-02; leave its slot in the form (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: profiles, the user ID trigger, consent records; every RLS policy (who can select, insert, update or delete, and why) with its allowed and denied pgTAP test.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events (object_action, no personal data) and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E2-01: Sign up with email". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: sign up a new account, try a 9-character password and a mismatched confirmation, open the confirmation email in Mailpit, see that an unverified account is read-only and check that adult_writer's public pages never show the user ID,
- the pull request description from .github/pull_request_template.md.
```

### S1-E2-02 Year of birth at sign-up
Must · M · March MVP (wave 1) · Depends on: S1-E2-01

```text
We are working on story S1-E2-02 (Year of birth at sign-up) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e02-accounts-age-gate-and-onboarding.md.

CONTEXT:
- Already merged: S1-E2-01.
- Decisions that apply:
  - Minimum age 13 (15 Oct 2026). Year of birth, then a Yoti age check (16 Oct 2026). Never a full date of birth (CLAUDE.md rule 5).
  - The month is asked only when the year leaves the age unclear at 13 or 16, and the person counts as the younger possible age (Q16). For every other year the month is never asked or stored.
  - Under 13: refuse with "We don’t keep anything you typed. You can try again once you turn 13."; store nothing; no device or IP block (17 Oct 2026).
  - Year of birth, age and the age check result are never shown to other users.
  - The "why we ask" sentence is a tooltip (Definition of Done, tooltip pattern), plus a visible line that a quick age check follows.
- Designs: design/boards/Main.dc.html (2.1 Sign up), design/renders/desktop/Main.jpg, design/renders/phone/Main.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). Use the one drop-down style for the year and month pickers.
- Back-end pieces: B05 (profiles.birth_year, birth_month, age_check_result = pending) and B02 (fill in age_band() and account_state() for the year and month). Yoti (S1-E2-08) isn't built: the account stays read-only, as the pending_check persona shows. Nothing else to mock.
- Watch-outs:
  - Self-declaration alone isn't age assurance (Commission Guidelines C/2025/5519, para 52): the year only picks the check.
  - Unit-test the age maths with a fixed "today", including 1 January and the story's example (born May 2011 counts as 15 until 1 June 2027).
  - A DPIA is needed before real users (ANSPDCP Decision 174/2018); that's paperwork, not code. No OPEN points in the story.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: columns, functions, RLS policies (nobody but the owner and authorised staff functions reads birth_year) with allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events (no ages in them) and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E2-02: Year of birth at sign-up". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: pick a year that needs the month and see the month picker; pick one that doesn't; pick a year under 13 and see the refusal, then show me how to confirm nothing was saved; as adult_writer open kid_14_ok's profile and see no age,
- the pull request description from .github/pull_request_template.md.
```

### S1-E2-03 Parental consent for under-16s
Must · M · March MVP (wave 1b) · Depends on: S1-E2-02, S1-E2-08

```text
We are working on story S1-E2-03 (Parental consent for under-16s) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e02-accounts-age-gate-and-onboarding.md.

CONTEXT:
- Already merged: S1-E2-02 and S1-E2-08 (at least 08a, which hands under-16s to this step; tell me if it isn't merged).
- Decisions that apply:
  - Consent is the legal basis, so a parent's or guardian's consent for under-16s is on from launch (Q15). Romania's digital consent age is 16.
  - The wording says "parent or guardian" (Q8). The consent email goes out in Romanian or English.
  - 16 and 17-year-olds join without a parent (17 Oct 2026, 10:23).
- Designs: design/boards/ParentConsent.dc.html (2.4), design/renders/desktop/ParentConsent.jpg, design/renders/phone/ParentConsent.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces (architecture 1.7.3 and 1.7.4, group B):
  - Real: B08 (parental_consents, consent-request and consent-confirm), B12 parental_consent flag (on; only an owner may turn it off, logged through B03), B02 is_active_member() now needs consent where the flag requires it, B17 the 14-day clean-up job (tests call its SQL function directly).
  - Mocked: B09 email goes to Mailpit.
- Watch-outs:
  - OPEN: how the parent or guardian is verified; email alone is weak (GDPR Art 8(2), lawyer list L2). Build the email link and stop and ask me before adding anything more.
  - OPEN: what exactly happens when consent is withdrawn later (lawyer list L1, L2). Build "read-only plus both people told" as the story says and stop and ask me before deleting anything on withdrawal.
  - Refusal deletes the account and its data and tells the young person. The consent record keeps who, when, the notice version and the email it was sent to; update the privacy notice, the record of processing and docs/retention.md in the same PR.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, functions, the job, RLS policies with allowed and denied pgTAP tests (the young person sees their own consent state; staff read only through admin functions).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en, including both email templates), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E2-03: Parental consent for under-16s". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as kid_14_waiting see the read-only state; with a new under-16 account enter a parent's email, open it in Mailpit and agree; repeat and refuse; run the clean-up job; check that teen_17 never sees the step; as owner try to turn the flag off and find the audit log row,
- the pull request description from .github/pull_request_template.md.
```

### S1-E2-04 Username and optional pen name
Must · M · March MVP (wave 1) · Depends on: S1-E2-01; S1-E11-02 for approving false hits

```text
We are working on story S1-E2-04 (Username and optional pen name) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e02-accounts-age-gate-and-onboarding.md.

CONTEXT:
- Already merged: S1-E2-01. S1-E11-02 (where a moderator approves a false hit) comes later in the March order.
- Decisions that apply:
  - Usernames may use any character, but swearwords (English and Romanian lists), staff and brand look-alikes and confusable characters are blocked; moderators can approve false hits; usernames are normalised for web addresses (Q21).
  - No legal names in Stage 1. The pen name is optional; without one, the handle is shown.
- Designs: design/boards/Onboarding.dc.html (2.5, the username and pen name part only: architecture 1.7.6 wave 1 says "2.5 (handle only)"; the rest of setup is S1-E2-06) and design/boards/Settings.dc.html (6.3) for changing the pen name, with their renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B05 (profiles.handle, handle_slug, pen_name), B12 reserved_names, the username_word_lists and username_approvals tables (architecture 1.6), B03 audit log for old pen names and approvals. Build the approval as an admin_* function that checks is_staff_session() and writes the audit log; the button on the account page comes with S1-E11-02 (check with Robert).
- Watch-outs:
  - 3 to 30 characters (canvas 2.5). Refuse invisible and control characters. Match after folding case, diacritics, look-alikes and digits; Unicode TR39 skeleton for confusables; NFKC, lower case and folding for the unique web-address form.
  - The English and Romanian swearword lists aren't in the repository: stop and ask me where they come from.
  - The pen name change limit of once every 30 days is a proposal: stop and ask me before fixing it; keep it as a setting.
  - Username rules belong in the community guidelines (S1-E14-01): note it as a follow-up. Lawyer list L12.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: columns, tables, indexes (unique normalised handle), functions, RLS policies with allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E2-04: Username and optional pen name". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as a new account try "admin", "adm1n", a name with a hidden zero-width space, a swearword with diacritics, an emoji name and a near-copy of adult_writer's handle; then as adult_writer set a pen name, change it again and see the limit,
- the pull request description from .github/pull_request_template.md.
```

### S1-E2-05 Sign in, sessions and account recovery
Must · S · March MVP (wave 1) · Depends on: S1-E2-01

```text
We are working on story S1-E2-05 (Sign in, sessions and account recovery) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e02-accounts-age-gate-and-onboarding.md.

CONTEXT:
- Already merged: S1-E2-01.
- Decisions that apply: no IP addresses or emails in logs (CLAUDE.md rule 12). Romanian is the default language. Member log-ins never give staff access (staff sign-in is S1-E2-07).
- Designs: design/boards/SignIn.dc.html (2.2), with design/renders/desktop/SignIn.jpg and design/renders/phone/SignIn.jpg. No board shows the Sessions list yet (checked 17 Oct 2026): put it in the Account tab of design/boards/Settings.dc.html (6.3) using the label rows and buttons on /design, and show me the layout in the plan. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). The passkey and Google, Apple and Microsoft buttons on these boards belong to S1-E2-09: keep them hidden.
- Back-end pieces: B05 (Supabase Auth) and our own user_sessions table (device name and last-seen date, no IP address) written at sign-in; "Sign out of all" uses Supabase's global sign-out. B09 email goes to Mailpit. The story's CTO note says Supabase Auth doesn't give users a device list (check before relying on it): confirm that in the plan.
- Watch-outs:
  - The failed sign-in message never reveals whether the email exists.
  - Five failed attempts pause sign-in for that account (canvas 2.2); the 15-minute window is a proposal, so keep it as a setting and stop and ask me if you want another value.
  - A finished password reset signs out every other session and sends an email. GDPR Art 32.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: user_sessions and any lock-out state, RLS policies (a user sees and ends only their own sessions) with allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en, including the reset and "your password changed" emails), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E2-05: Sign in, sessions and account recovery". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as adult_writer type a wrong password and an unknown email and compare the messages; fail six times; sign in on two browsers, see both in Sessions and sign out of all; reset the password through Mailpit and see the other browser signed out,
- the pull request description from .github/pull_request_template.md.
```

### S1-E2-06 Onboarding
Should · M · After March · Depends on: S1-E2-01, S1-E2-04, S1-E2-08, S1-E5-01

```text
We are working on story S1-E2-06 (Onboarding) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e02-accounts-age-gate-and-onboarding.md.

CONTEXT:
- Already merged: S1-E2-01, S1-E2-04, S1-E2-08, S1-E5-01.
- Decisions that apply:
  - Setup comes after the age check. Country is never asked; it comes from the connection (Q20, S1-E2-10). The county or region is optional and self-chosen.
  - Messaging: never between under-16s and adults; 16 and 17-year-olds choose whether adults can message them, off by default (Q6, Q13).
  - Preferences are explicit choices, not inferred profiling; ads are never personalised for anyone (16 Oct 2026).
  - Home and Discover are separate for now and Discover is the main screen.
  - Only accounts with an "18 or over" result see the teacher question; until S1-E2-11 is built, adults skip step 3.
- Designs: design/boards/Onboarding.dc.html (2.5), design/renders/desktop/Onboarding.jpg, design/renders/phone/Onboarding.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces (architecture 1.7.4, group B): B05 (handle, pen name, language), B12 reserved names, B13 categories and tags (seeded), B11 (the country header faked locally). Mocked: the teacher step (B24) is stubbed until S1-E2-11.
- Content: the short community guidelines for "Staying safe here" come from content/legal/03-community-guidelines.md; there is no short version yet, so stop and ask me for the wording (check with Robert).
- Watch-outs: the list of counties or regions isn't in the docs: stop and ask me. Only the username is required; everything else can be skipped and changed later in Settings.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: preference columns or tables, RLS policies (owner only) with allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events (no personal data, no preferences tied to a person) and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E2-06: Onboarding". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer, with a way to rerun setup for adult_writer, teen_17 and kid_14_ok: the teens see "Staying safe here", the adult sees the teacher question or skips step 3, skipping everything but the username works and "Go to Discover" lands on Discover,
- the pull request description from .github/pull_request_template.md.
```

### S1-E2-07 Staff roles with mandatory two-factor sign-in
Must · M · March MVP (wave 1) · Depends on: S1-E1-02, S1-E2-05

```text
We are working on story S1-E2-07 (Staff roles with mandatory two-factor sign-in) only. Read CLAUDE.md, docs/architecture.md (especially 1.8.1 and 1.8.3) and docs/definition-of-done.md first, then the story in docs/stories/s1-e02-accounts-age-gate-and-onboarding.md.

CONTEXT:
- Already merged: S1-E1-02, S1-E2-05.
- Decisions that apply:
  - Staff sign in with Google Workspace only; Google's own 2-Step Verification is the second factor, no separate code in Ghemotoc (17 Oct 2026, 11:53; 34n; Q30).
  - A staff account is separate from any personal writer account, which never holds a staff role.
  - Roles: member roles user and space_moderator (one space); staff roles owner, admin, moderator, support, content_editor; per-person permissions safeguarding, teacher_checks and on_call. What each may do is the table in architecture 1.8.3. Nobody changes their own role.
- Designs: design/boards/StaffSignIn.dc.html (8.1), design/renders/desktop/StaffSignIn.jpg, design/renders/phone/StaffSignIn.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). Staff screens use plain components, no doodles.
- Back-end pieces: B10 (staff_roles, staff_permissions, is_staff(), is_staff_session()), B03 audit log for every role change with who and why. Mocked locally: a test flag marks a seeded staff persona's session as a Google Workspace session (architecture 1.7.3); real Google sign-in is tested on staging.
- Watch-outs:
  - The company's Workspace domain isn't in the docs: stop and ask me.
  - Plain "Sign in with Google" restricted to the company domain works on Supabase's free plan; SAML SSO needs a paid plan (check before relying on it). Stop and ask me which to build.
  - Enforcing 2-Step Verification is a setting in the Google Workspace admin console: write the steps for me in a runbook under docs/runbooks/.
  - Spaces don't exist yet (S1-E8): tell me in the plan how space_moderator is modelled now.
  - The 12-hour staff session and fresh sign-in in architecture 1.8.3 are proposals, not in this story: don't build them.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, enums, functions, RLS policies (who can grant which role, nobody their own) with allowed and denied pgTAP tests, including a denied test for a member session holding a staff role.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E2-07: Staff roles with mandatory two-factor sign-in". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer using owner, admin, moderator, support and editor plus adult_writer: adult_writer can't reach staff sign-in powers; admin grants and removes a role; nobody can change their own role; where I see the audit log rows,
- the pull request description from .github/pull_request_template.md.
```

### S1-E2-08a Age check with Yoti: hosted check, return and webhook
Must · L (split: this is 08a) · March MVP (wave 1b) · Depends on: S1-E1-02, S1-E2-02 (S1-E16-02 only for the desktop return, after March)

```text
We are working on story S1-E2-08a (Age check with Yoti: hosted check, return and webhook) only. Part 08b (retries, manual check and appeal) is a separate session. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story S1-E2-08 in docs/stories/s1-e02-accounts-age-gate-and-onboarding.md.

CONTEXT:
- Already merged: S1-E1-02, S1-E2-02.
- Scope of 08a: the start function; Yoti's hosted page opened from the browser and the web redirect back to "Checking your age"; the signed webhook; saving the result; the "13 or over" result when the year says 18; handing under-16s to parental consent (S1-E2-03, a stub until merged); starting again after an expired session. The Tauri criteria wait for the desktop app.
- Decisions that apply: year of birth, then Yoti (16 Oct 2026); minimum age 13; March is web only (34o). Store only age_check_result (13_or_over, 18_or_over, failed), age_checked_at and age_check_method; never a selfie, document image, estimated age or Yoti evidence (CLAUDE.md rule 5).
- Designs: design/boards/AgeCheck.dc.html (2.3), design/renders/desktop/AgeCheck.jpg, design/renders/phone/AgeCheck.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces (architecture 1.7.4, group B):
  - Real before building: age_check_sessions, the profile age columns and the start function's contract (B07); B02 reads the result.
  - Mocked: a local yoti-mock function plus a script that sends a webhook signed with a test key (pass, fail, time-out). The Yoti sandbox replaces it on staging before Done; list the mock in docs/mocks.md.
- Watch-outs:
  - API key and SDK ID only in Edge Function secrets; reference_id is random with no personal data; verify the RSA-SHA256 PSS signature and fetch the session result from Yoti before saving; delete the session row after.
  - Hosted check only, Yoti's consent screen on, no Digital ID template.
  - OPEN, stop and ask me: the buffer at the 13 gate; whether Yoti also checks the 16 step; whether one session can test both 13 and 18; Yoti's price and whether it onboards before the company exists.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations, edge functions and their zod contracts; RLS policies with allowed and denied pgTAP tests (the client never writes the age result).
3. A table mapping each 08a acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events (result counts only) and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E2-08a: Age check with Yoti: hosted check, return and webhook". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as pending_check start the check and send each mock result (13 or over, 18 or over, failed, time-out); see what the profile stores; with a new under-16 account see the hand-off to the parent step; close the page mid-check and start again,
- the pull request description from .github/pull_request_template.md.
```

### S1-E2-08b Age check with Yoti: retries, manual check and appeal
Must · L (split: this is 08b) · March MVP (wave 1b) · Depends on: S1-E2-08a; staff side needs S1-E2-07

```text
We are working on story S1-E2-08b (Age check with Yoti: retries, manual check and appeal) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story S1-E2-08 in docs/stories/s1-e02-accounts-age-gate-and-onboarding.md.

CONTEXT:
- Already merged: S1-E2-08a, S1-E2-07.
- Scope of 08b: retries (2 facial attempts per session) and switching to an ID document; asking for a manual check (read-only meanwhile) and staff deciding it; the 1 January job inviting people who turn 18 by year to an "18 or over" check; the 14-day clean-up with no passed check and no open appeal. Putting the two jobs here is my reading of the split (check with Robert).
- Decisions that apply: staff see only the handle, the year of birth and the attempt history, never images; the decision and reason go to the audit log within 5 working days (canvas 2.3). Staff sign in with Google Workspace only. Under-18 protections stay on until an "18 or over" result is stored.
- Designs: design/boards/AgeCheck.dc.html (2.3) and design/boards/AdminUsers.dc.html (8.5 Users: it shows the age check column but no manual check panel yet, checked 17 Oct 2026), with their renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). Staff screens use plain components.
- Back-end pieces: B07, B27 (an admin_* function that checks role, permission and is_staff_session() and writes the audit log), B03, B17 jobs (tests call each job's SQL function directly). The yoti-mock from 08a stays for local use.
- Watch-outs:
  - OPEN, stop and ask me: the manual check method (for example Yoti's ID route with manual review, or a parent confirming for a 13 to 15-year-old without ID).
  - Architecture puts manual checks on screen 8.5, which S1-E11-02 builds later: stop and ask me whether to build the staff screen now or only the function.
  - Which staff role handles manual checks isn't in architecture 1.8.3: ask me.
  - This story lets the staff member see the year of birth, but architecture 1.8.3 says staff never see it: stop and ask me which wins before building the staff view.
  - How the user is told the outcome (email or in-app; notifications come in S1-E7-01): ask me.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: manual check requests, functions, jobs, RLS policies with allowed and denied pgTAP tests.
3. A table mapping each 08b acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E2-08b: Age check with Yoti: retries, manual check and appeal". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as failed_check retry, switch to ID and ask for a manual check; as the staff persona you chose decide it with a reason and find the audit log row; run the 1 January job and the 14-day clean-up and see what happens to pending_check,
- the pull request description from .github/pull_request_template.md.
```

### S1-E2-09 Sign up and log in with Google, Apple or Microsoft
Should · M · After March · Depends on: S1-E2-01, S1-E2-05, S1-E2-08

```text
We are working on story S1-E2-09 (Sign up and log in with Google, Apple or Microsoft) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e02-accounts-age-gate-and-onboarding.md.

CONTEXT:
- Already merged: S1-E2-01, S1-E2-05, S1-E2-08.
- Decisions that apply:
  - Sign up and log in with email, Google, Apple or Microsoft, plus passkeys (16 Oct 2026). The providers don't confirm age, so year of birth, the Yoti check and, for under-16s, parental consent still apply. The page says: "Google, Apple and Microsoft don’t tell us how old you are."
  - Member social log-in never gives staff access (S1-E2-07).
  - Third-party buttons use each provider's official button and logo, unchanged (Definition of Done, design rules).
- Designs: design/boards/Main.dc.html (2.1, the "or sign up with" divider), design/boards/SignIn.dc.html (2.2, "Use a passkey") and design/boards/Settings.dc.html (6.3, Ways to log in), with their renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B05 (Supabase Auth identities), B12 social_login flag hides the buttons locally, B09 email to Mailpit for the "method changed" email. Google, Apple and Microsoft need real developer apps, so test them on staging.
- Watch-outs:
  - Whether Supabase Auth supports passkeys isn't confirmed in the docs: check and tell me before planning around it (check with Robert).
  - Ask the providers for the minimum scopes (email; name optional); no contacts, age or profile photo.
  - An email that already has an account is never merged silently; disconnecting the last method is blocked.
  - App Store guideline 4.8 is met by Sign in with Apple (check before relying on it). An Apple developer account needs the company: ask me what exists before you start.
  - Provider data goes into the privacy notice and the record of processing in the same PR.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations, if any, with RLS policies and allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E2-09: Sign up and log in with Google, Apple or Microsoft". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer on staging: sign up with Google and still get the year of birth and age check; as adult_writer connect and disconnect a method and get the email; try to disconnect the last one; sign in with a provider whose email already has an account,
- the pull request description from .github/pull_request_template.md.
```

### S1-E2-10 Country from the connection at sign-up
Should · S · March MVP (wave 1) · Depends on: S1-E2-01, S1-E11-05

```text
We are working on story S1-E2-10 (Country from the connection at sign-up) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e02-accounts-age-gate-and-onboarding.md.

CONTEXT:
- Already merged: S1-E2-01. S1-E11-05 (markets and languages) comes after March: for March the markets are seeded in a migration (architecture 1.7.9).
- Decisions that apply:
  - The country comes from the connection and is never asked (Q20). Only the two-letter code is stored; we don't store the IP address.
  - Romania is the first market; English-speaking countries open later, one by one, each after its legal check (17 Oct 2026, 11:48).
  - Australia stays closed to under-16s until a lawyer says otherwise (Q19): refuse with "Ghemotoc isn't open to under-16s in Australia yet" and store nothing.
  - The optional county or region stays a separate, self-chosen field.
- Designs: design/boards/Onboarding.dc.html (2.5, no country question) and design/boards/Settings.dc.html (6.3, "From your connection"), with their renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). The "not open in your country yet" page has no board: build it from the /design components (check with Robert).
- Back-end pieces: B11, the signup-context function and seeded markets. The hosting provider is OPEN (Q38), so the country header is faked locally by a local-only setting.
- Watch-outs:
  - OPEN, stop and ask me: whether to keep the email someone leaves on the "not open yet" page.
  - Correcting the country through support (S1-E14-04) is a proposal; show the line only.
  - Reading the IP at the edge is still processing personal data (CJEU C-582/14 Breyer); basis legitimate interest, in the privacy notice and DPIA. VPNs make it approximate, so never use it alone for age or legal eligibility.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: profiles.country_code, the seeded markets, RLS policies with allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events (country counts only) and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E2-10: Country from the connection at sign-up". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: fake Romania and sign up, then see "From your connection" in Settings; fake Australia with an under-16 year and see the refusal; fake a closed country and see the page; show me that no IP address was saved,
- the pull request description from .github/pull_request_template.md.
```

### S1-E2-11 Teacher badge
Should · M · After March · Depends on: S1-E2-06, S1-E2-08, S1-E7-01, S1-E11-01, S1-E13-04

```text
We are working on story S1-E2-11 (Teacher badge) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e02-accounts-age-gate-and-onboarding.md.

CONTEXT:
- Already merged: S1-E2-06, S1-E2-08, S1-E7-01, S1-E11-01, S1-E13-04.
- Decisions that apply:
  - The Teacher badge is adults only and optional, asked in setup, by school email or proof of teaching that staff check and then delete (16 Oct 2026). Only accounts with the badge see the Class space option (the option itself is S1-E8-11).
  - Teachers still follow the messaging rules: no messages with under-16s, ever.
  - The badge is a badge, not a staff role (architecture 1.8.3); checking needs the teacher_checks permission.
- Designs: design/boards/Onboarding.dc.html (2.5, step 3), design/boards/AdminSchools.dc.html (8.9, Teacher checks) and design/boards/Profile.dc.html (6.1, the badge), with their renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). Staff screens use plain components.
- Back-end pieces: B24 teacher_checks; B14 teacher-proofs, a private bucket only staff with teacher_checks can open; B09 the one-time email link (Mailpit locally); B22 the outcome notification; B27 admin functions and B03 audit log, including the logged read when staff open a proof.
- Watch-outs:
  - OPEN, stop and ask me: the upload size limit (proposal 10 MB); how long the email link works; how staff confirm a non-.edu.ro school domain; when a badge is reviewed again; keeping the school email or only its domain (proposal: domain only).
  - Proposals, ask before fixing: asking later from Settings, nobody else seeing a pending badge, checks within two working days.
  - CLAUDE.md rule 19 says every uploaded picture goes through the picture check: ask me whether proof files do too.
  - Personal addresses are refused with the story's exact message; location data is stripped; the proof is deleted as soon as the decision is saved. Update the record of processing, the privacy notice and docs/retention.md in the same PR. Lawyer list L10.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations, storage policies and RLS policies with allowed and denied pgTAP tests (under-18s can never request; only teacher_checks staff read proofs).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E2-11: Teacher badge". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as adult_writer try a Gmail address, then a .edu.ro one through Mailpit; upload a proof; as admin with the teacher_checks permission approve one and reject one and see the file gone; check teen_17 never sees the option; look at the teacher persona's profile badge,
- the pull request description from .github/pull_request_template.md.
```

## S1-E3 Writer editor and chapters

### S1-E3-01 Create a story
Must · M · March MVP (wave 2) · Depends on: S1-E2-01, S1-E1-02; S1-E11-05 for the open languages (seeded in a migration for March); S1-E10-05 for uploaded covers

```text
We are working on story S1-E3-01 (Create a story) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md (covers and title rules) first, then the story in docs/stories/s1-e03-writer-editor-and-chapters.md.

CONTEXT:
- Already merged: S1-E2-01, S1-E1-02. Seed the open story languages in a migration until S1-E11-05 (architecture 1.7.9); the picture check (S1-E10-05) comes later in the March order.
- Decisions that apply:
  - Categories are fiction, poetry and nonfiction essays, with up to 10 tags; no journalism (Q52).
  - The story's owner is the writer's user ID (user_id), unchanged if the handle or pen name changes.
  - Picture uploads are on from launch and every picture is checked on upload (Q18).
  - Uploaded covers: tall first, then square (cropped or uploaded); we never add a title, pen name or bar on top (17 Oct 2026).
  - Drawn covers: 16 approved backgrounds (9 plain, 7 patterns), recolourable within the 9-colour palette; the full title always fits.
- Designs: design/boards/NewStory.dc.html (4.2), design/renders/desktop/NewStory.jpg, design/renders/phone/NewStory.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). The drawn backgrounds are SVG files in design/assets/.
- Back-end pieces (architecture 1.7.4, group D):
  - Real before building: stories with RLS by user ID (B13, with tags and categories); languages seeded (B11); the covers bucket (B14).
  - Mocked: B15 picture check with IMAGE_CHECK=stub (passes every file except names ending _fail); list it in docs/mocks.md (CLAUDE.md rule 17).
  - Register stories as reportable (B04); the Report button can call a stub until S1-E10-01.
- Watch-outs:
  - A story with no published chapter is hidden from everyone but the writer; chapters arrive in S1-E3-02, so tell me how you will enforce that now.
  - The Canva option (S1-E3-12) and the automatic cover (S1-E3-13) come after March: stop and ask me what the cover step shows for them in March.
  - If it grows past M, propose the story's split: 01a (form and upload) and 01b (drawn cover picker).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, indexes, storage policies and RLS policies with allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E3-01: Create a story". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as adult_writer create a story with tags "Fantezie" and "fantezie"; upload a tall cover and crop the square with the keyboard; upload a file named cover_fail and see it stay private; draw a cover with a long title at phone width; as teen_17 check the story isn't visible yet,
- the pull request description from .github/pull_request_template.md.
```

### S1-E3-02 Chapter editor with autosave
Must · L · March MVP (wave 2) · Depends on: S1-E3-01

```text
We are working on story S1-E3-02 (Chapter editor with autosave) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e03-writer-editor-and-chapters.md.

CONTEXT:
- Already merged: S1-E3-01.
- Decisions that apply: writers can write in the browser (Q5). User text is a Markdown subset, sanitised on save and before display, and links get rel="nofollow ugc noopener" (CLAUDE.md rule 8). No automated text moderation (rule 19).
- Designs: design/boards/Editor.dc.html (4.3), design/renders/desktop/Editor.jpg, design/renders/phone/Editor.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). The Insert menu's Picture, Drawing and music or video items belong to S1-E3-09, S1-E3-10 and S1-E3-11 (after March): leave them out.
- Back-end pieces (architecture 1.7.4, group D): real before building: chapters, chapter_revisions and save_chapter_draft() with a version number to spot conflicts (B13). Nothing to mock.
- Watch-outs:
  - Autosave every 10 seconds (canvas 4.3) and when the editor loses focus, with a visible "Saved" status.
  - Offline: keep the draft on the device, sync when the connection returns and warn if the server copy changed meanwhile.
  - Paste from Word or Google Docs keeps only headings, bold, italic, quote, lists, scene break and links.
  - Every toolbar button has a label, a visible focus state and a keyboard shortcut (WCAG 2.2 AA).
  - Store content as sanitised structured text so no script can be injected. Name the editor library you want in the plan and why; if it is an architectural choice, add an ADR.
  - Register chapters as reportable (B04, CLAUDE.md rule 6).
  - This story is size L: if your plan shows it is too big for one pull request, propose a split (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, the save function, RLS policies (only the owner reads and writes drafts) with allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it, including a sanitising test with a script in pasted text.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E3-02: Chapter editor with autosave". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as adult_writer type and watch "Saved"; switch the browser offline, keep typing, come back online; edit the same chapter in two tabs to see the warning; paste a page from Word; use the toolbar with the keyboard only; as teen_17 check you can't see the draft,
- the pull request description from .github/pull_request_template.md.
```

### S1-E3-03 Publish, unpublish and schedule chapters
Must · M · March MVP (wave 2) · Depends on: S1-E3-02

```text
We are working on story S1-E3-03 (Publish, unpublish and schedule chapters) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e03-writer-editor-and-chapters.md.

CONTEXT:
- Already merged: S1-E3-02.
- Decisions that apply:
  - No automated text check and nothing held before a chapter goes live; moderation acts on reports (Q42, Q43).
  - Publishing is a write, so it needs is_active_member() (architecture 1.7.8): unverified, age-pending and parent-waiting accounts can't publish.
- Designs: design/boards/Chapters.dc.html (4.4) and the publish and schedule controls on design/boards/Editor.dc.html (4.3), with their renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces (architecture 1.7.4, group D): publish, unpublish and schedule functions (B13); B16 the chapter_published event and the jobs queue; B17 the scheduled publisher in pg_cron (tests call the job's SQL function directly). Notifications (S1-E7-01) don't exist yet: store the event and send nothing.
- Watch-outs:
  - Publishing changes the story's "last updated" date.
  - Unpublishing stops readers opening the chapter; its comments are hidden but kept. Comments arrive with S1-E6-01, so tell me how you prepare for that.
  - A scheduled time is in Europe/Bucharest or the writer's time zone. Where the writer's time zone comes from isn't in the docs: ask me. "Within five minutes" is a proposal; keep the job interval easy to change.
  - Pictures in chapters are still checked on upload (S1-E10-05); nothing else is checked.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: status and scheduled time columns, functions, the job, RLS policies (readers see only published chapters of stories their age allows) with allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events (for example chapter_published, no personal data) and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E3-03: Publish, unpublish and schedule chapters". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as adult_writer publish a chapter and open it as teen_17; unpublish it and check teen_17 can't open it; schedule one a few minutes ahead and run the job; as kid_14_waiting and pending_check try to publish and be refused,
- the pull request description from .github/pull_request_template.md.
```

### S1-E3-04 Manage chapters
Must · M · March MVP (wave 2) · Depends on: S1-E3-03

```text
We are working on story S1-E3-04 (Manage chapters) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e03-writer-editor-and-chapters.md.

CONTEXT:
- Already merged: S1-E3-03.
- Decisions that apply: added to the March MVP on 17 Oct 2026 (11:53). Soft delete with deleted_at and a purge job (architecture 1.6). Staff never edit a writer's words (CLAUDE.md rule 18).
- Designs: design/boards/Chapters.dc.html (4.4), design/renders/desktop/Chapters.jpg, design/renders/phone/Chapters.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces (architecture 1.7.4, group D): a reorder function and the delete and undo functions (B13); B17 the purge job after 30 days (tests call its SQL function directly). Nothing to mock.
- Watch-outs:
  - Reordering works with "Move up" and "Move down" buttons as well as dragging (WCAG 2.2 criterion 2.5.7); the keyboard works too.
  - Editing a published chapter shows readers an "Edited on" date.
  - Deleting hides the chapter at once, offers undo for 30 days, then deletes it permanently.
  - No OPEN points in the story.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: order and edited-at columns, functions, the purge job, RLS policies (only the owner reorders, edits, deletes or undoes) with allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks (a deleted chapter under an open report: tell me how it is kept for the moderator).
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E3-04: Manage chapters". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as adult_writer reorder chapters with the buttons, by dragging and with the keyboard; edit a published chapter and see "Edited on" as teen_17; delete a chapter, undo it, delete it again and run the purge job,
- the pull request description from .github/pull_request_template.md.
```

### S1-E3-05 Story status and settings
Must · S · March MVP (wave 2) · Depends on: S1-E3-01

```text
We are working on story S1-E3-05 (Story status and settings) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e03-writer-editor-and-chapters.md.

CONTEXT:
- Already merged: S1-E3-01.
- Decisions that apply: soft delete with deleted_at and a purge job (architecture 1.6). Pills follow the pill system in docs/definition-of-done.md.
- Designs: design/boards/NewStory.dc.html (4.2, story settings), design/boards/Story.dc.html (3.4, the status on the card and story page) and the "Delete story" control on design/boards/Chapters.dc.html (4.4), with their renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B13 (status and comments settings on stories), B17 purge job (tests call its SQL function directly). Nothing to mock.
- Watch-outs:
  - "Completed" or "Ongoing" shows on the story card and works as a filter. The Discover filters come in S1-E5-01: build the column and index now and tell me what filter you can show here (check with Robert).
  - Comments switched off hides existing comments and stops new ones. Comments arrive with S1-E6-01: store the setting now and leave S1-E6-01 to enforce it (check with Robert).
  - Deleting a story needs two confirmations; the story and all its chapters follow the 30-day soft delete.
  - No OPEN points in the story.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: columns, indexes, functions, RLS policies (only the owner changes settings or deletes) with allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E3-05: Story status and settings". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as adult_writer mark a story Completed and see it on the card as teen_17; switch comments off; delete the story with both confirmations and check teen_17 can't find it; run the purge job,
- the pull request description from .github/pull_request_template.md.
```

### S1-E3-06 Ratings and labels: age rating, fan fiction, parody and AI assistance
Must · S · March MVP (wave 2) · Depends on: S1-E3-01

```text
We are working on story S1-E3-06 (Ratings and labels: age rating, fan fiction, parody and AI assistance) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e03-writer-editor-and-chapters.md.

CONTEXT:
- Already merged: S1-E3-01.
- Decisions that apply:
  - Ratings All ages, 13+, 16+ and 18+, each hidden from anyone younger everywhere and enforced in RLS through age_band() (Q17, CLAUDE.md rule 18). 18+ needs an "18 or over" Yoti result.
  - Each rating is explained where it is picked, including that no rating allows sexual content involving anyone under 18 (17 Oct 2026).
  - A story dealing with abuse or coercion must be 16+ or 18+ and carries a content note; a relationship between 16 or 17-year-old characters with no sexual content can be 13+ (17 Oct 2026).
  - Fan fiction and parody labels (Q87). AI disclosure: "No AI", "AI for brainstorming or outlining" or "Partly AI-written". Undisclosed AI: a label and a warning only after several reports confirmed true, never on reports alone and never from a detector score (Q24).
  - Staff may raise a rating but never lower one.
- Designs: design/boards/NewStory.dc.html (4.2) and design/boards/Story.dc.html (3.4), with their renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). Rating wording on canvas 4.2 is a draft for the lawyer (lawyer list L14): copy it from the board.
- Back-end pieces: B13 (ratings and content labels), B02 age_band(). Nothing to mock. Content: content/legal/03-community-guidelines.md.
- Watch-outs:
  - Signed-out visitors and the public website see only All ages and 13+ stories: a proposal, so stop and ask me before building it that way.
  - The number of confirmed reports for the AI label is a setting (proposal 3): ask me. Confirmed reports need S1-E10-01 and the warning's statement of reasons needs S1-E10-04; tell me what you build now and what waits.
  - Raising a rating sends a statement of reasons (S1-E10-04, later): tell me how you hook it.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: enums, columns, settings, RLS policies (hidden from anyone younger; staff can only raise) with allowed and denied pgTAP tests for every age group.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E3-06: Ratings and labels: age rating, fan fiction, parody and AI assistance". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as adult_writer publish a 13+, a 16+ and an 18+ story and tick "abuse or coercion" on one; check what kid_14_ok, teen_17, adult_writer and a signed-out visitor can see; add fan fiction and AI labels and see them on the story page,
- the pull request description from .github/pull_request_template.md.
```

### S1-E3-07 Writer dashboard
Should · M · After March · Depends on: S1-E3-03, S1-E15-02

```text
We are working on story S1-E3-07 (Writer dashboard) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e03-writer-editor-and-chapters.md.

CONTEXT:
- Already merged: S1-E3-03, S1-E15-02.
- Decisions that apply: follower lists are visible to the writer only (Q50). No profiling and no personal data in analytics (architecture 1.10).
- Designs: design/boards/WriterDashboard.dc.html (4.1), design/renders/desktop/WriterDashboard.jpg, design/renders/phone/WriterDashboard.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces (architecture 1.7.4, group D): a writer_stats view over the daily chapter_reads totals (B20), with likes, comments and followers. The "fewer than 5" rule lives in SQL, not the screen. Seeded totals while building.
- Watch-outs:
  - Any count from fewer than five readers shows as "fewer than 5". The dashboard never lists which readers read a chapter. Aggregated data only, which protects minor readers.
  - "Read-through rate" isn't defined in the docs: stop and ask me for the definition.
  - No OPEN points in the story itself.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: the view and any functions, RLS (a writer sees only their own stories' totals) with allowed and denied pgTAP tests, including a test of the "fewer than 5" rule.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E3-07: Writer dashboard". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as adult_writer open the dashboard with the seeded totals; find a chapter with few readers and see "fewer than 5"; as teen_17 try to open adult_writer's numbers and be refused,
- the pull request description from .github/pull_request_template.md.
```

### S1-E3-08 Where a story can be read: web and app, or app only
Must · M · After March · Depends on: S1-E3-01, S1-E3-05, S1-E4-04

```text
We are working on story S1-E3-08 (Where a story can be read: web and app, or app only) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e03-writer-editor-and-chapters.md.

CONTEXT:
- Already merged: S1-E3-01, S1-E3-05, S1-E4-04. This story needs an app, so it waits for the desktop app (architecture 1.13).
- Decisions that apply:
  - Writers choose per story: "On the web and in the app" (default) or "In the app only" (16 Oct 2026).
  - On the web an app-only story shows its cover, title, blurb, writer and chapter list but no chapter text.
  - "In the app only" also shows as a label on the cover wherever stories appear on the website, but not inside the apps (Q4).
  - Copy says "makes copying harder", never "can't be copied" (Q9).
- Designs: design/boards/NewStory.dc.html (4.2, "Where can people read this story?"), design/boards/Story.dc.html (3.4) and design/boards/AppOnly.dc.html (3.9), with their renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). The notice dialog itself is S1-E4-09.
- Back-end pieces (architecture 1.7.4, group C): the read_on column checked inside get_chapter(); B19 teaser and link previews; B33 "Open in the app" stays mocked until S1-E16-02.
- Watch-outs:
  - For an app-only story, no chapter text in the teaser, the link preview or search results.
  - The switch takes effect within a minute (proposal) and readers' library entries stay.
  - OPEN (34u): what "until we create the apps" means and what changes on the web then. Stop and ask me.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: the column, changes to get_chapter() and search, RLS with allowed and denied pgTAP tests (no chapter text reachable on the web for app-only stories).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E3-08: Where a story can be read: web and app, or app only". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as adult_writer switch a story to app only; as teen_17 and signed out on the web see the cover, blurb and chapter list but no text; check the link preview and search; switch back and check teen_17's library entry is still there,
- the pull request description from .github/pull_request_template.md.
```

### S1-E3-09 Pictures in chapters
Should · M · After March · Depends on: S1-E3-02, S1-E10-05

```text
We are working on story S1-E3-09 (Pictures in chapters) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e03-writer-editor-and-chapters.md.

CONTEXT:
- Already merged: S1-E3-02, S1-E10-05.
- Decisions that apply: picture uploads are on from launch and every picture is checked on upload by Sightengine and Arachnid Shield; a flagged picture waits for an in-house moderator (Q18, CLAUDE.md rule 19). Every new user-content type is reportable (rule 6).
- Designs: the Insert menu on design/boards/Editor.dc.html (4.3) and the picture in design/boards/Reader.dc.html (3.5), with their renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). No doodles on the reader.
- Back-end pieces: B14 chapter-images bucket, B15 the real picture check (S1-E10-05), B04 reporting. Nothing to mock.
- Watch-outs:
  - JPEG, PNG or WebP up to 5 MB; alt text is required before the picture is inserted.
  - Location and camera data are removed and the picture is resized for reading. The target size isn't in the docs: ask me.
  - A flagged picture shows readers "Picture being checked" until a moderator decides.
  - Every picture can be reported from its menu (S1-E10-01). The writer confirms they have the right to use the picture; notice and action applies.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations, storage policies and RLS policies (readers see a picture only once it has passed the check) with allowed and denied pgTAP tests, and the reportable type.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E3-09: Pictures in chapters". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as adult_writer insert a picture without alt text and be stopped, then with alt text; upload one the test check flags; as teen_17 see "Picture being checked" and report the other picture; as moderator see the held picture,
- the pull request description from .github/pull_request_template.md.
```

### S1-E3-10 Music and video from other services
Could · M · After March · Depends on: S1-E3-02

```text
We are working on story S1-E3-10 (Music and video from other services) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e03-writer-editor-and-chapters.md.

CONTEXT:
- Already merged: S1-E3-02.
- Decisions that apply:
  - The allowed list is Spotify, Apple Music, YouTube, Vimeo and Loom (Loom confirmed, Q22). Nothing loads from those services until the reader presses play (16 Oct 2026).
  - No third-party scripts or cookies without an ADR (CLAUDE.md rule 7). Third-party buttons and embeds use each provider's official logo and button (Definition of Done).
  - No doodles on the chapter reader.
- Designs: the Insert menu on design/boards/Editor.dc.html (4.3), with design/renders/desktop/Editor.jpg and design/renders/phone/Editor.jpg. The reader's embed card has no board of its own: build it from the /design components and check it on design/boards/Reader.dc.html (check with Robert). Match at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces (architecture 1.7.4, group D): an oembed edge function with the allow-list; oEmbed fixtures locally and in tests, the real services only on staging.
- Watch-outs:
  - The card shows title, service name and "Plays from YouTube. YouTube may use cookies." (with the right service name) until play.
  - YouTube's privacy-enhanced (no-cookie) player and Vimeo with do-not-track: both "check before relying on it".
  - Every embed can be reported; moderators can disable one embed without unpublishing the chapter.
  - Write the ADR for loading these players after a click.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations (embeds, the disabled state, the reportable type), RLS policies with allowed and denied pgTAP tests, and the oembed function's zod contract.
3. A table mapping each acceptance criterion to the test(s) that prove it, including one that nothing loads from the service before play.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E3-10: Music and video from other services". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as adult_writer paste a YouTube link and a link from a site not on the list; as teen_17 open the chapter, see the card, press play and report the embed; as moderator disable that one embed,
- the pull request description from .github/pull_request_template.md.
```

### S1-E3-11 Drawings in chapters
Could · M · After March · Depends on: S1-E3-09

```text
We are working on story S1-E3-11 (Drawings in chapters) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e03-writer-editor-and-chapters.md.

CONTEXT:
- Already merged: S1-E3-09.
- Decisions that apply: chapters can include simple drawings (16 Oct 2026). Every picture goes through the picture check before anyone else sees it (CLAUDE.md rule 19).
- Designs: the Drawing item in the Insert menu on design/boards/Editor.dc.html (4.3), with design/renders/desktop/Editor.jpg and design/renders/phone/Editor.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). If the board doesn't show the sketch pad itself, build it from the /design components (check with Robert).
- Back-end pieces: the same as S1-E3-09: B14 chapter-images and B15 the picture check. Nothing to mock.
- Watch-outs:
  - The sketch pad has pen, eraser, a few brand colours, undo and clear. Which colours isn't in the story: propose them from the design tokens and ask me.
  - A finished drawing is saved as a picture and follows every rule in S1-E3-09, including alt text and the check.
  - Accessibility: drawing is a pointer task. Tell me in the plan how keyboard and screen reader users are handled and how the rest of the pad meets WCAG 2.2 AA.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations, if any, with RLS policies and allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E3-11: Drawings in chapters". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as adult_writer draw, undo, clear and insert a drawing with alt text; as teen_17 see it in the chapter and report it,
- the pull request description from .github/pull_request_template.md.
```

### S1-E3-12 Design a cover in Canva
Could (idea for after the March test) · M · After March · Depends on: S1-E3-01, S1-E10-05

```text
We are working on story S1-E3-12 (Design a cover in Canva) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e03-writer-editor-and-chapters.md.

CONTEXT:
- Already merged: S1-E3-01, S1-E10-05.
- Decisions that apply: uploaded covers follow S1-E3-01 (location data removed, private until the picture check passes, no title added on top). No third-party scripts or cookies without an ADR (CLAUDE.md rule 7). The Canva button uses Canva's official button and logo, unchanged (Definition of Done).
- Designs: the cover step on design/boards/NewStory.dc.html (4.2), with design/renders/desktop/NewStory.jpg and design/renders/phone/NewStory.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). Disconnecting Canva in Settings has no board: use the /design components (check with Robert).
- Back-end pieces: an edge function for the Canva OAuth and return (secrets only in Edge Function secrets), B14 covers, B15 the picture check.
- Watch-outs:
  - The Canva Connect API flow (OAuth with the writer's own account, a blank 1600 × 2560 design, verifying Canva's return token, exporting PNG) is "check before relying on it": confirm it against Canva's current documentation in the plan.
  - It needs a registered Canva developer app and Canva likely reviews public integrations (unconfirmed): ask me what exists before you start.
  - Nothing is shared with Canva before the writer connects; connecting is optional and can be undone in Settings. Canva's own terms and age rules apply on its side, and the button says so.
  - Add Canva to the privacy notice as a service the writer chooses to connect, and write the ADR.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations (the connection and its tokens), RLS policies with allowed and denied pgTAP tests, and the function contracts.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E3-12: Design a cover in Canva". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer on staging: as adult_writer press "Design it in Canva", make a cover, return and see it held until the check passes; disconnect Canva in Settings,
- the pull request description from .github/pull_request_template.md.
```

### S1-E3-13 Automatic covers
Should · M · After March · Depends on: S1-E3-01

```text
We are working on story S1-E3-13 (Automatic covers) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md (the cover title rules) first, then the story in docs/stories/s1-e03-writer-editor-and-chapters.md.

CONTEXT:
- Already merged: S1-E3-01.
- Decisions that apply: a story without its own cover gets one of the 16 approved drawn designs automatically, always the same for that story and different from the cards next to it; the full title always fits on every cover (16 Oct 2026). A design the writer chose is never changed.
- Designs: the cover step on design/boards/NewStory.dc.html (4.2) and the story cards on design/boards/Discover.dc.html (3.1) and design/boards/Library.dc.html (3.7), with their renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). The 16 designs are SVG files in design/assets/.
- Back-end pieces: none. Architecture 1.7.4 says automatic covers are a function of the story ID; no cover file is stored. Nothing to mock.
- Watch-outs:
  - The cover step says "Skip this and we’ll give your story one of these covers automatically. You can change it any time.", shows the design the story would get and offers "Use the automatic cover".
  - Title and pen name drawn as real text over a decorative background, so screen readers read the title once; text colour chosen for 4.5:1 contrast; size steps down with length.
  - OPEN: the "never changes" rule and the neighbour rule can clash in a row. The story's proposal: the story page and the writer's own screens always show the ID design; only lists move a clashing card, to a second choice also taken from the ID. Stop and ask me before building it.
  - The story ID is used for the choice but never shown (architecture 1.6).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: none expected; say so if you need one.
3. A table mapping each acceptance criterion to the test(s) that prove it, including a unit test that the same ID always gives the same design and that neighbours never match.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E3-13: Automatic covers". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as adult_writer skip the cover step, see the automatic cover, change the title and see the same design; look at a shelf where two neighbours would match; switch back to the automatic cover from story settings,
- the pull request description from .github/pull_request_template.md.
```

## S1-E4 Reading

### S1-E4-01 Chapter reader
Must · L · March MVP (wave 2) · Depends on: S1-E3-03, S1-E1-03

```text
We are working on story S1-E4-01 (Chapter reader) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e04-reading.md.

CONTEXT:
- Already merged: S1-E3-03, S1-E1-03.
- Decisions that apply:
  - Signed-in readers whose age allows the story read full chapters in the browser until the apps exist (Q35); the signed-out teaser is S1-E4-04.
  - Ratings hide a story from anyone younger, enforced in RLS through age_band() (CLAUDE.md rule 18).
  - No doodles or doodle icons on the chapter reader (Definition of Done). At most 2 ad slots on any page (17 Oct 2026, 11:53); the banner never sits inside chapter text.
- Designs: design/boards/Reader.dc.html (3.5), design/renders/desktop/Reader.jpg, design/renders/phone/Reader.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21), and at 320 px for the reflow criterion. Leave out the board's reading settings panel (S1-E4-02).
- Back-end pieces (architecture 1.7.4, group C):
  - Real before building: get_chapter(), which checks status, the reader's age against the story's rating and blocks in one place, with its RLS tests.
  - B20: the reader records daily chapter_reads totals itself (architecture 1.7.9; the March return rate needs them).
  - B21 blocks arrive with S1-E5-05, later in the March order: stop and ask me how to leave the block check ready.
  - read_on belongs to S1-E3-08 (after March): ask me whether get_chapter() should check it now.
  - B29 the banner: pick_banner() comes with S1-E12-01 (after March); use a banner fixture below the chapter text.
- Watch-outs:
  - "Readable within 2 seconds on a mid-range Android phone on 4G" is a proposal: tell me how you'll measure it.
  - No horizontal scrolling at 320 px or 200% zoom (WCAG 2.2 criteria 1.4.10 and 1.4.4).
  - Size L: if your plan shows it is too big for one pull request, propose a split (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: get_chapter(), the daily reads table, RLS policies with allowed and denied pgTAP tests for every age group and rating.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events (for example chapter_read, no personal data) and moderation hooks (the report button on the chapter).
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E4-01: Chapter reader". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as teen_17 read a 13+ chapter and move with previous, next and contents using the keyboard; as kid_14_ok try a 16+ chapter and be refused; read at phone width, at 320 px and at 200% zoom; switch on night mode; see the banner only below the text,
- the pull request description from .github/pull_request_template.md.
```

### S1-E4-02 Reading settings
Must · M · After March · Depends on: S1-E4-01

```text
We are working on story S1-E4-02 (Reading settings) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e04-reading.md.

CONTEXT:
- Already merged: S1-E4-01.
- Decisions that apply: in the browser, readers choose from our fonts (16 Oct 2026); any device font is only in the apps (S1-E4-10). No doodles on the chapter reader. Accessibility is built in from Stage 1 (Q98).
- Designs: the reading settings on design/boards/Reader.dc.html (3.5), with design/renders/desktop/Reader.jpg and design/renders/phone/Reader.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). Drop-downs and chips follow docs/definition-of-done.md.
- Back-end pieces: reader settings saved in profiles.settings (architecture 1.7.4, group C). Nothing to mock.
- Watch-outs:
  - Font (including a dyslexia-friendly option), text size, line spacing, line width and light, sepia or night theme. Which dyslexia-friendly font isn't in the docs: ask me, and check its licence allows web use.
  - Signed-in readers' choices are saved to the account and apply on every device; the default text size follows the system's larger text setting.
  - The sepia theme needs its own tokens with the same contrast rules as light and night (S1-E1-03).
  - WCAG 2.2 criterion 1.4.12 (text spacing). No OPEN points in the story.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations, if any, with RLS policies (owner only) and allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it, including the contrast test for sepia.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E4-02: Reading settings". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as teen_17 change each setting, sign in on a second browser and see them kept; set the computer's text size larger and open the reader as a new visitor,
- the pull request description from .github/pull_request_template.md.
```

### S1-E4-03 Library and continue reading
Must · M · After March · Depends on: S1-E4-01

```text
We are working on story S1-E4-03 (Library and continue reading) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e04-reading.md.

CONTEXT:
- Already merged: S1-E4-01.
- Decisions that apply:
  - Every shelf is one scrolling line of at most 20 stories, ending with a "View more" card to its See all page (S1-E5-09; CLAUDE.md rule 20), with the one-side fade rule.
  - The full title fits on every drawn or automatic cover; stories without a cover use their automatic cover once S1-E3-13 is live.
  - Library private by default (Q50 for minors; the story says by default for everyone).
- Designs: design/boards/Library.dc.html (3.7), design/renders/desktop/Library.jpg, design/renders/phone/Library.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces (architecture 1.7.4, group C): B20 reading_progress and library_entries. Seed data while building; nothing to mock.
- Watch-outs:
  - The reader's position is saved when they leave and offered on any device.
  - "Reading", "Saved for later" and "Finished" lists.
  - Reading history is personal data and is never shared with advertisers or sponsors. Library entries for stories the reader can no longer open (rating, block, deletion) must not leak their titles: tell me how you handle them.
  - No OPEN points in the story.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, indexes, RLS policies (only the reader sees their own library and position) with allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events (no personal data) and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E4-03: Library and continue reading". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as teen_17 read halfway, leave, open on a second browser and continue; move stories between the three lists; as adult_writer look at teen_17's profile and see no library; fill a list past 20 and use "View more",
- the pull request description from .github/pull_request_template.md.
```

### S1-E4-04 Web teaser for shared links
Must · M · March MVP (wave 2) · Depends on: S1-E4-01; S1-E11-03 for the teaser_length flag (a seeded default until then)

```text
We are working on story S1-E4-04 (Web teaser for shared links) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e04-reading.md.

CONTEXT:
- Already merged: S1-E4-01. S1-E11-03 comes after March, so teaser_length is a seeded default.
- Decisions that apply:
  - Signed-in readers whose age allows the story read the whole chapter on the web until the apps exist (Q35).
  - Search engines index only story pages, with title, blurb and pen name or handle; chapter and teaser pages carry noindex; chapter text never goes into structured data or the sitemap (Q36).
  - The user ID never appears in a URL or link preview (architecture 1.6). The full title fits on drawn and automatic cover previews.
- Designs: design/boards/Teaser.dc.html (3.8) and design/boards/Story.dc.html (3.4), with their renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces (architecture 1.7.4, group C): B19 the teaser edge function, which renders a small HTML page with Open Graph tags for /s/:story/:chapter and runs locally; B12 teaser_length (seeded). The hosting provider is OPEN (Q38): tell me anything the route needs from it.
- Watch-outs:
  - Signed-out visitors see the blurb and the first one to two pages, then a prompt to sign up or open the app.
  - For 16+ and 18+ stories, signed-out visitors see no teaser text and no cover text beyond the title. Counting signed-out visitors as under 16 is a proposal (lawyer list L14): ask me.
  - OPEN, stop and ask me: the teaser length (proposal about 600 words; Q1 says one to two pages); keep it as the setting. OPEN (34u): what changes on the web once the apps exist; don't build for it.
  - Telling writers at Publish is S1-E4-06a.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations (the setting, any public view), RLS policies with allowed and denied pgTAP tests, and the teaser function's contract.
3. A table mapping each acceptance criterion to the test(s) that prove it, including tests of the Open Graph tags, noindex and the sitemap.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E4-04: Web teaser for shared links". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: signed out, open a chapter link and see the teaser and the prompt; as teen_17 open the same link and read it all; signed out, open a 16+ story and see no text; show me how to see the link preview a messaging app would get,
- the pull request description from .github/pull_request_template.md.
```

### S1-E4-05 Share a chapter
Should · S · After March · Depends on: S1-E4-04

```text
We are working on story S1-E4-05 (Share a chapter) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e04-reading.md.

CONTEXT:
- Already merged: S1-E4-04.
- Decisions that apply: no tracking (CLAUDE.md rule 7), so shared links carry no tracking parameters and nothing that identifies who shared them. No doodles on sharing screens (Definition of Done). The user ID never appears in a link (architecture 1.6).
- Designs: design/boards/Share.dc.html (3.6), design/renders/desktop/Share.jpg, design/renders/phone/Share.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). The quote card on the same board is S1-E4-07.
- Back-end pieces (architecture 1.7.4, group C): a share counter (aggregate only), used by popularity ranking (S1-E5-03). Nothing to mock.
- Watch-outs:
  - On a phone the system share sheet opens; on desktop the link is copied, with a confirmation that screen readers announce.
  - The counter counts shares, not people: no row ties a share to a reader.
  - Blocks and ratings still apply to whoever opens the link (get_chapter() and the teaser handle that).
  - No OPEN points in the story.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: the counter and its increment function, RLS policies with allowed and denied pgTAP tests (nobody can read who shared).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events (no personal data) and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E4-05: Share a chapter". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as teen_17 share a chapter on a phone-sized window and on desktop; paste the link and check it has nothing extra in it; see the share count go up for adult_writer's story,
- the pull request description from .github/pull_request_template.md.
```

### S1-E4-06a Copy protection and traceability
Should (06a Must for March) · L (split: this is 06a, S) · March MVP (wave 2) · Depends on: S1-E4-01

```text
We are working on story S1-E4-06a (Copy protection and traceability, the web part) only. Part 06b (the apps) comes after March. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story S1-E4-06 in docs/stories/s1-e04-reading.md.

CONTEXT:
- Already merged: S1-E4-01.
- Scope of 06a: right-click and copying switched off for chapter text on the web, with a short note that the writer's work is protected; a line at Publish telling writers that signed-in readers can read in the browser until the apps exist, that copying is made harder and that screenshots still work on the web; every protection wording says "makes copying harder".
- Decisions that apply: full chapters on the web for signed-in readers with right-click and copy off, writers told, screenshots still possible (Q35). Copy says "makes copying harder", never "can't be copied" or "screenshots are blocked" (Q9).
- Designs: design/boards/Reader.dc.html (3.5, the protection note) and the Publish step on design/boards/Chapters.dc.html (4.4) and design/boards/Editor.dc.html (4.3), with their renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). No doodles on the reader.
- Back-end pieces: none expected. Nothing to mock.
- Watch-outs:
  - Screen readers, zoom and the reader's own text size must still work; blocking copy must not block assistive technology (WCAG 2.2; lawyer list L17). Test with axe and tell me which screen reader you checked.
  - Only the chapter text is protected; the rest of the page, forms and the comment box behave normally.
  - OPEN: the per-reader watermark technique (the "traceability" part). It is not in 06a: don't build it; note it as a follow-up.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: none expected; say so if you need one.
3. A table mapping each 06a acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E4-06a: Copy protection and traceability". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as teen_17 right-click and try to copy chapter text and see the note; zoom to 200% and make the text bigger; turn on the Mac's VoiceOver and listen to a paragraph; as adult_writer publish a chapter and read the line at Publish,
- the pull request description from .github/pull_request_template.md.
```

### S1-E4-06b Copy protection and traceability in the apps
Should · L (split: this is 06b) · After March · Depends on: S1-E4-01, S1-E16-02 (and S1-E16-03 for the phone apps)

```text
We are working on story S1-E4-06b (Copy protection and traceability in the apps) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story S1-E4-06 in docs/stories/s1-e04-reading.md.

CONTEXT:
- Already merged: S1-E4-01, S1-E4-06a, S1-E16-02. The phone apps need S1-E16-03 (check with Robert); if it isn't merged, plan the desktop part only and tell me.
- Scope of 06b: Tauri content protection on Windows and macOS so screenshots and recordings of an open chapter come out blank; on Linux, chapter text blurs when the window loses focus; on Android, screen capture blocked for the reader screen only; on iOS, chapter text hidden while recording or mirroring is detected; protection wording everywhere.
- Decisions that apply: in the apps, each platform's own protection blanks the screen during screenshots and recordings (Q41). Copy says "makes copying harder", never "can't be copied" or "screenshots are blocked" (Q9). Screens never import Tauri directly; use src/lib/platform/ (CLAUDE.md rule 16).
- Designs: design/boards/Reader.dc.html (3.5), with its renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B33 the desktop shell (content protection) through the platform adapter, with a web version. Nothing on the server.
- Watch-outs:
  - The Linux blur is a proposal (master-plan route): ask me before building it.
  - Android: block capture only after a TalkBack and magnifier test confirms accessibility still works.
  - iOS can't block an ordinary screenshot; the unofficial secure-field trick is not used unless I decide otherwise.
  - OPEN, stop and ask me: the mobile wrapper (Capacitor proposed, not decided) and the per-reader watermark technique (a watermark that identifies a reader is personal data and must go in the privacy notice).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change, per platform.
2. Migrations: none expected; say so if you need one.
3. A table mapping each 06b acceptance criterion to the test(s) or manual check that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E4-06b: Copy protection and traceability in the apps". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as teen_17 open a chapter in the desktop app on my Mac, take a screenshot and a screen recording and see them blank; check VoiceOver still reads the text; the same for each other platform you built,
- the pull request description from .github/pull_request_template.md.
```

### S1-E4-07 Quote-share card
Could · M · After March · Depends on: S1-E4-01

```text
We are working on story S1-E4-07 (Quote-share card) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e04-reading.md.

CONTEXT:
- Already merged: S1-E4-01.
- Decisions that apply: every uploaded picture goes through the picture check (CLAUDE.md rule 19). No doodles on sharing screens. No tracking in shared links. Supporters are a later stage, not Stage 1.
- Designs: the quote card on design/boards/Share.dc.html (3.6), with design/renders/desktop/Share.jpg and design/renders/phone/Share.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces (architecture 1.7.4, group C): the card is drawn on the device. The writer's on/off switch is a story setting (B13). An uploaded background uses B15 (the picture check) first.
- Watch-outs:
  - Up to 280 characters; the image carries the passage, title, pen name and link, plus alt text we write ("We wrote this for you").
  - Backgrounds: plain brand purple with no gold glow by default; palette colours, the story cover or the person's own picture, with covers and pictures always blurred so the words stay readable. The person must have the right to use their own picture.
  - One card per chapter per reader, with a pop-up explaining the limit (Q17 in the story). Tell me in the plan how you'll remember that without storing more than needed.
  - Short extracts with attribution sit within the quotation exception; the writer's switch is respected.
  - OPEN: a higher limit as a supporter perk; not in Stage 1, so don't build it.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations (the writer's switch, the per-chapter limit) with RLS policies and allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E4-07: Quote-share card". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as teen_17 select a passage over 280 characters, then a shorter one, make a card with each background and read its alt text; try a second card from the same chapter; as adult_writer switch quote cards off and check the option has gone,
- the pull request description from .github/pull_request_template.md.
```

### S1-E4-08 Offline reading in the apps
Could · L · After March · Depends on: S1-E16-03

```text
We are working on story S1-E4-08 (Offline reading in the apps) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e04-reading.md.

CONTEXT:
- Already merged: S1-E16-03.
- Decisions that apply: screens never import platform code directly; use src/lib/platform/ (CLAUDE.md rule 16). Ratings, blocks and app-only rules still apply to downloaded chapters (rule 18).
- Designs: the Download control on design/boards/Library.dc.html (3.7) and design/boards/Reader.dc.html (3.5), with their renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: none new on the server expected; storage is on the device through the platform adapter.
- Watch-outs:
  - Chapters are stored encrypted in the app's private storage, never as files the user can open elsewhere (Q19 in the story).
  - Downloads are removed after 30 days (proposal: ask me) or when the reader signs out.
  - The web app never offers "Download".
  - The mobile wrapper is OPEN (Capacitor proposed): stop and ask me before planning around it.
  - Tell me what happens to a downloaded chapter that is later unpublished, deleted, removed by a moderator or re-rated.
  - Size L: if your plan shows it is too big for one pull request, propose a split (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: none expected; say so if you need one.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E4-08: Offline reading in the apps". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as teen_17 download a story in the app, switch the phone to flight mode and read; sign out and check it is gone; open the web app and check there is no Download,
- the pull request description from .github/pull_request_template.md.
```

### S1-E4-09 "Only in the app" notice on the web
Must · S · After March · Depends on: S1-E3-08; S1-E16-02 for "Open in the app" (the deep link)

```text
We are working on story S1-E4-09 ("Only in the app" notice on the web) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e04-reading.md.

CONTEXT:
- Already merged: S1-E3-08. S1-E16-02 gives the real deep link for "Open in the app"; if it isn't merged, keep it mocked (architecture 1.7.4, 3.9) and list the mock in docs/mocks.md.
- Decisions that apply: on the web an app-only story shows a notice that the writer chose the app for more privacy and control (16 Oct 2026). The wording never promises copy-proofing (Q9).
- Designs: design/boards/AppOnly.dc.html (3.9), design/renders/desktop/AppOnly.jpg, design/renders/phone/AppOnly.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: read_on (S1-E3-08); B33 the deep link through src/lib/platform/.
- Watch-outs:
  - The dialog says "This story is only in the app" and offers "Get the app", "Open in the app" (works only if the app is installed) and "Back to the story".
  - On a phone browser before the phone apps exist, it says the app is for Windows, macOS and Linux for now and offers to email a reminder. OPEN: whether to keep that email. Stop and ask me.
  - Accessible dialog: focus trapped, Escape closes, focus returns to where it was.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: none expected unless the reminder email is kept; say so if you need one, with RLS and allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled: S1-E4-09: "Only in the app" notice on the web. Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as teen_17 open a chapter of adult_writer's app-only story on a desktop browser and on a phone-sized window; use the dialog with the keyboard only and close it with Escape,
- the pull request description from .github/pull_request_template.md.
```

### S1-E4-10 Any font on your device, in the apps
Should · M · After March · Depends on: S1-E4-02, S1-E16-02

```text
We are working on story S1-E4-10 (Any font on your device, in the apps) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e04-reading.md.

CONTEXT:
- Already merged: S1-E4-02, S1-E16-02.
- Decisions that apply: in the downloaded apps readers can use any font installed on their device; in the browser they choose from our fonts (16 Oct 2026). Screens never import Tauri directly; listing device fonts goes through src/lib/platform/ with a web version (CLAUDE.md rule 16, architecture 1.7.5).
- Designs: the reading settings on design/boards/Reader.dc.html (3.5), with design/renders/desktop/Reader.jpg and design/renders/phone/Reader.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). The font search follows the one drop-down style or the board's own control.
- Back-end pieces: B33 the desktop shell; the reading settings saved by S1-E4-02.
- Watch-outs:
  - The font list is read on the device only and never sent to us, because it can work as a fingerprint. Only our own font choices may be saved to the account; tell me how you keep a device font choice on that device only.
  - If a chosen device font is missing on another device, the closest of our fonts is used and the choice is kept for the device that has it.
  - iOS and Android come later with S1-E16-03: build Windows, macOS and Linux now.
  - No OPEN points in the story.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: none expected; say so if you need one.
3. A table mapping each acceptance criterion to the test(s) that prove it, including a test that no font name leaves the device.
4. New i18n keys (ro and en), analytics events (none that carry font names) and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E4-10: Any font on your device, in the apps". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as teen_17 in the desktop app on my Mac search for and pick a font I have; open the same account in the browser and see one of our fonts; check the browser offers only our fonts,
- the pull request description from .github/pull_request_template.md.
```

### S1-E4-11 Share a passage or a picture
Should · M · After March · Depends on: S1-E4-05, S1-E4-07, S1-E3-09

```text
We are working on story S1-E4-11 (Share a passage or a picture) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story in docs/stories/s1-e04-reading.md.

CONTEXT:
- Already merged: S1-E4-05, S1-E4-07, S1-E3-09.
- Decisions that apply: no tracking, so links carry nothing that identifies who shared them (CLAUDE.md rule 7). No doodles on sharing screens. Pictures are shared outside only after the picture check has passed (rule 19).
- Designs: design/boards/Share.dc.html (3.6), design/boards/Reader.dc.html (3.5) and design/boards/Teaser.dc.html (3.8), with their renders in design/renders/desktop and design/renders/phone. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B19 the teaser function (the link preview shows the passage instead of the blurb), the share counter from S1-E4-05, the writer's sharing switches (B13).
- Watch-outs:
  - A link to a spot opens the chapter at that paragraph with the passage highlighted. Paragraphs need stable anchors in the stored chapter structure (S1-E3-02): tell me how you'll keep them stable when the writer edits.
  - The writer can turn sharing off for a story or for their pictures; then the options don't appear.
  - App-only stories (S1-E3-08) and stories rated 16+ or 18+ share only a plain link, with no text or picture in the card or preview.
  - Short extracts with attribution fit the quotation exception. No OPEN points in the story.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations (switches, anchors), RLS policies with allowed and denied pgTAP tests, and changes to the teaser contract.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E4-11: Share a passage or a picture". Then give me:
- a summary of what changed and the check results,
- step-by-step manual test steps for a non-developer: as teen_17 select lines and share a link to the spot, open it signed out and see the highlight; share a picture card; try both on a 16+ story and get a plain link; as adult_writer switch sharing off and check the options are gone,
- the pull request description from .github/pull_request_template.md.
```

## S1-E5 Discovery, search and profiles

### S1-E5-01 Browse by category and tag
Must · M · March MVP (wave 4) · Depends on: S1-E3-01, S1-E3-06 (ratings), S1-E5-05 (blocks)

```text
We are working on story S1-E5-01 (Browse by category and tag) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e05-discovery-search-and-profiles.md.

CONTEXT
- Already merged: S1-E3-01, S1-E3-06, S1-E5-05. S1-E5-09 (See all) comes later in the March order: build the shelf cap of 20 and the "View more" card as a real link to the shelf's See all address, and leave the See all page itself to S1-E5-09 (the story's build note, 17 Oct 2026).
- Platform: web only (March is web only).
- Decisions that apply: launch categories are fiction, poetry and nonfiction essays (Q52); ratings All ages, 13+, 16+ and 18+, each hidden from anyone younger and enforced in RLS through age_band() (Q17, CLAUDE.md rule 18, DSA Art 28 applied anyway); 18+ only for an "18 or over" result; shelves of at most 20 with a "View more" card (rule 20), one-side fade, SVG doodles and icons.
- Designs: design/boards/Discover.dc.html with design/renders/desktop/Discover.jpg and design/renders/phone/Discover.jpg; for the See all link target, design/boards/SeeAll.dc.html. There is no board for the category or tag page itself: build them from the Discover shelf, card and filter components on /design. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B02 age_band(), B13 stories, tags and categories, B21 blocks, the public story views (handle and pen name, never the user ID). Mocked: seed 40 stories, including one of each rating, one app-only and one by a blocked writer (architecture 1.7.4, group C). The Discover mix and ranking scores (B17) belong to S1-E5-03; banners (B29, S1-E12-01) and seasonal doodles (B30, S1-E5-07) are after March, so leave the ad slot out and use the default greeting doodle (check with Robert).
- Watch-outs: signed-out visitors seeing All ages and 13+ only is a proposal, and treating them as under 16 is on the lawyer's list (L14): stop and ask me before you build it. Full titles must fit on every drawn or automatic cover.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: views or functions for category and tag lists, indexes, RLS policies (who can select and why) with an allowed and a denied pgTAP test each, including rating and block tests.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en), analytics events (object_action, no personal data) and moderation hooks.
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E5-01: Browse by category and tag". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer, teen_17, kid_14_ok, blocker and blocked and a signed-out window; the PR description from .github/pull_request_template.md.
```

### S1-E5-02 Sort options
Must · S · March MVP (wave 4) · Depends on: S1-E5-01, S1-E5-03 (popularity is the default sort from the start)

```text
We are working on story S1-E5-02 (Sort options) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e05-discovery-search-and-profiles.md.

CONTEXT
- Already merged: S1-E5-01, S1-E5-03 (popularity ranking), so the popularity score exists and is the default sort.
- Platform: web only.
- Decisions that apply: popularity is the default and S1-E5-03 is in the March MVP (Q46); a shelf keeps its own order and Sort applies on its See all page (S1-E5-09); no personal reading history is used; no cookies or third-party scripts (CLAUDE.md rule 7).
- Designs: the Sort control on design/boards/Discover.dc.html and design/boards/SeeAll.dc.html (renders in design/renders/desktop/ and design/renders/phone/ under the same names). The drop-down follows the one drop-down style in the Definition of Done. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B13 and the public story views from S1-E5-01; B17 ranking scores once S1-E5-03 is merged. Mocked: the seeded stories from S1-E5-01.
- Watch-outs: options are popularity, newest, oldest, A to Z, Z to A and by writer; on equal scores the newer story comes first. Keeping the choice "in the same session" must not use a cookie: say in the plan where you keep it. Tell me how A to Z will order Romanian letters (ă, â, î, ș, ț) (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Any migration (for example sort parameters on the list functions), indexes and RLS impact with pgTAP tests if policies change.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en) for every option, analytics events and moderation hooks (none expected; say so).
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E5-02: Sort options". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer (and a signed-out window); the PR description from .github/pull_request_template.md.
```

### S1-E5-03 Popularity ranking
Must · M · March MVP (wave 4) · Depends on: S1-E6-03, S1-E15-02, S1-E11-03 (weights); shares count once S1-E4-05 exists

```text
We are working on story S1-E5-03 (Popularity ranking) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e05-discovery-search-and-profiles.md.

CONTEXT
- Already merged: S1-E6-03 (likes), S1-E15-02 (daily metrics), S1-E4-01 (which records daily chapter_reads), S1-E6-01 (comments) and S1-E5-01 (Discover). S1-E5-02 (sort) comes right after and sorts by this score. S1-E11-03 (the weights screen) and S1-E4-05 (shares) are after March: weights are seeded settings, and shares count once S1-E4-05 exists (the story says so); tell me in the plan how the job treats the missing share signal.
- Platform: web only.
- Decisions that apply: Discover mixes shelves from the start (for example Popular, New, Completed), and which shelves show, their order and how many new writers appear can change without a release (Q46); no shelf uses a person's reading history; private downvotes are never used (Q22); until S1-E11-03 lands, settings and weights are seeded by migration and read through get_client_config() or the settings table (architecture 1.7.9).
- Designs: design/boards/Discover.dc.html and design/boards/Legal.dc.html (the "How ranking works" page), plus design/boards/Website-Home.dc.html for the row shapes; renders under the same names in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B17 pg_cron ranking job, B12 settings, B13, B20 chapter_reads, B21. Tests call the job's SQL function directly. Mocked: seeded reads and stories.
- Watch-outs: the weights are OPEN and the hourly schedule is a proposal: build them as settings, and stop and ask me for starting values. A "New and rising" shelf for first-time writers is my CTO's proposal, not decided: stop and ask me before adding it. Explaining signals follows DSA Art 27 as good practice.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: score columns or table, the job function and schedule, the shelf settings, RLS policies (scores readable through public views only, no writes from clients) with allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test that proves it, including "weights change, next run uses them" and "downvotes never used".
4. i18n keys (ro and en) for the "How ranking works" page and shelf names, analytics events and moderation hooks.
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E5-03: Popularity ranking". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer and kid_14_ok (to check rating filters still apply on every shelf); the PR description from .github/pull_request_template.md.
```

### S1-E5-04 Search stories and writers
Must · M · After March · Depends on: S1-E3-01, S1-E3-06, S1-E5-05 (blocks)

```text
We are working on story S1-E5-04 (Search stories and writers) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e05-discovery-search-and-profiles.md.

CONTEXT
- Already merged: S1-E3-01, S1-E3-06, S1-E5-05, S1-E5-09 (See all).
- Platform: web only for now.
- Decisions that apply: ratings hidden from anyone younger through age_band() (Q17); blocks respected everywhere; removed content never shown; the user ID is never shown or used in a URL, only handle and pen name; groups of more than 20 results are one scrolling line with a "View more" card (CLAUDE.md rule 20); full titles fit on every cover.
- Designs: design/boards/Search.dc.html with design/renders/desktop/Search.jpg and design/renders/phone/Search.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). The board's portrait ad (S1-E12-01) and the seasonal popular-tags doodle (S1-E5-07) are not part of this story: use the default doodle and leave the ad slot out unless those stories are merged (check with Robert).
- Back-end pieces: real: B18 search_stories() with Postgres full-text search using the romanian and english configurations and unaccent (no outside search service), B13, B21, B02. Nothing to mock (architecture 1.7.4, 3.2).
- Watch-outs: "povesti" must match "povești". Results match titles, blurbs, tags and pen names, grouped as stories, writers and tags. No legal or compliance notes beyond the global checklist. Search terms are user input: don't log them (CLAUDE.md rule 12).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: search columns or generated tsvectors, indexes, search_stories() signature, RLS (results go through the same visibility rules as public views) with allowed and denied pgTAP tests for ratings, blocks and removed stories.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en), analytics events (no search terms in them) and moderation hooks.
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E5-04: Search stories and writers". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer, kid_14_ok, blocker and blocked; the PR description from .github/pull_request_template.md.
```

### S1-E5-05 Writer profile page
Must · M · March MVP (wave 2) · Depends on: S1-E2-04

```text
We are working on story S1-E5-05 (Writer profile page) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e05-discovery-search-and-profiles.md.

CONTEXT
- Already merged: S1-E2-04 (handle and pen name). This story also creates the blocks table (B21, architecture 1.7.3).
- Platform: web only.
- Decisions that apply: the user ID is never shown publicly; profile actions (follow, block, report) take a handle (architecture 1.6); year of birth, age check result, email and online status are never shown to others (online status only if the owner opted in; off by default for minors, Q50); no profile banners, banners on spaces only (Q50); picture uploads are on from launch and every picture is checked on upload (Q18).
- Designs: design/boards/Profile.dc.html with design/renders/desktop/Profile.jpg and design/renders/phone/Profile.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: a public profile view (no user ID, no age), B14 avatars bucket, B21 blocks, B02. Mocked: B15 picture check with IMAGE_CHECK=stub (files ending _fail are refused) until S1-E10-05; B04 Report button calls a stub until S1-E10-01. Both come later in the March order.
- Watch-outs: the 300-character bio is a proposal: confirm with me. The rank chip comes from S1-E8-09 (after March) and the Follow button's behaviour from S1-E6-05 (later in the March order): stop and ask me how each should appear until then (check with Robert). Online status opt-in lives in privacy settings (S1-E13-01, after March): say how you'll default it. Avatars follow the same file rules as covers.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: bio and avatar columns, the public profile view, the blocks table and block function, storage policies, RLS (who can select, insert, update or delete, and why) with allowed and denied pgTAP tests, including "another user never sees year of birth, age result or email".
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en), analytics events and moderation hooks (profile and avatar reportable; blocks respected).
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E5-05: Writer profile page". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer, kid_14_ok, blocker and blocked; the PR description from .github/pull_request_template.md.
```

### S1-E5-06 Public-domain classics shelf
Should · M · After March · Depends on: S1-E3-03, S1-E5-09

```text
We are working on story S1-E5-06 (Public-domain classics shelf) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e05-discovery-search-and-profiles.md.

CONTEXT
- Already merged: S1-E3-03, S1-E5-09.
- Platform: web only for now.
- Decisions that apply: seed the reader side with any Romanian classics that are free (Q51); shelves are one scrolling line of at most 20 with a "View more" card to See all (CLAUDE.md rule 20); draft content is loaded as seed or CMS data, never hard-coded in components.
- Designs: design/boards/Classics.dc.html (3.3) and design/boards/SeeAll.dc.html (3.10), with renders under the same names in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B13 stories and chapters owned by an official platform account, a "Public domain" label. Nothing extra to mock (architecture 1.7.4, 3.3).
- Content: content/classics/G5_romanian-classics.csv and content/classics/G5_english-classics.csv list works with each author's death year; content/README.md says to check each title's status and that the text isn't a newer translation.
- Watch-outs: copyright runs 70 years from 1 January after the author's death (Law 8/1996 art. 28(1) and art. 34), so in 2026 only authors who died in 1955 or earlier; a modern edition, translation or editor's notes may still be protected. The CSV holds titles, not texts: stop and ask me where the texts come from and who confirms each edition is free (check with Robert). Ask me how the official account is created and named.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: the official account, a public-domain flag or label, the import function that refuses any work whose author died after the cut-off year, RLS (only staff or the import job write) with allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en), analytics events and moderation hooks (classics stay reportable like any story).
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E5-06: Public-domain classics shelf". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer, kid_14_ok and a signed-out window; the PR description from .github/pull_request_template.md.
```

### S1-E5-07 Seasonal doodles
Could · S · After March · Depends on: S1-E1-03, S1-E5-01, S1-E5-04, S1-E11-11 (the schedule)

```text
We are working on story S1-E5-07 (Seasonal doodles) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e05-discovery-search-and-profiles.md.

CONTEXT
- Already merged: S1-E1-03, S1-E5-01, S1-E5-04, S1-E11-11 (the staff schedule).
- Platform: web only for now.
- Decisions that apply: the Discover greeting doodle and the Search popular-tags doodle change with seasons and occasions (16 Oct 2026); doodles are always SVG files using design tokens (CLAUDE.md rule 16); decorative doodles are hidden from screen readers, take no clicks and never sit over text or controls at any width; Romania first (17 Oct 2026).
- Designs: the greeting on design/boards/Discover.dc.html, the popular tags on design/boards/Search.dc.html and the doodle set on design/boards/Doodles.dc.html (11.1); renders under the same names in design/renders/desktop/ and design/renders/phone/; doodle files in design/assets/. Mark each doodle as a widget doodle with its breakpoint rule (Definition of Done). Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B30 seasonal_occasions and current_occasion() from S1-E11-11. Mocked: seeded occasions if needed.
- Watch-outs: only the device's date is used, never location. A schedule change must show within a minute with no release. Doodles must not move or animate. OPEN: the list of occasions, and whether they follow the reader's country once English-speaking countries open: stop and ask me.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Any migration or RLS change (reads of the published schedule only) with allowed and denied pgTAP tests, or say none is needed.
3. A table mapping each acceptance criterion to the test that proves it, including the doodle overlap check.
4. i18n keys (ro and en), analytics events (none expected) and moderation hooks (none expected).
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E5-07: Seasonal doodles". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer, changing the device date and using a staff persona such as editor to change the schedule; the PR description from .github/pull_request_template.md.
```

### S1-E5-08 Public website home page
Should · M · March MVP (wave 4) · Depends on: S1-E1-03, S1-E1-04, S1-E11-06, S1-E11-12, S1-E5-03 (for the rows), S1-E5-09 (View more), S1-E16-02 (download links); back end: the website's own database and public-shelves

```text
We are working on story S1-E5-08 (Public website home page) only. Read CLAUDE.md, docs/architecture.md (1.7.4 group A and 1.8.6), docs/definition-of-done.md and the story in docs/stories/s1-e05-discovery-search-and-profiles.md.

CONTEXT
- Already merged: S1-E1-03, S1-E1-04, S1-E5-03, S1-E5-09. S1-E11-06, S1-E11-12 and S1-E16-02 are after March, so for March build the short version (proposal in the story): hero, safety lines, questions and download buttons, with the copy in the locale files until the CMS stories land; the live rows can follow. Confirm the scope with me in the plan.
- Platform: web only.
- Decisions that apply: "Write stories. Get read." with "Post your stories, poems and essays, one chapter at a time, and find the people who want to read them." (no "articles"); "Yoti does the age check. We only get the result, never a photo."; one messaging line: never between under-16s and adults, off by default for 16 and 17-year-olds (Q6, Q13); "parent or guardian" (Q8); language drop-down in top bar and footer (Q11); Romanian is the default interface language; the website has its own database and never reads app tables (Q54); EU hosting (Q38).
- Designs: design/boards/Website-Home.dc.html with design/renders/desktop/Website-Home.jpg and design/renders/phone/Website-Home.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B31 is mocked with the WebsiteContentStore stub: a JSON fixture of the copy live on 16 Oct 2026, a fixture of the 16 Oct questions and a public-shelves fixture of 12 stories including one app-only story. Download buttons use fixed links.
- Watch-outs: public-shelves returns only public All ages or 13+ stories, never chapter text of app-only stories, nothing from class spaces, never a user ID. No cookies, no third-party script (cookieless analytics is S1-E15-01, after March); one h1 and the right lang attribute. The claims must stay true (Law 363/2007). Stop and ask me: where the website code lives and how its database is set up (OPEN); the hosting provider (OPEN); what the download buttons point to while March is web only; whether the contest block goes in (it needs published contest rules and the ROFUIP art. 178(2) check).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. The WebsiteContentStore and public-shelves contracts (zod) and any migration with RLS and allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test that proves it (mark which wait for the live rows).
4. i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E5-08: Public website home page". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer as a signed-out visitor in Romanian and English; the PR description from .github/pull_request_template.md.
```

### S1-E5-09 See all page for a shelf
Must · S · March MVP (wave 4) · Depends on: S1-E5-01, S1-E5-02

```text
We are working on story S1-E5-09 (See all page for a shelf) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e05-discovery-search-and-profiles.md.

CONTEXT
- Already merged: S1-E5-01, S1-E5-02, S1-E5-03. S1-E5-08 (the website home page) comes right after and uses this card on its rows.
- Platform: web only.
- Decisions that apply: every shelf is one horizontally scrollable line of at most 20, ending with a "View more" card only when there are more (CLAUDE.md rule 20, decided 16 Oct 2026); no personal reading history fills a shelf; ratings, blocks, app-only rules and removed content apply exactly as on the shelf; full titles fit on every cover.
- Designs: design/boards/SeeAll.dc.html with design/renders/desktop/SeeAll.jpg and design/renders/phone/SeeAll.jpg; the card at the end of the shelves on design/boards/Discover.dc.html. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: the public story views, B02, B13, B17 ranking order, B21 blocks. Mocked: the seeded 40 stories (add enough to one shelf to pass 20).
- Watch-outs: the card is a real link with an accessible name such as "View all 54 in Trending", reachable by keyboard and by the row's scroll buttons. The page lists every story in the same order, with the same filters and Sort, loads more by scrolling or a "Load more" button and has its own shareable address. Wire the card into every shelf that already exists (Discover, category and tag pages, the website home rows if built); Classics, Search and Library get it when their stories land. No legal notes beyond the global checklist.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Any migration (paged list functions keyed by shelf) with RLS impact and allowed and denied pgTAP tests for ratings, blocks and app-only stories.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en, with plurals for the count), analytics events and moderation hooks (none expected).
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E5-09: See all page for a shelf". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer, kid_14_ok and blocked, keyboard only for one pass; the PR description from .github/pull_request_template.md.
```

## S1-E6 Comments, reactions and follows

### S1-E6-01 Comment on a chapter
Must · M · March MVP (wave 4) · Depends on: S1-E4-01, S1-E10-01

```text
We are working on story S1-E6-01 (Comment on a chapter) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e06-comments-reactions-and-follows.md.

CONTEXT
- Already merged: S1-E4-01, S1-E10-01 (report button and reportable_type).
- Platform: web only.
- Decisions that apply: every write goes through is_active_member(), so read-only accounts (waiting for a parent, age check not done) can't comment (architecture 1.7.8); emoji-only comments are never deleted automatically (Q25); moderation is in-house and report-based, with no automated text moderation and no hold before publishing (Q42, Q43); comments can be switched off per story (S1-E3-05).
- Designs: the comments area on design/boards/Reader.dc.html with design/renders/desktop/Reader.jpg and design/renders/phone/Reader.jpg. No doodles at all on the chapter reader. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B21 comments, B20, B02, B04 report_item(). Nothing to mock. Notifications for replies come with S1-E7-01.
- Watch-outs: up to 2,000 characters (canvas 3.5), replies one level deep, spoilers hidden until "Show spoiler", the writer can delete any comment on their own story. Comment text is a Markdown subset, sanitised on save and before display; links get rel="nofollow ugc noopener" (CLAUDE.md rule 8). Register comment as reportable with a report button (DSA Art 16) and respect blocks. Rate limits: S1-E10-12 is after March, so architecture 1.7.9 proposes a fixed comment limit inside the comment function for March; the canvas 8.6 starting values are 5 an hour in the first 24 hours and 60 an hour after (proposal): stop and ask me which numbers to use.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: comments table (not-null user_id, soft delete), spoiler flag, reply depth rule, the comment function with its limit, RLS (who can select, insert, update or delete, and why: author, story writer, moderators, blocked pairs, ratings) with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en, including the wait message), analytics events (no comment text) and moderation hooks (reportable, removable, restorable, audited).
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E6-01: Comment on a chapter". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer, teen_17, kid_14_ok, kid_14_waiting, blocker and blocked; the PR description from .github/pull_request_template.md.
```

### S1-E6-02 Emoji reactions on comments
Must · S · March MVP (wave 4) · Depends on: S1-E6-01

```text
We are working on story S1-E6-02 (Emoji reactions on comments) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e06-comments-reactions-and-follows.md.

CONTEXT
- Already merged: S1-E6-01.
- Platform: web only.
- Decisions that apply: added to the March MVP on 17 Oct 2026; emoji stay in user content only and the interface uses no emoji (design direction); icons are SVG files (CLAUDE.md rule 16); writes go through is_active_member().
- Designs: the reaction picker and counts on design/boards/Reader.dc.html with design/renders/desktop/Reader.jpg and design/renders/phone/Reader.jpg. The board draws a fixed set of six as SVG icons, each with a text name (Heart, Fire, Laugh, Wow, Sad, Star), one reaction per person per comment, and picking it again removes it. The story calls the set of six a proposal: confirm the set with me in the plan (check with Robert). No doodles on the reader. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B21 reactions. Nothing to mock.
- Watch-outs: a user can change or remove their reaction; each count has a text name for screen readers (for example "heart, 4"); the picker works by keyboard with 24 px minimum targets. Reactions respect blocks. No legal notes beyond the global checklist.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: reactions table (not-null user_id, one per user per comment, the six kinds as an enum), RLS (who can select, insert, update or delete, and why) with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en) for every reaction name, analytics events and moderation hooks (say whether a reaction needs to be reportable, or why not).
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E6-02: Emoji reactions on comments". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer, kid_14_ok and kid_14_waiting, with one pass using a screen reader; the PR description from .github/pull_request_template.md.
```

### S1-E6-03 Like a chapter
Must · S · March MVP (wave 4) · Depends on: S1-E4-01

```text
We are working on story S1-E6-03 (Like a chapter) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e06-comments-reactions-and-follows.md.

CONTEXT
- Already merged: S1-E4-01. S1-E5-03 (popularity ranking) comes later in the March order and reads the likes this story stores.
- Platform: web only.
- Decisions that apply: likes feed the popularity score (S1-E5-03); private downvotes never do (Q22); no doodles on the chapter reader.
- Designs: the Like control on design/boards/Reader.dc.html and the like count on design/boards/Story.dc.html, with renders under the same names in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B20 likes. Nothing to mock; the B17 ranking job comes with S1-E5-03.
- Watch-outs: a signed-in reader taps "Like", the like toggles and the count updates. Name the likes table and count clearly in the plan so S1-E5-03 can read them. A like is a write: tell me whether read-only accounts (kid_14_waiting, pending_check) should be able to like, as the account gate would stop them (check with Robert). No legal notes beyond the global checklist.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: likes table (not-null user_id, one per user per chapter), the count, RLS (who can select, insert and delete, and why) with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it (the ranking job that reads likes is tested in S1-E5-03).
4. i18n keys (ro and en), analytics events (chapter_liked or similar, no personal data) and moderation hooks (none expected; say so).
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E6-03: Like a chapter". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer, kid_14_ok and kid_14_waiting; the PR description from .github/pull_request_template.md.
```

### S1-E6-04 Private downvote
Must · S · March MVP (wave 4) · Depends on: S1-E6-01, S1-E10-03

```text
We are working on story S1-E6-04 (Private downvote) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e06-comments-reactions-and-follows.md.

CONTEXT
- Already merged: S1-E6-01, S1-E10-03a (the March version of the moderation queue: one queue with tiers and deadlines).
- Platform: web only.
- Decisions that apply: downvotes are private and feed moderation only, never ranking (Q22); downvotes are readable only by staff (architecture 1.6); added to the March MVP on 17 Oct 2026.
- Designs: the Downvote button and its confirmation ("Downvote sent. It's private...") on design/boards/Reader.dc.html and the "Downvote privately" button on design/boards/Thread.dc.html; renders under the same names in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B21 downvotes, B26 queue (cases at the lowest tier). Nothing to mock.
- Watch-outs: nobody sees a count, the author included. Only distinct accounts count, and an account less than 24 hours old doesn't count (proposal). The threshold is "configured" but has no number: seed it as a setting (B12) and stop and ask me for the value. Forums are after March, so in March this covers comments only; forum posts get the button when S1-E8-02 lands (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: downvotes table (not-null user_id, one per user per item), the threshold setting, the function that opens a lowest-priority case when the threshold is crossed, RLS (users insert their own, only staff select, nobody else reads) with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it, including "ranking never reads downvotes".
4. i18n keys (ro and en), analytics events (none that reveal who downvoted) and moderation hooks.
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E6-04: Private downvote". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer, teen_17, kid_14_ok and the moderator persona; the PR description from .github/pull_request_template.md.
```

### S1-E6-05 Follow a writer or a story
Must · S · March MVP (wave 4) · Depends on: S1-E5-05

```text
We are working on story S1-E6-05 (Follow a writer or a story) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e06-comments-reactions-and-follows.md.

CONTEXT
- Already merged: S1-E5-05 (profile and blocks).
- Platform: web only.
- Decisions that apply: follower counts are public but the list of followers is visible to the writer only, to protect minors (Q50); actions on another person take a handle or story ID, never the user ID (architecture 1.6); writes go through is_active_member().
- Designs: the Follow buttons on design/boards/Profile.dc.html and design/boards/Story.dc.html, with renders under the same names in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B21 follows (architecture 1.6 names follows_users), B13 stories, B14 for avatars in the follower list. Nothing to mock. New-chapter notifications to followers come with S1-E7-01.
- Watch-outs: following and unfollowing work at any time; a blocked user trying to follow the person who blocked them fails silently (no error that reveals the block). Following a story is in scope as well as a writer: tell me whether you use one table or two.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: follows (not-null user_id), the follow and unfollow functions taking a handle or story ID, the public count, RLS (the follower list readable only by the writer, blocked pairs refused) with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en, with plurals for counts), analytics events and moderation hooks (blocks respected).
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E6-05: Follow a writer or a story". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer, kid_14_ok, blocker and blocked; the PR description from .github/pull_request_template.md.
```

### S1-E6-06 Inline paragraph comments
Could · L · After March · Depends on: S1-E6-01

```text
We are working on story S1-E6-06 (Inline paragraph comments) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e06-comments-reactions-and-follows.md.

CONTEXT
- Already merged: S1-E6-01, S1-E3-02 (chapters stored as structured content).
- Platform: web only for now.
- Decisions that apply: every rule of S1-E6-01 still holds (2,000 characters, spoilers, report button, blocks, sanitised Markdown, links with rel="nofollow ugc noopener", emoji-only comments never auto-deleted, Q25); no doodles on the chapter reader.
- Designs: there is no board for paragraph comments; extend the comments area of design/boards/Reader.dc.html (renders design/renders/desktop/Reader.jpg and design/renders/phone/Reader.jpg) using its existing components. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B13 chapters and chapter revisions, B21 comments. Nothing to mock.
- Watch-outs: a reader taps a paragraph's comment marker and sees and adds comments for that paragraph only. When the writer edits, comments stay attached by a stable paragraph ID or move to "comments on an earlier version". Markers must be keyboard reachable with 24 px targets and must not get in the way of reading. This story is sized L: if your plan shows it won't fit one pull request, propose a split (Definition of Ready).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: stable paragraph IDs in chapter content, a paragraph reference on comments, the "earlier version" rule, RLS changes with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en), analytics events and moderation hooks (paragraph comments stay reportable).
5. Every OPEN or unclear point as a question, and a split proposal if needed.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E6-06: Inline paragraph comments". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer (editing a chapter) and kid_14_ok (commenting); the PR description from .github/pull_request_template.md.
```

## S1-E7 Notifications

### S1-E7-01 In-app notifications
Must · M · March MVP (wave 4) · Depends on: S1-E6-01, S1-E6-05

```text
We are working on story S1-E7-01 (In-app notifications) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e07-notifications.md.

CONTEXT
- Already merged: S1-E6-01, S1-E6-05, S1-E3-03 (the chapter_published event). Moderation decisions already exist (S1-E10-03a, S1-E10-06, S1-E10-09): plan how a decision about a user's content arrives here as a notification. S1-E10-04 (statements of reasons) comes right after this story and sends its statements through these notifications.
- Platform: web only.
- Decisions that apply: statements of reasons must reach the user (DSA Art 17), so moderation decisions arrive as notifications that can't be switched off; no personal data in analytics or logs.
- Designs: design/boards/Notifications.dc.html with design/renders/desktop/Notifications.jpg and design/renders/phone/Notifications.jpg, plus the bell in the app shell from S1-E1-03. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B22 notifications table, triggers and Realtime (runs locally), B16 events and the jobs queue. Mocked: email (B09) is Mailpit only and push is a stub until S1-E16-03; neither is part of this story (S1-E7-02, S1-E7-03).
- Watch-outs: followers get a notification when a followed writer publishes; several reactions on one comment within an hour are grouped (the hour is a proposal: confirm it); the bell shows an unread count and "Mark all as read" clears it. A notification must never reveal content a reader can't see (ratings, blocks, removed items).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: notifications (not-null user_id, type, read state), the triggers or job that create them, grouping, RLS (each user reads and marks only their own; moderation notices can't be deleted or muted) with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en, with plurals), analytics events and moderation hooks.
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E7-01: In-app notifications". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer (publishing), kid_14_ok and teen_17 (following and reacting), blocked and the moderator persona (a decision); the PR description from .github/pull_request_template.md.
```

### S1-E7-02 Email notifications and digests
Should · M · After March · Depends on: S1-E7-01

```text
We are working on story S1-E7-02 (Email notifications and digests) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e07-notifications.md.

CONTEXT
- Already merged: S1-E7-01.
- Platform: web only for now.
- Decisions that apply: no marketing email to under-18s (Q50); marketing emails need consent (Law 506/2004); account and legal emails can't be switched off; never log email addresses or user content (CLAUDE.md rule 12).
- Designs: the notification rows (instant, daily digest, off) on design/boards/Settings.dc.html with design/renders/desktop/Settings.jpg and design/renders/phone/Settings.jpg. The drop-downs follow the one drop-down style. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B22 notifications and settings in profiles.settings, B17 for the daily digest job. Mocked: B09 email uses Mailpit locally; the real provider only on staging and production.
- Watch-outs: the email provider is OPEN (Q49; the CTO recommends Brevo, which is not a decision) and needs a data processing agreement: stop and ask me before wiring any provider. Every non-essential email has a one-click unsubscribe link and header. Templates in Romanian and English. Tell me what time the daily digest goes out, as the story doesn't say (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: per-type email settings, a digest queue, the unsubscribe token, the under-18 rule enforced in the database, RLS with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys and email templates (ro and en), analytics events (no email addresses) and moderation hooks.
5. Every OPEN or unclear point as a question, plus the privacy notice and processor list changes this needs.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E7-02: Email notifications and digests". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer, teen_17 and kid_14_ok, reading the emails in Mailpit; the PR description from .github/pull_request_template.md.
```

### S1-E7-03 Push notifications in the apps
Should · M · After March · Depends on: S1-E7-01, S1-E16-03

```text
We are working on story S1-E7-03 (Push notifications in the apps) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e07-notifications.md.

CONTEXT
- Already merged: S1-E7-01, S1-E16-03 (the iOS and Android apps).
- Platform: the phone apps. Screens never import native code directly; use src/lib/platform/ (CLAUDE.md rule 16).
- Decisions that apply: minors get quiet hours for push (Q50); March was web only and the apps came after (34o).
- Designs: the push rows and quiet hours on design/boards/Settings.dc.html with design/renders/desktop/Settings.jpg and design/renders/phone/Settings.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B22 notifications, push tokens and settings. Mocked: push stays a stub until the S1-E16-03 wrapper is real (architecture 1.7.5).
- Watch-outs: the app doesn't ask for push permission until the user follows someone or comments. For under-18s, pushes between 22:00 and 07:00 in their time zone wait until 07:00; Q50 decided quiet hours but not the times (22:00 to 07:00 come from canvas 6.3): stop and ask me to confirm them, and tell me how you find the user's time zone without storing location. Push switched off for a type means none of that type is sent. The mobile wrapper (Capacitor proposed) is OPEN: stop and ask me if S1-E16-03 hasn't settled it.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: push tokens (not-null user_id), per-type push settings, the quiet-hours hold, RLS with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point as a question, plus the privacy label and data safety changes.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E7-03: Push notifications in the apps". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer on a phone using adult_writer and kid_14_ok (late evening); the PR description from .github/pull_request_template.md.
```

## S1-E8 Forums and spaces

### S1-E8-01 Forum categories and subforums
Must · M · After March · Depends on: S1-E1-02, S1-E11-03

```text
We are working on story S1-E8-01 (Forum categories and subforums) only. Read CLAUDE.md, docs/architecture.md (1.8 for staff screens), docs/definition-of-done.md and the story in docs/stories/s1-e08-forums-and-spaces.md.

CONTEXT
- Already merged: S1-E1-02, S1-E11-03 (settings and the admin Settings area).
- Platform: web only for now.
- Decisions that apply: forums sort by latest activity with the starting categories pinned (Q45); threads are never archived or closed automatically; staff changes go through admin_* functions that check role, permission and is_staff_session() and write the audit log in the same transaction (architecture 1.8.1); staff sign in with Google Workspace only.
- Designs: the forum index on design/boards/Forums.dc.html (renders design/renders/desktop/Forums.jpg and design/renders/phone/Forums.jpg) and the forums block on design/boards/AdminSettings.dc.html (renders under the same name). Staff screens use plain components, no doodles. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B23 forums, B27 admin functions, B03 audit log. Mocked: seeded categories and forums.
- Watch-outs: staff set name, description, order and parent, up to two levels deep (proposal: confirm). Each forum shows thread count, post count and the latest post. The starting categories aren't listed in the docs: stop and ask me for them. Ads in forums belong to S1-E12-01, not here.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: forums with parent and order, counts and latest-post view, admin_* create and update functions, RLS (everyone reads, only permitted staff write) with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it, including "no automatic archive".
4. i18n keys (ro and en; say how forum names are stored in two languages), analytics events and moderation hooks.
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E8-01: Forum categories and subforums". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using the admin and moderator staff personas and adult_writer; the PR description from .github/pull_request_template.md.
```

### S1-E8-02 Threads and posts with safe formatting
Must · L · After March · Depends on: S1-E8-01, S1-E10-01

```text
We are working on story S1-E8-02 (Threads and posts with safe formatting) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e08-forums-and-spaces.md.

CONTEXT
- Already merged: S1-E8-01, S1-E10-01.
- Platform: web only for now.
- Decisions that apply: writes go through is_active_member(); moderation is in-house and report-based, no automated text moderation (Q42, Q43); when an account is deleted its forum posts stay as "Deleted user" (Q47); downvotes on posts are private (Q22, S1-E6-04); threads ordered by latest activity (Q45).
- Designs: design/boards/Thread.dc.html and design/boards/Forums.dc.html, with renders under the same names in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). The forum ads below the reply box and at the side belong to S1-E12-01.
- Back-end pieces: real: B23 threads, posts and post_revisions, B04 report_item(), B21 blocks and downvotes. Nothing to mock.
- Watch-outs: the Markdown subset is cleaned on the server and again before display, so no script, iframe or style can run; links get rel="nofollow ugc noopener"; every post has a number (#1, #2) and its own permalink; an edit shows "Edited" and moderators can see the previous version. Register thread and post as reportable with report buttons, respect blocks, add the private downvote from S1-E6-04. OPEN: whether pictures are allowed in posts (if yes, they go through the picture check in S1-E10-05): stop and ask me. This story is sized L: if your plan shows it won't fit one pull request, propose a split (Definition of Ready).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: threads and posts (not-null user_id, soft delete, post number), post_revisions, the sanitising step, RLS (who can select, insert, update or delete, and why: author, moderators, blocked pairs, read-only accounts) with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it, including an XSS test.
4. i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point as a question, and a split proposal if needed.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E8-02: Threads and posts with safe formatting". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer, teen_17, kid_14_ok, kid_14_waiting, blocker, blocked and the moderator persona; the PR description from .github/pull_request_template.md.
```

### S1-E8-03 Quote, multi-quote and quick reply
Must · M · After March · Depends on: S1-E8-02

```text
We are working on story S1-E8-03 (Quote, multi-quote and quick reply) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e08-forums-and-spaces.md.

CONTEXT
- Already merged: S1-E8-02.
- Platform: web only for now.
- Decisions that apply: post text is the sanitised Markdown subset (CLAUDE.md rule 8); writes go through is_active_member(); blocks are respected everywhere.
- Designs: the Quote and Multi-quote controls and the reply box on design/boards/Thread.dc.html with design/renders/desktop/Thread.jpg and design/renders/phone/Thread.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B23 posts. Nothing to mock.
- Watch-outs: "Quote" opens the reply box with the quoted text and a link to the original post; several posts marked "Multi-quote" are quoted in order; the quick reply box at the bottom posts without leaving the page. Tell me what a quote shows when the original is later removed or its author is blocked by the reader (check with Robert). Multi-quote selections must work by keyboard and be announced to screen readers. No legal notes beyond the global checklist.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Any migration (for example a quoted-post reference) with RLS impact and allowed and denied pgTAP tests.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E8-03: Quote, multi-quote and quick reply". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer, teen_17, blocker and blocked; the PR description from .github/pull_request_template.md.
```

### S1-E8-04 Read and unread tracking
Must · M · After March · Depends on: S1-E8-02

```text
We are working on story S1-E8-04 (Read and unread tracking) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e08-forums-and-spaces.md.

CONTEXT
- Already merged: S1-E8-02.
- Platform: web only for now.
- Decisions that apply: read marks are personal data about what someone read: they stay private to the user and are never used for ranking or a feed (no profiling in Stage 1, architecture 1.10).
- Designs: unread markers and "Mark all as read" on design/boards/Forums.dc.html and design/boards/Thread.dc.html, with renders under the same names in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). Unread must not be shown by colour alone.
- Back-end pieces: real: B23 read_marks at user, forum and thread levels (the phpBB pattern confirmed by the research). Nothing to mock.
- Watch-outs: threads with posts newer than the user's last visit show as unread; opening an unread thread lands on the first unread post; "Mark all as read" works for one forum or the whole board. Tell me whether read marks need a retention period in docs/retention.md (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: read_marks (not-null user_id) at three levels, the mark functions, indexes, RLS (each user reads and writes only their own) with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en), analytics events and moderation hooks (none expected; say so).
5. Every OPEN or unclear point as a question, plus any privacy notice change.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E8-04: Read and unread tracking". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer and teen_17 posting to each other; the PR description from .github/pull_request_template.md.
```

### S1-E8-05 Sticky and locked threads, reply without bumping
Must · S · After March · Depends on: S1-E8-02, S1-E2-07

```text
We are working on story S1-E8-05 (Sticky and locked threads, reply without bumping) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e08-forums-and-spaces.md.

CONTEXT
- Already merged: S1-E8-02, S1-E2-07 (staff roles).
- Platform: web only for now.
- Decisions that apply: threads are ordered by latest activity and the starting categories stay pinned, with no popularity ranking in forums (Q45); staff actions go through admin_* functions with is_staff_session() and the audit log (architecture 1.8.1).
- Designs: the pinned and locked states and the "don't bump" option on design/boards/Thread.dc.html and pinned threads on design/boards/Forums.dc.html, with renders under the same names in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B23, B27, B03. Nothing to mock.
- Watch-outs: a moderator makes a thread sticky and it stays at the top of its forum; a locked thread can be read but not replied to, and the lock reason is shown; a reply with "Don't bump" ticked doesn't change the thread's position. Tell me whether space moderators (S1-E8-07) may also pin and lock in their own space, or only platform staff (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: sticky, locked and lock reason on threads, a last-activity column that "don't bump" leaves alone, admin_* functions, RLS (replies refused on locked threads) with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en), analytics events and moderation hooks (pin and lock in the audit log).
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E8-05: Sticky and locked threads, reply without bumping". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using the moderator persona and adult_writer; the PR description from .github/pull_request_template.md.
```

### S1-E8-06 User-created spaces
Must · L · After March · Depends on: S1-E8-02, S1-E2-02

```text
We are working on story S1-E8-06 (User-created spaces) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e08-forums-and-spaces.md.

CONTEXT
- Already merged: S1-E8-02, S1-E2-02 (year of birth and age_band()).
- Platform: web only for now.
- Decisions that apply: anybody fully active can create a space, with no minimum account age, no approval and no per-person limit beyond the spam limits (Q26); a space made by an under-16 is an under-16 space (only under-16s join, post, are invited or moderate); a space made by someone 16 or over is a 16+ space (only 16 and over); class spaces are the only exception (S1-E8-11); open 16+ spaces can be read by anyone, signed in or not; an under-16 space is hidden from people 16 and over and from signed-out visitors unless its owner made it public to everybody, and even then only under-16s join or post (34p); a member who turns 16 stays in the under-16 groups joined before but can't start or join any (34p); banners appear only on spaces (Q50); brand or author names are allowed and complaints go through notice and action (Q26).
- Designs: design/boards/Space.dc.html (5.3) and design/boards/Forums.dc.html, with renders under the same names in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B23 spaces, space_members, space_roles; B02 age_band(); B14 for the banner with B15 the picture check (stub IMAGE_CHECK=stub only if S1-E10-05 isn't merged). Nothing else to mock.
- Watch-outs: the age split must live in RLS, not the interface, with pgTAP tests for every age pairing. Members-only posting asks non-members to join under the owner's approval rule. OPEN: what happens when the owner of an under-16 space turns 16 (proposal: hand it to another under-16 member or a moderator): stop and ask me. This story is sized L: if your plan shows it won't fit one pull request, propose a split (Definition of Ready).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: spaces (not-null user_id, unique name, age group, public-to-everybody flag, members-only flag), members and join requests, RLS (who can select, insert, update or delete, and why) with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en), analytics events and moderation hooks (space, banner and rules reportable).
5. Every OPEN or unclear point as a question, and a split proposal if needed.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E8-06: User-created spaces". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer, teen_17, kid_14_ok, kid_14_waiting, blocked and a signed-out window; the PR description from .github/pull_request_template.md.
```

### S1-E8-07 Space moderators and permissions
Should · M · After March · Depends on: S1-E8-06, S1-E2-07

```text
We are working on story S1-E8-07 (Space moderators and permissions) only. Read CLAUDE.md, docs/architecture.md (1.8.3), docs/definition-of-done.md and the story in docs/stories/s1-e08-forums-and-spaces.md.

CONTEXT
- Already merged: S1-E8-06, S1-E2-07.
- Platform: web only for now.
- Decisions that apply: build the permission model in Stage 1 and use it more later; platform moderators keep legal responsibility; space_moderator is a member role scoped to one space, not a staff role (architecture 1.8.3); only under-16s can moderate an under-16 space and only people 16 or over a 16+ space (Q26).
- Designs: the moderator section and the line "Every moderator action is logged. The owner and Ghemotoc's own moderators can see the log." on design/boards/Space.dc.html with design/renders/desktop/Space.jpg and design/renders/phone/Space.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B23 space_roles, B27 for platform moderators, B03 for platform staff actions. Nothing to mock.
- Watch-outs: the owner appoints a moderator and picks permissions from posts, members, settings and mail; every space moderator action is logged and visible to the owner and platform moderators; platform moderators override space settings. Tell me what the "mail" permission covers (check with Robert). Say where the space moderation log lives and how it relates to the staff audit log.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: space roles with permission flags, a space moderation log, functions for each action, RLS (owner appoints, moderator acts only within granted permissions, platform moderators always) with an allowed and a denied pgTAP test each, including the age group rule for moderators.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E8-07: Space moderators and permissions". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer (owner), teen_17 (space moderator), kid_14_ok (refused for a 16+ space) and the moderator staff persona; the PR description from .github/pull_request_template.md.
```

### S1-E8-08 Signatures and profile customisation limits
Should · S · After March · Depends on: S1-E8-02

```text
We are working on story S1-E8-08 (Signatures and profile customisation limits) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e08-forums-and-spaces.md.

CONTEXT
- Already merged: S1-E8-02, S1-E10-05 (picture check).
- Platform: web only for now.
- Decisions that apply: signatures are hidden on phone-width screens (Q25); a flagged signature or banner earns a warning and is removed if not changed within 24 hours (Q29); every uploaded picture goes through the picture check before anyone else sees it (CLAUDE.md rule 19); every new user-content type is reportable and respects blocks (rule 6).
- Designs: the signature section on design/boards/Profile.dc.html (6.1) and where signatures sit under posts on design/boards/Thread.dc.html, with renders under the same names in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: profiles or a signatures table, B14 storage, B15 picture check, B26 for the moderator warning. Nothing to mock if S1-E10-05 is merged.
- Watch-outs: at most 300 characters, three lines and one static image (canvas 6.1); animated images are refused. The 24-hour removal needs a scheduled job (B17). The story mentions banners too: tell me whether that means space banners from S1-E8-06 (check with Robert). No legal notes beyond the global checklist.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: signature fields with limits enforced in the database, the flag and 24-hour removal job, RLS (owner edits, everyone reads, moderators flag) with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it, including the animated-image refusal.
4. i18n keys (ro and en), analytics events and moderation hooks (signature registered as reportable).
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E8-08: Signatures and profile customisation limits". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer and the moderator persona, on a phone width and a desktop width; the PR description from .github/pull_request_template.md.
```

### S1-E8-09 Ranks and light reputation
Could · M · After March · Depends on: S1-E3-03

```text
We are working on story S1-E8-09 (Ranks and light reputation) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e08-forums-and-spaces.md.

CONTEXT
- Already merged: S1-E3-03, S1-E5-05 (profile with the rank chip placeholder).
- Platform: web only for now.
- Decisions that apply (canvas comment, 17 Oct 2026): four ranks given automatically from published chapters and words, never post count: New writer (first chapter), Writer (5 chapters), Storyteller (15 chapters or 30,000 words), Novelist (100,000 words); recalculated whenever a chapter is published or removed; staff never hand out ranks; each rank has its own doodle sticker on the profile picture (pencil, quill and ink, open book with sparkles, crown). Ranks unlock nothing.
- Designs: the rank sticker and rank panel on design/boards/Profile.dc.html, the doodles on design/boards/Doodles.dc.html (files in design/assets/) and the small avatar and rank chip next to names on design/boards/Thread.dc.html; renders under the same names in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B13 chapters and published word counts, B16 chapter_published event. Nothing to mock.
- Watch-outs: stickers are SVG doodles, never emoji, hidden from screen readers and never over text or controls (widget doodles with a breakpoint rule); the rank name is real text next to them. The panel lists all four ranks, highlights the current one, fades the ones not reached and shows progress to the next. Reputation weighting is deferred.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: a rank function or column recalculated on publish and removal, RLS (public read through the profile view, no client writes) with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it, including every threshold edge.
4. i18n keys (ro and en) for rank names and progress, analytics events and moderation hooks.
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E8-09: Ranks and light reputation". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer and kid_14_ok publishing and removing chapters; the PR description from .github/pull_request_template.md.
```

### S1-E8-10 Forum search
Must · M · After March · Depends on: S1-E8-02

```text
We are working on story S1-E8-10 (Forum search) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e08-forums-and-spaces.md.

CONTEXT
- Already merged: S1-E8-02, and S1-E8-06 if spaces exist (the space filter needs them; check with Robert).
- Platform: web only for now.
- Decisions that apply: Postgres full-text search with the romanian and english configurations and unaccent, no outside search service (architecture 1.5); removed posts and blocked users never appear; space visibility rules (under-16 and 16+ spaces, 34p) apply to results exactly as to browsing.
- Designs: the forum search on design/boards/Forums.dc.html with design/renders/desktop/Forums.jpg and design/renders/phone/Forums.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B18 search_posts(), B23, B21. Nothing to mock.
- Watch-outs: results include threads and posts, filterable by space and author, with Romanian stemming and diacritic-insensitive matching. Authors are filtered by handle, never the user ID. Don't log search terms (CLAUDE.md rule 12). No legal notes beyond the global checklist.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: search columns, indexes, search_posts() signature, RLS (results go through the same policies as reading) with allowed and denied pgTAP tests for removed posts, blocks and an under-16 space seen by an adult.
3. A table mapping each acceptance criterion to the test that proves it.
4. i18n keys (ro and en), analytics events (no search terms) and moderation hooks.
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E8-10: Forum search". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using adult_writer, kid_14_ok, blocker and blocked; the PR description from .github/pull_request_template.md.
```

### S1-E8-11a Private class spaces: private visibility and invite codes
Should · L, split (11a) · After March · Depends on: S1-E8-06, S1-E8-07, S1-E2-08, S1-E2-03, S1-E2-11, S1-E11-01

```text
We are working on story S1-E8-11a (Private class spaces: private visibility and invite codes) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and S1-E8-11 in docs/stories/s1-e08-forums-and-spaces.md. The story says to split it: 11a is private visibility and invite codes; 11b is the Class space option and teacher tools. Which acceptance criteria fall in 11a is my reading (check with Robert): the private-class criterion, invite code and link, students joining once fully active, class-only stories and the mixed-age rule.

CONTEXT
- Already merged: S1-E8-06, S1-E8-07, S1-E2-08, S1-E2-03, S1-E2-11 (Teacher badge), S1-E11-01.
- Platform: web only for now.
- Decisions that apply: class spaces are by invitation, follow the people in the room, mix ages and are never split at 16 (17 Oct 2026); a private class space never appears in search, discovery or public lists, and its posts and stories can't be opened by non-members; a student sees and posts only once fully active (age check passed and, for under-16s, parental consent); a story shared with the class stays members-only until the student makes it public, and a teacher can never do that for them; reports from inside go to the normal queue; DSA Art 28 protections apply inside.
- Designs: design/boards/ClassSpace.dc.html (5.4) with design/renders/desktop/ClassSpace.jpg and design/renders/phone/ClassSpace.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B24 class space fields and space_invites, B23, B02 is_active_member(). Persona teacher.
- Watch-outs: the teacher can reset the invite code and link at any time and sets how long they work. Teachers can never message under-16 students (S1-E9-03). The school's data role and the protocol need a Romanian lawyer before the pilot (L11): don't decide anything about it.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: the private class flag, space_invites with expiry and reset, the join function, class-only story visibility, RLS with an allowed and a denied pgTAP test each (non-member, kid_14_waiting, member, platform moderator).
3. A table mapping each 11a acceptance criterion to its test.
4. i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point as a question, including my split of the criteria.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E8-11a: Private class spaces: private visibility and invite codes". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using teacher, kid_14_ok, kid_14_waiting, teen_17 and adult_writer (as an outsider); the PR description from .github/pull_request_template.md.
```

### S1-E8-11b Private class spaces: Class space option and teacher tools
Should · L, split (11b) · After March · Depends on: S1-E8-11a, S1-E8-07, S1-E2-11, S1-E11-01

```text
We are working on story S1-E8-11b (Private class spaces: Class space option and teacher tools) only. Read CLAUDE.md, docs/architecture.md (1.8 for the admin site), docs/definition-of-done.md and S1-E8-11 in docs/stories/s1-e08-forums-and-spaces.md. Which criteria fall in 11b is my reading (check with Robert): the Teacher badge on the profile, the "What kind of space?" question, teacher moderation, archiving at the end of the year, no ads and the staff pilot mode.

CONTEXT
- Already merged: S1-E8-11a, S1-E8-07, S1-E2-11, S1-E11-01.
- Platform: web only for now.
- Decisions that apply: only accounts with a Teacher badge see the Class space option; every other account gets no "What kind of space?" question and only makes open spaces (canvas comments, 16 Oct 2026); a class space locks at the end of the academic year or when the teacher closes it: nobody posts, reacts, joins or is invited, and members keep read access while their account exists (Q69); never any banners, ads, sponsored items or sponsor credits inside (Q70); teacher actions are logged (S1-E8-07) and platform moderators can act in any class space; staff sign in with Google Workspace and admin screens use plain components.
- Designs: the Class space option on design/boards/Space.dc.html, design/boards/ClassSpace.dc.html (5.4) and the staff side on design/boards/AdminSchools.dc.html (8.9), with renders under the same names in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B24, B23, B27 admin functions, B03 audit log. Persona teacher.
- Watch-outs: the class space page explains the three steps to start one. Manual pilot mode: staff approve the teacher from the Teacher checks queue (S1-E2-11), create the space, name the teacher as owner and print the invite code. Keeping posts readable for life needs a line in the privacy notice and the school protocol, both for the lawyer (L11): flag it in the PR, don't write legal text. Tell me how "end of the academic year" is set (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: the archived state and its lock, admin_* functions for pilot mode, RLS with an allowed and a denied pgTAP test each (badge vs no badge, locked space writes refused, members still read, ad slots never rendered).
3. A table mapping each 11b acceptance criterion to its test.
4. i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point as a question.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E8-11b: Private class spaces: Class space option and teacher tools". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using teacher, adult_writer (no badge), kid_14_ok, the admin staff persona and the moderator persona; the PR description from .github/pull_request_template.md.
```

### S1-E8-12 Writing certificates
Could · M · After March · Depends on: S1-E8-11, S1-E11-01, S1-E12-02

```text
We are working on story S1-E8-12 (Writing certificates) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e08-forums-and-spaces.md.

CONTEXT
- Already merged: S1-E8-11a, S1-E8-11b, S1-E11-01, S1-E12-02.
- Platform: web only for now.
- Decisions that apply: certificates are co-signed by Ghemotoc and the teacher leading the contest or class (Q23, Q71); no county contest calendars and no inspectorate involvement until autumn 2027 (Q67); partner or school logos only with their written permission; the PDF has real, tagged text, not an image.
- Designs: design/boards/Certificate-Winner.dc.html and design/boards/Certificate-Participation.dc.html (desktop renders only), "My certificates" on design/boards/Settings.dc.html and the staff side on design/boards/AdminContests.dc.html and design/boards/AdminSchools.dc.html; renders under the same names. Match the screens at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B24 certificates and the certificate-pdf function, B27, B03. Mocked: the PDF is a stub until this story makes it real (architecture 1.7.3).
- Watch-outs: the printed name is asked only when a student requests a certificate, stored only on the certificate record and never on the profile (GDPR Art 5(1)(c)). CLAUDE.md rule 5 says "store no legal names": stop and ask me how to square the two (check with Robert). The public verification page shows only valid or revoked, the contest or programme, the result and the date, never the name; deleting an account deletes its certificates and the code shows "no longer available". Stop and ask me about each OPEN point: the PDF tool (34f; pdf-lib is a recommendation, not a decision), how the teacher's signature is captured (34q) and ROFUIP art. 178(2) for our own app in a school partnership.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: certificates (not-null user_id, unique code, printed name, status), the verify view without names, revoke and delete paths, RLS with an allowed and a denied pgTAP test each.
3. A table mapping each acceptance criterion to the test that proves it, including the tagged-PDF check.
4. i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point as a question, plus the privacy notice and retention changes.

STEP 2, after I approve: build it, run every check in CLAUDE.md, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E8-12: Writing certificates". Then give me: a summary; the check results; step-by-step manual test steps for a non-developer using teacher, kid_14_ok, the admin staff persona and a signed-out window for the verification page; the PR description from .github/pull_request_template.md.
```

## S1-E9 Private messages

### S1-E9-01 One-to-one private messages
Must · L · After March · Depends on: S1-E5-05, S1-E9-03

```text
We are working on story S1-E9-01 (One-to-one private messages) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e09-private-messages.md.

CONTEXT
- Already merged: S1-E5-05 (writer profile and the blocks table), S1-E9-03 (can_message() and the "Let adults message me" setting).
- Decisions that apply: private messages are in Stage 1 with block and report built in. Under-16s and adults can never message each other, teachers included; 16 and 17-year-olds choose whether adults can message them, off by default (Q6, Q13). Adults never learn anyone's age: they only ever see "<name> isn't taking messages right now" (canvas comment, 17 Oct 2026). No special limit on new chats for new accounts (Q61). Messages are not end-to-end encrypted, so reported ones can be reviewed. Platform: web.
- Designs: design/boards/Messages.dc.html (design/renders/desktop/Messages.jpg, design/renders/phone/Messages.jpg) for the chat list, the conversation, Message requests and the neutral note; the Message button on design/boards/Profile.dc.html (design/renders/desktop/Profile.jpg, design/renders/phone/Profile.jpg). Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). Messages is not a public page, so it has no ad slot (S1-E12-01).
- Back-end pieces: B25 (conversations, conversation_members, messages, message_requests, can_message(a, b)) and Realtime, both real locally; B21 blocks; B02 is_active_member() gates sending. Nothing to mock.
- Watch-outs: RLS lets only the two members read a message, and moderators only messages attached to a report (architecture 1.6). Register messages as reportable (rule 6); the in-chat Report and Block actions are S1-E9-02. If S1-E13-02 is merged, add messages to the data export. The privacy notice must say staff read messages only when reported or required by law: check content/legal/02-privacy-notice.md and tell me if it doesn't.
- OPEN: images in messages (proposal: off). Stop and ask me. The general spam limits of S1-E10-12 apply: if S1-E10-12 isn't merged, stop and ask me what to do meanwhile.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, including a non-member, a staff member without a report and a blocked person.
3. A table mapping each acceptance criterion to the test(s) that prove it, including the "Message requests" rule (no second message until accepted).
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E9-01: One-to-one private messages". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using adult_writer, teen_17, kid_14_ok, blocker and blocked (a first message to someone who doesn't follow you, accepting it, adult_writer trying to message kid_14_ok); and the pull request description from .github/pull_request_template.md.
```

### S1-E9-02 Block and report inside messages
Must · S · After March · Depends on: S1-E9-01, S1-E10-01

```text
We are working on story S1-E9-02 (Block and report inside messages) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e09-private-messages.md.

CONTEXT
- Already merged: S1-E9-01 (conversations), S1-E10-01 (report button and the one report form).
- Decisions that apply: anyone can block someone from their profile or from a conversation. A block means neither person can message, mention or follow the other, and the blocked person is not told. A reported message carries that message and up to the 20 previous messages as context (canvas 5.5). There is one report form for every report (S1-E10-01), with the same reasons list. Platform: web.
- Designs: design/boards/Messages.dc.html ("Report this message", "Block <name>?" and "Reporting, blocking and limits"; renders design/renders/desktop/Messages.jpg and design/renders/phone/Messages.jpg). Keep the block confirmation consistent with design/boards/Profile.dc.html. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). No doodles on reporting screens (Definition of Done).
- Back-end pieces: B25 messages, B04 report_item(), B21 blocks, B26 cases (moderators see only the reported messages). All real locally; nothing to mock.
- Watch-outs: Apple guideline 1.2 and Google Play's user-content policy require blocking and reporting. Staff see private messages only when they are part of a report (S1-E11-02), so the context window must be the only part of the conversation a moderator can read. Reported messages are kept until the report is closed and then for the retention period (S1-E9-04). Reporting stays allowed for read-only accounts (S1-E10-01).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: any new columns, functions or RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each: a moderator can read the reported message and its context but not the rest of the conversation; a blocked person can't message, mention or follow.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E9-02: Block and report inside messages". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using blocker, blocked, adult_writer and moderator (block from a chat, check the blocked person sees nothing about it, report a message, open the case as moderator); and the pull request description from .github/pull_request_template.md.
```

### S1-E9-03 Adult and minor messaging rules
Must · M · After March · Depends on: S1-E2-02, S1-E2-08

```text
We are working on story S1-E9-03 (Adult and minor messaging rules) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e09-private-messages.md.

CONTEXT
- Already merged: S1-E2-02 (year of birth), S1-E2-08 (Yoti age check and age_band()).
- Order: S1-E9-01 depends on this story, so this one comes first. It builds can_message(a, b), the "Let adults message me" setting and the neutral note; the conversation screens come in S1-E9-01. Where a criterion needs a conversation (Message button hidden, the API refuses, a message request), prove it through can_message() and the profile's "can message" flag, and list the end-to-end tests as follow-ups for S1-E9-01 (check with Robert).
- Decisions that apply (Q6, Q13, 16 Oct 2026): under-16s and adults (teachers included) can never message each other, in either direction, and no setting changes that. For 16 and 17-year-olds "Let adults message me" is off at account creation and only the teen can switch it, never a parent, staff or the adult. Under-18 to under-18 follows the normal rules. Adults see only "<name> isn't taking messages right now", the same note as when someone has turned messages off; no screen, error or API response reveals an age or age band (canvas comment, 17 Oct 2026). age_band() uses the younger possible age. Platform: web.
- Designs: design/boards/Settings.dc.html (Messages tab, "Let adults message me"), design/boards/Messages.dc.html (the neutral note) and design/boards/Profile.dc.html, with their renders in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B25 can_message(), B02 age_band(), B17 the nightly age-rules job. All real; tests call the job's SQL function directly.
- Watch-outs: the refusal for an age rule and for "messages off" must be identical, so nothing leaks. When someone turns 18 by year of birth and holds an "18 or over" result, existing conversations continue and the new rules apply to new ones. DSA Art 28 and the DPIA for minors apply.
- OPEN: whether teachers' posts in class threads count. Stop and ask me before touching class spaces.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: columns, functions and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, and a pgTAP test for every age pairing in both directions (adult, teacher, 16 to 17 with the switch off and on, 13 to 15).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events (none that reveal age) and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E9-03: Adult and minor messaging rules". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using adult_writer, teacher, teen_17 and kid_14_ok (teen_17 turning the switch on and off, adult_writer seeing only the neutral note, kid_14_ok blocked both ways); and the pull request description from .github/pull_request_template.md.
```

### S1-E9-04 Message settings and retention
Should · S · After March · Depends on: S1-E9-01

```text
We are working on story S1-E9-04 (Message settings and retention) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e09-private-messages.md.

CONTEXT
- Already merged: S1-E9-01 (conversations); S1-E9-03 for "Let adults message me".
- Decisions that apply: 16 and 17-year-olds also see "Let adults message me", off by default (S1-E9-03, Q13). Under-16s and adults never message each other. Platform: web.
- Designs: design/boards/Settings.dc.html, Messages tab ("Who can message you", "Let adults message me", "How long messages stay"; renders design/renders/desktop/Settings.jpg and design/renders/phone/Settings.jpg). Copy the wording from the board. Match it at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B25 (conversation members, per-person delete), B17 pg_cron clean-up job, the retention schedule in docs/retention.md (S1-E13-04). All real; tests call the job function directly.
- Watch-outs: choices are everyone, people I follow or nobody. The under-18 default "people I follow" is a proposal in the story (architecture 1.10 lists it as the under-18 default): confirm with me before you seed it. When both people delete a conversation, the clean-up job deletes the messages for good. Reported messages are kept until the case closes, then for the period in the retention schedule, then deleted. If docs/retention.md doesn't give a period for reported messages, stop and ask me. GDPR Art 5(1)(e) storage limitation.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: columns, the clean-up function and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, and tests that the job deletes only conversations both people deleted and never a message under an open case.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E9-04: Message settings and retention". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using adult_writer, teen_17 and kid_14_ok (change who can message you, delete a chat on both sides, run the clean-up); and the pull request description from .github/pull_request_template.md.
```

## S1-E10 Reporting, moderation and safety

### S1-E10-01 Report button on everything
Must · M · March MVP (wave 3) · Depends on: S1-E1-02

```text
We are working on story S1-E10-01 (Report button on everything) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e10-reporting-moderation-and-safety.md.

CONTEXT
- Already merged: S1-E1-02 (the reportable_type enum and the database baseline).
- Decisions that apply: our own team moderates in English and Romanian, acting on reports; no automated text screening (Q42, Q43). Reporting is the one action a read-only account can always do (architecture 1.7.8). There is one report form for every report: the in-app Report action opens the same form as the web form (S1-E10-02), with the item filled in. Reports are kept 3 years after the report is closed, then deleted (canvas comment, 17 Oct 2026). The interface opens in Romanian. Platform: web.
- Designs: design/boards/ReportDialog.dc.html (design/renders/desktop/ReportDialog.jpg, design/renders/phone/ReportDialog.jpg). Match it at 390, 768 and 1440 px (CLAUDE.md rule 21). No doodles on reporting screens (Definition of Done).
- Back-end pieces: B04 (reportable_type, reports, report_item()), real; B02 account gate (reporting is allowed for every signed-in state). Nothing to mock.
- Watch-outs: the reasons are exactly the story's list: illegal content, harassment, self-harm, sexual content involving a minor, terrorism, hate, spam, copyright, "copied from a published work", undisclosed AI and other. The extra source fields for "copied from a published work" are S1-E10-08. S1-E10-02 (the public web form) comes later in the March order: build the report form as one shared component that S1-E10-02 reuses. Put the Report action on every user-content type that exists today as one shared component, so later types (comments, posts, spaces, messages) reuse it. CI must fail when a new user-content table isn't registered (rule 6). Keyboard and screen reader access are acceptance criteria. Don't log report text or emails (rule 12). DSA Art 16 (confirmation of receipt); Apple 1.2 and Google Play user-content policy.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, including a read-only account that can report and a reporter who can't read other people's reports.
3. A table mapping each acceptance criterion to the test(s) that prove it, including the CI registration check.
4. New i18n keys (ro and en), analytics events (no personal data) and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E10-01: Report button on everything". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using adult_writer, kid_14_waiting and pending_check (report a chapter and a profile by keyboard only, see the confirmation); and the pull request description from .github/pull_request_template.md.
```

### S1-E10-02 One web form for all reports, including authority removal orders
Must · M · March MVP (wave 3) · Depends on: S1-E10-03, S1-E14-02

```text
We are working on story S1-E10-02 (One web form for all reports, including authority removal orders) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e10-reporting-moderation-and-safety.md.

CONTEXT
- Already merged: S1-E14-02 (contact points), S1-E10-03a (the queue, where the tier-1 case opens), S1-E10-01 (the shared report form this page reuses).
- Decisions that apply: one web form takes every report and is our TCO contact point (16 Oct 2026, 22:59), in English and Romanian, no account needed. Authority orders arrive here, never through user reports. One-hour removal is mandatory (Regulation (EU) 2021/784, art. 3(3)) and the on-call founder is alerted. A reporter's name, email and report are kept 3 years after the report is closed, then deleted (17 Oct 2026). Platform: web.
- Designs: design/boards/NoticeForm.dc.html (design/renders/desktop/NoticeForm.jpg, design/renders/phone/NoticeForm.jpg), including "Report received". Match it at 390, 768 and 1440 px (CLAUDE.md rule 21). No doodles. The country contacts in "Is someone in danger right now?" are S1-E10-13: ask me what that block shows until it lands.
- Back-end pieces: a `public-notice` edge function (bot check, rate limit), B26 (cases, authority_orders), B09 email. Mock: Mailpit for every email; the on-call phone alert is the B26 stub that only logs until S1-E10-09.
- Watch-outs: an illegal-content notice requires the exact URL, why it is illegal, the notifier's name and email (optional for child sexual abuse reports) and a good-faith statement. The page says plainly it is our contact point for authorities and removal orders under Regulation (EU) 2021/784 and that we accept English and Romanian. An order opens a tier-1 case, starts the one-hour clock and the authority gets an acknowledgement with the time of receipt. Every notifier gets an acknowledgement email and later the decision. The bot check is accessible (no puzzle only) and never blocks an authority's order. If the rate limit uses IP addresses, they are scrambled and kept 30 days (Q48); never log emails or IPs (rule 12). Lawyer's list: which Romanian authority issues orders and whether a web form alone is enough.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each; anonymous visitors insert only through the function.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E10-02: One web form for all reports, including authority removal orders". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer: a signed-out visitor sending a notice and an authority order, adult_writer reporting while signed in, the owner persona finding the tier-1 case and the logged alert, and the emails in Mailpit; and the pull request description from .github/pull_request_template.md.
```

### S1-E10-03a Moderation queue with priority tiers (part a: one queue, tiers, deadlines and a decision with a note)
Must · L, split (03a is M) · March MVP (wave 3) · Depends on: S1-E10-01, S1-E2-07, S1-E11-01 (the /staff shell)

```text
We are working on story S1-E10-03a (Moderation queue with priority tiers) only: part a, one queue with tiers, deadlines and a decision with a note. Grouping, claiming and visible timers are part b, after March. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story S1-E10-03 in docs/stories/s1-e10-reporting-moderation-and-safety.md.

CONTEXT
- Already merged: S1-E10-01 (reports), S1-E2-07 (staff roles and is_staff_session()), S1-E11-01 (the /staff shell and the audit log; architecture 1.7.7).
- Decisions that apply: every case comes from a report, an authority order or a flagged picture; there is no automated text screening (Q42, Q43). In-house moderators, English and Romanian. Tiers: authority removal order 1 hour (the legal rule); child abuse material, a threat to a minor or self-harm risk the same day; other illegal content 48 hours; everything else 7 days. Apart from the one-hour rule these are proposals (canvas 8.7, Q62), so keep them changeable without a release (architecture 1.1, principle 12). Platform: web (staff).
- Designs: design/boards/Moderation.dc.html ("Report queue", "Open cases", "Decision") and the decision panel in design/boards/ModCase.dc.html, with renders in design/renders/desktop/ and design/renders/phone/. Plain components, no doodles. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B26 (cases, case_actions, the queue view with tier and deadline), B16, B27 admin_* functions writing B03 audit_log. Mock: 20 seeded cases across the tiers (architecture 1.7.4).
- Watch-outs: roles from architecture 1.8.3: owner, admin and moderator act; support and content editor see nothing, refused by the server. A decision needs an action (no action, remove, restrict, warn, suspend, ban) and a written note. The statement of reasons (S1-E10-04), sanctions (S1-E10-06) and safeguarding-only visibility (S1-E10-10) come next: leave clean hooks, don't build them. DSA Art 16(6) (paragraph to verify).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each staff role.
3. A table mapping each acceptance criterion in part a to the test(s) that prove it, and the criteria you are leaving for 03b.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E10-03a: Moderation queue with priority tiers". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using adult_writer (files a report), moderator (sorts the queue, decides with a note), and support and editor (both refused); and the pull request description from .github/pull_request_template.md.
```

### S1-E10-03b Moderation queue with priority tiers (part b: grouping, claiming and visible timers)
Must · L, split (03b is about 18 hours) · After March · Depends on: S1-E10-03a

```text
We are working on story S1-E10-03b (Moderation queue with priority tiers) only: part b, grouping several reports into one case, claiming a case and visible SLA timers. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story S1-E10-03 in docs/stories/s1-e10-reporting-moderation-and-safety.md.

CONTEXT
- Already merged: S1-E10-03a (one queue with tiers, deadlines and decisions).
- Decisions that apply: in-house moderators acting on reports (Q42, Q43). The tier deadlines are those from 03a (1 hour for authority orders by law; same day, 48 hours and 7 days as proposals). Platform: web (staff).
- Designs: design/boards/Moderation.dc.html and design/boards/ModCase.dc.html (renders in design/renders/desktop/ and design/renders/phone/), for the grouped report count, the "claimed by" state and the timer. Plain components, no doodles. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B26 (cases, case_actions, the queue view), B27 admin_* functions with B03 audit log. Real; extend the 03a seed so one item has several reports.
- Watch-outs: several reports on one item join one case and every reporter still gets their own confirmation and outcome (S1-E10-01, S1-E10-04). When a moderator claims a case, others see it is claimed; two people claiming at once must not both win. The timer shows time left against the tier deadline and must be readable by screen readers, not colour alone (WCAG 2.2 AA). Claiming and unclaiming go in the audit log. Roles stay as in architecture 1.8.3.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: columns, functions and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, plus a test for two claims at the same time.
3. A table mapping each 03b acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E10-03b: Moderation queue with priority tiers (grouping, claiming and timers)". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using adult_writer and teen_17 (both report the same chapter), moderator (claims the case) and admin (sees it claimed); and the pull request description from .github/pull_request_template.md.
```

### S1-E10-04 Statements of reasons
Must · M · March MVP (wave 3) · Depends on: S1-E10-03, S1-E7-01

```text
We are working on story S1-E10-04 (Statements of reasons) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e10-reporting-moderation-and-safety.md.

CONTEXT
- Already merged: S1-E10-03a (queue and decisions), S1-E7-01 (in-app notifications, where moderation decisions can't be switched off). Decisions from S1-E10-05, S1-E10-06, S1-E10-08 and S1-E10-09 were built earlier with a hook for this story: wire each of them to a statement.
- Decisions that apply: decisions are made by in-house moderators, not automated tools (Q42, Q43); the only automated step is the picture check, which only holds. The interface opens in Romanian; statements go out in the user's language. Platform: web.
- Designs: design/boards/MyReports.dc.html (6.5), the "What <user> will receive" panel and the "Will he know it was me?" note in design/boards/ModCase.dc.html (8.3), and design/boards/Notifications.dc.html (moderation decisions can't be switched off), with renders in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Content: the draft wording in content/legal/06-notice-action-and-appeals.md (section 4) and rule names from content/legal/03-community-guidelines.md. Both are drafts a lawyer reviews; load them as content, never hard-code.
- Back-end pieces: B26 statements_of_reasons, B22 notifications, B09 email for notifiers who used the public form. Mock: Mailpit.
- Watch-outs: every removal, restriction, suspension or ban sends a statement with the action, the facts, whether automated means were used, the rule or law relied on and how to appeal. Appeals (S1-E10-07) come after March: ask me what "how to appeal" links to until then. The notifier is told the outcome. A copy is stored with the case. A statement never identifies the reporter. DSA Art 17 and Art 16(5).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each: the affected user reads their own statements only, staff read them with the case.
3. A table mapping each acceptance criterion to the test(s) that prove it, in both languages.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E10-04: Statements of reasons". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using teen_17 (reports a comment or chapter), adult_writer (whose content is removed) and moderator, plus a signed-out notifier's email in Mailpit; and the pull request description from .github/pull_request_template.md.
```

### S1-E10-05 Picture check on upload
Must · M · March MVP (wave 3) · Depends on: S1-E10-03, S1-E10-10 (safeguarding steps for an Arachnid Shield match)

```text
We are working on story S1-E10-05 (Picture check on upload) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e10-reporting-moderation-and-safety.md.

CONTEXT
- Already merged: S1-E10-03a (queue), S1-E10-10 (safeguarding). Earlier upload stories (S1-E3-01 covers, S1-E5-05 avatars) ran on IMAGE_CHECK=stub: wire every upload that exists today to the real function.
- Decisions that apply (16 Oct 2026, 22:59; Q18, Q42, Q43): picture uploads are on from launch. Every uploaded picture is checked before anyone else sees it by Sightengine (nudity, gore) and Arachnid Shield (hash matching against known child abuse images). A flagged picture is held for an in-house moderator; the tools only hold, never approve or remove. S1-E10-04 (statements of reasons) comes later in the March order: leave a hook for the statement a removal sends. No automated check on text. Teachers' proof files are excluded (staff only). Platform: web.
- Designs: "What the picture check held today" on design/boards/Moderation.dc.html (design/renders/desktop/Moderation.jpg, design/renders/phone/Moderation.jpg); the "Picture being checked" placeholder follows the story's wording. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B15 (`image-check` edge function, picture_checks, the held state, a case for flagged pictures), B14 buckets including the private `evidence` bucket. Mock locally: IMAGE_CHECK=stub (file names ending _fail are flagged); before Done the vendors' test keys run on staging, and docs/mocks.md is updated. Vendor keys live only in Edge Function secrets.
- Watch-outs: an Arachnid Shield match opens a tier-2 (same day) case, keeps the file in the evidence bucket and follows the safeguarding steps of S1-E10-10 (merged): tag the case so only safeguarding staff see it. If a service is down, the picture stays private until the check runs and the writer can still save and publish the text. Both vendors are new processors: update the privacy notice (content/legal/02-privacy-notice.md), the record of processing and the processor list in this PR (Definition of Done). Arachnid Shield's eligibility and where Sightengine processes images are "check before relying on it"; what to do with a confirmed match is on the lawyer's list. Strip EXIF on upload (architecture 1.9).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, storage policies and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each: nobody but the uploader and moderators sees a held picture.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E10-05: Picture check on upload". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using adult_writer (uploads a normal cover and one named cover_fail.jpg), kid_14_ok (sees "Picture being checked") and moderator (decides on the held picture); and the pull request description from .github/pull_request_template.md.
```

### S1-E10-06 Sanctions and repeat offenders
Must · M · March MVP (wave 3) · Depends on: S1-E10-03

```text
We are working on story S1-E10-06 (Sanctions and repeat offenders) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e10-reporting-moderation-and-safety.md.

CONTEXT
- Already merged: S1-E10-03a (queue and decisions with warn, suspend and ban actions).
- Decisions that apply: in-house moderation acting on reports (Q42, Q43). Reporting is otherwise always allowed, even for read-only accounts (S1-E10-01); the pause for repeatedly unfounded reporters (Q83) is the one exception. Platform: web.
- Designs: "The account" and "Sanction ladder" in design/boards/ModCase.dc.html (design/renders/desktop/ModCase.jpg, design/renders/phone/ModCase.jpg). Plain components, no doodles. Match it at 390, 768 and 1440 px (CLAUDE.md rule 21). The Users screen (S1-E11-02) reuses these actions later.
- Back-end pieces: B26 sanctions; B02 account gate: this story fills in the suspension and ban part of is_active_member() (architecture 1.7.3); B27 admin_* functions with the B03 audit log. Real; seed personas suspended_user and banned_user.
- Watch-outs: a suspended user can sign in, read and download their data but can't post, comment or message until the suspension ends, enforced in RLS, not only in the interface. Sign-up with a banned email address is refused: plan how the banned address is stored with the least data possible (never in logs, rule 12) and show me before building (check with Robert). The story doesn't set suspension lengths or how long a reporting pause lasts: ask me. Sanctions trigger a statement of reasons (S1-E10-04, later in the March order: leave a hook it can use). DSA Art 23 as good practice.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, including every write policy refusing a suspended user while reading and data download still work.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E10-06: Sanctions and repeat offenders". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using moderator, suspended_user (reads but can't comment), banned_user (sign-up again refused) and adult_writer (reporting paused); and the pull request description from .github/pull_request_template.md.
```

### S1-E10-07 Appeals
Should · M · After March · Depends on: S1-E10-04

```text
We are working on story S1-E10-07 (Appeals) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e10-reporting-moderation-and-safety.md.

CONTEXT
- Already merged: S1-E10-04 (statements of reasons).
- Decisions that apply: in-house moderation (Q42, Q43). A user can appeal within six months of a statement of reasons. A different moderator decides where possible: in architecture 1.8.3 a moderator can act on appeals but not on their own decisions. Platform: web.
- Designs: design/boards/Appeals.dc.html (8.4, the appeals part: "Appeal", "Statement of reasons they received", "Why they say it's wrong", "Your decision", "Outcome sent") and design/boards/MyReports.dc.html (6.5, "Tell us why the decision is wrong"), with renders in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Content: the draft appeals wording in content/legal/06-notice-action-and-appeals.md (section 5); a draft a lawyer reviews.
- Back-end pieces: B26 appeals, B22 notifications, B27 admin_* functions with the B03 audit log. Mock: one seeded closed case (architecture 1.7.4).
- Watch-outs: the "Appeal" button shows only within six months. MyReports shows an example where a hidden post was put back after an appeal: confirm with me what an upheld appeal changes automatically (check with Robert). Appeal text is user content: it is sanitised and never logged (rules 8 and 12). DSA Art 20 applies only above micro and small size; building it now prepares for growth and app store review.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, including a moderator refused on an appeal against their own decision and an appeal after six months refused.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E10-07: Appeals". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using adult_writer (appeals a removal), moderator (who made the decision, refused) and admin (decides the appeal); and the pull request description from .github/pull_request_template.md.
```

### S1-E10-08 "Copied from a published work" report
Must · M · March MVP (wave 3) · Depends on: S1-E10-01, S1-E10-03

```text
We are working on story S1-E10-08 ("Copied from a published work" report) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e10-reporting-moderation-and-safety.md.

CONTEXT
- Already merged: S1-E10-01 (report form and reasons), S1-E10-03a (queue and decisions).
- Decisions that apply: uploads are not plagiarism-scanned; scanning applies only to works the imprint acquires (Stage 5). The source fields (title, author, ISBN or URL, matching passage) are all optional, the passage the reader selected is attached automatically and the box says even just a title helps (canvas comment, 16 Oct 2026). Before a copy is confirmed nothing public changes. Platform: web.
- Designs: design/boards/ReportDialog.dc.html (6.4) for the reason and its fields, design/boards/ModCase.dc.html (8.3) for the side-by-side view, with renders in design/renders/desktop/ and design/renders/phone/. No doodles on reporting or staff screens. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B04 report_item() (extra fields for this reason), B26 cases and case_actions, B27 admin_* functions with the B03 audit log. Real; seed one case with a passage and a pasted source.
- Watch-outs: the story doesn't say how a moderator asks the reporter for more details (in-app notification for signed-in reporters, email for the public form?): stop and ask me. The wording of the public note on a confirmed copy isn't written anywhere: ask me for it. A removal sends a statement of reasons (S1-E10-04, later in the March order: leave a hook it can use). No similarity percentage is a safe harbour and even short extracts can infringe (Infopaq), so never show a score. The pasted source passage is reporter content: sanitise it (rule 8).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: columns, functions and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each.
3. A table mapping each acceptance criterion to the test(s) that prove it, including "nothing public changes before confirmation".
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E10-08: \"Copied from a published work\" report". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using adult_writer (selects a passage and reports it with only a title), teen_17 (the writer, who sees nothing until a decision) and moderator (compares side by side and confirms); and the pull request description from .github/pull_request_template.md.
```

### S1-E10-09 Terrorist content removal orders
Must · M · March MVP (wave 3) · Depends on: S1-E10-03, S1-E14-02

```text
We are working on story S1-E10-09 (Terrorist content removal orders) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e10-reporting-moderation-and-safety.md.

CONTEXT
- Already merged: S1-E10-03a (queue), S1-E14-02 (contact points); S1-E10-02 for the form's authority path.
- Decisions that apply (16 Oct 2026, late evening, Q44): one-hour removal is mandatory (Regulation (EU) 2021/784, art. 3(3)); the founding team rotates on call; orders arrive at our published contact point (the report form's authority path) or are logged by staff from the contact page's email address, never through user reports. A provider's first order comes with 12 hours' notice (art. 3(2), to verify). Platform: web (staff).
- Designs: the order view and "Emergency disable" in design/boards/Appeals.dc.html (8.4) and "On call" in design/boards/Moderation.dc.html, with renders in design/renders/desktop/ and design/renders/phone/. Plain components, no doodles. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B26 (authority_orders, emergency_disable(), the on-call alert), `on_call_rota`, B27 admin_* functions with the B03 audit log. Mock: the phone alert is a stub that only logs. A real phone alert needs a provider nobody has chosen, which would be a new processor: stop and ask me before picking one.
- Watch-outs: proposals in the story: the alert within five minutes, exactly one founding-team member on call with the on-call permission, and the rest of the founding team alerted if nobody acknowledges within 15 minutes. "Emergency disable" makes the content unavailable everywhere in one action and asks for a fresh Google sign-in (architecture 1.8.3, proposal). The content and related data are preserved for six months (canvas 8.4) and every timestamp is logged as proof. The uploader is told when the order allows it (through S1-E10-04 and S1-E7-01, later in the March order: leave a hook). Only staff with the on-call permission act on orders (1.8.3). Which Romanian authority issues orders is on the lawyer's list.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, including staff without the on-call permission refused.
3. A table mapping each acceptance criterion to the test(s) that prove it, with timestamps checked end to end.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E10-09: Terrorist content removal orders". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using owner (on call, gets the logged alert and uses Emergency disable), admin (escalation after 15 minutes, simulated), moderator without the permission (refused) and adult_writer (the uploader, told when allowed); and the pull request description from .github/pull_request_template.md.
```

### S1-E10-10 Safeguarding escalation
Must · M · March MVP (wave 3) · Depends on: S1-E10-03

```text
We are working on story S1-E10-10 (Safeguarding escalation) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e10-reporting-moderation-and-safety.md.

CONTEXT
- Already merged: S1-E10-03a (queue and cases).
- Decisions that apply: in-house moderators acting on reports (Q42, Q43). Safeguarding is a permission an owner or admin ticks for trained staff only (architecture 1.8.3). Staff see a person's age group only, never the year of birth (1.8.3). The Romanian child helpline is 116 111, Monday to Friday 10:00 to 20:00 (research G4); Romania has no confirmed youth crisis line. Platform: web (staff).
- Designs: "Keep the young person safe" and "Evidence pack" in design/boards/ModCase.dc.html (design/renders/desktop/ModCase.jpg, design/renders/phone/ModCase.jpg). Plain components, no doodles. Match it at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Content: load helplines from content/safety-contacts.json as seed data, never hard-coded. The per-country block and its admin screen are S1-E10-13.
- Back-end pieces: B26 cases with a safeguarding tag, B14 the private `evidence` bucket, B27 admin_* functions with the B03 audit log. Real; seed one safeguarding case about kid_14_ok and one staff persona with the safeguarding permission (tell me which).
- Watch-outs: a case tagged self-harm, grooming or threat to a minor shows the checklist and support resources. Only staff with the safeguarding permission can see these cases, enforced in RLS. Escalating a credible threat produces an evidence pack (content, account data, timestamps) for police or prosecutors and logs the referral; opening an evidence pack is a logged sensitive read (S1-E11-01). The story doesn't define the pack's file format or what "account data" includes: stop and ask me. The written safeguarding process (risk table) is a document that must exist before launch, not code. DSA Art 18 and Law 50/2024 art 31 (to verify).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, storage policies and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each: a moderator without the permission can't see the case, its evidence or its existence in queue counts beyond what you propose.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events (none about the people in a case) and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E10-10: Safeguarding escalation". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using the staff persona with the safeguarding permission (opens the case, sees 116 111, builds an evidence pack), moderator without it (sees nothing) and kid_14_ok (the young person, who sees no change); and the pull request description from .github/pull_request_template.md.
```

### S1-E10-11 Moderator mail
Should · M · After March · Depends on: S1-E10-03

```text
We are working on story S1-E10-11 (Moderator mail) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e10-reporting-moderation-and-safety.md.

CONTEXT
- Already merged: S1-E10-03 (queue and cases).
- Decisions that apply: support tickets live inside the admin site with a ready-made external helpdesk behind them through its API (17 Oct 2026, S1-E11-13); the helpdesk product is OPEN (question 34t). The story's proposal is to use the same helpdesk as S1-E14-04, in its own queue. Platform: web.
- Designs: "Contact the moderators" and "Write to the moderation team about a report or a decision" in design/boards/MyReports.dc.html (6.5); the inbox, assignment and internal notes look like design/boards/AdminTickets.dc.html (8.13). Renders in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B26 and the moderator mail inbox (architecture 1.7.4, screen 8.3), B27 admin_* functions with the B03 audit log, B09 email.
- Watch-outs: a user's message goes to a shared inbox, never to one moderator. Staff can assign a thread, add internal notes (never sent) and reply as "The moderation team". Replies to minors stay in the thread, never by private message (S1-E11-13). Supports the DSA Art 12 contact point; the TCO contact point stays the web form (S1-E10-02).
- OPEN: which helpdesk, and whether this rides on S1-E11-13's tickets (a "Moderation" queue) or is its own inbox. Stop and ask me before planning tables.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each: a user reads only their own threads and never internal notes; support and content editors see no moderation mail.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E10-11: Moderator mail". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using teen_17 (writes to the moderators), moderator (assigns, adds a note, replies) and admin; and the pull request description from .github/pull_request_template.md.
```

### S1-E10-12 Spam and abuse rate limits
Must · M · After March · Depends on: S1-E2-01, S1-E11-03 (the limits screen; seeded defaults until then)

```text
We are working on story S1-E10-12 (Spam and abuse rate limits) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e10-reporting-moderation-and-safety.md.

CONTEXT
- Already merged: S1-E2-01 (sign-up), S1-E11-03 (the settings screen; until it exists the limits are seeded defaults).
- Decisions that apply: IP addresses are scrambled and kept 30 days (Q48). There is no extra limit on new chats for new accounts (Q61). For March, Supabase Auth's limits, the account gate and a fixed comment limit covered this (architecture 1.7.9, proposal): replace that fixed comment limit with the general limits here. Platform: web.
- Designs: "Rate limits" in design/boards/AdminSettings.dc.html (8.6) and the sign-up screen design/boards/Main.dc.html (2.1) for the challenge, with renders in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B12 (rate_limits, get_client_config()), B27 admin_* functions with the B03 audit log, B09 email for the challenge code. Mock: Mailpit.
- Watch-outs: an account under 24 hours old can put at most one link in a post and posts at a lower rate. The story gives no numbers for "lower rate": take the values on the AdminSettings board as seeded defaults and list them for me to confirm (check with Robert). The bot challenge is accessible and not a puzzle only; the canvas 8.6 proposal is a code sent by email, and the story doesn't say how bot-like behaviour is detected: stop and ask me. Every limit tells the user how long to wait. An admin's change applies within a minute and is logged. The privacy notice must mention rate limits and IP use (content/legal/02-privacy-notice.md). WCAG 2.2 criterion 3.3.8.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, functions and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, including the 24-hour boundary and staff-only changes.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E10-12: Spam and abuse rate limits". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using a new account you create during the test (two links refused, then the wait message), adult_writer (normal limits) and admin (changes a limit and sees it in the audit log); and the pull request description from .github/pull_request_template.md.
```

### S1-E10-13 Country-specific emergency and safety contacts
Must · M · March MVP (wave 3) · Depends on: S1-E2-10, S1-E10-02, S1-E11-13, S1-E11-01; back end: a `safety_contacts` table and a monthly scheduled job

```text
We are working on story S1-E10-13 (Country-specific emergency and safety contacts) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e10-reporting-moderation-and-safety.md.

CONTEXT
- Already merged: S1-E2-10 (country from the connection), S1-E10-02 (the report form), S1-E11-01 (admin shell). S1-E11-13 (support tickets) is after March, so there is nowhere for the monthly ticket to go; for March, Contact us messages go to support@ghemotoc.com. Settings › Safety contacts sits in the admin Settings area, whose screen (S1-E11-03) is also after March. Stop and ask me how the monthly check and the editing screen work for March (open question for Robert).
- Decisions that apply: contacts follow the account's country, taken from the connection at sign-up and never asked (Q20), and a support task checks them every month (canvas comment, 17 Oct 2026). Romania is the first and, at launch, only open market (17 Oct 2026, 11:48). Telefonul Copilului 116 111 runs Monday to Friday 10:00 to 20:00. Platform: web.
- Designs: the "Is someone in danger right now?" block in design/boards/NoticeForm.dc.html (7.3) and the safeguarding panel in design/boards/ModCase.dc.html, with renders in design/renders/desktop/ and design/renders/phone/. Settings › Safety contacts has no board: use the plain section style of design/boards/AdminSettings.dc.html. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Content: content/safety-contacts.json (research G4, checked 17 Oct 2026) is seed data only; never show a number from memory. Store the source link and check date with each contact.
- Back-end pieces: `safety_contacts` (country, kind, label, number, link, language, last checked, checked by), B11 country (header faked locally), B17 pg_cron monthly job, B03 audit log.
- Watch-outs: the story speaks of "every launch country" (8 in the research) while only Romania opens at launch: ask me which list "Not your country?" and the monthly job use. A country with no row shows "Call your local emergency number" plus "the international links we keep for that case": no such list exists yet, so ask me for it; the gap is logged for staff. Numbers are tappable phone links on phones and selectable text everywhere; official links open in a new tab with no tracking. The 45-day unconfirmed warning is a proposal. DSA art. 16 and 28.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each: everyone reads, only staff change, every change records who and when.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events (none on helpline links) and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E10-13: Country-specific emergency and safety contacts". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using adult_writer (Romania), a signed-out visitor with a faked country and one with no row, and admin (edits a contact, runs the monthly job by hand); and the pull request description from .github/pull_request_template.md.
```

## S1-E11 Admin site

### S1-E11-01 Admin shell with protected access
Must · M · March MVP (wave 3) · Depends on: S1-E2-07, S1-E1-02 (audit log)

```text
We are working on story S1-E11-01 (Admin shell with protected access) only. Read CLAUDE.md, docs/architecture.md (especially section 1.8), docs/definition-of-done.md and the story in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E2-07 (staff roles, Google Workspace sign-in, is_staff_session()), S1-E1-02 (append-only audit_log and log_staff_action()).
- Decisions that apply: staff sign in with Google Workspace only; Google's 2-Step Verification is the second factor, no separate code (17 Oct 2026, 11:53; Q30, 34n). Staff accounts are separate from any personal writer account. The admin site lives in the same React app under /staff, loaded as a separate chunk so its code never ships to readers (architecture 1.8.1). The server decides, not the menu. Platform: web (staff).
- Designs: the staff menu and page frame as drawn on the admin boards, for example design/boards/AdminUsers.dc.html and design/boards/AdminSettings.dc.html (with "Audit log" and "Recent changes"), renders in design/renders/desktop/ and design/renders/phone/. Plain components, no doodles. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B03 audit log, B10 staff roles and is_staff_session(), B27 the admin_* function pattern (role, permission, staff session, then the work and the audit entry in one transaction). Real; locally a test flag marks a seeded staff persona's session as Google Workspace (B10).
- Watch-outs: anyone without a staff role or a Google Workspace staff session is refused by the server on every admin route. The audit log stores who, what, when and before and after values, also for sensitive reads (revealing an email, opening a draft, an export file, an evidence pack or a teacher's proof). No role, the owner included, can change or delete an audit row; admins and the owner can search it and export CSV. The menu shows only what the role allows (1.8.2 and the 1.8.3 table). Proposals: sessions end after 12 hours; changing a role, starting an export for someone else, "Emergency disable" and removing part of a writer's text ask for a fresh Google sign-in. GDPR Art 32 and 5(2).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, functions and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, including the owner refused on updating or deleting an audit row and a member session refused everywhere.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-01: Admin shell with protected access". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using owner, admin, moderator, support and editor (each sees only their menu), adult_writer (refused at /staff) and the audit log CSV export; and the pull request description from .github/pull_request_template.md.
```

### S1-E11-02 User management
Must · M · March MVP (wave 3) · Depends on: S1-E11-01, S1-E10-06

```text
We are working on story S1-E11-02 (User management) only. Read CLAUDE.md, docs/architecture.md (section 1.8), docs/definition-of-done.md and the story in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-01 (admin shell and audit log), S1-E10-06 (sanctions).
- Decisions that apply: every account has a permanent user ID; staff see it shortened with a copy button, never publicly (architecture 1.6). Staff see the age group and the age check result with its date, never the year of birth, a photo or a document (1.8.3, S1-E2-08). Usernames block swearwords, staff look-alikes and confusable characters, and moderators can approve a false hit: that approval is one action on this account page (architecture 1.7.9, S1-E2-04). Platform: web (staff).
- Designs: design/boards/AdminUsers.dc.html (8.5; design/renders/desktop/AdminUsers.jpg, design/renders/phone/AdminUsers.jpg). Plain components, no doodles; label and value rows with a fine line between them (Definition of Done). Match it at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B27 admin_user_lookup() (handle, email or user ID; revealing an email is logged), B26 sanctions and open cases, B03 audit log. Real; seed personas.
- Watch-outs: roles from 1.8.3: owner, admin and moderator look up and sanction; support only views; everyone but the content editor can reveal an email after pressing "Show", and that click is logged. Actions: suspend, ban, reset a pen name, sign out everywhere, and start a data export or deletion on the user's request. Until S1-E11-09 exists those last two need a holding path: ask me what they do meanwhile. Private messages are visible only when part of a report. Need-to-know access, GDPR Art 5(1)(f).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: functions and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each role, including support refused on sanctions and the editor refused on look-up.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-02: User management". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using moderator (finds kid_14_ok by handle and teen_17 by short user ID, suspends suspended_user, approves a username false hit), support (views and reveals an email, then checks the audit log entry) and editor (refused); and the pull request description from .github/pull_request_template.md.
```

### S1-E11-03 Content settings and feature flags
Must · M · After March · Depends on: S1-E11-01

```text
We are working on story S1-E11-03 (Content settings and feature flags) only. Read CLAUDE.md, docs/architecture.md (sections 1.7.9 and 1.8), docs/definition-of-done.md and the story in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-01 (admin shell and audit log). For March, settings, flags, reserved names and the username word lists were seeded and changed only by migration (architecture 1.7.9); this story makes them editable.
- Decisions that apply: parental consent for under-16s is on from launch (Q15), so its flag is an emergency switch only. Picture uploads are on (Q18). Open decisions should land without a release (architecture 1.1, principle 12). Settings and flags belong to owner and admin only (1.8.3). Platform: web (staff).
- Designs: design/boards/AdminSettings.dc.html (8.6: "Content settings", "Feature flags", "Categories", "Forums", "Reserved names", "Ranking weights", "Rate limits", "Recent changes"; design/renders/desktop/AdminSettings.jpg, design/renders/phone/AdminSettings.jpg). Markets and languages on the same board are S1-E11-05; Website home page is S1-E11-06. Plain components. Match it at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B12 (feature_flags, settings, rate_limits, reserved_names, read by get_client_config()), B27 admin_* functions, B03 audit log. Real.
- Watch-outs: every change applies within a minute and is logged with before and after values. The flag list includes parental consent, picture uploads, images in posts, the teaser length, social log-in (S1-E2-09), the number of confirmed AI reports before a label (S1-E3-06), the Discover mix (S1-E5-03) and the username word lists (S1-E2-04). Rate limit numbers belong to S1-E10-12: keep one source of truth. Switching parental consent off must be hard to do by accident: show me your proposal (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: columns, functions and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each: owner and admin change, everyone else refused; clients read only through get_client_config().
3. A table mapping each acceptance criterion to the test(s) that prove it, including the one-minute rule.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-03: Content settings and feature flags". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using admin (adds a reserved name, changes the teaser length and checks the change shows within a minute and in the audit log) and moderator (refused); and the pull request description from .github/pull_request_template.md.
```

### S1-E11-04 Metrics and compliance logs
Should · M · After March · Depends on: S1-E15-02, S1-E10-03

```text
We are working on story S1-E11-04 (Metrics and compliance logs) only. Read CLAUDE.md, docs/architecture.md (section 1.8), docs/definition-of-done.md and the story in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E15-02 (first-party March metrics), S1-E10-03 (queue with tiers and deadlines).
- Decisions that apply: no tracking; the March numbers come from our own database. Staff see aggregates only. Metrics: owner and admin view, moderators see queue numbers only (architecture 1.8.3). Platform: web (staff).
- Designs: design/boards/AdminMetrics.dc.html (8.7: "March test numbers", "Sign-ups by age group", "Age checks with Yoti", "Reports by tier", "Authority orders and legal requests"; design/renders/desktop/AdminMetrics.jpg, design/renders/phone/AdminMetrics.jpg). Example numbers on the board are made up. Charts need real text alternatives (WCAG 2.2 AA). Match it at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B17 daily metrics job, the compliance log, B26 (reports by tier, SLA), B27 admin_* functions with the B03 audit log. Mock: seeded totals.
- Watch-outs: sign-ups by age (13 to 15, 16 to 17, 18 or over) are counted from year of birth and shown only as totals. The dashboard shows age checks passed, failed and appealed, writers who published, readers, the March return rate, reports by tier and the share handled within SLA. OPEN: the return rate definition (proposal: readers of chapter N who open chapter N+1 within 14 days of its release; docs/open-questions.md row 23). Stop and ask me. A logged authority order or legal request records the authority, date, content, action and timestamps. Add the ANCOM notification within 45 days of launch (Law 50/2024) as a launch task here; ask me how it should appear. Small totals could point to one person: tell me how you'd avoid that (check with Robert). DSA Art 15(2): transparency reports aren't required yet.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, views and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each role.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-04: Metrics and compliance logs". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using owner (reads the dashboard, logs a legal request), moderator (queue numbers only) and support (refused); and the pull request description from .github/pull_request_template.md.
```

### S1-E11-05 Markets and languages
Must · M · After March · Depends on: S1-E11-03, S1-E2-10

```text
We are working on story S1-E11-05 (Markets and languages) only. Read CLAUDE.md, docs/architecture.md (section 1.8), docs/definition-of-done.md and the story in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-03 (settings screen), S1-E2-10 (country from the connection). For March, open languages and markets were seeded in a migration (architecture 1.7.9).
- Decisions that apply: Romania is the first market; English-speaking countries open later, one by one, each after its legal check (17 Oct 2026, 11:48). At launch only Romania is Open; the others show Ready to open or Closed. The interface opens in Romanian, with English in the language menu. A language opens only when moderators who read it are on the rota. Australia is open to people 16 and over only, closed to under-16s until a lawyer says otherwise (Q19). Opening a market is owner-only (architecture 1.8.3, proposal). Platform: web (staff and the story language picker).
- Designs: "Markets and languages", "Languages" and "Markets" in design/boards/AdminSettings.dc.html (design/renders/desktop/AdminSettings.jpg, design/renders/phone/AdminSettings.jpg); the story language picker in design/boards/NewStory.dc.html (4.2). Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B11 (markets, languages, signup-context; the country header faked locally), B12, B27 admin_* functions with the B03 audit log. Real.
- Watch-outs: languages are English and Română to start; markets are UK, Ireland, US, Canada, Australia, New Zealand, Singapore, Romania and others. Opening is blocked for a language with no moderator who reads it on the rota and for a market whose legal check isn't done. The story doesn't say where moderators' languages or a market's legal check are recorded: stop and ask me. Story creation offers only open languages; the others show "Coming when we have moderators for it". Each market has its own child-safety law (research H1).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, functions and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, including admin refused on opening a market and the two blocking rules.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-05: Markets and languages". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using owner (tries to open a market without its legal check), admin (refused), adult_writer (sees only open story languages) and kid_14_ok with a faked Australian connection; and the pull request description from .github/pull_request_template.md.
```

### S1-E11-06 Website home page copy
Should · M · After March · Depends on: S1-E11-01, S1-E11-03, S1-E2-07, the website's own database and the `website-cms` bridge

```text
We are working on story S1-E11-06 (Website home page copy) only. Read CLAUDE.md, docs/architecture.md (sections 1.7.4 group A and 1.8.6), docs/definition-of-done.md and the story in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-01 (admin shell), S1-E11-03 (settings), S1-E2-07 (staff roles).
- Decisions that apply: the public website has its own database, separate from the app (16 Oct 2026); its CMS is built new on that database (Q54). The live copy: headline "Write stories. Get read." and the line under it "Post your stories, poems and essays, one chapter at a time, and find the people who want to read them." Website copy goes live without a second approver for now (Q31); home page copy is logged only. Content editors and admins can save and publish (1.8.3). Platform: web (staff and the public website).
- Designs: "Website home page" and "Earlier versions" in design/boards/AdminSettings.dc.html (the board notes these now live under Website, as in the menu of design/boards/AdminPages.dc.html), and the hero on design/boards/Website-Home.dc.html for the preview; renders in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B31 (`hero_versions` on the website's database, written only through the `website-cms` function, which checks the role and is_staff_session() and logs to the app's audit log). Mock: the `WebsiteContentStore` stub with the same contract and a fixture of the copy live on 16 Oct 2026. The website database set-up is OPEN: the story is Done only when it is real or behind an off flag (docs/mocks.md).
- Watch-outs: fields are the line above the headline, the headline on two lines, the underlined word, the line under it, two button labels and three short points; both languages required; character limits are proposals (50, 40, 170, 20, 30). Publish is refused with the list of fields to fix, and counters are announced to screen readers. "Show from" goes live at 00:00 Romanian time. Restore brings a version back as a draft. The website reads its own database and falls back to the last published version. The headline stays the page's one h1, the underline is decoration and lang matches the copy. Claims must stay true (Law 363/2007).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations and the bridge contract: tables, the write key's scope and RLS or grants (who can select, insert, update or delete, and why), with an allowed and a denied test for each.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-06: Website home page copy". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using editor (drafts, previews, publishes with a future "Show from" date, restores), moderator (refused) and a signed-out visitor on the home page; and the pull request description from .github/pull_request_template.md.
```

### S1-E11-07 Every story in the admin site
Should · M · After March · Depends on: S1-E11-01, S1-E2-07, S1-E3-01, S1-E10-03 (open report counts)

```text
We are working on story S1-E11-07 (Every story in the admin site) only. Read CLAUDE.md, docs/architecture.md (section 1.8), docs/definition-of-done.md and the story in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-01 (admin shell), S1-E2-07 (staff roles), S1-E3-01 (stories), S1-E10-03 (cases, for open report counts).
- Decisions that apply: the admin site can open every story (16 Oct 2026). Every story links to its owner's permanent user ID; staff see it shortened with a copy button. Staff see the age group only, never the year of birth (1.8.3). Roles: owner, admin and moderator list and open; support sees titles and metadata; content editors are refused (1.8.3). Platform: web (staff).
- Designs: design/boards/AdminStories.dc.html (8.10; design/renders/desktop/AdminStories.jpg, design/renders/phone/AdminStories.jpg). Plain components; drop-downs follow the one drop-down style (Definition of Done). Match it at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B27 admin_search_stories() (title, current or earlier handle from the audit log, user ID full or short), B13, B26 open reports, B03. Real; seed stories in every status and one by a writer under 18.
- Watch-outs: filters are category, language, status (draft, published, hidden, removed), where it can be read, rating, open reports and writers under 18. A row never shows year of birth, email or chapter text. A draft shows only its title and metadata; its text opens only from a case or a data request, and opening it is logged with the reason (proposal). No bulk actions; changes happen one story at a time in S1-E11-08. Searching by user ID uses the index on stories.user_id. GDPR Art 5(1)(f) and 32.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: functions, indexes and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each role, including no chapter text in any result.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-07: Every story in the admin site". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using moderator (finds adult_writer's story by an earlier handle and by short user ID, filters writers under 18), support (no change controls) and editor (refused); and the pull request description from .github/pull_request_template.md.
```

### S1-E11-08a Staff can open and change any story (part a: open a story, settings, visibility and metadata)
Should · L, split · After March · Depends on: S1-E11-07, S1-E3-04, S1-E3-05, S1-E3-06, S1-E10-04, S1-E7-01, S1-E14-01

```text
We are working on story S1-E11-08a (Staff can open and change any story) only: part a, opening a story and changing its settings, visibility and metadata with a reason and a notice. Version history, Restore and removing a passage are part b. Read CLAUDE.md, docs/architecture.md (sections 1.8.4 and 1.8.5), docs/definition-of-done.md and the story S1-E11-08 in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-07, S1-E3-04, S1-E3-05, S1-E3-06, S1-E10-04 (statements of reasons), S1-E7-01 (notifications), S1-E14-01 (terms).
- Decisions that apply (Q14, 16 Oct 2026): staff may hide or restrict a story or a chapter, change its settings and visibility and fix its metadata; they never edit a writer's words, not even when asked (CLAUDE.md rule 18). Ratings are All ages, 13+, 16+ and 18+. Roles: owner, admin and moderator change; support and content editors are refused (1.8.3). Platform: web (staff).
- Designs: design/boards/AdminStory.dc.html (8.11: "Story settings", the chapter list, "Reports and decisions"; design/renders/desktop/AdminStory.jpg, design/renders/phone/AdminStory.jpg). Plain components. Match it at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B27 admin_update_story(), B13 story_revisions, B26 statements, B22 notifications, B03. Real.
- Watch-outs: the page shows cover, title, blurb, owner handle and user ID, all settings, each chapter with its status, and "under 18" (age group only) for young writers. Every save needs a reason (a list plus free text) and applies within a minute. Hiding, restricting or raising the rating sends a statement of reasons with the appeal route; a correction that restricts nothing sends a notification. Staff can hide a cover (the automatic cover from S1-E3-13 shows instead; if S1-E3-13 isn't merged, ask me) or hide a title behind "Title hidden by the moderation team"; never write a new one. I've put "every change is stored as a new version with who, when, the reason and before and after, plus an audit entry carrying the owner's user ID" in part a and the history screen in part b (check with Robert). The terms must list what staff can change (S1-E14-01). Law 8/1996 art. 10 and 11; DSA art. 17 and 14(4).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: functions, columns and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each role, including no path that writes chapter text.
3. A table mapping each part-a acceptance criterion to the test(s) that prove it, and the criteria left for 08b.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-08a: Staff can open and change any story (settings, visibility and metadata)". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using moderator (raises a rating and fixes a tag on teen_17's story), teen_17 (gets a statement for one and a notification for the other), support and editor (refused); and the pull request description from .github/pull_request_template.md.
```

### S1-E11-08b Staff can open and change any story (part b: version history, Restore and removing a passage)
Should · L, split · After March · Depends on: S1-E11-08a

```text
We are working on story S1-E11-08b (Staff can open and change any story) only: part b, the version history, Restore and removing an unlawful passage. Read CLAUDE.md, docs/architecture.md (sections 1.8.3 and 1.8.5), docs/definition-of-done.md and the story S1-E11-08 in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-08a (story page, settings and versioned changes).
- Decisions that apply (Q14): staff may remove an unlawful part or someone's personal data by cutting the exact passage and leaving "[Removed by the moderation team]"; they can never add to or reword the writer's text (CLAUDE.md rule 18). Every change is versioned, restorable and in the audit log. Removing part of a writer's text asks for a fresh Google sign-in (architecture 1.8.3, proposal). Platform: web (staff).
- Designs: design/boards/AdminStory.dc.html ("Who changed what, and why" and the chapter view; design/renders/desktop/AdminStory.jpg, design/renders/phone/AdminStory.jpg). Plain components. Match it at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B27 admin_remove_passage(), B13 story_revisions and chapter_revisions, B26 statements of reasons, B03. Real.
- Watch-outs: staff select the exact passage; the rest of the chapter is untouched and the text area can't be typed in. The original passage stays in the version history, visible only to staff working on that case. Restore brings an earlier version's settings and text back as a new version with its own reason, and the writer is told. A removal sends a statement of reasons (S1-E10-04). Whether cutting a passage with a visible marker is safe under Law 8/1996 art. 10(d) is on the lawyer's list.
- OPEN: how long the original of a removed passage is kept (proposal: with the case, for the case's retention period, then deleted). Stop and ask me.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: functions, columns and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, including staff outside the case refused on the original passage.
3. A table mapping each 08b acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-08b: Staff can open and change any story (history, restore and removing a passage)". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using moderator (removes a passage from adult_writer's chapter, then restores an earlier version), adult_writer (sees the marker and the statement) and admin (a staff member not on the case, refused on the original); and the pull request description from .github/pull_request_template.md.
```

### S1-E11-09a Data requests and story export (part a: request log, identity check, deadline, machine-readable copy and Word files)
Must (GDPR) · L, split (09a about 30 hours) · March MVP (wave 5) · Depends on: S1-E11-01, S1-E11-02, S1-E13-02, S1-E2-07, S1-E7-01; S1-E2-03 for requests made by a parent

```text
We are working on story S1-E11-09a (Data requests and story export) only: part a, the request log, identity check, deadline, the machine-readable copy and the Word files. PDF files are part b, after March. Read CLAUDE.md, docs/architecture.md (sections 1.7.3 B28 and 1.8), docs/definition-of-done.md and the story S1-E11-09 in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-01, S1-E11-02, S1-E2-07, S1-E7-01; S1-E2-03 for requests made by a parent; S1-E13-02 (the machine-readable export, which this story reuses).
- Decisions that apply: Word (.docx) files from the first version, no EPUB (Q28, Q29); PDF after March. 13 to 15-year-olds download their own data from their own account; requests made on a child's behalf go through the parent or guardian in the consent record (Q27). Data requests: support, admin and owner act; moderators and content editors are refused (1.8.3). Platform: web (staff).
- Designs: design/boards/AdminDataRequests.dc.html (8.12; design/renders/desktop/AdminDataRequests.jpg, design/renders/phone/AdminDataRequests.jpg). Plain components. Match it at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B28 (data_requests, exports, export-build, story-export); this story replaces story-export's Word placeholder. B14 `exports` bucket, B22 and B09 for notices (Mailpit locally), B03 audit log. The `docx` npm library is a recommendation still waiting for me (Q49, docs/open-questions.md 34r): stop and ask before adding it.
- Watch-outs: staff find the user by user ID, handle or email and record the type, the channel and the date received. The deadline is one month, with a reminder 7 days and an alert 2 days before (proposal); staff can extend by up to two months with a reason and the user is told within the first month. A request not made inside the signed-in account needs an identity check (confirmation link to the account's email or a sign-in), logged, and nothing ever goes to another address. The export finds every story by user_id, including earlier handles, drafts and unpublished chapters. Each Word file has the title, pen name, user ID, dates, status and every chapter in order; Romanian letters (ă, â, î, ș, ț) render, headings are real headings, pictures keep alt text and embeds are links. Files go one per story or as a zip, through a link that needs sign-in (a one-time link for a parent) and expires after seven days; files are deleted after seven days (S1-E13-04). Opening a file's contents is logged. Large exports run one job per story and zip at the end. GDPR Art 12, 15 and 20 (some article numbers to verify).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, storage policies and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each role.
3. A table mapping each part-a acceptance criterion to the test(s) that prove it, and the criteria left for 09b.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-09a: Data requests and story export". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using support (logs an email request for adult_writer, checks identity, sends Word files and opens one in Word to check ș and ț), a parent request for kid_14_ok checked against the consent record, and moderator and editor (refused); and the pull request description from .github/pull_request_template.md.
```

### S1-E11-09b Data requests and story export (part b: PDF files)
Must (GDPR) · L, split (09b about 12 hours) · After March · Depends on: S1-E11-09a

```text
We are working on story S1-E11-09b (Data requests and story export) only: part b, one PDF per story next to the Word file. Read CLAUDE.md, docs/architecture.md (B28), docs/definition-of-done.md and the story S1-E11-09 in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-09a (request log, identity check, deadline, machine-readable copy and Word files).
- Decisions that apply: Word first, PDF after March (Q29); no EPUB (Q28). Platform: web (staff); S1-E13-05 (Download my stories) offers the same files to writers.
- Designs: design/boards/AdminDataRequests.dc.html (design/renders/desktop/AdminDataRequests.jpg, design/renders/phone/AdminDataRequests.jpg); add PDF next to Word as the board shows. Match it at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B28 story-export, which returns a placeholder PDF until this story; this story removes that mock (docs/mocks.md).
- Watch-outs: each PDF has the same content as the Word file: title, pen name, user ID, the dates created, first published and last updated, status and every chapter in order with its title and dates. Romanian letters render, headings are real (tagged) headings for screen readers, pictures keep their alt text and embeds are listed as links. Large exports stay one job per story, zipped at the end.
- OPEN: the PDF tool (question 34f, Q49). A library inside the edge function is simplest; an HTML-to-PDF renderer gives tagged, accessible PDFs; a hosted renderer is a new processor that needs a data processing agreement. Stop and ask me before choosing.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change, and the options for the PDF tool with what each means for accessibility, cost and processors.
2. Migrations, if any, and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each.
3. A table mapping each PDF acceptance criterion to the test(s) that prove it, including a check that the PDF is tagged.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-09b: Data requests and story export (PDF files)". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using support (exports adult_writer's stories as PDF and zip, opens one and checks ă, î, ș, ț and the headings) and teen_17 (downloads through the sign-in link); and the pull request description from .github/pull_request_template.md.
```

### S1-E11-10 Website notice banners
Should · S · After March · Depends on: S1-E11-01, S1-E2-07; back end: the website's own database and the `website-cms` bridge (B31)

```text
We are working on story S1-E11-10 (Website notice banners) only. Read CLAUDE.md, docs/architecture.md (sections 1.7.4 group A and 1.8.6), docs/definition-of-done.md and the story in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-01 (admin shell), S1-E2-07 (staff roles); S1-E11-06 if you want to reuse its CMS pattern.
- Decisions that apply: the website has its own database and a new CMS built on it (16 Oct 2026, Q54). Website copy goes live without a second approver for now (Q31). Content editors, admins and the owner use the Website CMS (1.8.3). Sponsors never appear in notices; paid content goes through Sponsors (S1-E12). Platform: web (staff and the public website).
- Designs: "Notice banners" in the Website menu of design/boards/AdminPages.dc.html; no screen of its own, so use the CMS editing pattern of design/boards/AdminSettings.dc.html ("Website home page"). The public strip is on design/boards/Website-Home.dc.html. Renders in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). The AdminPages board describes the strip as showing on the website and the app; the story says the website: stop and ask me which (check with Robert).
- Back-end pieces: B31 (`site_banners` on the website's database, written only through `website-cms`, logged in the app's audit log). Mock: the `WebsiteContentStore` stub and a fixture; Done only when the website database is real or the feature sits behind an off flag.
- Watch-outs: text in English and Română, each up to 120 characters (proposal), an optional link to one of our own pages, a type (news, contest or important) and the pages it shows on (every page or the home page only). "Show from" and optional "Show until" at 00:00 Romanian time; both languages required. Two notices for the same page and time: only the one with the latest "Show from" shows. Colours from design tokens at 4.5:1, no focus move, no animation, a labelled region. Closing it lasts for the visit only (session storage, no consent needed). Versions restore as drafts. No sponsor names or logos. Claims must be true (Law 363/2007).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations and the bridge contract: tables, grants and RLS (who can select, insert, update or delete, and why), with an allowed and a denied test for each.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-10: Website notice banners". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using editor (creates two overlapping notices, publishes, restores one), moderator (refused) and a signed-out visitor (sees one notice, closes it, reloads in the same visit); and the pull request description from .github/pull_request_template.md.
```

### S1-E11-11 Seasonal doodle schedule
Could · S · After March · Depends on: S1-E11-01, S1-E2-07, the doodle set (canvas 11.1); back end: B30

```text
We are working on story S1-E11-11 (Seasonal doodle schedule) only. Read CLAUDE.md, docs/architecture.md (sections 1.7.3 B30 and 1.8.6), docs/definition-of-done.md and the story in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-01 (admin shell), S1-E2-07 (staff roles); S1-E5-07 shows the doodles to readers.
- Decisions that apply: the Discover greeting doodle and the Search tags doodle change with the seasons and occasions (16 Oct 2026). Doodles are always SVG files that take their colours from the design tokens (CLAUDE.md rule 16, Definition of Done). Content editors, admins and the owner use the Website CMS (1.8.3). Platform: web (staff).
- Designs: "Seasonal doodles" in the Website menu of design/boards/AdminPages.dc.html (no screen of its own: use plain admin components), the doodle set in design/boards/Doodles.dc.html (11.1) and where they show on design/boards/Discover.dc.html and design/boards/Search.dc.html; renders in design/renders/desktop/ and design/renders/phone/. Staff screens show the doodle only as a preview, no decorative doodles. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B30 (`seasonal_occasions`, current_occasion()) in the app's database, B27 admin_* functions with the B03 audit log. Mock: seeded occasions.
- Watch-outs: an occasion has a name, a date range (with "every year"), the doodle and where it shows (Discover greeting, Search popular tags or both). Editors choose only from approved SVG doodles shipped with the app; new doodles arrive in a release, never as uploads. Overlaps: the shorter occasion wins; a season's default covers days with no occasion. A year view shows every occasion and the gaps, with light and night previews. Changes apply within a minute and are logged. No religious or political occasion is on by default.
- OPEN (from S1-E5-07): whether occasions follow the reader's country, and whether the website shows them too. Stop and ask me.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, functions and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, and tests for the overlap and default rules.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-11: Seasonal doodle schedule". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using editor (adds two overlapping occasions, checks the year view in light and night mode), moderator (refused) and adult_writer (sees the doodle change on Discover); and the pull request description from .github/pull_request_template.md.
```

### S1-E11-12 Help pages and questions
Should · M · After March · Depends on: S1-E11-01, S1-E2-07, S1-E1-04, S1-E14-01; back end: the website's own database and the `website-cms` bridge (B31)

```text
We are working on story S1-E11-12 (Help pages and questions) only. Read CLAUDE.md, docs/architecture.md (sections 1.7.4 group A and 1.8.6), docs/definition-of-done.md and the story in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-01, S1-E2-07, S1-E1-04 (Romanian and English), S1-E14-01 (legal documents).
- Decisions that apply: the website CMS is new, on the website's own database (Q54). Website copy goes live without a second approver for now (Q31). Content editors, admins and the owner use it (1.8.3). If a help page and the terms or privacy notice disagree, the legal documents win and the help page is fixed the same day. Platform: web (staff, the public website and Help in the app).
- Designs: "Help and questions" in the Website menu of design/boards/AdminPages.dc.html (no screen of its own: follow the CMS editing pattern of design/boards/AdminSettings.dc.html); the public questions on design/boards/Website-Home.dc.html and help on design/boards/Legal.dc.html. Renders in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B31 (`help_pages`, `faq_items`, written only through `website-cms`). Mock: the `WebsiteContentStore` stub and a fixture of the 16 Oct 2026 questions; Done only when the website database is real or behind an off flag.
- Watch-outs: a help page has a title, a web address, a section and a body in the safe Markdown subset (rule 8), in both languages. A question has the question, answer, order and where it shows (home page, help centre or both). Version 1 imports the questions live on 16 Oct 2026, including "What is a class space?": tell me where you take them from (the Website-Home board is my guess; check with Robert). Every edit follows the CMS way of working (preview, "Show from", both languages, Restore, audit log). Links to our own pages must work or saving is refused, naming the link. One h1, real headings and the right lang. Plain language a 13-year-old can follow (DSA art. 14(3)).
- OPEN: answers about age checks, parental consent, messaging rules, privacy or money needing an admin to publish (proposal; Q31 logs no second approver). Stop and ask me.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations and the bridge contract: tables, grants and RLS (who can select, insert, update or delete, and why), with an allowed and a denied test for each.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-12: Help pages and questions". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using editor (writes a help page with a broken link, fixes it, publishes a question), moderator (refused), and adult_writer opening Help in the app in Romanian and English; and the pull request description from .github/pull_request_template.md.
```

### S1-E11-13a Support tickets inside the admin site (part a: inbox, ticket view and email in and out)
Must · L, split · After March · Depends on: S1-E11-01, S1-E2-07, S1-E14-04, S1-E7-02 (email provider), S1-E10-02, S1-E11-09

```text
We are working on story S1-E11-13a (Support tickets inside the admin site) only: part a, the inbox, the ticket view and email in and out. Views, timers, canned replies, merge and reports are part b. Read CLAUDE.md, docs/architecture.md (section 1.8), docs/definition-of-done.md and the story S1-E11-13 in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-01, S1-E2-07, S1-E14-04 (Contact us), S1-E7-02 (email provider), S1-E10-02 (report form), S1-E11-09 (data requests).
- Decisions that apply (17 Oct 2026): every support request arrives as a ticket in the admin site, linked to support@ghemotoc.com, following normal ticketing logic; a ready-made external helpdesk (EU hosting, DPA) runs behind our screens through its API and handles email in and out, threading and spam filtering. Tickets never replace reports; the TCO contact point stays the web form. Platform: web (staff, plus "Your support requests" in Settings).
- Designs: design/boards/AdminTickets.dc.html (8.13) and "Your support requests" in design/boards/Settings.dc.html, with renders in design/renders/desktop/ and design/renders/phone/. Plain components on staff screens. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: `tickets`, `ticket_messages`, `ticket_events`, an inbound-email webhook and an outbound sender (story), B27 and B03. Mock: Mailpit locally.
- OPEN: which helpdesk product (question 34t; cheapest suitable option, research pending), and so what lives in our tables and what stays in the helpdesk. Stop and ask me before planning tables.
- Watch-outs: I've placed these criteria in part a (check with Robert): ticket creation from email, Contact us or in-app with a number, the user ID and username or "email only"; the acknowledgement email and "Your support requests"; staff replies with the ticket number and threading headers, replies landing in the same ticket; status, priority, category, assignee and tags with history; internal notes never emailed; the under-16 banner with the age group only, never year of birth or the age check result; spam; deletion 2 years after closing (proposal) and inclusion in the user's export; role limits and an audit entry for every view and action. Minors: staff answer only in the ticket, never by private message. GDPR: the helpdesk is a processor with an EU-hosted DPA.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each role, including a user reading only their own tickets and never internal notes.
3. A table mapping each part-a acceptance criterion to the test(s) that prove it, and the criteria left for 13b.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-13a: Support tickets inside the admin site (inbox, ticket view and email)". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using kid_14_ok (sends a Contact us message and sees the under-16 banner from the staff side), adult_writer (replies by email in Mailpit), support (answers, adds an internal note) and editor (refused); and the pull request description from .github/pull_request_template.md.
```

### S1-E11-13b Support tickets inside the admin site (part b: views, timers, canned replies, merge and reports)
Must · L, split · After March · Depends on: S1-E11-13a

```text
We are working on story S1-E11-13b (Support tickets inside the admin site) only: part b, views with counts, timers, canned replies, merge and the links to reports and data requests. Read CLAUDE.md, docs/architecture.md (section 1.8), docs/definition-of-done.md and the story S1-E11-13 in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-13a (inbox, ticket view, email in and out), S1-E10-03 (moderation queue), S1-E10-10 (safeguarding), S1-E11-09 (data requests).
- Decisions that apply: tickets inside the admin site with an external helpdesk behind them (17 Oct 2026); tickets never replace reports (DSA art. 12, TCO contact point stays the web form). Platform: web (staff).
- Designs: design/boards/AdminTickets.dc.html (views, "Actions", "How Support works") and "Support" and "Canned replies" in design/boards/AdminSettings.dc.html, with renders in design/renders/desktop/ and design/renders/phone/. Plain components. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: the ticket tables from 13a, B17 pg_cron for the 7-day rule, B26 cases, B28 data_requests, B27 and B03. Real; tests call job functions directly.
- Watch-outs: the split says "views, timers, canned replies, merge and reports"; I've read "reports" as "Convert to report" and "Open data request" (check with Robert). Views: My tickets, Unassigned, All open, Pending on user, Solved, Spam, with counts, and a first-reply timer against the target in admin settings (proposal: one working day). Pending on user for 7 days solves the ticket with a polite email; a reply reopens a solved ticket; a closed ticket stays closed and a reply opens a linked follow-up. Canned replies fill in the user's name and language and can be edited. Merging joins two tickets from the same person and tells them the new number. "Convert to report" opens a case with the ticket linked and safeguarding rules apply; "Open data request" starts one with its legal deadline. Timers must not rely on colour alone.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: columns, functions and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each role.
3. A table mapping each 13b acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-13b: Support tickets inside the admin site (views, timers, canned replies, merge and reports)". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using support (uses a canned reply in Romanian, merges two tickets from adult_writer, runs the 7-day job by hand), moderator (receives a ticket converted to a report) and admin (changes the first-reply target); and the pull request description from .github/pull_request_template.md.
```

### S1-E11-14 Landing pages for contests and campaigns
Should · L · After March · Depends on: S1-E11-01, S1-E11-06 (the website editing pattern), S1-E10-05 (picture check), S1-E7-01 (for "Remind me"), S1-E12-02 (approved campaigns for the Sponsor block)

```text
We are working on story S1-E11-14 (Landing pages for contests and campaigns) only. Read CLAUDE.md, docs/architecture.md (section 1.8), docs/definition-of-done.md and the story in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-01, S1-E11-06, S1-E10-05, S1-E7-01, S1-E12-02 (approved sponsor campaigns for the Sponsor block).
- Decisions that apply: staff can build landing pages for contests and campaigns; the details are proposals until confirmed (17 Oct 2026, 11:06). "Sponsored" marks direct sponsors (Q7). At most 2 ad slots on any page (17 Oct 2026, 11:53). Ratings All ages, 13+, 16+ and 18+ hide stories from anyone younger (rule 18). Website copy has no second approver (Q31). Platform: web (staff and public pages).
- Designs: design/boards/AdminPages.dc.html (8.14: page settings with type, address and one of four themes, "Blocks", "Before it goes live", "How readers will see it", "Where people find it", "Earlier versions") and the public page design/boards/Contest.dc.html (3.11), with renders in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces (proposal in the story): tables in the app's database, written only through admin_* functions (B27) with the B03 audit log; B15 picture check, B14 storage, B22 notifications, B19 teaser preview. Real.
- Watch-outs: types Contest, Campaign or Information; address ghemotoc.com/c/<slug> (proposal), refusing reserved or used slugs. Only the fixed blocks (Hero, Text, Key dates, Who can enter, Prize, How to enter, Rules, Sponsor, Featured stories, Questions and answers, Remind me): no free HTML, script or custom colour. English and Română side by side with phone and desktop previews; Up and Down buttons, no drag-only control; one heading order. Pictures need alt text and a passed check. Featured stories only at the youngest targeted rating; hidden stories drop off at once. "Remind me" sends one in-app notification when entries open (tell me where that date comes from). Publish checks per the story; an admin publishes a page with a Sponsor block or an under-18 contest (proposal). "Show from" and "Take down" at 00:00 Romanian time, then "This contest has ended" and results unless archived. No countdown timers or "only today" for minors.
- OPEN: whether a landing page may also carry an ad-network ad (proposal: no; only the sponsor or a house ad). Stop and ask me.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-14: Landing pages for contests and campaigns". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using editor (builds a contest page by keyboard, tries to publish with a missing translation), admin (publishes it), kid_14_ok (taps "Remind me", sees only suitable featured stories) and a signed-out visitor; and the pull request description from .github/pull_request_template.md.
```

### S1-E11-15 Contests: set up, entries, judging and results
Should · L · After March · Depends on: S1-E11-14, S1-E3-05 (story settings), S1-E3-06 (ratings), S1-E8-12 (certificates), S1-E10-04 (statements of reasons)

```text
We are working on story S1-E11-15 (Contests: set up, entries, judging and results) only. Read CLAUDE.md, docs/architecture.md (sections 1.8.3 and 1.8.5), docs/definition-of-done.md and the story in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-14 (landing pages), S1-E3-05, S1-E3-06, S1-E8-12 (certificates), S1-E10-04; S1-E10-07 for appeals and S1-E12-02 for sponsor campaigns, if merged.
- Decisions that apply: staff can run contests; the details are proposals until confirmed (17 Oct 2026, 11:06). Staff never edit an entry's words (1.8.5). Certificates are co-signed by Ghemotoc and the leading teacher (Q23, Q71). Sponsors have no say in results. Under-16s need a parent or guardian (Q8, Q15). Platform: web (staff, story settings and the landing page).
- Designs: design/boards/AdminContests.dc.html (8.15: contests, "Entries", "Winners and finalists", "Checks for this contest"), design/boards/Contest.dc.html (3.11), the certificate boards design/boards/Certificate-Winner.dc.html and design/boards/Certificate-Participation.dc.html; "Enter <contest>" in story settings has no board, so use the settings components of design/boards/NewStory.dc.html. Renders in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: new contest and entry tables written through admin_* functions (B27) with the B03 audit log; B13 stories, B24 certificates, B26 statements. Real.
- Watch-outs: the story says "as an admin": tell me whether content editors may also run contests (architecture 1.8.3 has no contests row; check with Robert). Who can enter uses the age groups 13 to 15, 16 to 17 and 18 and over, but the First Chapter contest is for writers aged 13 to 19, which those groups can't express: ask me. Opening is refused until the rules are published in both languages and linked. One entry per writer (proposal), withdrawable before closing. Under-16 contests take only All ages or 13+ stories (proposal). Staff see pen name, age group, rating, date and status only. Disqualifying needs a reason and sends a statement of reasons. No public vote (proposal). Results show pen names only unless the writer (and for under-16s a parent or guardian) agreed. Prize delivery details for an under-16 need the parent's consent on file (proposal); they are new personal data, so plan where they live, who sees them and when they are deleted, and ask me before storing anything (Definition of Done, privacy). Never build anything that holds or moves money (rule 10). Prize tax and withholding are for the accountant.
- OPEN: whether a sponsor-funded prize needs an ONJN opinion (OUG 77/2009 art. 3(3)). Stop and ask me. A lawyer and an accountant confirm before the first contest. The rules may ask writers only for a licence to show the entry and results (Law 8/1996 art. 11, 42(2), 43).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, including an ineligible writer refused and staff unable to change entry text.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-15: Contests: set up, entries, judging and results". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using admin (creates a contest, tries to open it without rules, publishes results, issues certificates), kid_14_ok (enters a 13+ story, tries a 16+ one), teen_17 (enters and withdraws) and adult_writer (disqualified, gets a statement); and the pull request description from .github/pull_request_template.md.
```

### S1-E11-16a Add and manage public-domain classics (part a: adding a work, the public-domain check and publishing)
Should · L, split · After March · Depends on: S1-E11-01, S1-E3-01, S1-E3-03, S1-E5-06

```text
We are working on story S1-E11-16a (Add and manage public-domain classics) only: part a, adding a work with the public-domain check and publishing it. Importing the lists in content/classics and the 1 January suggestions are part b. Read CLAUDE.md, docs/architecture.md (section 1.8), docs/definition-of-done.md and the story S1-E11-16 in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-01 (admin shell), S1-E3-01 (stories), S1-E3-03 (publishing chapters), S1-E5-06 (the classics shelf and the official account).
- Decisions that apply: seed the reader side with free public-domain Romanian classics (Q51). Only texts we know are free are used; a modern translation or edition can still be protected. Ratings All ages, 13+, 16+ and 18+ hide a work from anyone younger (rule 18). Romania is the only open market at launch (17 Oct 2026, 11:48). Classics pages follow the normal ad rules (at most 2 slots a page). Platform: web (staff, plus the public classics pages).
- Designs: design/boards/AdminClassics.dc.html ("8.16 Classics", renders design/renders/desktop/AdminClassics.jpg and design/renders/phone/AdminClassics.jpg). Public side: design/boards/Classics.dc.html (3.3) and design/boards/SeeAll.dc.html (3.10). Plain components on staff screens. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B13 (stories, chapters, revisions, ratings, labels), B27 admin_* functions with the B03 audit log, B04 reports. Real.
- Watch-outs: the story lets content editors add works under Stories › Classics, but S1-E11-07 and architecture 1.8.3 refuse content editors on Stories: stop and ask me which wins (check with Robert). Fields: title, author, author's year of death, original language, kind, source edition with link and, for a translation, the translator and their year of death. The check shows per market whether the work is free: Romania, the EU and the UK 70 years after 1 January following the author's death (and the translator's) (Law 8/1996 art. 28(1) and 34; research G5); the US by publication date, which isn't in the field list: ask me. A work shows only where it is free. Text is pasted or uploaded as plain text or Markdown, split into chapters at headings with a preview; modern notes are left out unless free. Typo fixes are new versions with a reason; staff never rewrite or abridge (proposal). Publishing puts it under "Ghemotoc Classics" with the "Public domain" label, dates, source, a staff-chosen rating with a content note where needed, category, tags and an automatic or drawn cover. An admin publishes (proposal); the audit log records who added, checked and published. A report that a work isn't free goes to the queue and staff can unpublish at once. The public-domain test is on the lawyer's list.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, functions and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, and unit tests for the public-domain check at its year boundaries.
3. A table mapping each part-a acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-16a: Add and manage public-domain classics (adding, checking and publishing)". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using editor or admin (adds a Creangă tale from Wikisource, fixes a chapter title, admin publishes it with a rating), kid_14_ok (sees it on the Classics shelf only if the rating allows) and moderator (unpublishes after a report); and the pull request description from .github/pull_request_template.md.
```

### S1-E11-16b Add and manage public-domain classics (part b: importing content/classics and the 1 January suggestions)
Should · L, split · After March · Depends on: S1-E11-16a

```text
We are working on story S1-E11-16b (Add and manage public-domain classics) only: part b, importing the research lists in content/classics as drafts and the 1 January suggestions. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story S1-E11-16 in docs/stories/s1-e11-admin-site.md.

CONTEXT
- Already merged: S1-E11-16a (adding, checking and publishing a classic).
- Decisions that apply: seed with free public-domain Romanian classics (Q51); only texts we know are free are used. Platform: web (staff).
- Designs: design/boards/AdminClassics.dc.html ("8.16 Classics"; design/renders/desktop/AdminClassics.jpg, design/renders/phone/AdminClassics.jpg). Plain components. Match it at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Content: content/classics/G5_romanian-classics.csv and content/classics/G5_english-classics.csv (research G5), with the columns title, author, author_died, type, language, pd_romania_2026, pd_uk_eu_2026, pd_us_2026, source_url and notes. Load them as data, never hard-code them (CLAUDE.md, Designs). Check each title's status per country and that the text used isn't a newer translation (content/README.md).
- Back-end pieces: the classics tables and the public-domain check from 16a, B17 pg_cron for the 1 January job, B27 admin_* functions with the B03 audit log. Real; tests call the job function directly.
- Watch-outs: each row becomes a draft with its details filled in; its text still has to be added and checked through 16a, and nothing is published by the import. The CSV has no translator or publication date, so those stay empty for staff. Run 16a's check on each row and show me any row where it disagrees with the CSV's pd_ columns (check with Robert). Importing twice must not create duplicates. On 1 January the Classics area lists authors whose works have just become free (died 70 years before) as suggestions; the story doesn't say where that list of authors comes from beyond the research notes (for example the authors who died in 1956 on 1 January 2027): stop and ask me.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, functions and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each.
3. A table mapping each part-b acceptance criterion to the test(s) that prove it, including the duplicate check and a test that runs the 1 January job for 2027.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E11-16b: Add and manage public-domain classics (import and 1 January suggestions)". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using editor or admin (imports both lists, imports again, opens a draft, runs the 1 January job by hand) and moderator (refused); and the pull request description from .github/pull_request_template.md.
```

## S1-E12 Banners and sponsor slots

### S1-E12-01 Contextual banner slot
Must · M · After March · Depends on: S1-E4-01

```text
We are working on story S1-E12-01 (Contextual banner slot) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e12-banners-and-sponsor-slots.md.

CONTEXT
- Already merged: S1-E4-01 (chapter reader).
- Decisions that apply: contextual banners, no tracking, never inside chapter text, as a pop-up or full screen; everyone sees the same kind of banners. "Sponsored" ("Sponsorizat") marks direct sponsors with their name and "Ad" ("Reclamă") marks ad-network ads (Q7). No ads in class spaces (Q70). Ads show on every public page, but never too many; at most 2 ad slots on any page (17 Oct 2026, 11:53). A big banner on Discover, a portrait ad on Search, and in a forum thread one wide ad below the reply box plus a side ad on desktop, never between replies; Library shows ads; side ads go on the forum thread, Forums, the app-only story page and Search (17 Oct 2026). Writers get no share of ad income. Rule 7: no ad code except S1-E12-04. Platform: web.
- Designs: design/boards/AdFormats.dc.html (7.5) for formats, labels, "Why this ad?" and "How many ads", plus the slot on each public page's board (Discover, Search, Classics, SeeAll, Story, Teaser, AppOnly, Forums, Thread, Space, Profile, Library, Reader, Contest), with renders in design/renders/desktop/ and design/renders/phone/. If any board still shows an ad between forum replies, the decision wins. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B29 pick_banner(context) using page context only (category, tag, language), never user data, cookies or device identifiers. Mock: one seeded test campaign and a banner fixture.
- Watch-outs: the public pages and the pages with no slot are listed in the story; class spaces never get one. Add the slot to every public page that exists in the app now and list the missing ones as follow-ups in the PR (check with Robert). Formats: wide banner (up to 970 px, 120 px tall on desktop, 100 px on phones), portrait 300 × 600 and side box 300 × 250 (desktop side column only, portrait from 1200 px), in-list card; every slot reserves its space. Proposals still waiting for me: never more than one in view, never two adjacent, never above the heading or first row, one in-list card per 12 items and never first.
- OPEN (known conflict): a forum thread and Discover can show two ads in view at once on a wide screen. Stop and ask me whether that is allowed.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: functions and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, and a test that pick_banner() takes no user input.
3. A table mapping each acceptance criterion to the test(s) that prove it, including the 2-slot cap per page and no slot in class spaces.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E12-01: Contextual banner slot". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using adult_writer and kid_14_ok (same banner on the same chapter, "Why this ad?", no slot in a class space or in Settings) at phone and desktop widths; and the pull request description from .github/pull_request_template.md.
```

### S1-E12-02 Sponsor campaigns and "Sponsored" placements
Must · M · After March · Depends on: S1-E11-01, S1-E12-01

```text
We are working on story S1-E12-02 (Sponsor campaigns and "Sponsored" placements) only. Read CLAUDE.md, docs/architecture.md (section 1.8), docs/definition-of-done.md and the story in docs/stories/s1-e12-banners-and-sponsor-slots.md.

CONTEXT
- Already merged: S1-E11-01 (admin shell), S1-E12-01 (banner slot).
- Decisions that apply: sponsors are the early money. "Sponsored" marks placements paid for directly by sponsors such as Cărturești or a ministry (Q7). No ads, sponsored items or sponsor credits in class spaces (Q70). Sponsors have no say over what we publish, rank or remove (Q16 wording). Sponsors belong to owner and admin only (architecture 1.8.3). Platform: web (staff and public pages).
- Designs: design/boards/AdminSponsors.dc.html (8.8: "Campaigns", "Set up a campaign", "Check the creative", "Where sponsors can appear", "A sponsored category") and the sponsored formats on design/boards/AdFormats.dc.html (category "presented by", featured slide, sponsored writing contest), with renders in design/renders/desktop/ and design/renders/phone/. Plain components on staff screens. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B29 (sponsors, campaigns, pick_banner()), B14 `sponsor-creatives` bucket, B15 picture check on every creative (rule 19), B27 admin_* functions with the B03 audit log. Mock: seed one campaign; IMAGE_CHECK=stub locally.
- Watch-outs: a campaign has the sponsor, a creative image with alt text, a link, a placement (category, contest or featured slot) and dates. No creative goes live until staff confirm it suits minors (no alcohol, gambling, tobacco, dating or similar). A sponsored category or contest shows "Sponsored by <sponsor>" without changing which stories are listed or how they are ranked: prove that with a test. Placing anything sponsored in a class space is refused by the server. Romanian rules restrict some advertising to minors; the "no say" clause goes in every sponsor contract (not code).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, storage policies and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each role.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E12-02: Sponsor campaigns and \"Sponsored\" placements". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using admin (sets up a sponsored category, approves the creative, tries a class space), moderator and editor (refused) and kid_14_ok (sees "Sponsored by" with the same story order); and the pull request description from .github/pull_request_template.md.
```

### S1-E12-03 Sponsor reporting
Should · S · After March · Depends on: S1-E12-02

```text
We are working on story S1-E12-03 (Sponsor reporting) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e12-banners-and-sponsor-slots.md.

CONTEXT
- Already merged: S1-E12-02 (sponsor campaigns).
- Decisions that apply: no tracking (rule 7); counts are aggregate only. Sponsors belong to owner and admin only (architecture 1.8.3). Platform: web (staff).
- Designs: the campaign report with impressions, clicks and "Export CSV" in design/boards/AdminSponsors.dc.html (design/renders/desktop/AdminSponsors.jpg, design/renders/phone/AdminSponsors.jpg). Example numbers on the board are made up. Match it at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B29 `campaign_daily_stats`, B27 admin_* functions with the B03 audit log. Real.
- Watch-outs: impressions and clicks are counted per day on the server, with no cookies, no user IDs and nothing about the reader; the counter must not create a new kind of personal data (Definition of Done, privacy). The export is a CSV of daily totals per campaign. Don't log IP addresses or user agents (rule 12).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, functions and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each, and a test that the stats table holds no user column.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E12-03: Sponsor reporting". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using adult_writer (views a page with the seeded campaign and clicks it), admin (exports the CSV and opens it in a spreadsheet) and moderator (refused); and the pull request description from .github/pull_request_template.md.
```

### S1-E12-04 Ad-network ads that are never personalised
Could · M · After March · Depends on: S1-E12-01, S1-E14-03

```text
We are working on story S1-E12-04 (Ad-network ads that are never personalised) only. Read CLAUDE.md, docs/architecture.md, docs/definition-of-done.md and the story in docs/stories/s1-e12-banners-and-sponsor-slots.md.

CONTEXT
- Already merged: S1-E12-01 (banner slot), S1-E14-03 (accessibility statement and the CI no-cookie check).
- Decisions that apply (16 Oct 2026, late evening, Q7 and 22:55): ad-network ads only from vendors that don't personalise, for everyone, so "No tracking ads" stays true. They are labelled "Ad" ("Reclamă"). Never inside chapter text, full screen or in a class space (Q70). At most 2 ad slots a page. Rule 7: this story is the only place ad code may enter, through an ADR. Platform: web.
- Designs: the "Ad" format and label on design/boards/AdFormats.dc.html and the ad-network settings in design/boards/AdminSponsors.dc.html, with renders in design/renders/desktop/ and design/renders/phone/. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B29 pick_banner() and the slot from S1-E12-01; a feature flag (B12) that keeps the network off by default.
- Watch-outs: the network serves non-personalised ads only, for every reader of every age, and staff can block categories unsuitable for minors (alcohol, gambling, dating and similar). The ad sits only in the banner slot and loads when the slot comes into view. Its code sets no cookie and reads no device storage unless the reader agreed; if the vendor can't promise that, the slot shows our own banners (proposal). Cookies or storage for frequency capping or fraud checks would need consent under ePrivacy art. 5(3) and end the no-cookie-banner position. Add an ADR and the processor list entry; update the privacy notice. DSA Art 26 and 28(2); on the lawyer's list.
- OPEN: which vendor (docs/open-questions.md 34s; proposal: our own banners until a vendor can promise no cookies or storage). Stop and ask me before writing any vendor code.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change, and a draft ADR.
2. Migrations: settings, blocked categories and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each.
3. A table mapping each acceptance criterion to the test(s) that prove it, including the no-cookie check with the network switched on.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E12-04: Ad-network ads that are never personalised". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using admin (switches the network on, blocks a category), kid_14_ok and adult_writer (same ad behaviour, "Ad" label, no new cookies in the browser's storage panel) and a class space (no ad); and the pull request description from .github/pull_request_template.md.
```

### S1-E12-05 Ad slot booking and fill order
Should · M · After March · Depends on: S1-E12-01, S1-E12-02, S1-E12-04

```text
We are working on story S1-E12-05 (Ad slot booking and fill order) only. Read CLAUDE.md, docs/architecture.md (section 1.8), docs/definition-of-done.md and the story in docs/stories/s1-e12-banners-and-sponsor-slots.md.

CONTEXT
- Already merged: S1-E12-01 (slots), S1-E12-02 (campaigns); S1-E12-04 (ad network) is a Could: if it isn't merged, keep step 3 of the fill order behind its flag and tell me.
- Decisions that apply: staff book sponsors into ad slots and the ad network fills unbooked slots automatically; the details are proposals until confirmed (17 Oct 2026, 11:06). At most 2 ad slots on any page (17 Oct 2026, 11:53). "Sponsored" and "Ad" labels (Q7). No slots in class spaces (Q70). Never personalised. Sponsors belong to owner and admin only (1.8.3). Platform: web (staff and public pages).
- Designs: the Placements section of design/boards/AdminSponsors.dc.html (8.8: "Placements", "Book a slot for a campaign", "Our own promos"; design/renders/desktop/AdminSponsors.jpg, design/renders/phone/AdminSponsors.jpg). Plain components; the six-week grid needs text states, not colour alone. Match it at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B29 (campaigns, a new bookings table, house ads, pick_banner() with the fill order), B27 admin_* functions with the B03 audit log. Real; seed a campaign, a house ad and one booking.
- Watch-outs: Placements shows every slot on every public page against the next six weeks: Booked (sponsor and campaign), House ad, Ad network or Free. Booking picks the slot, dates and page context (category, tag, language); an overlapping booking for the same slot is refused with the clash shown (one sponsor per slot per date, proposal). Fill order every time: 1. the matching booked sponsor ("Sponsored"); 2. a house ad for our own contest or landing page; 3. the ad network, only if S1-E12-04 is on ("Ad"); 4. otherwise a house ad, so the space is never blank. The network gets only the page context. House ads have English and Română copy, a link to one of our own pages and dates. Every booking change is in the audit log. Every sponsor creative still passes the minors check (S1-E12-02).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, constraints against overlapping bookings and RLS policies (who can select, insert, update or delete, and why), with an allowed and a denied pgTAP test for each.
3. A table mapping each acceptance criterion to the test(s) that prove it, with a test for each step of the fill order.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E12-05: Ad slot booking and fill order". Then give me: a summary of what changed; the check results; step-by-step manual test steps for a non-developer using admin (books a slot, tries a clashing booking, adds a house ad, cancels a booking and checks the audit log), moderator (refused) and adult_writer (sees the sponsor, then the house ad after the booking ends); and the pull request description from .github/pull_request_template.md.
```

## S1-E13 Privacy and data rights

### S1-E13-01 Privacy settings
Must · M · After March · Depends on: S1-E5-05 (the messaging control is added by S1-E9-04)

```text
We are working on story S1-E13-01 (Privacy settings) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e13-privacy-and-data-rights.md.

CONTEXT
- Already merged: S1-E5-05 (profile and the public profile view). "Who can message me" belongs to S1-E9-04: if it is merged, reuse that setting (the board says it is the same one as in Messages); if not, leave it out and note a follow-up.
- Decisions that apply: under-18s are private by default: library private, online status off (architecture 1.10, Q50). Adults can never message under-16s; 16 and 17-year-olds choose whether adults can message them, off by default; only they can change it (Q6, Q13). Follower lists are visible to the writer only (Q50).
- Designs: design/boards/Settings.dc.html, Privacy tab (screen 6.3); design/renders/desktop/Settings.jpg and design/renders/phone/Settings.jpg. Copy the option labels and the "Default for under 18" tags from the board. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces (1.7.3 and 1.7.4 group F): real: `profiles.settings`, B02 `age_band()`, the public profile view from S1-E5-05. Nothing to mock.
- Watch-outs: GDPR Art 25(2), privacy by default. Each choice must be enforced in the database (RLS and the public views), not only hidden in the interface. Online status is opt-in.
- Stop and ask me about each of these:
  - The story sets defaults only for under-18s; the defaults for adults aren't written down (check with Robert).
  - The board's "Where you are" block (country and an optional county) isn't in this story's criteria. Leave it out unless I say otherwise (check with Robert).
  - Library visibility needs the library (S1-E4-03) and online status needs a presence feature no story describes. Tell me what exists and what you would store now.
  - What happens to the settings when a 17-year-old turns 18 isn't stated.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: settings keys or columns, how defaults are set by age at account creation and the RLS changes to the public views (who can see what, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it, with an allowed and a denied pgTAP test per policy.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E13-01: Privacy settings". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer using teen_17 and kid_14_ok (every setting starts at its most private value), adult_writer (change each setting, then view the profile signed out and as teen_17);
- the pull request description from .github/pull_request_template.md.
```

### S1-E13-02 Download my data
Must · M · March MVP (wave 5) · Depends on: S1-E3-02, S1-E7-01 for the ready notice (email until then); each later content type, such as messages from S1-E9-01, adds itself to the export

```text
We are working on story S1-E13-02 (Download my data) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e13-privacy-and-data-rights.md.

CONTEXT
- Already merged: S1-E3-02 (chapters), S1-E7-01 (in-app notifications, for the ready notice). In the March order, S1-E6-01 to 05, S1-E10-01 and S1-E2-03 are merged too. Forums, messages and certificates come after March, so each later content type must be able to add itself.
- Decisions that apply: a 13 to 15-year-old can request their own export from their own signed-in account; a parent or guardian asking for a child's data goes through S1-E11-09 and the consent record, not this screen (Q27). The user ID is shown only to its owner.
- Designs: design/boards/Settings.dc.html, "Download my data" panel with its idle, preparing and ready states; design/renders/desktop/Settings.jpg and design/renders/phone/Settings.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B28 `exports` and the `export-build` job contract, B14 `exports` bucket, B22 notifications. Email goes to Mailpit locally (B09). Nothing else to mock.
- Watch-outs: GDPR Art 15 and Art 20; one month to respond (Art 12(3)). The link needs sign-in and expires after seven days; storage policies must stop anyone but the owner reaching the file. S1-E13-04 purges expired exports. No user content or emails in logs (rule 12). Word copies of stories are S1-E13-05 and S1-E11-09, not this story.
- Stop and ask me about each of these:
  - The story says machine-readable JSON plus readable HTML; the board copy says "Word (.docx) files in one ZIP". Which wins? (check with Robert)
  - The story's list doesn't name likes, emoji reactions, private downvotes, follows, blocks or reading records. Ask before including or leaving them out (check with Robert).
  - S1-E11-09a comes right after this story and reuses this export for staff-handled requests: plan the job so it can run for any user through a staff function, and never build a second export.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change, including the job and the export's file layout.
2. Migrations: tables, columns, indexes, storage policies and RLS policies (who can select, insert, update or delete, and why); how repeated requests are limited.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E13-02: Download my data". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer using adult_writer (request, notice, download, open the files), kid_14_ok (requests their own export) and teen_17 (tries adult_writer's link and is refused);
- the pull request description from .github/pull_request_template.md.
```

### S1-E13-03 Delete my account in the app
Must · M · March MVP (wave 5) · Depends on: S1-E2-05 (offer the export from S1-E13-02 once it exists)

```text
We are working on story S1-E13-03 (Delete my account in the app) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e13-privacy-and-data-rights.md.

CONTEXT
- Already merged: S1-E2-05 (reuse its fresh sign-in), S1-E13-02 (offer "Download my data first"); in the March order also S1-E6-01 (comments) and S1-E10-03a and 04 (cases).
- Decisions that apply: when an account is deleted, its forum posts stay as "Deleted user"; stories, chapters and comments are deleted (Q47). Every account has a permanent user ID that is never given to anyone else (16 Oct 2026). March is web only, so "in the app" means the web app.
- Designs: design/boards/Settings.dc.html, "Delete account" tab and its second panel (log in again to confirm), plus the web route ghemotoc.com/delete-account named on the board; design/renders/desktop/Settings.jpg and design/renders/phone/Settings.jpg. Show only the sign-in methods that exist (others are S1-E2-09, after March). Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B28 deletion job on B17 `pg_cron`, B02 `account_state()` and `is_active_member()`, B05 auth. Tests call the job function directly (1.7.5).
- Watch-outs: GDPR Art 17; Apple 5.1.1(v) and Google Play's deletion rule want an in-app and a web route (check before relying on them). Kept forum posts need a legal basis and a privacy-notice line (lawyer's list). Forums don't exist in March: make the "Deleted user" rule ready for them and note it as a follow-up. No emails in logs (rule 12).
- Stop and ask me about each of these:
  - Nothing marks "content under an open legal case" yet. Ask me what counts (for example an open case in B26 or an authority order) before building the hold (check with Robert).
  - How you will prove a user ID is never reused: propose it, don't pick silently.
  - Whether an under-16's deletion involves the parent or guardian isn't stated (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: the deactivated and pending-deletion states, the purge job, what each table does on purge and RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it, including a Playwright test of the whole flow.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E13-03: Delete my account in the app". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer using adult_writer (delete, cancel by logging in, delete again, run the purge), teen_17 (checks adult_writer's profile, stories and comments are gone) and the web route while signed out;
- the pull request description from .github/pull_request_template.md.
```

### S1-E13-04 Retention schedule and log minimisation
Must · M · March MVP (wave 5) · Depends on: S1-E1-02

```text
We are working on story S1-E13-04 (Retention schedule and log minimisation) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e13-privacy-and-data-rights.md.

CONTEXT
- Already merged: S1-E1-02. In the March order, S1-E2-01, S1-E10-02 (public report form), S1-E13-02 and S1-E13-03 are merged too.
- Decisions that apply: IP addresses are stored scrambled and kept 30 days (Q48). Reports, with the reporter's name and email, are kept 3 years after the report closes, then deleted (canvas comment, 17 Oct 2026). Never log emails, IP addresses or user content (CLAUDE.md rule 12).
- Schedule from the story (canvas 8.7): soft-deleted content 30 days, unverified accounts 7 days, expired exports 7 days. design/boards/AdminMetrics.dc.html ("Retention") shows it, but that screen is S1-E11-04, so build no screen here.
- Back-end pieces: real: B17 scheduled jobs, B28 `exports`. Tests call each job's SQL function directly (1.7.5). Nothing to mock.
- Files: docs/retention.md and the record of processing change in the same pull request as any schedule change.
- Watch-outs: GDPR Art 5(1)(e) and Art 30. A scrambled IP address is still personal data, so it stays in the record of processing. The hash key lives only in a secret store (rule 2).
- Stop and ask me about each of these:
  - How often the hash key changes isn't decided (check with Robert).
  - List every place an IP address is stored today (our tables, edge functions, Supabase Auth's own logs) before changing anything. Don't change platform settings without asking.
  - I don't know of a record of processing file yet. Propose where it lives (check with Robert).
  - Whether the 3-year report purge is built here or later.
  - The board's rows marked Proposal or OPEN (support tickets, class space posts) are not decided: list them in docs/retention.md as not decided and build no job for them.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change, including docs/retention.md.
2. Migrations: the scrambling function, the nightly jobs and their schedules and any RLS changes (who can read the scrambled values, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it, including one that fails when a raw IP address is stored.
4. New i18n keys if any, analytics events and moderation hooks (likely none; say so).
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E13-04: Retention schedule and log minimisation". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer: one command that backdates a soft-deleted comment by adult_writer, an unconfirmed new sign-up and an expired export, runs the nightly job and shows what was deleted;
- the pull request description from .github/pull_request_template.md.
```

### S1-E13-05 Download my stories
Should · S · March MVP (wave 5) · Depends on: S1-E13-02, S1-E11-09 (09a makes the Word files, 09b the PDF)

```text
We are working on story S1-E13-05 (Download my stories) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e13-privacy-and-data-rights.md.

CONTEXT
- Already merged: S1-E13-02 (Download my data and its job), S1-E11-09a (`story-export` and the Word files). S1-E11-09b (PDF) comes after March: offer Word only and add PDF when 09b lands. Also merged in the March order: S1-E10-06 (sanctions) and S1-E7-01 (notifications).
- Decisions that apply: Word (.docx) from the first version, no EPUB (Q28, Q29). 13 to 15-year-olds can use it on their own (Q27). The user ID in the files is the writer's own data and is shown only to them.
- Designs: design/boards/Settings.dc.html, "Download my stories" block inside "Download my data" (story picker with "All my stories", "Get Word files"); design/renders/desktop/Settings.jpg and design/renders/phone/Settings.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B28 `story-export` and `exports`, B14 `exports` bucket, B22 notifications. If Word is still the B28 placeholder file, stop and tell me.
- Watch-outs: same contents as S1-E11-09 (every chapter including drafts, the dates and the user ID), so reuse its builder; never write a second one. The link needs sign-in and stops working after seven days; S1-E13-04 purges the files. A suspended writer can still download (S1-E10-06), so the request must not be gated by `is_active_member()`; check how S1-E10-06 handles this. GDPR Art 20 is met by S1-E13-02; this is a convenience on top.
- Stop and ask me about each of these:
  - The 24-hour rule (offer the earlier files instead of new ones) is a proposal (check with Robert).
  - Whether a banned writer, not only a suspended one, can download isn't stated (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: any columns on `exports`, storage and RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E13-05: Download my stories". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer using adult_writer (one story, then all stories; check drafts, dates and Romanian letters in Word), suspended_user (can still download), kid_14_ok (own stories) and teen_17 (tries adult_writer's link and is refused);
- the pull request description from .github/pull_request_template.md.
```

## S1-E14 Legal pages and compliance

### S1-E14-01 Terms, privacy notice and community guidelines
Must · M · March MVP (wave 1) · Depends on: S1-E1-04

```text
We are working on story S1-E14-01 (Terms, privacy notice and community guidelines) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e14-legal-pages-and-compliance.md.

CONTEXT
- Already merged: S1-E1-04 (and S1-E1-01 to 03). This story comes before sign-up in the March order: S1-E2-01 is next and stores which versions a new account accepted, and parental consent (S1-E2-03) comes later. Build the legal documents, their versions and the Legal centre now, and test the account criteria (accept before posting again; 16 and 17-year-olds accept without a parent) with the seed personas from S1-E1-02. The sign-up and Settings links are wired by those stories: list them as follow-ups.
- Decisions that apply: consent is the legal basis; under-16s need a "parent or guardian" (Q15, Q8). 16 and 17-year-olds accept the Terms without a parent (17 Oct 2026, 10:23). The minors-in-fiction rule goes in the guidelines (17 Oct 2026, 10:36). Staff never edit a writer's words; what they may change is architecture 1.8.5 (Q14). The privacy notice facts in the story (Sightengine and Arachnid Shield, country from the connection, IP addresses 30 days, deleted accounts) are decided (16 Oct 2026). Copy protection "makes copying harder" (Q9). A lawyer reviews everything before March.
- Designs: design/boards/Legal.dc.html (7.2: tabs, short and full text, the updated-terms notice, version history) and design/boards/Main.dc.html (2.1, the links at sign-up); renders in design/renders/desktop and design/renders/phone for both. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B06 legal documents and consents, B02 account gate (for "accept before posting again"), B05. Seed one version of each document (1.7.4 group G).
- Content: content/legal/01-terms-of-use.md, 02-privacy-notice.md, 03-community-guidelines.md (seed or CMS content, never hard-coded).
- Watch-outs: DSA Art 14, including 14(3) on explaining terms to minors; GDPR Arts 12 to 14. Civil Code art. 41 risk for 16 and 17-year-olds is on the lawyer's list. Don't write or change legal wording: if a draft misses something a criterion needs, list the gap.
- Stop and ask me about each of these:
  - Only English drafts exist; Romanian versions follow the lawyer's review (content/README.md). How do we meet "exists in Romanian" now? (check with Robert)
  - The drafts hold [placeholders] and OPEN notes (for example L1 on consent withdrawal and L2 on parent verification). Show them as they are or hide them? (check with Robert)
  - Who marks a new version as a material change.
  - Where the settings link goes if Settings doesn't exist yet.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: document versions, acceptances, how the account gate blocks posting until a new version is accepted and RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E14-01: Terms, privacy notice and community guidelines". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer: a signed-out visitor (footer links, both languages), teen_17 (accepts at sign-up without a parent), kid_14_waiting (told a parent or guardian must agree) and adult_writer (sees the new-version notice and can't post until accepting);
- the pull request description from .github/pull_request_template.md.
```

### S1-E14-02 Contact points and company details
Must · S · March MVP (wave 1) · Depends on: S1-E14-01

```text
We are working on story S1-E14-02 (Contact points and company details) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e14-legal-pages-and-compliance.md.

CONTEXT
- Already merged: S1-E14-01 (Legal centre and B06).
- Decisions that apply: one web form takes every report, including authority removal orders; it is our TCO contact point, in English and Romanian (16 Oct 2026). Users reach us through Contact us, backed by a ready-made EU helpdesk (Q60, refined 17 Oct 2026). Languages accepted: Romanian and English. The footer reads "An app by The Magic Coffin".
- Designs: design/boards/Legal.dc.html, the "Contact and company details" tab and the "Company details" block ("These go live once the company is registered"); design/renders/desktop/Legal.jpg and design/renders/phone/Legal.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Content: content/legal/04-contact-and-company-details.md, loaded like the other legal documents.
- Back-end pieces: B06 (the page is a Legal centre document). Nothing to mock.
- Watch-outs: DSA Art 11 and Art 12; TCO Regulation. In the March order the report form (S1-E10-02) and Contact us (S1-E14-04) are built later. The apps criterion ("one tap away in settings") applies when the apps exist; on the web, link the page from Settings if that screen exists.
- Stop and ask me about each of these:
  - Company details are OPEN (SRL or AB, and when, Q55). Keep the board's placeholders; never invent details.
  - The draft has [authorities email] and [privacy email] placeholders. Ask me for them; don't make up addresses.
  - How the links to the report form and Contact us behave until those pages exist (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: likely only the seeded document; say if anything else changes, with RLS policies and why.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E14-02: Contact points and company details". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer: a signed-out visitor (opens the page from the footer in Romanian and English, checks the authority and user contact points and the languages) and adult_writer (opens it from Settings, if Settings exists);
- the pull request description from .github/pull_request_template.md.
```

### S1-E14-03 Accessibility statement and no-cookie check
Should · S · After March · Depends on: S1-E14-01

```text
We are working on story S1-E14-03 (Accessibility statement and no-cookie check) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e14-legal-pages-and-compliance.md.

CONTEXT
- Already merged: S1-E14-01 (Legal centre and B06), S1-E1-01 (CI, architecture 1.12).
- Decisions that apply: WCAG 2.2 AA is the target (CLAUDE.md rule 9). No tracking; no third-party scripts or cookies without an ADR; the only ad code allowed is the non-personalised network in S1-E12-04 (rule 7).
- Designs: design/boards/Legal.dc.html, the "Accessibility statement" tab; design/renders/desktop/Legal.jpg and design/renders/phone/Legal.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Content: content/legal/05-accessibility-statement.md, loaded like the other legal documents. Known gaps are added after the first audit.
- Back-end pieces: B06. Nothing to mock.
- The CI check: the build fails if a third-party script or a non-essential cookie or device storage (cookies, localStorage, sessionStorage, IndexedDB, cache) appears without review. Fit it into the existing CI and Playwright run; don't build a second pipeline. Propose how "reviewed" is recorded (for example an allow-list file that changes only in a reviewed pull request) and wait for my approval.
- Watch-outs: the EAA exempts microenterprises providing services, but we apply WCAG 2.2 AA anyway. ePrivacy Art 5(3) covers local storage too, so we need no cookie banner only while all storage is strictly necessary. List every cookie and storage key the app sets today and why each is strictly necessary.
- Stop and ask me about each of these:
  - The contact for accessibility problems: Contact us (S1-E14-04) or an address? The draft has placeholders (check with Robert).
  - Any storage you find that isn't clearly necessary, for example from S1-E15-01 analytics or S1-E12-04 ads if they are merged.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change, including the CI step and the allow-list.
2. Migrations: likely only the seeded document; say if anything else changes, with RLS policies and why.
3. A table mapping each acceptance criterion to the test(s) that prove it, including a test that fails on purpose when an unlisted cookie or script is added.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E14-03: Accessibility statement and no-cookie check". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer: a signed-out visitor opens the statement in both languages; then where to look on GitHub to see the check fail on a test branch that adds a cookie, and pass again without it;
- the pull request description from .github/pull_request_template.md.
```

### S1-E14-04 Contact us with a ready-made EU helpdesk
Must · S · March MVP (wave 5) · Depends on: S1-E14-02, S1-E1-04

```text
We are working on story S1-E14-04 (Contact us with a ready-made EU helpdesk) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e14-legal-pages-and-compliance.md.

CONTEXT
- Already merged: S1-E14-02, S1-E1-04; in the March order also S1-E10-02 and S1-E11-09a.
- Decisions that apply: support tickets live inside the admin site, linked to support@ghemotoc.com, with a ready-made external helpdesk behind it through its API (17 Oct 2026, refines Q60).
- Designs: design/boards/Settings.dc.html, the "Contact us" panel ("Ask us something": topic, message, email, the line pointing to the report form); design/renders/desktop/Settings.jpg and design/renders/phone/Settings.jpg; "Contact us" in every footer. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: our own edge function receives the form (a proposal in the story); B09 email goes to Mailpit locally. Mock: the helpdesk call is a stub behind one typed contract, listed in docs/mocks.md.
- Watch-outs: DSA Art 12; GDPR Art 12(2). A signed-in sender's message carries only their handle and user ID, never year of birth or age check result. No tracking script or cookie from the helpdesk on our pages. Don't log emails or message text (rule 12). Rate-limit the signed-out form (DoD security). The helpdesk is a new processor (DoD privacy).
- Stop and ask me about each of these:
  - The helpdesk product is OPEN (open questions 34t) and the email provider is OPEN (Q49). Don't choose either.
  - S1-E11-13 (tickets in the admin site) is after March and proposes that, for March, messages arrive at support@ghemotoc.com and staff answer from that mailbox. Confirm that and say who creates the reference number (check with Robert).
  - How staff open a data request (S1-E11-09a) from a "My data" message.
  - The board pre-fills the account email for signed-in users and shows "Your support requests"; the story asks for email only when signed out and has no request list (that list is S1-E11-13). Confirm scope (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change, including the edge function and its zod contract.
2. Migrations, if any (for example a rate-limit record), with RLS policies and why; say if you store nothing.
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E14-04: Contact us with a ready-made EU helpdesk". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer: a signed-out visitor (sends a message, sees the acknowledgement in Mailpit), adult_writer and kid_14_ok (send from Settings; check only handle and user ID go with it) and the support staff persona (where the message arrives);
- the pull request description from .github/pull_request_template.md.
```

## S1-E15 Analytics and the March test

### S1-E15-01 Cookieless product analytics
Must · S · After March · Depends on: S1-E1-01

```text
We are working on story S1-E15-01 (Cookieless product analytics) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e15-analytics-and-the-march-test.md.

CONTEXT
- Already merged: S1-E1-01 (CI). If S1-E14-03 (no-cookie check) is merged, the analytics code must pass it.
- Decisions that apply: no tracking; no third-party script or cookie without an ADR (CLAUDE.md rule 7). Events are named object_action and listed in docs/analytics-events.md, with no personal data. The March numbers come from our own database (S1-E15-02), which is why this story moved after March.
- Designs: no user-facing screen. The "Product analytics" panel on design/boards/AdminMetrics.dc.html belongs to S1-E11-04, not this story.
- Back-end pieces: B32 cookieless analytics. It is off locally and in tests and on for staging, with scrubbing (1.7.5).
- Watch-outs: no cookies, no user IDs, no personal data, EU hosting. The tool is a new processor: DPA, processor list, privacy notice and record of processing in the same pull request, plus an ADR. Every event sent must be on the catalogue; S1-E15-03 adds the CI check.
- Stop and ask me about each of these:
  - The tool is OPEN (Q49). My recommendation, not a decision, is Plausible or Umami Cloud (open questions 34r). Don't choose. Plan a small adapter in src/lib/ with a no-op default so the choice can land late, and wait.
  - Whether the script loads from the vendor's domain or ours (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change, including the adapter, the flag that switches it on and the ADR.
2. Migrations: none expected; say so if that changes.
3. A table mapping each acceptance criterion to the test(s) that prove it (for example: no cookie or storage set, no user ID or handle in any payload).
4. New i18n keys (likely none), the first events for docs/analytics-events.md and moderation hooks (none expected).
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E15-01: Cookieless product analytics". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer: as adult_writer, browse a few pages on staging and see the events arrive in the tool, then check in the browser that no cookie or storage was set;
- the pull request description from .github/pull_request_template.md.
```

### S1-E15-02 First-party metrics for the March test
Must · M · March MVP (wave 5) · Depends on: S1-E4-01 (daily `chapter_reads` totals), S1-E3-03; S1-E4-03 once it lands (it moved after March, section 1.13)

```text
We are working on story S1-E15-02 (First-party metrics for the March test) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e15-analytics-and-the-march-test.md.

CONTEXT
- Already merged: S1-E4-01 (daily `chapter_reads`), S1-E3-03; in the March order also S1-E2-07, S1-E11-01 (admin shell) and S1-E2-10. Open markets are seeded (1.7.9).
- Decisions that apply: the target is 20 writers publishing, from any open market (16 Oct 2026). The 200 readers and 30% return targets are proposals. Staff sign in with Google Workspace only. Who sees metrics follows architecture 1.8.3: owner and admin view; support none; moderators see only queue numbers, which aren't part of this story.
- Designs: design/boards/AdminMetrics.dc.html (8.7), the "March test numbers" block; design/renders/desktop/AdminMetrics.jpg and design/renders/phone/AdminMetrics.jpg. Keep the board's line that the targets and the definition are proposals. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: real: B17 daily metrics job and the metrics table (1.7.4 group H). Mock while building: seeded totals.
- Watch-outs: aggregates only; no individual-level export and no per-person rows reachable from the screen. Staff reads are checked in the database (`is_staff_session()` and the role).
- Stop and ask me about each of these:
  - The return rate definition is a proposal (open questions 23) (check with Robert).
  - The return rate needs to know whether the same reader opened chapter N and then N+1. If `chapter_reads` holds only daily totals, it can't. Before building, tell me what it holds, what you'd need and how that fits "aggregated only".
  - "Signed-up readers": the board says accounts that opened at least one chapter. Confirm (check with Robert).
  - The board's other panels (readers per day, sign-ups by age group, age checks, reports by tier, product analytics, compliance log, retention) look like S1-E11-04, after March. Confirm which are in scope (check with Robert).

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: the metrics table, the daily job and its SQL and RLS policies (who can select, and why; nobody inserts but the job).
3. A table mapping each acceptance criterion to the test(s) that prove it, including a denied test for support and moderator.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E15-02: First-party metrics for the March test". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer: adult_writer publishes a chapter, teen_17 and kid_14_ok read it, run the daily job, then owner and admin see the numbers while support and moderator are refused;
- the pull request description from .github/pull_request_template.md.
```

### S1-E15-03 Event catalogue
Must · S · After March · Depends on: S1-E15-01

```text
We are working on story S1-E15-03 (Event catalogue) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e15-analytics-and-the-march-test.md.

CONTEXT
- Already merged: S1-E15-01 (cookieless analytics and its adapter).
- Decisions that apply: events are named object_action, listed in docs/analytics-events.md and carry no personal data (CLAUDE.md conventions). Architecture 1.12 lists "the analytics event catalogue check" on every pull request. First check whether S1-E1-01 or S1-E15-01 already made the file or the check; extend what exists, never duplicate it.
- Designs: none. The "Event catalogue" panel on design/boards/AdminMetrics.dc.html is S1-E11-04.
- Back-end pieces: B32. Nothing to mock.
- What the catalogue holds per event: its object_action name, its properties and where it fires.
- Watch-outs: the point is to keep personal data out of analytics. The story asks only that unknown event names fail the build. Ask before adding checks on property values.
- Stop and ask me about each of these:
  - How CI finds event names in the code. Propose a way (for example one typed helper that accepts only catalogue names) and wait for my approval.
  - Any event already in the code that isn't on the list, or that carries something personal.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change: docs/analytics-events.md, the check script and the CI step.
2. Migrations: none expected; say so if that changes.
3. A table mapping each acceptance criterion to the test(s) that prove it, including one that fails on an unknown name.
4. New i18n keys (none expected) and the events you will list.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E15-03: Event catalogue". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer: where to read the catalogue on GitHub, and where to see the check fail on a test branch that adds a made-up event name and pass once it is removed (no seed personas needed);
- the pull request description from .github/pull_request_template.md.
```

## S1-E16 Platforms and app stores

### S1-E16-01 Installable web app
Should · M · After March · Depends on: S1-E1-03

```text
We are working on story S1-E16-01 (Installable web app) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e16-platforms-and-app-stores.md.

CONTEXT
- Already merged: S1-E1-03 (design tokens and app shell). The offline state comes from S1-E1-05 (7.4); if it isn't merged, tell me before building your own.
- Decisions that apply: web first; the Tauri desktop app and the phone wrapper come later and this story adds neither. The web hosting provider is OPEN, so leave deploy steps switched off. No third-party scripts (CLAUDE.md rule 7). The app is called Ghemotoc, "An app by The Magic Coffin".
- Designs: design/boards/GetApp.dc.html (7.1: "Use Ghemotoc in your browser" and the add-to-home-screen steps per device) and design/boards/States.dc.html (7.4, the offline state); renders in design/renders/desktop and design/renders/phone for both. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: none.
- Watch-outs: the service worker and its cache are device storage (ePrivacy Art 5(3)), so keep them to what is strictly necessary and add them to the S1-E14-03 allow-list if that check exists. Cache only the app shell, never chapters or other user content, unless I say otherwise (check with Robert): copy protection (S1-E4-06) and offline reading in the apps (S1-E4-08) are other stories.
- Stop and ask me about each of these:
  - App icon files: use one from design/assets if it exists; if not, ask me.
  - The name and colours shown on the home screen if the boards don't give them.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change: the manifest, icons, the service worker and how it updates.
2. Migrations: none expected; say so if that changes.
3. A table mapping each acceptance criterion to the test(s) that prove it, including an offline Playwright test.
4. New i18n keys (ro and en), analytics events and moderation hooks (none expected).
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E16-01: Installable web app". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer: as adult_writer on an Android phone and an iPhone, add Ghemotoc to the home screen, open it full screen, switch on airplane mode and see the offline state;
- the pull request description from .github/pull_request_template.md.
```

### S1-E16-02 Desktop apps for Windows, macOS and Linux
Must · L · After March · Depends on: S1-E4-01

```text
We are working on story S1-E16-02 (Desktop apps for Windows, macOS and Linux) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e16-platforms-and-app-stores.md.

CONTEXT
- CLAUDE.md says Tauri 2 comes after March and not to add it yet. This story is that step: confirm with me that the March test is over before you start.
- Already merged: S1-E4-01. The age check (S1-E2-08) returns through the deep link and "Open in the app" (S1-E4-09) uses the opener, both through the `platform` adapter.
- Decisions that apply: March was web only; desktop comes after (34o). Screens never import Tauri; everything goes through src/lib/platform/ (CLAUDE.md rule 16, architecture 1.7.5). Signing is budgeted (Q53); the Apple Developer Program and the Windows certificate go in the company's name where possible, the company is OPEN (Q55) and neither exists yet (1.11).
- Designs: design/boards/GetApp.dc.html (7.1: Windows .msi, macOS .dmg, Linux AppImage and .deb; "signed by [Company name]"; updates install by themselves); design/renders/desktop/GetApp.jpg and design/renders/phone/GetApp.jpg. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21). Website download buttons read the release list the updater publishes (1.7.4 group A).
- Back-end pieces: B33 desktop shell (deep link, opener, single instance, updater). Content protection is S1-E4-06b; leave it out.
- Watch-outs: builds run only on a tagged release (1.12), macOS on a macOS runner. Signing keys live only in GitHub secrets; never ask me to paste them into the chat.
- Stop and ask me about each of these:
  - This is an L story; the Definition of Ready says split it first and the pack gives no split. Propose one (check with Robert).
  - The desktop camera for the Yoti check on macOS and Linux is OPEN (open questions 4d).
  - The custom URL scheme name isn't decided (check with Robert).
  - Which steps can run unsigned until the signing accounts exist.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change: the Tauri project, the platform adapter's Tauri version, the release workflow and the updater set-up.
2. Migrations: none expected; say so if that changes.
3. A table mapping each acceptance criterion to the test(s) or release checks that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point, and the split you propose. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E16-02: Desktop apps for Windows, macOS and Linux". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer: install each build, sign in as adult_writer and read a chapter, open a chapter link from the browser, start the age check as pending_check and come back to the app, then install an update;
- the pull request description from .github/pull_request_template.md.
```

### S1-E16-03 iOS and Android apps with deep links
Must · L · After March · Depends on: S1-E16-01

```text
We are working on story S1-E16-03 (iOS and Android apps with deep links) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e16-platforms-and-app-stores.md.

CONTEXT
- First check: the mobile wrapper is OPEN (Q40: Capacitor, Tauri 2 mobile or Expo, decided with a programmer). If docs/decisions.md doesn't record a choice, stop after reading and ask me. Don't plan around a guess.
- Already merged: S1-E16-01 (installable web app), S1-E4-04 (teaser). The apps' capture rules come from S1-E4-06 (06b is the apps part).
- Decisions that apply: in the apps, each platform's own protection blanks the screen during screenshots and recordings (Q41), described as "makes copying harder" (Q9). Under-18s get quiet hours for push (Q50). Apple and Google developer accounts open only in the company's name (1.11). No external purchase links in iOS where Apple restricts them (CLAUDE.md rule 11). Screens never import native code directly; use src/lib/platform/ (rule 16).
- Designs: design/boards/GetApp.dc.html ("iPhone and Android apps", links open straight in the app) and design/boards/Teaser.dc.html (3.8, the install prompt); renders in design/renders/desktop and design/renders/phone for both. Match them at 390, 768 and 1440 px (CLAUDE.md rule 21).
- Back-end pieces: B22 push tokens (a stub until this story), B19 teaser, the platform adapter extended for phones.
- Watch-outs: Apple's minimum functionality rule: the app must offer native value (push, offline or capture protection), not a web page in a frame. Deep links need files served from ghemotoc.com; the web host is OPEN, so tell me what the host must serve.
- Stop and ask me about each of these:
  - This is an L story with no split in the pack. Propose one (check with Robert).
  - The developer accounts don't exist yet (they need the company (OPEN, Q55) and a D-U-N-S number).
  - The push provider isn't decided.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: push tokens and their RLS policies (who can insert, read or delete, and why).
3. A table mapping each acceptance criterion to the test(s) or device checks that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Every OPEN or unclear point, and the split you propose. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E16-03: iOS and Android apps with deep links". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer on a test iPhone and Android phone: adult_writer taps a shared chapter link with and without the app, gets a push notification, tries a screenshot; kid_14_ok checks push waits during quiet hours;
- the pull request description from .github/pull_request_template.md.
```

### S1-E16-04 App store compliance pack
Must · M · After March · Depends on: S1-E10-01, S1-E9-02, S1-E13-03, S1-E14-02

```text
We are working on story S1-E16-04 (App store compliance pack) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md, then the story in docs/stories/s1-e16-platforms-and-app-stores.md.

CONTEXT
- Already merged: S1-E10-01 (report button), S1-E9-02 (block and report in messages), S1-E13-03 (in-app and web account deletion), S1-E14-02 (published contact details). The builds come from S1-E16-03; if it isn't merged, stop and tell me.
- Decisions that apply: minimum age 13. Ratings All ages, 13+, 16+ and 18+, each hidden from anyone younger (Q17), are the content filtering. No external purchase links where Apple restricts them (CLAUDE.md rule 11); Stage 1 has no supporter payments. No tracking.
- Designs: no board. The output is mostly a checklist and the store answers, plus a fix for any gap the check finds. The web deletion link is the route from S1-E13-03 (ghemotoc.com/delete-account on the Settings board).
- Back-end pieces: none new expected.
- What to produce: for each acceptance criterion, the evidence (screen, story and test); draft answers for Apple's privacy label and Google's data safety form that match the SDKs actually in the build; the content rating answers; and instructions for the reviewer demo account.
- Watch-outs: Apple 1.2, 3.1.1 and 5.1.1(v) (check 5.1.1(v) before relying on it); Google Play's user-content and account deletion policies. A new personal Google Play account must run a closed test (currently 12 testers for 14 days); an organisation account needs the company (OPEN, Q55) and a D-U-N-S number. Check both rules when the accounts are opened. Never create or store a real password for the demo account: describe it and I create it.
- Stop and ask me about each of these:
  - Where the pack lives in the repository (check with Robert).
  - The age rating: 13+ or higher.
  - Any SDK or data flow in the build you can't explain.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: none expected; say so if a gap needs one, with RLS policies and why.
3. A table mapping each acceptance criterion to its evidence or test.
4. New i18n keys (ro and en) for any gap you fix, analytics events and moderation hooks.
5. Every OPEN or unclear point. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "S1-E16-04: App store compliance pack". Then give me:
- a summary of what changed;
- the check results;
- step-by-step manual test steps for a non-developer in the phone builds: as adult_writer, report a story, find the contact details and delete the account; as blocker, block blocked; as kid_14_ok, check 16+ and 18+ stories are hidden; check no purchase link shows anywhere;
- the pull request description from .github/pull_request_template.md.
```

## Review prompt (after every pull request, in a fresh session)

```text
Review the diff of pull request #[NUMBER] against CLAUDE.md, docs/definition-of-done.md and the story's acceptance criteria in docs/stories/. Compare every screen it touches with its board in design/boards/. Check that a junior developer could read and change the code without help, following the "Readable code" section of CLAUDE.md (names, small functions, file and doc comments, no clever shortcuts, errors handled). List anything missing or wrong, most serious first. Don't change any code.
```
