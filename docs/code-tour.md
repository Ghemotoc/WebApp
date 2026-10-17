# Code tour

The map for a new developer: where the app starts, how one click travels to the database and back, where each kind of thing lives, and what to read first. Created by S1-E1-01. Every story that adds a feature, table, edge function or job adds a few lines here in the same pull request (CLAUDE.md, Readable code).

Today the app is a skeleton: one home page, the brand config, translations and CI (S1-E1-01), the database baseline with its seed personas (S1-E1-02), the design tokens, light and night mode, the app shell and the /design components page (S1-E1-03), the Romanian and English interface with the language saved to the account (S1-E1-04), and the Legal centre with versioned terms, privacy notice and guidelines (S1-E14-01). Sections below say which later story fills in each part, so you can tell what exists from what is planned.

## Where the app starts

1. **`index.html`** is the only HTML page. The browser loads it first. Its `<head>` runs `public/theme-init.js`, which picks light or night mode before anything draws. It holds an empty `<div id="root">` and loads `src/main.tsx`. Its `<title>` is filled in from the brand config at build time by `vite.config.ts`.
2. **`src/main.tsx`** starts the app in four steps: find the root element, start the translations (`src/lib/i18n.ts`) in the language this browser last chose, or Romanian on a first visit (`src/lib/language-preference.ts`), build the router from `src/app/router.tsx`, and draw everything inside `src/app/AppProviders.tsx`.
3. **`src/app/AppProviders.tsx`** wraps every screen with the shared services: TanStack Query (the data cache that hooks use to talk to Supabase) and i18next (translations).
4. **`src/app/router.tsx`** lists every address and the page it shows. Every public page sits inside **`src/app/shell/AppLayout.tsx`**: a "Skip to content" link, the `TopBar`, the page in `<main>`, then the `Footer` with the Device / Light / Night drop-down. The English / Română drop-down sits in both the top bar and the footer, and `useAccountLanguage` shows a signed-in person's account language (S1-E1-04). Today: `/` shows `HomePage`; `/design` shows every component (development and staging only); any other address goes back to `/` until S1-E1-05 adds a 404 page.
5. **`src/features/<feature>/components/<Page>.tsx`** is the page itself, for example `src/features/home/components/HomePage.tsx`. Pages build on the shared components in `src/components/ui/`.

The product name, site, email addresses and social handle come from **`src/config/brand.ts`** only (decided 17 Oct 2026, 12:47). Translations say `{{productName}}` and i18next fills it in from that file. A test (`scripts/find-hard-coded-brand-values.test.ts`) fails if any of those values is typed anywhere else in `src/`, `supabase/`, `public/`, `e2e/` or `index.html`.

## How a click travels

