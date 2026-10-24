# MVP gap review: March 2027 stories against what is built

Thread "Ghemotoc · MVP gap review", for Robert, at the CTO's request (24 Oct 2026). Read and report only: nothing in the code was changed.

**Everything in sections 3, 5 and 6 is a PROPOSAL for Robert, not a decision.** Items marked **OPEN** need an answer.

How this was checked: `git log` and `git rev-list` of `main` and the named branches (fetched 24 Oct 2026), story headings and their Priority/Size/Depends lines in `docs/stories/`, `docs/architecture.md` section 1.13, `docs/decisions.md`, `docs/mocks.md` and the open pull requests. No test suites were run, and the code on the branches was not reviewed. Sizes use the plan's scale: S about 3 hours, M about 12, L about 30.

## Summary

- **The MVP list in the repository is 63 stories and about 540 hours**, not the brief's 58 and 498 (architecture.md 1.13, updated 17 Oct 2026, 19:14 to 19:19). The difference (5 stories, 42 hours) looks like the brief's list was taken before the website CMS joined (S1-E11-06, 10, 12, 18 = 39 hours) plus one epic check. **OPEN:** which list is current. This review uses the 63.
- **Merged on main:** 23 March stories, about 204 hours (Foundations, Accounts, Writing, the admin shell, invite links, legal texts and contact points).
- **Built on branches, not merged:** 11 March stories, about 96 hours (Reading: 4 stories; Safety and admin chain: 7 stories).
- **Not built:** 29 March stories, about **240 hours**.
- **Proposed cuts and swaps save about 95 hours**, which takes the work left to about **145 hours of new build**, plus about 10 to 15 hours to land the 11 branch stories (both before and after).
- **Two ordering problems in the current bundle plan:** S1-E5-02 (PEOPLE-2) needs S1-E5-03 (PEOPLE-3), and S1-E5-08 (PEOPLE-2) needs the CMS stories S1-E11-06 and S1-E11-12, which aren't in any listed bundle.

## 1. Every March MVP story

Status: **merged** = on `main`; **branch** = built on an unmerged branch; **not built**.

