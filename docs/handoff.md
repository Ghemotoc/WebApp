# Working with Claude Code

> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

## 4. Claude Code handoff

### 4.1 The working loop (one story per session)

1. **Pick the next story** whose dependencies are merged and which passes the Definition of Ready.
2. **Start fresh:** open a new Claude Code session (or type `/clear`) so the last story's context doesn't leak into this one.
3. **Branch:** `git switch -c story/S1-E3-02-chapter-editor`.
4. **Plan first:** paste the prompt template (4.3) and ask for a plan only. Use plan mode if you like. Read the plan; check it covers every acceptance criterion and the RLS tests. Push back if it touches files outside the story.
5. **Build:** let Claude Code write the migration, policies, tests and screens, then run the checks.
6. **Verify yourself** with the checklist in 4.4, on staging.
7. **Pull request:** Claude Code opens it with the template in 4.5. CI must be green. Merge.
8. **Log it:** tick the story in your tracker and note anything new in `docs/decisions.md` or an ADR.

Rules of thumb:

- If a session gets long or confused, stop, commit what works, `/clear` and continue with a short summary.
- If Claude Code says a story needs a decision, don't let it guess: answer it, add the answer to the story and record it.
- Claude Code builds first (decided 17 Oct 2026, 11:20). Lovable's role is **OPEN** pending a two-screen trial: new Lovable projects use TanStack Start and Lovable can't import an existing repository (research H2). If Lovable joins, Lovable and Claude Code share one GitHub repository. Never edit in both at the same time; pull before you start in either tool. Use Lovable for screens and layout, Claude Code for migrations, RLS, edge functions, tests, CI and Tauri.
- Never paste real user data, production keys or reports about real minors into any AI tool.

### 4.2 `CLAUDE.md` template for the repository root

Claude Code reads `CLAUDE.md` at the start of every session. Keep it short and point to `docs/` for detail (Claude Code can import other files with `@path` lines). Replace the bracketed parts.

```markdown
# Ghemotoc: project rules for Claude Code

## What this is
A writer-first social platform for stories, poems, essays and discussion. Stage 1 only:
writing, reading, comments, follows, forums with user-created spaces, private
messages, reporting and moderation, contextual banners, admin site.
Launch: Romania first (decided 17 Oct 2026); English-speaking countries open later. The interface opens in Romanian for everyone; English is available in the language menu.
Users include minors (13+). Design rules (covers, doodles, rows) are in the DoD.
Read @docs/architecture.md and @docs/definition-of-done.md before planning.

## Stack
- React + Vite + TypeScript (strict) + Tailwind + shadcn/ui + React Router + TanStack Query
- Supabase (EU region): Postgres with row-level security, Auth, Storage, Edge Functions (Deno), pg_cron
- i18next with locales in src/locales/ro and src/locales/en
- Tauri 2 for desktop (src-tauri/); mobile wrapper: [Capacitor | OPEN]
- Tests: Vitest (unit), pgTAP (supabase/tests), Playwright + axe (e2e)

## Commands
- Install: npm ci
- Dev: npx supabase start && npm run dev
- Checks (run all before saying you're done): npm run lint && npm run typecheck && npm run types:check && npm test && npx supabase test db && npm run test:e2e && npm run i18n:check
- Regenerate database types after a migration: npm run types:gen
- New migration: npx supabase migration new <name>

## Non-negotiable rules
1. Every table has RLS on and explicit policies. Every policy gets an allowed and a denied pgTAP test.
2. Never use the service role key in client code. It is only for Edge Functions.
3. Schema changes only through files in supabase/migrations/. Never suggest dashboard edits.
4. No hard-coded user-facing strings. Add keys to both ro and en. Romanian uses ș and ț (comma below).
5. Store no legal names and no full dates of birth. Age is birth_year (plus birth_month only when the year leaves the age unclear at 13 or 16) plus the Yoti result (age_check_result, age_checked_at, age_check_method). Never store a selfie, an ID image or an estimated age; the Yoti API key lives only in Edge Function secrets.
6. Every new user-content type must be registered as reportable (reportable_type enum), have a report button and respect blocks.
7. No tracking. No ad code except the non-personalised ad network in S1-E12-04; no other third-party scripts or cookies without an ADR.
8. User text is a Markdown subset, sanitised on save and before display. Links get rel="nofollow ugc noopener".
9. Accessibility: WCAG 2.2 AA. Real HTML text, labelled controls, keyboard support, 24px minimum targets.
10. Payments: never build anything that holds or moves users' money. Credits buy features only.
11. No external purchase links in the iOS app where Apple restricts them.
12. Do not log emails, IP addresses or user content.
13. If a story depends on a decision marked OPEN, stop and ask. Do not choose for the founder.
14. Contract first: migration, RLS tests and generated types before any screen. Never hand-write a type that mirrors the database.
15. Every table for user content or user actions has a not-null user_id referencing profiles.id. Never show the user ID publicly.
16. Doodles and icons are SVG files. Screens never import Tauri directly; use src/lib/platform/.
17. Mocks are listed in docs/mocks.md. A story is not done while its mock is still on for staging.
18. Ratings (All ages, 13+, 16+, 18+) hide a story from anyone younger, enforced in RLS through age_band(). Staff never edit a writer's words.
19. Every uploaded picture goes through the picture check (S1-E10-05) before anyone else sees it. No automated text moderation.
20. Shelves of stories are one scrolling line of at most 20 with a "View more" card to a See all page.

## Conventions
- Database: snake_case, plural table names, uuid primary keys, created_at/updated_at timestamptz, soft delete with deleted_at; the owner column is user_id, other people get role names (reporter_user_id).
- TypeScript: camelCase; components in PascalCase files; one component per file; zod schemas in src/schemas/ shared with Edge Functions.
- Folders: src/features/<feature>/ (components, hooks, api), src/lib/, src/locales/, supabase/migrations/, supabase/functions/, supabase/tests/, e2e/, docs/.
- Analytics: events named object_action, listed in docs/analytics-events.md, no personal data.
- Commits: "S1-E3-02: short description". One story per branch and pull request.
- Comments: explain why, not what. Every RLS policy has a comment saying who it allows and why.

## How to work
- Plan first: list files to change, migrations, policies, tests and the acceptance criteria each test covers. Wait for approval.
- Work only on the story given. Note anything else as a follow-up in the PR description.
- Finish by running all checks and pasting the results.
```