This is the pattern every feature follows. The first real round trip is saving the interface language (S1-E1-04, traced below); sign-up (S1-E2-01) adds the next.

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
| `src/app/shell/`, `src/app/navigation.ts` | The frame around pages: top bar, footer, staff bar, and the links each one shows (only pages that exist) | S1-E1-03 |
| `src/components/ui/`, `src/components/icons/` | Shared components (buttons, drop-down, fields, pills, chips, cards, shelves, notices, ad slots) and the few plain icons; see its README | S1-E1-03 |
| `src/features/theme/` | Light and night mode: the footer drop-down and the hook that applies it | S1-E1-03 |
| `src/features/language/` | The English / Română drop-downs, the hooks that switch and save the language, and the Supabase calls for `profiles.locale` | S1-E1-04 |
| `src/features/legal/` | The Legal centre (`/legal/:documentSlug`) and the "We've updated our Terms" notice; see its README | S1-E14-01 |
| `src/features/auth/` | Who is signed in (`useSession`); sign-up and sign-in from S1-E2-01 and S1-E2-05 | S1-E14-01 |
| `content/legal/`, `scripts/build-legal-migration.ts` | The legal drafts (English, and Romanian draft translations in `ro/`) and the script that turns a new version into a migration | S1-E14-01 |
| `src/features/design-system/` | The /design page: every token and component on one page, with live contrast ratios | S1-E1-03 |
| `src/config/brand.ts` | Product name, site, email addresses, social handle and company name (front end only) | S1-E1-01, S1-E1-03 |
| `src/features/<feature>/` | One folder per feature: `components/` (screens), `hooks/` (data hooks), `api/` (Supabase calls) and a `README.md` | each feature story; `home/` by S1-E1-01 |
| `src/lib/` | Shared helpers: `i18n.ts` (translations), `utils.ts` (`cn` for class names), `database.types.ts` (generated, never edited by hand), `supabase.ts` (the one browser client, loaded on demand; null without settings), `language-preference.ts` (the language kept in this browser), `romanian-text.ts` (ş and ţ become ș and ț), and later `platform/` adapters | S1-E1-01, S1-E1-02, S1-E1-04 |
| `src/locales/ro/`, `src/locales/en/` | All interface text, one JSON file per namespace; same keys in both | S1-E1-01, S1-E1-04 |
| `src/styles/` | `tokens.css` (every colour, light and night, plus fonts, radii and shadows, all from the boards), `fonts.css` (self-hosted fonts), `index.css` (global rules: focus ring, reduce motion, tmc-* classes), `contrast-pairs.ts` (the pairs CI checks) | S1-E1-01, S1-E1-03 |
| `src/schemas/` | zod schemas shared with edge functions | first story with a form or function |
| `src/test/` | Test set-up; later fixtures and MSW mocks | S1-E1-01 |
| `public/` | Files copied as they are into `dist/`: `_redirects` (every address serves `index.html` on Cloudflare Pages) and `theme-init.js` (light or night before the first paint) | S1-E1-01, S1-E1-03 |
| `supabase/config.toml` | Local Supabase settings; also read by Supabase's GitHub integration | S1-E1-01 |
| `supabase/migrations/` | Every schema change, as SQL files. The only way the database changes (CLAUDE.md rule 3). Staging gets them from Supabase's GitHub integration when main changes | S1-E1-02 onwards |
| `supabase/functions/` | Edge functions (Deno), the only code that may hold secrets | first story with a function |
| `supabase/tests/` | pgTAP database tests: an allowed and a denied test for every policy, plus the CI guards (`001` RLS on every table, `002` table kinds and `user_id`) | S1-E1-02 onwards |
| `supabase/seed.sql` | The 16 synthetic seed personas (accounts, profiles, staff roles); never real data | S1-E1-02 |
| `supabase/README.md` | The database conventions every migration follows, the account gate and the persona list with the shared test password | S1-E1-02 |
| `e2e/` | Playwright tests in a real browser, with axe accessibility checks. `e2e/support/personas.ts` signs a seed persona in against the local Supabase (no sign-in screen needed). Tests run one at a time, because they share the personas in one database | S1-E1-01, S1-E1-04, S1-E1-QA |
| `scripts/` | Repository checks: the i18n check, the brand-value check, the generated-types check, the story issue sync (S1-E1-01); the policy-test coverage check and the bundle secret scan (S1-E1-02); and their tests | S1-E1-01, S1-E1-02 |
| `.github/workflows/` | CI (`ci.yml`), the disabled production release, the story issue sync | S1-E1-01 |
| `.claude/` | Claude Code settings and the SessionStart hook that installs packages when the lock file changes | S1-E1-01 |
| `docs/` | Architecture, Definition of Done, decisions, stories, runbooks, this tour; `mocks.md` (mocks and stubs still on); `epic-reports/` (one report per epic check) | starter kit, then every story |
| `design/` | Boards (source of truth for screens), renders and pictures | starter kit |

**Where the app runs.** Locally: Vite's dev server plus the Supabase CLI in Docker. Staging: Cloudflare Pages project `ghemotoc` builds `main` (`npm run build`, output `dist`) and gives each pull request a preview link; Supabase's GitHub integration applies migrations to the staging project. Production: a tagged release, approved in GitHub (`.github/workflows/release-production.yml`, switched off until a production project exists).

**Checks.** `npm run lint`, `npm run typecheck`, `npm run types:check`, `npm test`, `npx supabase test db`, `npm run test:e2e`, `npm run i18n:check`, and after a build `npm run scan:bundle`. CI runs all of them on every pull request.

