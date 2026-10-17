# Every prompt to give Claude Code

One story per cloud session, in this order. Start each session on the WebApp repository in **Plan** mode, paste the prompt, read the plan, then switch to **Accept edits**. After the pull request, run the review prompt at the end of this file in a fresh session.

Generated on 17 October 2026 from docs/ (CTO pack sections 1.7.4, 1.7.6 and 1.13). The order follows the build waves; a story whose dependencies aren't merged yet waits. Sizes are estimates: S about 3 hours, M about 12, L about 30.

## Files: nothing for you to upload

Everything Claude Code needs is already in the repository (Ghemotoc/WebApp), pushed on 17 October 2026:

| Folder | What it holds |
| --- | --- |
| `CLAUDE.md` | The rules Claude Code reads at the start of every session |
| `docs/` | Architecture, Definition of Ready and Done, every story, decisions, open questions, the lawyer's list, ADR 0001 |
| `design/boards/` | The HTML source of all 63 canvas boards, plus `canvas.json` |
| `design/renders/` | A desktop picture of every board and a phone picture of every product screen |
| `design/assets/` | Every picture the boards use (doodles, covers, photos) |
| `content/` | Draft legal texts, safety contacts by country and the public-domain classics lists |
| `prompts/` | This file, the first three session prompts, the story template and the review prompt |
| `docs/history/` | How everything was made, including every brief Claude used (a record, not instructions) |

What stays out of the repository, on purpose: passwords, the Supabase database password and API keys. They live in your password manager, and in GitHub or Supabase secret stores if a session asks for them.

**When the canvas changes:** ask Claude (in the WattPad Better Be Gone project) to refresh `design/` in the repository, so Claude Code always builds from the latest boards.

**March MVP: 49 stories.**