| ID | Name | Status | Size | What depends on it (inside the MVP) |
| --- | --- | --- | --- | --- |
| S1-E1-01 | Repository, environments and CI | merged | M | everything |
| S1-E1-02 | Database baseline, RLS, account gate | merged | M | E2-01, E3-01, E10-01, E13-04 |
| S1-E1-03 | Design tokens, themes, app shell | merged | M | E4-01, E5-08 |
| S1-E1-04 | Romanian and English interface | merged | M | E2-01, E11-06, E11-12, E11-18, E14-01, E14-04 |
| S1-E1-QA | Epic check: Foundations | merged | S | none |
| S1-E2-01 | Sign up with email | merged | M | E2-02, E2-04, E2-05, E3-01, E11-17 |
| S1-E2-02 | Year of birth at sign-up | merged | M | the account gate (age_band) |
| S1-E2-04 | Username and pen name | merged | M | E5-05 |
| S1-E2-05 | Sign in, sessions, recovery | merged | S | E2-07a |
| S1-E2-07a | Staff roles on the normal login | merged | S | E11-01, E11-06 |
| S1-E2-10 | Country from the connection | merged | S | E5-08 market pick |
| S1-E2-QA | Epic check: Accounts | merged | S | none |
| S1-E3-01 | Create a story | merged | M | E3-02, E3-05, E3-06, E5-01 |
| S1-E3-02 | Chapter editor (02a, 02b) | merged | L | E3-03 |
| S1-E3-03 | Publish and schedule | merged | M | E3-04, E4-01, E15-02 |
| S1-E3-04 | Manage chapters | merged | M | none |
| S1-E3-05 | Story status and settings | merged | S | none |
| S1-E3-06 | Ratings and labels | merged | S | E5-01 rating filter |
| S1-E3-QA | Epic check: Writing | merged | S | none |
| S1-E4-01 | Chapter reader (01a, 01b) | branch `claude/s1-e4-01a-reader`, `-01b-reader-budget`; PRs #191 and #192 are **closed, not merged** (**OPEN:** replaced by the READ-1 chain?) | L | E4-04, E4-06a, E6-01, E6-03, E15-02 |
| S1-E4-04 | Web teaser and link previews | branch `claude/s1-e4-04-teaser` | M | E4-QA |
| S1-E4-06a | Right-click and copy off (web) | branch `claude/s1-e4-06a-copy-off` | S | E4-QA |
| S1-E4-QA | Epic check: Reading | branch `claude/s1-e4-qa` (stacked on all of the above) | S | none |
| S1-E5-01 | Browse by category and tag | not built | M | E5-02, E5-09 |
| S1-E5-02 | Sort options | not built | S | E5-09 |
| S1-E5-03 | Popularity ranking | not built | M | E5-02 (popularity is the default sort) |
| S1-E5-05 | Writer profile page (and blocks) | not built | M | E5-01, E6-05 (and the blocks every list respects) |
| S1-E5-08 | Public website home page | not built | M | none |
| S1-E5-09 | See all page for a shelf | not built | S | every shelf (rule 20) |
| S1-E5-QA | Epic check: Discovery | not built | S | none |
| S1-E6-01 | Comment on a chapter | not built | M | E6-02, E6-04, E7-01 |
| S1-E6-02 | Emoji reactions on comments | not built | S | none |
| S1-E6-03 | Like a chapter | not built | S | E5-03 |
| S1-E6-04 | Private downvote | not built | S | none |
| S1-E6-05 | Follow a writer or a story | not built | S | E7-01 |
| S1-E6-QA | Epic check: Comments and follows | not built | S | none |
| S1-E7-01 | In-app notifications | not built | M | E10-04 (statements of reasons reach the user) |
| S1-E7-QA | Epic check: Notifications | not built | S | none |
| S1-E10-01 | Report button on everything | branch (chain), PR #171 open | M | E6-01, E10-08, every user-content type |
| S1-E10-02 | One web form, removal-order contact point | not built | M | E10-QA |
| S1-E10-03a | One queue with tiers and deadlines | branch (chain), PR #174 open | M | E10-02, 04, 05, 06, 08, 09, 10; E6-04 |
| S1-E10-04 | Statements of reasons | not built | M | E10-QA |
| S1-E10-05 | Picture check on upload | not built | M | uploaded covers and avatars |
| S1-E10-06 | Sanctions and repeat offenders | branch (chain), PR #175 open | M | E11-02 |
| S1-E10-08 | "Copied from a published work" report | not built | M | none |
| S1-E10-09 | Terrorist content removal orders | not built | M | E10-02 (the authority path) |
| S1-E10-10 | Safeguarding escalation | not built | M | E10-05 (steps for an Arachnid Shield match) |
| S1-E10-13a | Safety contacts by country (seeded) | branch (chain), PR #172 open | S | none |
| S1-E10-QA | Epic check: Safety | branch (chain), PR #185 open; **built before 6 of the 10 stories it checks**, so it needs extending | S | none |
| S1-E11-01 | Admin shell | merged (01b, "pick the account when granting a role", is on the chain branch with no open PR: **OPEN**) | M | E11-02, 06, 17; every staff screen |
| S1-E11-02 | User management | not built | M | E2-04 false-hit approvals, E11-17 Invites tab |
| S1-E11-06 | Website CMS and home page copy | not built | M | E11-10, E11-12, E11-18, E5-08 |
| S1-E11-10 | Notice banners | not built | S | none |
| S1-E11-12 | Help pages and questions | not built | M | E5-08 (questions block) |
| S1-E11-17 | Invite links for the March test | merged | S | the invited sign-up |
| S1-E11-18 | Edit interface text | not built | M | none |
| S1-E11-QA | Epic check: Admin site | branch (chain), PR #186 open; **built before 5 of the 7 stories it checks** | S | none |
| S1-E14-01 | Terms, privacy notice, guidelines | merged | M | E2-01, E11-12 |
| S1-E14-02 | Contact points and company details | merged | S | E10-02, E10-09, E14-04 |
| S1-E14-04 | Contact us with an EU helpdesk | branch (chain), PR #182 open | S | E14-QA |
| S1-E14-QA | Epic check: Legal | not built | S | none |
| S1-E15-02 | First-party metrics for the March test | not built | M | E5-03 |
| S1-E15-QA | Epic check: March numbers | not built | S | none |

Totals: merged 23 stories, about 204 hours; branch 11, about 96; not built 29, about 240.