## The database baseline (S1-E1-02)

Five tables exist, each with row-level security and only read policies; every write will go through a function a later story adds:

| Table | Holds | Who can read it |
| --- | --- | --- |
| `profiles` | one row per account: the user ID, year of birth (and month when needed), the age check result, and the interface language (`locale`, S1-E1-04; changed only through `set_my_locale()`) | the account's owner only |
| `staff_roles` | which staff role each team member holds | the person themselves; owner and admin see all |
| `feature_flags`, `settings` | switches and values (`invite_only`, `adults_only` on for March) | anyone, for rows marked public; owner and admin see all |
| `audit_log` | every staff action, written only by `log_staff_action()`; nobody can change or delete a row | owner and admin |
| `legal_documents`, `legal_document_versions` (S1-E14-01) | the Legal centre's documents and every live version, per language; written only by migrations | anyone, for live versions; owner and admin also see versions not live yet |
| `consents` (S1-E14-01) | which version of the terms and privacy notice each person accepted, and when | the person themselves; written only by the sign-up trigger (S1-E2-01) and `accept_current_legal_versions()` |

The **account gate** is a handful of SQL functions in `supabase/migrations/…_account_gate.sql`. Every write policy in later stories calls `is_active_member()`, and every under-18 protection reads `age_band()`. Staff checks use `is_staff(role)` and `is_staff_session()`. `supabase/README.md` explains them and what each later story fills in.

**Following one check end to end (example for a later story):** a writer presses Publish → the hook calls `supabase.rpc('publish_chapter', …)` → Postgres runs the function as that user → the chapters policy asks `is_active_member()` → that calls `account_state(auth.uid())`, which reads `profiles`, `auth.users` and `feature_flags` → false for, say, kid_14_waiting, so the database refuses and the screen shows the plain-language message.

## One round trip: saving the language (S1-E1-04)

The first feature that reaches the database, and the shape every later one copies:

```
LanguageSelect (top bar or footer)      src/features/language/components/LanguageSelect.tsx
  │  the person picks English
  ▼
useInterfaceLanguage                    src/features/language/hooks/useInterfaceLanguage.ts
  │  switches i18next (the whole screen changes), keeps 'en' in this browser
  │  (src/lib/language-preference.ts), then, if someone is signed in:
  ▼
saveAccountLanguage                     src/features/language/api/profileLocale.ts
  │  supabase.rpc('set_my_locale', { new_locale: 'en' }) with the person's sign-in token
  ▼
set_my_locale()                         supabase/migrations/20261017160001_s1_e1_04_profile_locale.sql
  │  refuses signed-out callers and any code but ro or en; updates only auth.uid()'s row
  ▼
profiles.locale = 'en'
  ▲
  └─ on another device: AppLayout → useAccountLanguage reads profiles.locale (policy
     profiles_select_own: own row only) after Supabase reports the session, and switches the screen
```

Which language shows: the account's (when signed in), else this browser's last choice, else Romanian. The browser's own language is never read (decided 17 Oct 2026, 11:48). Tests: `supabase/tests/database/014-profile-locale.test.sql`, `src/features/language/components/LanguageSelect.test.tsx` and `e2e/language.spec.ts` (two browsers, one persona).

## The Legal centre and "accept before posting again" (S1-E14-01)

How a legal text gets from a file to the screen:

```
content/legal/01-terms-of-use.md (English) and content/legal/ro/01-terms-of-use.md (Romanian draft)
  │  scripts/build-legal-migration.ts: leaves out the lawyer's notes, marks the lines in
  │  content/legal/after-the-invited-test.json, swaps brand values for {{tokens}}
  ▼
supabase/migrations/…_s1_e14_01_legal_versions_v0_1.sql   one row per document and language
  ▼
public.legal_document_versions   policy legal_document_versions_select_published: anyone reads live versions
  ▼
useLegalVersions → api/legalDocuments.ts             src/features/legal/
  ▼
LegalCentrePage → chooseLegalVersion (reader's language, else English) → LegalDocumentView
  → fillBrandTokens (src/config/brand.ts) → parseLegalDocument → LegalSectionCard → LegalMarkdown
```