| # | Story | Title | Priority | Size | Wave |
| --- | --- | --- | --- | --- | --- |
| 1 | S1-E1-01 | Repository, environments and CI skeleton | Must | M | Wave 0: Foundations |
| 2 | S1-E1-03 | Design tokens, themes and app shell | Must | M | Wave 0: Foundations |
| 3 | S1-E1-02 | Database baseline with deny-by-default row-level security | Must | M | Wave 0: Foundations |
| 4 | S1-E1-04 | Romanian and English interface | Must | M | Wave 0: Foundations |
| 5 | S1-E2-01 | Sign up with email | Must | M | Wave 1: Identity |
| 6 | S1-E2-02 | Year of birth at sign-up | Must | M | Wave 1: Identity |
| 7 | S1-E2-04 | Username and optional pen name | Must | M (was S; the word lists and look-alike checks add work) | Wave 1: Identity |
| 8 | S1-E2-05 | Sign in, sessions and account recovery | Must | S | Wave 1: Identity |
| 9 | S1-E2-07 | Staff roles with mandatory two-factor sign-in | Must | M | Wave 1: Identity |
| 10 | S1-E2-10 | Country from the connection at sign-up | Should | S | Wave 1: Identity |
| 11 | S1-E14-01 | Terms, privacy notice and community guidelines | Must | M | Wave 1: Identity |
| 12 | S1-E14-02 | Contact points and company details | Must | S | Wave 1: Identity |
| 13 | S1-E2-03 | Parental consent for under-16s | Must | M | Wave 1b: Age gate (critical) |
| 14 | S1-E2-08 | Age check with Yoti | Must | L (split before building: 08a hosted check, deep link and webhook; 08b retries, manual check and appeal) | Wave 1b: Age gate (critical) |
| 15 | S1-E3-01 | Create a story | Must | M | Wave 2: Write and read |
| 16 | S1-E3-02 | Chapter editor with autosave | Must | L | Wave 2: Write and read |
| 17 | S1-E3-03 | Publish, unpublish and schedule chapters | Must | M | Wave 2: Write and read |
| 18 | S1-E3-05 | Story status and settings | Must | S | Wave 2: Write and read |
| 19 | S1-E3-06 | Ratings and labels: age rating, fan fiction, parody and AI assistance | Must | S | Wave 2: Write and read |
| 20 | S1-E4-01 | Chapter reader | Must | L | Wave 2: Write and read |
| 21 | S1-E4-04 | Web teaser for shared links | Must | M | Wave 2: Write and read |
| 22 | S1-E4-06a | Copy protection and traceability | Should (06a Must for March) | L (split: 06a the web, S, in the March MVP; 06b the apps, after March) | Wave 2: Write and read |
| 23 | S1-E5-05 | Writer profile page | Must | M | Wave 2: Write and read |
| 24 | S1-E10-01 | Report button on everything | Must | M | Wave 3: Safety and staff |
| 25 | S1-E10-02 | One web form for all reports, including authority removal orders | Must | M | Wave 3: Safety and staff |
| 26 | S1-E10-03a | Moderation queue with priority tiers | Must | L (split: 03a one queue with tiers, deadlines and a decision with a note, M, in the March MVP; 03b grouping, claiming and visible timers, after March) | Wave 3: Safety and staff |
| 27 | S1-E10-04 | Statements of reasons | Must | M | Wave 3: Safety and staff |
| 28 | S1-E10-05 | Picture check on upload | Must | M | Wave 3: Safety and staff |
| 29 | S1-E10-06 | Sanctions and repeat offenders | Must | M | Wave 3: Safety and staff |
| 30 | S1-E10-09 | Terrorist content removal orders | Must | M | Wave 3: Safety and staff |
| 31 | S1-E10-10 | Safeguarding escalation | Must | M | Wave 3: Safety and staff |
| 32 | S1-E11-01 | Admin shell with protected access | Must | M | Wave 3: Safety and staff |
| 33 | S1-E11-02 | User management | Must | M | Wave 3: Safety and staff |
| 34 | S1-E5-01 | Browse by category and tag | Must | M | Wave 4: Social and discovery |
| 35 | S1-E5-02 | Sort options | Must | S | Wave 4: Social and discovery |
| 36 | S1-E5-03 | Popularity ranking | Must | M | Wave 4: Social and discovery |
| 37 | S1-E5-08 | Public website home page | Should (proposal: for the March test a short version is enough, with the hero, the safety lines, the questions and the download buttons; the live rows can follow) | M | Wave 4: Social and discovery |
| 38 | S1-E5-09 | See all page for a shelf | Must | S | Wave 4: Social and discovery |
| 39 | S1-E6-01 | Comment on a chapter | Must | M | Wave 4: Social and discovery |
| 40 | S1-E6-03 | Like a chapter | Must | S | Wave 4: Social and discovery |
| 41 | S1-E6-05 | Follow a writer or a story | Must | S | Wave 4: Social and discovery |
| 42 | S1-E7-01 | In-app notifications | Must | M | Wave 4: Social and discovery |
| 43 | S1-E11-09a | Data requests and story export | Must (GDPR) | L (split before building: 09a the request log, identity check, deadline, the machine-readable copy and the Word files, in the March MVP; 09b the PDF files, after March) | Wave 5: Rights, numbers and shipping |
| 44 | S1-E13-02 | Download my data | Must | M | Wave 5: Rights, numbers and shipping |
| 45 | S1-E13-03 | Delete my account in the app | Must | M | Wave 5: Rights, numbers and shipping |
| 46 | S1-E13-04 | Retention schedule and log minimisation | Must | M | Wave 5: Rights, numbers and shipping |
| 47 | S1-E13-05 | Download my stories | Should | S | Wave 5: Rights, numbers and shipping |
| 48 | S1-E14-04 | Contact us with a ready-made EU helpdesk | Must | S | Wave 5: Rights, numbers and shipping |
| 49 | S1-E15-02 | First-party metrics for the March test | Must | M | Wave 5: Rights, numbers and shipping |

## 1. S1-E1-01 Repository, environments and CI skeleton