Suggested companion files in `docs/`: `architecture.md` (section 1 of this pack), `mocks.md` (section 1.7.10), `definition-of-done.md` (section 2), `analytics-events.md`, `retention.md`, `processors.md`, `decisions.md`, `adr/`, `runbooks/` (restore, incident, authority order, safeguarding).

### 4.3 Prompt template per story

Copy this, fill in the brackets and paste the whole story from the stage file.

```text
We are working on story [S1-E3-02] only. Read CLAUDE.md and docs/architecture.md first.

STORY (paste exactly from stage-1-stories.md):
[paste the full story: title, user story, priority, size, depends on,
acceptance criteria, legal and compliance notes]

CONTEXT:
- Already merged: [list dependency story IDs]
- Decisions that apply: [e.g. minimum age 13; adult-to-minor DMs off]
- Target platforms for this story: [web, desktop, iOS, Android, admin]
- Designs or screen notes: [link or short description]
- Back-end pieces (CTO pack, section 1.7): real: [e.g. B05, B13]; mocked with: [e.g. B15 stub, B07 yoti-mock]

STEP 1, PLAN ONLY. Do not write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md and check that the code follows the Readable code section of CLAUDE.md, fix failures,
then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand on staging, written
  for a non-developer, in both a signed-in adult and an under-16 test account
  where relevant,
- the pull request description using the template in docs/.
```

For a bug, use the same template with "BUG" instead of "STORY": what you did, what you expected, what happened, the screen and the device.

### 4.4 How to verify a story (founder checklist)

You don't need to read the code to check most of it.

- [ ] **CI is green** on the pull request (all checks ticked in GitHub).
- [ ] **Every acceptance criterion has a test:** the plan's criterion-to-test table matches the tests in the pull request.
- [ ] **Try it on staging** with three test accounts: an adult, a 16 to 17 account and an under-16 account. Follow Claude Code's manual test steps.
- [ ] **Try to break it:** while signed out, as another user and as a blocked user, try to see or change what you shouldn't. It should fail.
- [ ] **Switch to Romanian:** no English left over, no broken ș or ț, nothing cut off.
- [ ] **Keyboard only:** Tab through the new screen; you can reach and use everything and always see where focus is.
- [ ] **Phone width and zoom:** shrink the window to phone width and zoom to 200%; nothing overlaps or scrolls sideways.
- [ ] **Report and block:** if it shows user content, the report button is there and blocked people disappear.
- [ ] **Ask Claude Code one review question in a new session:** "Review the diff of this PR against CLAUDE.md and the Definition of Done. List anything missing. Do not change code." Fix what it finds.
- [ ] **Security-sensitive stories** (auth, RLS, messages, moderation, admin, files, payments): get a second human review before merging, once the developer is hired or through a paid review.

### 4.5 Pull request template (`.github/pull_request_template.md`)

```markdown
## Story
S1-E?-??: [title]

## What changed
-

## Acceptance criteria and tests
| Criterion | Test |
| --- | --- |
|  |  |

## Definition of Done
- [ ] CI green  - [ ] RLS allowed and denied tests  - [ ] ro and en strings
- [ ] axe clean, keyboard checked  - [ ] No personal data in logs or analytics
- [ ] Reportable and blockable (if user content)  - [ ] Docs, retention or processor list updated (if needed)
- [ ] Tested on staging by a person

## Follow-ups
-
```

### 4.6 Lovable and Claude Code together

> **Updated 17 Oct 2026 (11:20 decision and research H2).** Claude Code builds first, on our own Supabase project in the EU (West EU, Ireland, eu-west-1) from day one. Research H2 (17 Oct 2026) found that new Lovable projects use TanStack Start (server-rendered), not React and Vite, that Lovable offers no framework choice, and that Lovable can't import an existing repository: connecting GitHub always creates a new one, and an uploaded ZIP is rebuilt on Lovable Cloud. Lovable also doesn't run migration files pushed through Git. So the split below is **OPEN** until a two-screen trial shows whether Lovable can work on our repository without breaking the stack or the migrations.

| Task | Tool |
| --- | --- |
| Screen layout, visual polish, quick UI iterations | Lovable (synced to GitHub) |
| Migrations, RLS, pgTAP tests, edge functions, cron jobs | Claude Code |
| CI, Tauri desktop, mobile wrapper, signing, store builds | Claude Code |
| Refactors across many files, security fixes, test suites | Claude Code |
| Copy and translations | You, with Claude for drafts and a native speaker check |

Before switching tools, commit and push, then pull in the other tool. If Lovable proposes changing the database from its own interface, decline and do it as a migration through Claude Code, so the history stays in `supabase/migrations/`.

Further reading: [Claude Code memory and CLAUDE.md](https://code.claude.com/docs/en/memory.md) · [Claude Code best practices](https://code.claude.com/docs/en/best-practices.md) · [Common workflows, including planning first](https://code.claude.com/docs/en/common-workflows.md)

---