The other branches named in the brief hold no March story: `claude/friendly-cannon-yhc0gi` is CI tooling (3 commits; its PR #194 is closed, not merged), and `claude/beautiful-rubin-amp8k6` holds the doodle tokens, the 20th classic and the demo top-up in SQL Editor-sized parts (5 commits ahead of main). PR #193 (CI fails on duplicate migration versions) and PR #181 (doodle tokens) are open.

## 2. Built already, outside the March list (bonus work: don't rebuild)

| What | Where | Story it belongs to | Why it matters |
| --- | --- | --- | --- |
| Error, offline and maintenance states | main | S1-E1-05 (Should, S) | done; the maintenance switch is the `maintenance_mode` flag in the SQL editor until S1-E11-03 |
| Automatic covers | main | S1-E3-13 (Should, M) | covers the "no picture uploads" path (section 3, cut 1) |
| Staff role picker | chain branch | S1-E11-01b (add-on to S1-E11-01) | lands with SAFE-1 |
| 20 public-domain classics, sources and credit lines | main (19) and `beautiful-rubin` (the 20th) | content for S1-E5-06 and S1-E11-16 (both after March) | the data for a Classics shelf exists; only the shelf screen is missing |
| 36 synthetic Romanian demo stories and the staging top-up | main and `beautiful-rubin` | January investor demo (decided 23 Oct 2026) | fills Discover shelves for the demo and the March test |
| Doodle colours from the tokens, doodle sheet on request | PR #181, `beautiful-rubin` | design rules (DoD) | removes the "doodle colours" stub in docs/mocks.md |
| `get_chapter()`, daily read totals, blocks stub | reading branch | S1-E4-01a | S1-E15-02 can read `chapter_reads` straight away |
| Moderation hold filled in, "Threat to a minor" and "Insults" reasons | chain branch | S1-E10-01, S1-E10-03a | the safeguarding tier already exists in the queue |
| Banner slot in the reader | reading branch | S1-E4-01b (prepares S1-E12-01, after March) | nothing to do for March |
| CI only runs the long jobs when they matter; duplicate migration check | `friendly-cannon`, PR #193 | tooling | saves CI time on every later bundle |

## 3. The fastest path (PROPOSALS)

Each line is a proposal for Robert. "Hours saved" is against the story's planned size.

| # | Story | Proposal | What the user loses | Hours saved |
| --- | --- | --- | --- | --- |
| 1 | S1-E10-05 Picture check | **Move after March.** Keep `picture_uploads` off for March as for the January demo (decided 23 Oct 2026): drawn and automatic covers, initials for avatars; S1-E5-05 drops its avatar upload too. Rule 19 still holds: nothing is uploaded, so nothing needs checking. It also moves the Sightengine and Arachnid Shield contracts, DPAs and DPIA entries off the March path. This reverses "picture uploads on from launch" (16 Oct 2026) for the test only: Robert's call | Writers can't upload their own cover or avatar | about 14 (12 plus about 2 in E5-05) |
| 2 | S1-E5-03 Popularity ranking | **Replace with simple shelves** (newest, most liked, completed), already approved for the January demo (23 Oct 2026) and listed as a small cut in architecture 1.13. S1-E5-02 sorts by newest, oldest, A to Z and most liked | The tuned Discover mix and the "why this story" explanation (DSA art. 27 is good practice only; micro and small platforms are exempt, as the story says) | about 9 |
| 3 | S1-E5-08 Home page | **The short version only**: hero, safety lines and questions, no live rows (the story's own proposal) | Live shelves on the public page; invitees arrive by invite link anyway | about 9 (architecture 1.13's figure for a one-page site) |
| 4 | S1-E11-18 Edit interface text | **Move after March.** For 20 writers and 200 readers, a copy change is a one-line locale-file change in a pull request | Robert can't change button text himself without a pull request | 12 |
| 5 | S1-E11-12 Help pages and questions | **Cut down and merge into S1-E11-06**: the questions become a block of the home page record; help pages come after March; help in March is Contact us (S1-E14-04) | A separate Help area | about 9 |
| 6 | S1-E11-10 Notice banners | **Move after March**; tell the invited group by email | In-app notices (maintenance, news) | 3 |
| 7 | S1-E10-08 "Copied from a published work" | **Merge into S1-E10-02**: the reason plus the optional source fields on the one report form; the side-by-side view, "ask for more details" and the public note come after March. Moderators handle it like any copyright report | The structured comparison screen for moderators | about 9 |
| 8 | S1-E11-02 User management | **A small version**: find by handle, see status, apply the sanctions from S1-E10-06, sign out everywhere. Search by email and the logged email reveal come after March (staff then see no emails at all, which is stricter, not weaker, under GDPR art. 5(1)(f)) | Finding an account by email | about 6 (**OPEN**: depends on what S1-E10-06 already gives moderators) |
| 9 | S1-E15-02 March numbers | **SQL views only, no screen**: Robert reads the numbers in the SQL editor, the same pattern as the maintenance switch today | A numbers page in the admin site | about 9 |
| 10 | S1-E6-02 Emoji reactions | **Move after March** (it joined on 17 Oct 2026 to make the MVP "as complete as possible") | Reactions on comments | 3 |
| 11 | S1-E6-04 Private downvote | **Move after March**; reports carry the moderation signal for a small group | A private signal to moderators | 3 |
| 12 | Epic checks | **Merge** S1-E6-QA, S1-E7-QA and S1-E15-QA into S1-E5-QA (one "people and discovery" check), and fold S1-E14-QA into the S1-E10-QA rerun (E14-04 and E10-02 are the same contact path) | Nothing: the same flows are tested, in fewer passes | about 9 |
| | | | **Total** | **about 95** |

Also proposed, without hours saved:

- **Land before building.** About 96 hours of March work sits on branches. Merging the READ-1 and SAFE-1 chains is the single fastest gain, and it unblocks S1-E6-01 (needs E4-01 and E10-01). **OPEN:** why #191 and #192 were closed, and whether S1-E11-01b gets its own pull request.
- **A one-page runbook for data requests by email** (decided 17 Oct 2026, 12:44: answered by hand within a month). None exists in `docs/runbooks/` yet; about 1 hour.

Considered and **not** proposed: cutting S1-E5-09 (See all) saves only 3 hours, and rule 20 needs it once a shelf passes 20 (the demo content alone is 56 stories); cutting S1-E7-01 would leave statements of reasons with no way to reach the user.

## 4. What can't be cut, and why

The legal basis is as written in the stories (no new research; "to verify" is the story's own note).

| Story | Status | Why it stays | Basis as written |
| --- | --- | --- | --- |
| S1-E10-01 Report button on everything | branch | notice and action on every piece of content | DSA art. 16; CLAUDE.md rule 6 |
| S1-E10-02 One web form and removal-order contact point | not built | the notice route for people without an account and the authorities' contact point | DSA art. 11, 12 and 16(2) to (5) (paragraph numbers to verify); Regulation (EU) 2021/784 (TCO) art. 15(1) and 15(2) |
| S1-E10-03a Moderation queue | branch | reports have to be handled on time | supports DSA art. 16; decided for the January demo (23 Oct 2026) |
| S1-E10-04 Statements of reasons | not built | every removal or restriction is explained to the writer | DSA art. 17 and 16(5) |
| S1-E7-01 In-app notifications | not built | the statement of reasons has to reach the user | DSA art. 17 (S1-E7-01's note) |
| S1-E10-09 Terrorist content removal orders | not built | removal within one hour of an order, for every hosting provider in the EU | TCO art. 3(3), 1(2), 15(1); art. 3(2) to verify |
| S1-E10-10 Safeguarding escalation | not built | a threat to life or safety must reach the authorities; the written process must exist before launch | DSA art. 18; Romanian Law 50/2024 art. 31 (to verify) |
| S1-E10-06 Sanctions | branch | the account gate's "no suspension or ban" check (`account_state()` stub in docs/mocks.md) | the account gate (architecture 1.7.8) |
| S1-E10-13a Safety contacts | branch | the country's emergency and support numbers next to safety cases | decided 17 Oct 2026, 12:44 (13a in March) |
| S1-E14-04 Contact us | branch | the published contact route | DoD (app store compliance: published contact details) |
| S1-E3-06 ratings and the S1-E5-01 rating filter | merged / not built | ratings hide stories from anyone younger, in RLS through `age_band()` | CLAUDE.md rule 18; Q17; DSA art. 28 followed as good practice (micro and small platforms exempt) |
| S1-E5-05 Writer profile, with blocks | not built | blocks respected everywhere; follower lists visible to the writer only | CLAUDE.md rule 6; Q50 (to protect minors) |
| S1-E6-01 Comments | not built | the one social feature of March; carries a report button | DSA art. 16 |
| S1-E6-05 Follows | not built | feeds new-chapter notices; follower list private | Q50 |
| `invite_only` and `adults_only` (merged) | merged | keep minors out until the age check, parental consent and data rights exist | decided 17 Oct 2026, 12:44 |
| GDPR basics in March | merged (legal texts) plus a manual process | data requests by email, answered by hand within a month; need-to-know staff access | decided 17 Oct 2026, 12:44; GDPR art. 5(1)(f) (S1-E11-02's note) |

Before the first under-18 joins (already after March, not touched here): S1-E2-08, S1-E2-03, S1-E2-07b, S1-E13-01 to 05, S1-E11-09a, S1-E10-13b, and under-18 defaults (architecture 1.10). If proposal 1 is accepted, S1-E10-05 joins that list, because picture uploads must not open before the picture check.

## 5. A faster bundle order (PROPOSAL)

**Problems in the current order:**

- PEOPLE-2 holds S1-E5-02, which depends on S1-E5-03 in PEOPLE-3. Proposal 2 removes the clash; without it, S1-E5-02 has to move to PEOPLE-3.
- PEOPLE-2 holds S1-E5-08, which needs S1-E11-06 and S1-E11-12 first (architecture 1.7.6), and the CMS stories are in none of the listed bundles. **OPEN:** are they TOOL-3?
- SAFE-3 waits until the end, but S1-E10-09 and S1-E10-10 need only S1-E10-03a (SAFE-1) and S1-E14-02 (merged). The legal must-haves can move forward; only S1-E10-04 has to wait for S1-E7-01.
- S1-E11-06 and S1-E15-02 have no blocker left once READ-1 is merged, so they can fill any gap.

**Proposed order** (each bundle starts only when what it needs is merged; "‖" means it can run alongside):

| Step | Bundle | Stories | Needs merged first |
| --- | --- | --- | --- |
| 0 | Land | TOOL-1 (#193 and the CI branch), READ-1 (E4-01a/b, 04, 06a, QA), SAFE-1 (#171 to #186 plus 01b), TOOL-2 (doodles, demo) | main |
| 1 | SAFE-3a ‖ PEOPLE-1 ‖ CMS | E10-09, E10-10 ‖ E5-05, E6-05 ‖ E11-06 (with the questions block) | SAFE-1 ‖ main ‖ main |
| 2 | SAFE-2 ‖ READ-2 | E10-02 (with the E10-08 fields), E11-02 small ‖ E6-03, E6-01 | SAFE-1 ‖ READ-1 and SAFE-1 |
| 3 | READ-3, then SAFE-3b | E7-01, then E10-04 | READ-2 and PEOPLE-1; then E7-01 |
| 4 | PEOPLE-2 | E5-01, E5-09, E5-02 (simple sort), E5-08 short | PEOPLE-1, CMS |
| 5 | PEOPLE-3 | E15-02 (SQL views), simple shelves | READ-1, READ-2 |
| 6 | Checks | the merged discovery check; reruns of E10-QA (with E14) and E11-QA | everything above |

After March, if the proposals are accepted: SAFE-4 (E10-05), E11-18, E11-10, help pages, E6-02, E6-04, E10-08's comparison screen, and the ranking job.

## 6. Hours left (rough)

| | Before | After the proposals |
| --- | --- | --- |
| New build (29 stories not built) | about 240 | about 145 |
| Landing the 11 branch stories (rebase, review, fixes) | about 10 to 15 (**OPEN**, guess) | about 10 to 15 |
| Extending E10-QA and E11-QA, which were built early | included in the 240 | included |
| **Total left** | **about 250 to 255** | **about 155 to 160** |

At 10 to 12 hours a week, about 250 hours is 21 to 25 weeks (around late March to mid-April 2027); about 155 is 13 to 16 weeks (around late January to mid-February 2027). The planning figures in architecture 1.13 assume Claude Code does the typing and Robert reviews.

## OPEN questions for Robert

1. Which MVP list is current: the repository's 63 stories and about 540 hours, or the brief's 58 and about 498?
2. Why were PRs #191 and #192 closed without merging, and does S1-E11-01b get a pull request?
3. Which bundle holds the CMS stories (S1-E11-06, 10, 12, 18)? TOOL-1, TOOL-2 and TOOL-3 aren't listed in the brief.
4. Picture uploads off for the March test (proposal 1): yes or no? It reverses the 16 Oct 2026 decision for the test only.
5. Moving S1-E11-18 after March (proposal 4) reverses its "Must, in March" status (17 Oct 2026, 19:19): yes or no?