Use the dedicated prompt in `prompts/01-session-S1-E1-01.md` (the same text is in the build guide's Files and prompts tab).

## 2. S1-E1-03 Design tokens, themes and app shell

Use the dedicated prompt in `prompts/02-session-S1-E1-03.md` (the same text is in the build guide's Files and prompts tab).

## 3. S1-E1-02 Database baseline with deny-by-default row-level security

Use the dedicated prompt in `prompts/03-session-S1-E1-02.md` (the same text is in the build guide's Files and prompts tab).

## 4. S1-E1-04 Romanian and English interface

```text
We are working on story S1-E1-04 (Romanian and English interface) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E1-01
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: no board of its own; follow the components on /design
- Back-end pieces (architecture 1.7.3): see the story; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E1-04, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 5. S1-E2-01 Sign up with email

```text
We are working on story S1-E2-01 (Sign up with email) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E1-02, S1-E1-04, S1-E14-01 (its table; a seeded version stands in until the final text exists)
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Main (2.1 Sign up)
- Back-end pieces (architecture 1.7.3): B02, B05, B06, B09, B12; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E2-01, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 6. S1-E2-02 Year of birth at sign-up

```text
We are working on story S1-E2-02 (Year of birth at sign-up) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E2-01
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Main (2.1 Sign up)
- Back-end pieces (architecture 1.7.3): B02, B05, B06, B09, B12; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E2-02, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 7. S1-E2-04 Username and optional pen name

```text
We are working on story S1-E2-04 (Username and optional pen name) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E2-01; S1-E11-02 for approving false hits
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Onboarding (2.5 Onboarding: name and language)
- Back-end pieces (architecture 1.7.3): B05, B11, B12, B13, B14, B24; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E2-04, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 8. S1-E2-05 Sign in, sessions and account recovery

```text
We are working on story S1-E2-05 (Sign in, sessions and account recovery) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E2-01
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: SignIn (2.2 Log in and reset password), Settings (6.3 Settings)
- Back-end pieces (architecture 1.7.3): B05, B28; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E2-05, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 9. S1-E2-07 Staff roles with mandatory two-factor sign-in

```text
We are working on story S1-E2-07 (Staff roles with mandatory two-factor sign-in) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E1-02, S1-E2-05
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: StaffSignIn (8.1 Staff sign-in (Google Workspace))
- Back-end pieces (architecture 1.7.3): B10; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E2-07, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 10. S1-E2-10 Country from the connection at sign-up

```text
We are working on story S1-E2-10 (Country from the connection at sign-up) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E2-01, S1-E11-05
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Onboarding (2.5 Onboarding: name and language)
- Back-end pieces (architecture 1.7.3): B05, B11, B12, B13, B14, B24; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E2-10, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 11. S1-E14-01 Terms, privacy notice and community guidelines

```text
We are working on story S1-E14-01 (Terms, privacy notice and community guidelines) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E1-04
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Main (2.1 Sign up), Legal (7.2 Legal centre)
- Back-end pieces (architecture 1.7.3): B02, B05, B06, B09, B12; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E14-01, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 12. S1-E14-02 Contact points and company details

```text
We are working on story S1-E14-02 (Contact points and company details) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E14-01
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: no board of its own; follow the components on /design
- Back-end pieces (architecture 1.7.3): see the story; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E14-02, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 13. S1-E2-03 Parental consent for under-16s

```text
We are working on story S1-E2-03 (Parental consent for under-16s) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E2-02, S1-E2-08
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: ParentConsent (2.4 Parent’s consent (under 16))
- Back-end pieces (architecture 1.7.3): B08, B09, B12; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E2-03, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 14. S1-E2-08 Age check with Yoti

```text
We are working on story S1-E2-08 (Age check with Yoti) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E1-02, S1-E2-02; S1-E16-02 for the desktop return (08a works on the web first, section 1.7.4, group B)
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: AgeCheck (2.3 Age check with Yoti), AdminUsers (8.5 Users)
- Back-end pieces (architecture 1.7.3): B02, B07, B27, B33; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E2-08, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 15. S1-E3-01 Create a story

```text
We are working on story S1-E3-01 (Create a story) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E2-01, S1-E1-02; S1-E11-05 for the open languages (seeded in a migration for March, section 1.7.9); S1-E10-05 for uploaded covers
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: NewStory (4.2 New story and settings)
- Back-end pieces (architecture 1.7.3): B11, B13, B14, B15; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E3-01, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 16. S1-E3-02 Chapter editor with autosave

```text
We are working on story S1-E3-02 (Chapter editor with autosave) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E3-01
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Editor (4.3 Chapter editor)
- Back-end pieces (architecture 1.7.3): B14; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E3-02, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 17. S1-E3-03 Publish, unpublish and schedule chapters

```text
We are working on story S1-E3-03 (Publish, unpublish and schedule chapters) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E3-02
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Chapters (4.4 Manage chapters)
- Back-end pieces (architecture 1.7.3): B16, B17; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E3-03, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 18. S1-E3-05 Story status and settings

```text
We are working on story S1-E3-05 (Story status and settings) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E3-01
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Story (3.4 Story page), NewStory (4.2 New story and settings)
- Back-end pieces (architecture 1.7.3): B11, B13, B14, B15, B21; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E3-05, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 19. S1-E3-06 Ratings and labels: age rating, fan fiction, parody and AI assistance

```text
We are working on story S1-E3-06 (Ratings and labels: age rating, fan fiction, parody and AI assistance) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E3-01
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Story (3.4 Story page), NewStory (4.2 New story and settings)
- Back-end pieces (architecture 1.7.3): B11, B13, B14, B15, B21; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E3-06, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 20. S1-E4-01 Chapter reader

```text
We are working on story S1-E4-01 (Chapter reader) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E3-03, S1-E1-03
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Reader (3.5 Chapter reader)
- Back-end pieces (architecture 1.7.3): B20, B21, B29; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E4-01, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 21. S1-E4-04 Web teaser for shared links

```text
We are working on story S1-E4-04 (Web teaser for shared links) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E4-01; S1-E11-03 for the `teaser_length` flag (a seeded default until then)
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Teaser (3.8 Shared link on the web (teaser))
- Back-end pieces (architecture 1.7.3): B12, B19; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E4-04, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 22. S1-E4-06a Copy protection and traceability

```text
We are working on story S1-E4-06a (Copy protection and traceability) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E4-01; S1-E16-02 for 06b
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Reader (3.5 Chapter reader)
- Back-end pieces (architecture 1.7.3): B20, B21, B29; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E4-06a, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 23. S1-E5-05 Writer profile page

```text
We are working on story S1-E5-05 (Writer profile page) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E2-04
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Profile (6.1 Writer profile)
- Back-end pieces (architecture 1.7.3): B14, B21; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E5-05, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 24. S1-E10-01 Report button on everything

```text
We are working on story S1-E10-01 (Report button on everything) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E1-02
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: ReportDialog (6.4 Report something)
- Back-end pieces (architecture 1.7.3): B04; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E10-01, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 25. S1-E10-02 One web form for all reports, including authority removal orders

```text
We are working on story S1-E10-02 (One web form for all reports, including authority removal orders) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E10-03, S1-E14-02
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: NoticeForm (7.3 Report without an account)
- Back-end pieces (architecture 1.7.3): B09, B26; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E10-02, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 26. S1-E10-03a Moderation queue with priority tiers

```text
We are working on story S1-E10-03a (Moderation queue with priority tiers) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E10-01, S1-E2-07
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Moderation (8.2 Moderation queue)
- Back-end pieces (architecture 1.7.3): B16, B26; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E10-03a, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 27. S1-E10-04 Statements of reasons

```text
We are working on story S1-E10-04 (Statements of reasons) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E10-03, S1-E7-01
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: MyReports (6.5 My reports and appeals), ModCase (8.3 Moderation case)
- Back-end pieces (architecture 1.7.3): B14, B26; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E10-04, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 28. S1-E10-05 Picture check on upload

```text
We are working on story S1-E10-05 (Picture check on upload) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E10-03
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Moderation (8.2 Moderation queue)
- Back-end pieces (architecture 1.7.3): B16, B26; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E10-05, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 29. S1-E10-06 Sanctions and repeat offenders

```text
We are working on story S1-E10-06 (Sanctions and repeat offenders) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E10-03
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: ModCase (8.3 Moderation case)
- Back-end pieces (architecture 1.7.3): B14, B26; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E10-06, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 30. S1-E10-09 Terrorist content removal orders

```text
We are working on story S1-E10-09 (Terrorist content removal orders) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E10-03, S1-E14-02
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Appeals (8.4 Appeals and removal orders)
- Back-end pieces (architecture 1.7.3): B26; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E10-09, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 31. S1-E10-10 Safeguarding escalation

```text
We are working on story S1-E10-10 (Safeguarding escalation) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E10-03
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: ModCase (8.3 Moderation case)
- Back-end pieces (architecture 1.7.3): B14, B26; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E10-10, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 32. S1-E11-01 Admin shell with protected access

```text
We are working on story S1-E11-01 (Admin shell with protected access) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E2-07, S1-E1-02 (audit log)
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: GetApp (7.1 About the apps)
- Back-end pieces (architecture 1.7.3): B03; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E11-01, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 33. S1-E11-02 User management

```text
We are working on story S1-E11-02 (User management) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E11-01, S1-E10-06
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: AdminUsers (8.5 Users)
- Back-end pieces (architecture 1.7.3): B27; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E11-02, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 34. S1-E5-01 Browse by category and tag

```text
We are working on story S1-E5-01 (Browse by category and tag) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E3-01, S1-E3-06 (ratings), S1-E5-05 (blocks), S1-E5-09 (See all)
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Discover (3.1 Discover (home))
- Back-end pieces (architecture 1.7.3): B02, B17, B21, B29, B30; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E5-01, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 35. S1-E5-02 Sort options

```text
We are working on story S1-E5-02 (Sort options) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E5-01; S1-E5-03 for popularity
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Discover (3.1 Discover (home))
- Back-end pieces (architecture 1.7.3): B02, B17, B21, B29, B30; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E5-02, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 36. S1-E5-03 Popularity ranking

```text
We are working on story S1-E5-03 (Popularity ranking) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E6-03, S1-E15-02, S1-E11-03 (weights); shares count once S1-E4-05 exists
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Website-Home (1.1 Website home page), Discover (3.1 Discover (home))
- Back-end pieces (architecture 1.7.3): B02, B13, B17, B21, B29, B30, B31; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E5-03, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 37. S1-E5-08 Public website home page

```text
We are working on story S1-E5-08 (Public website home page) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E1-03, S1-E1-04, S1-E11-06, S1-E11-12, S1-E5-03 (for the rows), S1-E16-02 (download links); back end: the website's own database and `public-shelves` (section 1.7, group A)
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Website-Home (1.1 Website home page)
- Back-end pieces (architecture 1.7.3): B13, B17, B31; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E5-08, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 38. S1-E5-09 See all page for a shelf

```text
We are working on story S1-E5-09 (See all page for a shelf) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E5-01, S1-E5-02
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Discover (3.1 Discover (home))
- Back-end pieces (architecture 1.7.3): B02, B17, B21, B29, B30; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E5-09, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 39. S1-E6-01 Comment on a chapter

```text
We are working on story S1-E6-01 (Comment on a chapter) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E4-01, S1-E10-01
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Reader (3.5 Chapter reader)
- Back-end pieces (architecture 1.7.3): B20, B21, B29; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E6-01, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 40. S1-E6-03 Like a chapter

```text
We are working on story S1-E6-03 (Like a chapter) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E4-01
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: no board of its own; follow the components on /design
- Back-end pieces (architecture 1.7.3): see the story; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E6-03, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 41. S1-E6-05 Follow a writer or a story

```text
We are working on story S1-E6-05 (Follow a writer or a story) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E5-05
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Story (3.4 Story page), Profile (6.1 Writer profile)
- Back-end pieces (architecture 1.7.3): B13, B14, B21; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E6-05, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 42. S1-E7-01 In-app notifications

```text
We are working on story S1-E7-01 (In-app notifications) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E6-01, S1-E6-05
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: Notifications (6.2 Notifications)
- Back-end pieces (architecture 1.7.3): B22; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E7-01, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 43. S1-E11-09a Data requests and story export

```text
We are working on story S1-E11-09a (Data requests and story export) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E11-01, S1-E11-02, S1-E13-02, S1-E2-07, S1-E7-01; S1-E2-03 for requests made by a parent; back end: section 1.7, B28
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: AdminDataRequests (8.12 Data requests and exports)
- Back-end pieces (architecture 1.7.3): B28; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E11-09a, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 44. S1-E13-02 Download my data

```text
We are working on story S1-E13-02 (Download my data) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E3-02, S1-E7-01 for the ready notice (email until then); each later content type, such as messages from S1-E9-01, adds itself to the export
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: no board of its own; follow the components on /design
- Back-end pieces (architecture 1.7.3): see the story; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E13-02, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 45. S1-E13-03 Delete my account in the app

```text
We are working on story S1-E13-03 (Delete my account in the app) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E2-05 (offer the export from S1-E13-02 once it exists)
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: no board of its own; follow the components on /design
- Back-end pieces (architecture 1.7.3): see the story; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E13-03, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 46. S1-E13-04 Retention schedule and log minimisation

```text
We are working on story S1-E13-04 (Retention schedule and log minimisation) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E1-02
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: no board of its own; follow the components on /design
- Back-end pieces (architecture 1.7.3): see the story; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E13-04, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 47. S1-E13-05 Download my stories

```text
We are working on story S1-E13-05 (Download my stories) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E13-02, S1-E11-09 (09a makes the Word files, 09b the PDF)
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: no board of its own; follow the components on /design
- Back-end pieces (architecture 1.7.3): see the story; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E13-05, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 48. S1-E14-04 Contact us with a ready-made EU helpdesk

```text
We are working on story S1-E14-04 (Contact us with a ready-made EU helpdesk) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E14-02, S1-E1-04
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: no board of its own; follow the components on /design
- Back-end pieces (architecture 1.7.3): see the story; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E14-04, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## 49. S1-E15-02 First-party metrics for the March test

```text
We are working on story S1-E15-02 (First-party metrics for the March test) only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: S1-E4-01 (daily `chapter_reads` totals), S1-E3-03; S1-E4-03 once it lands (it moved after March, section 1.13)
- Decisions that apply: see docs/decisions.md; anything new: [write it here or delete this line]
- Platform for this story: web (March is web only)
- Designs: AdminMetrics (8.7 Metrics and logs)
- Back-end pieces (architecture 1.7.3): B17; check in architecture 1.7.4 which are real and which you may mock

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md, fix failures, push the branch story/S1-E15-02, then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.
```

## After March

Use `prompts/story-template.md` for these, in the order of architecture section 1.13 (Must first, then Should). Forums (S1-E8-01, 02, 05) are the first to add back if hours allow.

| Story | Title | Priority | Size |
| --- | --- | --- | --- |
| S1-E1-05 | Error, offline and maintenance states | Should | S |
| S1-E2-06 | Onboarding | Should | M |
| S1-E2-09 | Sign up and log in with Google, Apple or Microsoft | Should | M |
| S1-E2-11 | Teacher badge | Should | M |
| S1-E3-04 | Manage chapters | Must | M |
| S1-E3-07 | Writer dashboard | Should | M |
| S1-E3-08 | Where a story can be read: web and app, or app only | Must | M |
| S1-E3-09 | Pictures in chapters | Should | M |
| S1-E3-10 | Music and video from other services | Could | M |
| S1-E3-11 | Drawings in chapters | Could | M |
| S1-E3-12 | Design a cover in Canva | Could (idea for after the March test) | M |
| S1-E3-13 | Automatic covers | Should | M |
| S1-E4-02 | Reading settings | Must | M |
| S1-E4-03 | Library and continue reading | Must | M |
| S1-E4-05 | Share a chapter | Should | S |
| S1-E4-07 | Quote-share card | Could | M |
| S1-E4-08 | Offline reading in the apps | Could | L |
| S1-E4-09 | "Only in the app" notice on the web | Must | S |
| S1-E4-10 | Any font on your device, in the apps | Should | M |
| S1-E4-11 | Share a passage or a picture | Should | M |
| S1-E5-04 | Search stories and writers | Must | M |
| S1-E5-06 | Public-domain classics shelf | Should | M |
| S1-E5-07 | Seasonal doodles | Could | S |
| S1-E6-02 | Emoji reactions on comments | Must | S |
| S1-E6-04 | Private downvote | Must | S |
| S1-E6-06 | Inline paragraph comments | Could | L |
| S1-E7-02 | Email notifications and digests | Should | M |
| S1-E7-03 | Push notifications in the apps | Should | M |
| S1-E8-01 | Forum categories and subforums | Must | M |
| S1-E8-02 | Threads and posts with safe formatting | Must | L |
| S1-E8-03 | Quote, multi-quote and quick reply | Must | M |
| S1-E8-04 | Read and unread tracking | Must | M |
| S1-E8-05 | Sticky and locked threads, reply without bumping | Must | S |
| S1-E8-06 | User-created spaces | Must | L |
| S1-E8-07 | Space moderators and permissions | Should | M |
| S1-E8-08 | Signatures and profile customisation limits | Should | S |
| S1-E8-09 | Ranks and light reputation | Could | M |
| S1-E8-10 | Forum search | Must | M |
| S1-E8-11 | Private class spaces | Should (proposal: for the March test, staff set up class spaces by hand for the pilot schools; self-service teacher sign-up comes after March) | L (split before building: 11a private visibility and invite codes, 11b the Class space option and teacher tools; the badge itself is S1-E2-11) |
| S1-E8-12 | Writing certificates | Could (proposal: for the March test, staff make the certificates by hand from a branded template and send them as PDFs; this story automates it later) | M |
| S1-E9-01 | One-to-one private messages | Must | L |
| S1-E9-02 | Block and report inside messages | Must | S |
| S1-E9-03 | Adult and minor messaging rules | Must | M |
| S1-E9-04 | Message settings and retention | Should | S |
| S1-E10-07 | Appeals | Should | M |
| S1-E10-08 | "Copied from a published work" report | Must | M |
| S1-E10-11 | Moderator mail | Should | M |
| S1-E10-12 | Spam and abuse rate limits | Must | M |
| S1-E10-13 | Country-specific emergency and safety contacts | Must | M |
| S1-E11-03 | Content settings and feature flags | Must | M |
| S1-E11-04 | Metrics and compliance logs | Should | M |
| S1-E11-05 | Markets and languages | Must | M |
| S1-E11-06 | Website home page copy | Should | M |
| S1-E11-07 | Every story in the admin site | Should | M |
| S1-E11-08 | Staff can open and change any story | Should | L (split before building: 08a open a story, settings, visibility and metadata with a reason and a notice; 08b version history, restore and removing a passage) |
| S1-E11-10 | Website notice banners | Should | S |
| S1-E11-11 | Seasonal doodle schedule | Could | S |
| S1-E11-12 | Help pages and questions | Should | M |
| S1-E11-13 | Support tickets inside the admin site | Must | L (split before building: 13a inbox, ticket view and email in and out; 13b views, timers, canned replies, merge and reports) |
| S1-E11-14 | Landing pages for contests and campaigns | Should | L |
| S1-E11-15 | Contests: set up, entries, judging and results | Should | L |
| S1-E12-01 | Contextual banner slot | Must | M |
| S1-E12-02 | Sponsor campaigns and "Sponsored" placements | Must | M |
| S1-E12-03 | Sponsor reporting | Should | S |
| S1-E12-04 | Ad-network ads that are never personalised | Could | M |
| S1-E12-05 | Ad slot booking and fill order | Should | M |
| S1-E13-01 | Privacy settings | Must | M |
| S1-E14-03 | Accessibility statement and no-cookie check | Should | S |
| S1-E15-01 | Cookieless product analytics | Must | S |
| S1-E15-03 | Event catalogue | Must | S |
| S1-E16-01 | Installable web app | Should | M |
| S1-E16-02 | Desktop apps for Windows, macOS and Linux | Must | L |
| S1-E16-03 | iOS and Android apps with deep links | Must | L |
| S1-E16-04 | App store compliance pack | Must | M |

## Review prompt (after every pull request, in a fresh session)

```text
Review the diff of pull request #[NUMBER] against CLAUDE.md, docs/definition-of-done.md and the story's acceptance criteria in docs/stories/. Compare every screen it touches with its board in design/boards/. List anything missing or wrong, most serious first. Don't change any code.
```
