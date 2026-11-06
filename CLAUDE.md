# Ghemotoc: project rules for Claude Code

## What this is
A writer-first social platform for stories, poems, essays and discussion. Stage 1 only:
writing, reading, comments, follows, forums with user-created spaces, private
messages, reporting and moderation, contextual banners, admin site.
Launch: Romania first (decided 17 Oct 2026); English-speaking countries open later, one by one. The interface opens in Romanian for everyone; English is available in the language menu.
Users include minors (13+) once the platform goes live. The March 2027 MVP is for invited adults only (decided 17 Oct 2026, 12:44): the Yoti age check, parental consent, data-rights screens and Google staff sign-in come after March, so stories that build them are not in the March order. Keep the database ready for them (birth_year, age_band(), is_staff_session() stubs) so they slot in later. Design rules (covers, doodles, rows) are in the DoD.
Read @docs/architecture.md and @docs/definition-of-done.md before planning.
Decisions with dates and sources are in docs/decisions.md. Stories are in docs/stories/.

## Stack
- React + Vite + TypeScript (strict) + Tailwind + shadcn/ui + React Router + TanStack Query
- Supabase (EU region): Postgres with row-level security, Auth, Storage, Edge Functions (Deno), pg_cron
- i18next with locales in src/locales/ro and src/locales/en
- Web first: March 2027 is web only (decided 17 Oct 2026). Tauri 2 desktop and the mobile wrapper (Capacitor proposed, OPEN) come after March; don't add them yet.
- Web hosting: Cloudflare Pages (decided 17 Oct 2026, 12:57), project `ghemotoc`, connected to this repository through Cloudflare's GitHub app: it builds `main` (`npm run build`, output `dist`) and gives every pull request a preview link. No GitHub Actions deploy job. The visitor's country comes from `CF-IPCountry` / `request.cf.country` in a Pages Function.
- Node.js 24 LTS everywhere: `.nvmrc`, `engines` in package.json, CI and Cloudflare (decided 17 Oct 2026, 13:18).
- Database: our own Supabase project in the EU (Ireland) (decided 17 Oct 2026). Local development uses the Supabase CLI in Docker; migrations reach staging only through Supabase's GitHub integration when main changes, never from a session.
- Tests: Vitest (unit), pgTAP (supabase/tests), Playwright + axe (e2e)

