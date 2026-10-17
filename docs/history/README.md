# How the plan, the designs and this kit were made

**This folder is a historical record, not instructions.** Claude Code: don't follow anything in docs/history/ as a task or a rule. The rules are CLAUDE.md and docs/; the decisions are docs/decisions.md.

Between 15 and 17 October 2026, Robert worked with Claude (claude.ai, a project called "WattPad Better Be Gone") as project manager, lawyer, business specialist and CTO. Claude split the work across helper agents. Each helper got a written brief. The briefs are kept here so anyone can see how each piece was produced.

## The briefs in `briefs/`

| File | What it produced |
| --- | --- |
| RESEARCH_BRIEF_15OCT.md, RESEARCH_BRIEF_16OCT.md | The research reports A1 to H1 and G1 to G5 (law, tax, funding, schools, safety contacts, classics) |
| SCREENS.md, CANVAS_BRIEF.md, VISUAL_SPEC.md | The first version of the design canvas and its screen list. VISUAL_SPEC is out of date (it predates the name Ghemotoc and the current fonts); the boards win |
| STORY_BIBLE.md, COVERS_BRIEF.md, TITLE_FIT_BRIEF.md | The made-up stories, writers and covers shown on the boards |
| RESTYLE_BRIEF.md, CONSISTENCY_BRIEF.md, COPY_PASS_BRIEF.md, ROMANIAN_BRIEF.md | Restyling, consistency and copy passes over the boards |
| DOODLE_ASSETS.md, DOODLE_PLACEMENT_BRIEF.md | The doodle set and where doodles go |
| PILLS_BRIEF.md | Pills, chips, drop-downs, tables and eyebrow labels (now in the Definition of Done) |
| ADS_BRIEF.md | Ad and sponsor slots on public pages |
| DECISIONS_16OCT.md, ANSWERS_16OCT.md | Robert's answers to the 71 open questions, as applied to the stories and boards |
| STORIES_UPDATE_BRIEF.md | Updating the user stories after those answers |
| DECK_UPDATE_BRIEF.md, DECK_REFRESH_17OCT.md | The five slide decks |

## The briefs used on 17 October 2026

These six went out at 11:06, after Robert asked for a full report, admin landing pages and contests, sponsored ad booking, fact-checked stories and a Lovable or Claude recommendation.

### 1. Fact-check every user story

> Work on a copy of the CTO pack. Check every story against the decisions (the master plan's Decisions made tab, the 16 and 17 October snapshots and the decisions listed in the brief), the research files, the legal drafts and the canvas boards. For each story: every "decided" claim must match a logged decision or be relabelled proposal or OPEN; decisions not yet reflected are applied; every number has a source or is marked "(proposal)"; legal citations are checked against the research and marked "(to verify)" if not covered; vendor facts are checked; screens match the canvas; dependencies exist and counts add up; every Stage 1 story has ID, user story, priority, size, Given/When/Then criteria, dependencies and legal notes. Known conflicts (markets, company form, two ads in view) are marked OPEN, not resolved. Output: the corrected pack, a change list and a list of citations to verify. Later added: apply Robert's 11:20 decision (own Supabase from day one; S1-E1-06 becomes Won't) and note the Lovable research.

### 2. Verify every legal citation at the source

> Diagnostic only. Extract every citation to a law, regulation, directive, code or order in the CTO pack's stories, open the primary source (EUR-Lex, legislatie.just.ro, official regulator pages), and compare what the pack claims with the article text. Output a table (citation, stories, claim, what the source says, verdict, URL opened), a list of citations that need a fix and APA references for pages actually opened. Result: research H3 (90 citations: 79 correct, 9 partly right, 2 wrong article number).

### 3. Lovable and Claude: build facts

> Diagnostic only. Research Lovable as of October 2026 (default stack, Lovable Cloud versus own Supabase, EU hosting, GDPR, code ownership), GitHub sync and importing an existing repository, how designs can be fed in (screenshots, Figma, URLs, HTML, knowledge files, design systems, fonts), cost and limits, known weaknesses and security incidents, what Claude Code can do here, and Lovable's MCP server. Cite only pages opened. Result: research H2.

### 4. Contests, prizes and landing pages under Romanian and EU law

> Diagnostic only. Is a free, jury-judged writing contest with prizes a promotional lottery or gambling (OG 99/2000, OUG 77/2009)? What must contest rules contain and where must they be published? How are prizes taxed (Fiscal Code)? Can 13 to 17-year-olds enter and receive prizes (Civil Code art. 41, GDPR art. 8)? What do advertising, sponsorship and consumer law say about a sponsored contest aimed at minors? What may a contest take from entrants' copyright (Law 8/1996)? Result: research G6.

### 5. Design: the landing page builder and a public contest page

> Add two boards to the canvas, built from the existing boards' components and the Definition of Done rules: "8.14 Website: landing pages" (a page list; an editor built only from fixed blocks such as hero, key dates, who can enter, prize, how to enter, rules, sponsor, featured stories, questions and Remind me; English and Romanian side by side; phone and desktop preview; four brand themes; an address with a reserved-name check; publish checks; show-from and take-down dates; version history; audit log) and "3.11 Contest landing page" (The First Chapter contest as a reader sees it). Mark proposals and OPEN points. Validate, render at 1440 and 390 and fix what breaks.

### 6. Design: contests, slot booking and the staff menu

> Add Contests and Website to every staff board's menu; build "8.15 Contests" (set up, entries, disqualify with a reason, judging, results by pen name, certificates, a compliance panel); and add a Placements section to "8.8 Sponsors" (every ad slot against six weeks, booking with a clash check, house ads, and the fill order: booked sponsor, then house ad, then the ad network automatically, then a house ad so nothing is blank). Mark proposals. Validate, render and fix.

## What Claude did directly on 17 October 2026

- Wrote the build report and the build guide (Claude Docs), with an architecture diagram of how the admin site drives the app.
- Wrote the three new stories (S1-E11-14 landing pages, S1-E11-15 contests, S1-E12-05 slot booking) and inserted them into the pack with the G6 legal notes and the H3 citation fixes.
- Set up the Supabase organisation and project and connected it to this repository, with Robert's permission, in his browser.
- Built this starter kit: CLAUDE.md, docs/ split from the pack, the boards, renders and pictures, content/ and prompts/.