When an important (material) version goes live, `account_state()` answers `legal_acceptance_required` for everyone who hasn't accepted it, so `is_active_member()` is false and every write policy refuses. `LegalUpdateNotice` (at the top of every page, from AppLayout) asks `my_legal_documents_to_accept()`, links to the new text and calls `accept_current_legal_versions()`. Tests: `supabase/tests/database/015` to `017`, `e2e/legal.spec.ts`.

## Epic S1-E1 at a glance (checked by S1-E1-QA)

What the Foundations epic left in place, and where to find it. The epic report, `docs/epic-reports/S1-E1.md`, lists what works, the known gaps and the steps Robert does by hand.

| Kind | Where | Story |
| --- | --- | --- |
| Screens | `/` (`src/features/home/`) and `/design` (`src/features/design-system/`, local and staging only), inside the shell in `src/app/shell/` | S1-E1-01, S1-E1-03 |
| Hooks | `useThemePreference` (`src/features/theme/hooks/`), `useInterfaceLanguage` and `useAccountLanguage` (`src/features/language/hooks/`) | S1-E1-03, S1-E1-04 |
| Supabase calls | `src/features/language/api/profileLocale.ts`, through the one client in `src/lib/supabase.ts` | S1-E1-04 |
| Tables | `profiles`, `staff_roles`, `feature_flags`, `settings`, `audit_log` | S1-E1-02, S1-E1-04 |
| Functions | the account gate (`age_band()`, `is_active_member()`, `is_staff()`, `is_staff_session()`), `log_staff_action()`, `set_my_locale()` | S1-E1-02, S1-E1-04 |
| Jobs | none yet; the first `pg_cron` jobs come with S1-E3-03 (scheduled chapters) | |
| Tests | `supabase/tests/database/` (one file per table, `090` for the epic), `e2e/` (`epic-s1-e1.spec.ts` walks the epic's journeys and runs axe on every screen), `scripts/` (repository checks) | each story, S1-E1-QA |

**One main journey through the whole epic:** kid_14_waiting opens the app on a second device. `index.html` runs `public/theme-init.js` (light or night before the first paint, S1-E1-03) → `src/main.tsx` starts the translations in this browser's language, Romanian on a first visit (S1-E1-01, S1-E1-04) → the router draws `AppLayout` with the top bar, the page and the footer (S1-E1-03) → `useAccountLanguage` asks Supabase for the stored session, then reads `profiles.locale` → Postgres checks `profiles_select_own` and returns only kid_14_waiting's own row (S1-E1-02) → the screen switches to English. If kid_14_waiting tried to publish, the write policy would ask `is_active_member()`, which says no: under 16 and read-only in March (S1-E1-02). `e2e/epic-s1-e1.spec.ts` walks this journey.

## Start here

Read in this order; each file's header comment says what it is for and where things go next.

1. `CLAUDE.md`: the rules, then `docs/architecture.md` sections 1.5 to 1.7 and `docs/definition-of-done.md`.
2. `index.html` → `src/main.tsx` → `src/app/AppProviders.tsx` → `src/app/router.tsx`: how the app starts.
3. `src/features/home/components/HomePage.tsx` and its test: the smallest complete feature.
4. `src/config/brand.ts` and `src/lib/i18n.ts`: where the name and the words come from.
5. `src/locales/ro/common.json` and `src/locales/en/common.json`: the interface text.
6. `src/styles/tokens.css`, `src/components/ui/README.md` and `/design` in the running app (`npm run dev`, then open /design): how screens look and which components to reuse.
7. `supabase/README.md`, then `supabase/migrations/` in order, `supabase/seed.sql` and `supabase/tests/database/010-profiles.test.sql`: the database side and how a policy is tested.
8. `.github/workflows/ci.yml`: what has to pass before anything merges.
9. `src/features/language/`: the first feature that saves to the database, from drop-down to SQL function (traced above).
10. `e2e/home.spec.ts`, `e2e/language.spec.ts` and `scripts/`: how the checks prove each rule.
