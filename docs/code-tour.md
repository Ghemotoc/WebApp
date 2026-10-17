# Code tour

The map for a new developer: where the app starts, how one click travels to the database and back, where each kind of thing lives, and what to read first. Created by S1-E1-01. Every story that adds a feature, table, edge function or job adds a few lines here in the same pull request (CLAUDE.md, Readable code).

Today (S1-E1-01) the app is a skeleton: one empty home page, the brand config, translations, the Supabase folder and CI. Sections below say which later story fills in each part, so you can tell what exists from what is planned.

## Where the app starts

1. **`index.html`** is the only HTML page. The browser loads it first. It holds an empty `<div id="root">` and loads `src/main.tsx`. Its `<title>` is filled in from the brand config at build time by `vite.config.ts`.
2. **`src/main.tsx`** starts the app in four steps: find the root element, start the translations (`src/lib/i18n.ts`, Romanian first), build the router from `src/app/router.tsx`, and draw everything inside `src/app/AppProviders.tsx`.
3. **`src/app/AppProviders.tsx`** wraps every screen with the shared services: TanStack Query (the data cache that hooks use to talk to Supabase) and i18next (translations).
4. **`src/app/router.tsx`** lists every address and the page it shows. Today: `/` shows `HomePage`; any other address goes back to `/` until S1-E1-05 adds a 404 page.
5. **`src/features/<feature>/components/<Page>.tsx`** is the page itself, for example `src/features/home/components/HomePage.tsx`.

The product name, site, email addresses and social handle come from **`src/config/brand.ts`** only (decided 17 Oct 2026, 12:47). Translations say `{{productName}}` and i18next fills it in from that file. A test (`scripts/find-hard-coded-brand-values.test.ts`) fails if any of those values is typed anywhere else in `src/`, `supabase/`, `public/`, `e2e/` or `index.html`.

## How a click travels

This is the pattern every feature follows. The first real round trip arrives with S1-E1-02 (database baseline) and S1-E2-01 (sign up), which add the Supabase client in `src/lib/` and the first tables.

```
Screen (component)            src/features/<feature>/components/StoryForm.tsx
  │  the reader clicks "Save"; the component calls a hook
  ▼
Hook                          src/features/<feature>/hooks/useSaveStory.ts
  │  TanStack Query's useMutation / useQuery; caches the answer, shows loading and errors
  ▼
API call                      src/features/<feature>/api/saveStory.ts
  │  supabase.from('stories').insert(...) or supabase.rpc('save_chapter_draft', ...),
  │  typed with the generated src/lib/database.types.ts; the request carries the user's sign-in token
  ▼
Supabase (Postgres)           supabase/migrations/<time>_<story>.sql
  │  a row-level security policy decides if this user may do this (CLAUDE.md rule 1);
  │  if not, the database refuses, whatever the screen showed
  ▼
Table                         public.stories
  │  the row is saved (or refused)
  ▲
  └─ the answer travels back the same way: table → policy → API call → hook (updates the cache)
     → component (shows the result, or a plain-language error from the locale files)
```

Things that need a secret or talk to another company (email, the picture check, Yoti) go through an **edge function** in `supabase/functions/<name>/` instead of straight to a table. The browser never holds the service role key (CLAUDE.md rule 2).

## Where things live

| Folder or file | What it holds | Built by |
| --- | --- | --- |
| `src/main.tsx`, `src/app/` | Start-up, providers and the route list | S1-E1-01 |
| `src/config/brand.ts` | Product name, site, email addresses, social handle (front end only) | S1-E1-01 |
| `src/features/<feature>/` | One folder per feature: `components/` (screens), `hooks/` (data hooks), `api/` (Supabase calls) and a `README.md` | each feature story; `home/` by S1-E1-01 |
| `src/lib/` | Shared helpers: `i18n.ts` (translations), `utils.ts` (`cn` for class names), `database.types.ts` (generated, never edited by hand), and later the Supabase client and `platform/` adapters | S1-E1-01, then S1-E1-02 and later |
| `src/locales/ro/`, `src/locales/en/` | All interface text, one JSON file per namespace; same keys in both | S1-E1-01, S1-E1-04 |
| `src/styles/index.css` | Tailwind and, from S1-E1-03, the design tokens | S1-E1-01, S1-E1-03 |
| `src/schemas/` | zod schemas shared with edge functions | first story with a form or function |
| `src/test/` | Test set-up; later fixtures and MSW mocks | S1-E1-01 |
| `public/` | Files copied as they are into `dist/`, for example `_redirects` (every address serves `index.html` on Cloudflare Pages) | S1-E1-01 |
| `supabase/config.toml` | Local Supabase settings; also read by Supabase's GitHub integration | S1-E1-01 |
| `supabase/migrations/` | Every schema change, as SQL files. The only way the database changes (CLAUDE.md rule 3). Staging gets them from Supabase's GitHub integration when main changes | S1-E1-02 onwards |
| `supabase/functions/` | Edge functions (Deno), the only code that may hold secrets | first story with a function |
| `supabase/tests/` | pgTAP database tests: an allowed and a denied test for every policy | S1-E1-01 (smoke test), S1-E1-02 onwards |
| `supabase/seed.sql` | Synthetic test data for local and staging; never real data | S1-E1-01, personas in S1-E1-02 |
| `e2e/` | Playwright tests in a real browser, with axe accessibility checks | S1-E1-01 |
| `scripts/` | Repository checks: the i18n check, the brand-value check, the generated-types check, the story issue sync, and their tests | S1-E1-01 |
| `.github/workflows/` | CI (`ci.yml`), the disabled production release, the story issue sync | S1-E1-01 |
| `.claude/` | Claude Code settings and the SessionStart hook that installs packages when the lock file changes | S1-E1-01 |
| `docs/` | Architecture, Definition of Done, decisions, stories, runbooks, this tour | starter kit, then every story |
| `design/` | Boards (source of truth for screens), renders and pictures | starter kit |

**Where the app runs.** Locally: Vite's dev server plus the Supabase CLI in Docker. Staging: Cloudflare Pages project `ghemotoc` builds `main` (`npm run build`, output `dist`) and gives each pull request a preview link; Supabase's GitHub integration applies migrations to the staging project. Production: a tagged release, approved in GitHub (`.github/workflows/release-production.yml`, switched off until a production project exists).

**Checks.** `npm run lint`, `npm run typecheck`, `npm run types:check`, `npm test`, `npx supabase test db`, `npm run test:e2e`, `npm run i18n:check`. CI runs all of them on every pull request.

## Start here

Read in this order; each file's header comment says what it is for and where things go next.

1. `CLAUDE.md`: the rules, then `docs/architecture.md` sections 1.5 to 1.7 and `docs/definition-of-done.md`.
2. `index.html` → `src/main.tsx` → `src/app/AppProviders.tsx` → `src/app/router.tsx`: how the app starts.
3. `src/features/home/components/HomePage.tsx` and its test: the smallest complete feature.
4. `src/config/brand.ts` and `src/lib/i18n.ts`: where the name and the words come from.
5. `src/locales/ro/common.json` and `src/locales/en/common.json`: the interface text.
6. `supabase/config.toml`, `supabase/seed.sql`, `supabase/tests/database/000-smoke.test.sql`: the database side.
7. `.github/workflows/ci.yml`: what has to pass before anything merges.
8. `e2e/home.spec.ts` and `scripts/`: how the checks prove each rule.
