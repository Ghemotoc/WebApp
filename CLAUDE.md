# Ghemotoc: project rules for Claude Code

## What this is
A writer-first social platform for stories, poems, essays and discussion. Stage 1 only:
writing, reading, comments, follows, forums with user-created spaces, private
messages, reporting and moderation, contextual banners, admin site.
Launch: English and Romanian, in Romania and English-speaking countries [markets OPEN: together or Romania first].
Users include minors (13+). Design rules (covers, doodles, rows) are in the DoD.
Read @docs/architecture.md and @docs/definition-of-done.md before planning.
Decisions with dates and sources are in docs/decisions.md. Stories are in docs/stories/.

## Stack
- React + Vite + TypeScript (strict) + Tailwind + shadcn/ui + React Router + TanStack Query
- Supabase (EU region): Postgres with row-level security, Auth, Storage, Edge Functions (Deno), pg_cron
- i18next with locales in src/locales/ro and src/locales/en
- Web first: March 2027 is web only (decided 17 Oct 2026). Tauri 2 desktop and the mobile wrapper (Capacitor proposed, OPEN) come after March; don't add them yet.
- Web hosting provider: OPEN (EU, with a DPA). Leave web deploy steps switched off until it is chosen.
- Database: our own Supabase project in the EU (Ireland) (decided 17 Oct 2026). Local development uses the Supabase CLI in Docker; migrations reach staging only through Supabase's GitHub integration when main changes, never from a session.
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

## Designs
- design/boards/*.dc.html is the source of truth for layout, copy, colours, fonts and spacing. Read the board's HTML before building a screen, and copy values from it rather than guessing.
- design/renders/desktop and design/renders/phone show how each board should look. design/README.md maps boards to stories.
- Fonts: Bricolage Grotesque (headings), Inter (body), Cutive (eyebrow labels, 14 px, sentence case), Shadows Into Light Two (handwriting). The design rules (drop-downs, scroll arrows, label rows, ad slots) are in docs/definition-of-done.md.
- Pictures the boards use (doodles, covers, photos) are in design/assets/; a board's /_blob/<id> is design/assets/<id>.<ext>.
- Draft content (legal texts, safety contacts by country, public-domain classics) is in content/. Load it as seed data or CMS content; never hard-code it in components.
- Staff (admin) screens use plain components, no doodles.

## Safety while building
- Never ask for, print or store production keys, passwords or real user data. Use the seed personas.
- Never push to main. Work on a branch named story/<story-id>-<short-name> and open a pull request.

## How to work
- Plan first: list files to change, migrations, policies, tests and the acceptance criteria each test covers. Wait for approval.
- Work only on the story given. Note anything else as a follow-up in the PR description.
- Finish by running all checks and pasting the results.