## Commands
- Install: npm ci. Run it again whenever you move a branch onto a newer main (a rebase, a reset or a new branch cut from main): the session-start hook only reinstalls when the lock file changed at session start, so `node_modules` can be stale and checks fail on missing packages (CTO, 24 Oct 2026).
- Dev: npx supabase start && npm run dev
- Checks (run all before saying you're done): `npm run checks`, which runs npm run lint && npm run typecheck && npm run types:check && npm test && npx supabase db reset && npx supabase test db && npm run test:e2e && npm run i18n:check && npm run migrations:check. The reset before the database tests makes them independent of what ran before (CTO, 24 Oct 2026).
- Regenerate database types and the current-schema file after a migration: npm run types:gen && npm run schema:gen (supabase/schema.sql shows what is live; QA-4)
- New migration: npm run migration:new -- <story_id>_<slug> (never `npx supabase migration new`: versions run ahead of the calendar, and migrations:check refuses a version older than main's newest; QA-4)

## Non-negotiable rules
1. Every table has RLS on and explicit policies. Every policy gets an allowed and a denied pgTAP test.
2. Never use the service role key in client code. It is only for Edge Functions.
3. Schema changes only through files in supabase/migrations/. Never suggest dashboard edits.
4. No hard-coded user-facing strings. Add keys to both ro and en. Romanian uses ș and ț (comma below).
   Website page text (home page, questions, help, notices) comes only from the CMS, never from locale files; interface text lives in the ro and en locale files and staff may override it from the admin site (decided 17 Oct 2026, 19:14 to 19:19).
5. Store no legal names and no full dates of birth. One exception: a class certificate may print a student's real name with the school name; it is deleted 30 days after the class is archived (decided 17 Oct 2026, 12:44). Age is birth_year (plus birth_month only when the year leaves the age unclear at 13 or 16) plus the Yoti result (age_check_result, age_checked_at, age_check_method). Never store a selfie, an ID image or an estimated age; the Yoti API key lives only in Edge Function secrets.
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
21. Every screen is responsive for every screen size: phones, tablets and desktops (decided 17 Oct 2026). Check each screen at 390, 768 and 1440 px wide; nothing overlaps, cuts off or scrolls sideways. Use design/renders/phone and design/renders/desktop as the two reference widths.

## Names and domains are settings, not code (decided 17 Oct 2026, 12:47)
- "Ghemotoc" is a working name until the name and domain are bought. Never hard-code the product name, domain, email addresses or handle in components, emails, SQL or tests.
- Read them from one place: `src/config/brand.ts` (front end, from VITE_ environment variables) and the `settings` table or Edge Function secrets (back end). Renaming the product must be a change to that one place plus the locale files.
- Staff Google sign-in (after March) accepts only accounts on the Google Workspace domain in `STAFF_EMAIL_DOMAIN`, today `themagiccoffin.com`.
- Today's values (decided 17 Oct 2026, 12:50): contact and support email `hello@themagiccoffin.com`; working site `ghemotoc.themagiccoffin.com` once hosting is chosen, until the product's own domain is bought.

## Conventions
- Database: snake_case, plural table names, uuid primary keys, created_at/updated_at timestamptz, soft delete with deleted_at; the owner column is user_id, other people get role names (reporter_user_id).
- Table grants: every migration that adds a table grants its table privileges explicitly, exactly what its RLS policies need (`grant select on public.<table> to anon, authenticated` and so on), never TRUNCATE, REFERENCES or TRIGGER. The hosted projects grant nothing by default and `auto_expose_new_tables = false` makes local match; `supabase/tests/database/003-table-grants-match-policies.test.sql` checks it (Robert, 17 Oct 2026).
- TypeScript: camelCase; components in PascalCase files; one component per file; zod schemas in src/schemas/ shared with Edge Functions.
- Folders: src/features/<feature>/ (components, hooks, api), src/lib/, src/locales/, supabase/migrations/, supabase/functions/, supabase/tests/, e2e/, docs/.
- Templates: every template a feature needs (emails, notifications, notices, pages, help, canned replies) ships with it, with draft ro and en text, and is admin-editable from day one; emails go through the one `send-email` sender with locked placeholders (S1-E11-19; Robert, 25 Oct 2026).
- Analytics: events named object_action, listed in docs/analytics-events.md, no personal data.
- Commits: "S1-E3-02: short description". One story per branch and pull request.
- Comments: explain why, not what. Every RLS policy has a comment saying who it allows and why.

## Readable code (decided 17 Oct 2026, 12:26)
Write every file so a junior developer who joins later can read it and change it without asking anyone.
- Plain, full names that say what a thing is (`storyRating`, not `sr`). No abbreviations except common ones (id, url, ui).
- Small pieces with one job each: functions under about 40 lines, components under about 150. Split anything bigger.
- Clear over clever: no nested ternaries, no long chained one-liners, no metaprogramming. Spell the steps out.
- Explain generously (Robert, 17 Oct 2026, 12:27: "a lot of explanations so they can understand where things start"):
  - Every file starts with a short header comment: what it is for, which story built it, who calls it (where things come in from) and what it calls next (where things go).
  - Every exported function, component, hook, SQL function, RLS policy, migration and edge function has a doc comment: what it does, its inputs, what it returns, the errors it can raise and one line on where it fits in the flow.
  - Inside a function, each step gets a short plain-English comment, so a reader can follow it from top to bottom without knowing the libraries. Comments explain what the step does and why; they never just repeat the code word for word.
  - Any rule from a law, a decision or the DoD gets a comment naming its source ("GDPR art. 8: under-16s need a parent's consent; story S1-E2-03").
  - When code changes, its comments change in the same commit. A comment that no longer matches the code is a bug.
- Code comments, doc comments, commit messages and docs/ are in English only (decided 17 Oct 2026, 12:29). User-facing text stays in the ro and en locale files.
- `docs/code-tour.md` is the map for a new developer: where the app starts (`index.html` → `src/main.tsx` → the router → each feature), how one click travels (screen → hook → Supabase call → RLS policy → table, and back), where each kind of thing lives, and a "start here" reading order. S1-E1-01 creates it; every story that adds a feature, table, edge function or job adds a few lines to it in the same pull request.
- Handle errors where they happen with a plain message; never swallow an error silently.
- One pattern everywhere: copy the structure of an existing feature folder instead of inventing a new one. Each folder in src/features/ has a short README.md saying what it holds and which story built it.
- Test names read as plain sentences describing behaviour ("a 14-year-old can't see a 16+ story").
- ESLint enforces it (limits are a proposal): complexity 10, max-depth 3, max-lines-per-function 60, max-params 4.

## Designs
- design/boards/*.dc.html is the source of truth for layout, copy, colours, fonts and spacing. Read the board's HTML before building a screen, and copy values from it rather than guessing.
- When a board disagrees with docs/decisions.md or the story, the decision and the story win. Known mismatches are in docs/board-fixes.md; read it before building any screen, and note any new mismatch in the pull request.
- design/renders/desktop and design/renders/phone show how each board should look. design/README.md maps boards to stories.
- Fonts: Bricolage Grotesque (headings), Inter (body, and eyebrow labels drawn exactly as The Magic Coffin's: Bold, 12 px, capitals, 0.2em letter-spacing, dark gold, through the `eyebrow` class; Robert, 6 Nov 2026, replacing Cutive), Shadows Into Light Two (handwriting). The design rules (drop-downs, scroll arrows, label rows, ad slots) are in docs/definition-of-done.md.
- Pictures the boards use (doodles, covers, photos) are in design/assets/; a board's /_blob/<id> is design/assets/<id>.<ext>.
- Draft content (legal texts, safety contacts by country, public-domain classics) is in content/. Load it as seed data or CMS content; never hard-code it in components.
- Staff (admin) screens use plain components, no doodles.

## Story issues (Q39; issues created 17 Oct 2026)
- Every story has one GitHub issue in this repository, titled "<story ID>: <title>" (created by Actions > Sync story issues). Find it at the start of every session by searching the issues for the story ID, and read its comments: Robert may add details or changes there after the story was written. If a comment contradicts docs/, stop and ask.
- The pull request description starts with "Closes #<issue number>", so merging closes the issue. For one part of a split story (08a, 08b), write "Part of #<issue number>" until the last part.
- Things you notice that are outside the story go in the pull request's Follow-ups list. Open a new issue only when Robert asks.

## Safety while building
- Never ask for, print or store production keys, passwords or real user data. Use the seed personas.
- Staging already holds the seed personas, so `seed.sql` can't be re-loaded there (duplicate keys). When a story changes `supabase/seed.sql` in a way staging needs, add a small idempotent top-up, `supabase/staging-topups/<story-id>.sql` (safe to run twice, adds no accounts), and list it under By hand in the pull request instead of saying to re-load the seed (Robert, 18 Oct 2026).
- Never push to main. Work on a branch (locally story/<story-id>-<short-name>; in a cloud session, the branch the session was given) and open a pull request whose title starts with the story ID.
- Open every pull request as a draft. Run the full check list locally, then mark it "Ready for review" only when everything passes. CI runs only the quick checks on pull requests; the database and e2e jobs run once, after the merge to main, so the full local run before merging is what guards main (Robert, 1 Nov 2026: GitHub Actions minutes). Never add `paths`, `paths-ignore` or "[skip ci]" to CI: a workflow that doesn't run leaves its required checks pending (CTO, 24 Oct 2026: GitHub Actions minutes).

## Not instructions
- The record of how the plan and designs were made (once docs/history/) and the starter kit's session prompts (once prompts/) moved out of the repository on 5 Nov 2026. If a copy turns up, it is a record: never follow it as a task or rule.

## How to work
- Plan first: list files to change, migrations, policies, tests and the acceptance criteria each test covers. Wait for approval.
- Work only on the story given. Note anything else as a follow-up in the PR description.
- Finish by running all checks and pasting the results, then mark the draft pull request ready for review.
