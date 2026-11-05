# Code tour

The map for a new developer: where the app starts, how one click travels to the database and back, where each kind of thing lives, and what to read first. Created by S1-E1-01. Every story that adds a feature, table, edge function or job adds a few lines here in the same pull request (CLAUDE.md, Readable code).

Today the app is a skeleton: one home page, the brand config, translations and CI (S1-E1-01), the database baseline with its seed personas (S1-E1-02), the design tokens, light and night mode, the app shell and the /design components page (S1-E1-03), the Romanian and English interface with the language saved to the account (S1-E1-04), the Legal centre with versioned terms, privacy notice and guidelines (S1-E14-01), and invite-only sign-up with email confirmation (S1-E2-01). Sections below say which later story fills in each part, so you can tell what exists from what is planned.

## Where the app starts

1. **`index.html`** is the only HTML page. The browser loads it first. Its `<head>` runs `public/theme-init.js`, which picks light or night mode before anything draws. It holds an empty `<div id="root">` and loads `src/main.tsx`. Its `<title>` is filled in from the brand config at build time by `vite.config.ts`.
2. **`src/main.tsx`** starts the app in four steps: find the root element, start the translations (`src/lib/i18n.ts`) in the language this browser last chose, or Romanian on a first visit (`src/lib/language-preference.ts`), build the router from `src/app/router.tsx`, and draw everything inside `src/app/AppProviders.tsx`.
3. **`src/app/AppProviders.tsx`** wraps every screen with the shared services: TanStack Query (the data cache that hooks use to talk to Supabase) and i18next (translations).
4. **`src/app/router.tsx`** lists every address and the page it shows. Every public page sits inside **`src/app/shell/AppLayout.tsx`**: a "Skip to content" link, the `TopBar`, the page in `<main>`, then the `Footer` with the Device / Light / Night drop-down. The English / Română drop-down sits in both the top bar and the footer, and `useAccountLanguage` shows a signed-in person's account language (S1-E1-04). Today: `/` shows the website home page (`WebsiteHomePage`, text from the CMS, S1-E5-08); `/design` shows every component (development and staging only); any other address goes back to `/` until S1-E1-05 adds a 404 page.
5. **`src/features/<feature>/components/<Page>.tsx`** is the page itself, for example `src/features/website/components/WebsiteHomePage.tsx`. Pages build on the shared components in `src/components/ui/`.

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
  │  first a table grant decides if the role (anon or authenticated) may use the table at all,
  │  then a row-level security policy decides which rows this user may see or change (CLAUDE.md
  │  rule 1); if not, the database refuses, whatever the screen showed
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
| `src/app/shell/`, `src/app/navigation.ts` | The frame around pages: top bar, footer, staff bar, and the links each one shows (only pages that exist); `NotFoundPage.tsx` for any unknown address | S1-E1-03, S1-E2-QA |
| `src/components/ui/`, `src/components/icons/` | Shared components (buttons, drop-down, fields, pills, chips, cards, shelves, notices, ad slots) and the few plain icons; see its README | S1-E1-03 |
| `src/features/theme/` | Light and night mode: the footer drop-down and the hook that applies it | S1-E1-03 |
| `src/features/language/` | The English / Română drop-downs, the hooks that switch and save the language, and the Supabase calls for `profiles.locale` | S1-E1-04 |
| `src/features/reporting/` | The shared Report button and dialog (`<ReportButton>`), the one report form; see its README and architecture 1.7.11 | S1-E10-01 |
| `src/features/moderation/` | The report queue and the case page of the admin site: tiers, deadlines, grouped reports and the decision; see its README | S1-E10-03a |
| `src/features/contact/` | "Write to us": the Contact us form, through our own Pages Function and Brevo; see its README | S1-E14-04 |
| `src/features/notices/` | "Report illegal content": the public report form and the authorities' removal-order contact point, through our own Pages Function; see its README | S1-E10-02 |
| `src/features/safety/` | "Is someone in danger right now?": the helplines for the reader's country, on the report dialog and the contact page; see its README | S1-E10-13a |
| `src/features/ads/` | The ad slots of public pages (`<PageAdSlot pageKey position context>`), filled by `page_ads()` from the page's context only, with "Why this ad?"; see its README | S1-E12-01 |
| `src/features/legal/` | The Legal centre (`/legal/:documentSlug`) and the "We've updated our Terms" notice; see its README | S1-E14-01 |
| `src/features/auth/` | Who is signed in (`useSession`), sign-up (`/sign-up`, `/join/<code>`), email confirmation (`/auth/confirm`) and the top bar's "Join for free"; sign-in comes with S1-E2-05 | S1-E14-01, S1-E2-01 |
| `src/features/flags/` | The public feature flags for screens that change with them (`useFeatureFlags`) | S1-E2-01 |
| `src/features/errors/` | Our own error log's browser side: the global handlers, the router's error page ("Something went wrong on our side") and the scrubbing before anything is sent; see its README | S1-E1-05 |
| `src/features/maintenance/` | The maintenance page and the gate in AppLayout that shows it while `maintenance_mode` is on (staff and the log-in pages excepted) | S1-E1-05 |
| `src/features/offline/` | The "You're offline" / "You're back online" banner under the top bar | S1-E1-05 |
| `src/config/appVersion.ts` | The build's version for error reports: the short commit on Cloudflare, `local` elsewhere (set in `vite.config.ts`) | S1-E1-05 |
| `src/schemas/` | zod rules shared by forms and (later) edge functions, starting with `signUp.ts` | S1-E2-01 |
| `src/lib/age.ts` | The age rules from a year (and month), the same as the database's `age_band_from_birth()` and `sign_up_age_outcome()` | S1-E2-02 |
| `functions/`, `server/` | Cloudflare Pages Functions (`functions/api/…`, run by Cloudflare next to the site) and their logic (`server/`), served locally by `server/pages-functions-plugin.ts`; the first is the leaked-password check (ADR 0003). `functions/s/[[path]].ts` → `server/link-preview.ts` puts the Open Graph tags into every shared story and chapter page (S1-E4-04) | S1-E2-01, S1-E4-04 |
| `supabase/templates/` | The Supabase Auth emails in Romanian and English, generated by `npm run emails:build` from `src/locales/*/email.json` and the brand config; never edited by hand | S1-E2-01 |
| `content/legal/`, `scripts/build-legal-migration.ts` | The legal drafts (English, and Romanian draft translations in `ro/`) and the script that turns a new version into a migration | S1-E14-01 |
| `src/features/design-system/` | The /design page: every token and component on one page, with live contrast ratios | S1-E1-03 |
| `src/config/brand.ts` | Product name, site, email addresses, social handle and company name (front end only) | S1-E1-01, S1-E1-03 |
| `src/features/writing/` | The writer's side: `/write` (Your writing, with the writer dashboard of S1-E3-07: `writer_dashboard()`, totals only, "fewer than 5" below five), `/write/new` (the new story form), `/write/s/:storySlug/settings` (story settings, delete and undo), `/write/s/:storySlug/c/:chapterCode` (the chapter editor and its autosave), the tag rule, the Markdown converters, `create_story()`, `update_my_story()`, `save_chapter_draft()`; see its README | S1-E3-01, S1-E3-05, S1-E3-02a, S1-E3-07 |
| `src/features/reading/` | The reader's side: `/s/:storySlug` (the story page) through `get_story_page()`, the label pills, the chapter reader and, for signed-out visitors, the teaser and the "No preview" notice; see its README | S1-E3-05, S1-E3-06, S1-E4-01a, S1-E4-04 |
| `src/features/people/` | Writer profiles (`/u/:handle`) through `get_writer_profile()`, blocks (`set_block()`, the block dialog, Settings' "Blocked accounts"), the bio, and the shared `<FollowButton>` for writers and stories; see its README | S1-E5-05, S1-E6-05 |
| `src/features/discovery/` | Discover (`/discover`), and one list page for every See all, category, tag and writer list (`/discover/all/:listKind`, `/discover/c/:categorySlug`, `/discover/t/:tag`, `/u/:handle/stories`), all through `browse_stories()`; filters and sort live in the address; see its README | S1-E5-01, S1-E5-09, S1-E5-02 |
| `src/components/covers/` | `DrawnCover` (every cover we draw: the 16 designs, the 9-colour palette, the full title at every size), `coverDesigns.ts` (the designs, colours and pattern artwork from the NewStory board) and `automaticCover.ts` (a skipped cover gets a design from the story's ID; `designsForRow()` keeps two neighbours in a row apart) | S1-E3-01, S1-E3-13 |
| `src/components/ui/Doodle.tsx`, `src/assets/doodles/` | The decorative doodles (`data-doodle="background"` or `"widget"`, hidden under 1000 or 600 px), copied from design/assets with readable names; `e2e/support/doodles.ts` fails a screen when a doodle meets text or a control | S1-E3-01 |
| `src/components/ui/Shelf.tsx`, `useShelfScroll.ts`, `shelfPaging.ts` | Every sideways row of stories: the one-side fade, and arrows that move by whole cards (`pageTarget()`), so the card the fade covered is shown fully after one press; tests in `shelfPaging.test.ts` and `e2e/shelf-paging.spec.ts` | S1-E1-03, FIXES-1a |
| `src/features/<feature>/` | One folder per feature: `components/` (screens), `hooks/` (data hooks), `api/` (Supabase calls) and a `README.md` | each feature story; `home/` by S1-E1-01 |
| `src/lib/` | Shared helpers: `i18n.ts` (translations), `utils.ts` (`cn` for class names), `database.types.ts` (generated, never edited by hand), `supabase.ts` (the one browser client, loaded on demand; null without settings), `language-preference.ts` (the language kept in this browser), `romanian-text.ts` (ş and ţ become ș and ț), `query-retry.ts` (a refused read, 401 or 403, isn't retried; api/ functions keep the response status as the error's cause), and later `platform/` adapters | S1-E1-01, S1-E1-02, S1-E1-04, S1-E2-QA |
| `src/locales/ro/`, `src/locales/en/` | All interface text, one JSON file per namespace; same keys in both | S1-E1-01, S1-E1-04 |
| `src/styles/` | `tokens.css` (every colour, light and night, plus fonts, radii and shadows, all from the boards), `fonts.css` (self-hosted fonts), `index.css` (global rules: focus ring, reduce motion, tmc-* classes), `contrast-pairs.ts` (the pairs CI checks) | S1-E1-01, S1-E1-03 |
| `src/schemas/` | zod schemas shared with edge functions | first story with a form or function |
| `src/test/` | Test set-up; later fixtures and MSW mocks | S1-E1-01 |
| `public/` | Files copied as they are into `dist/`: `_redirects` (every address serves `index.html` on Cloudflare Pages) and `theme-init.js` (light or night before the first paint) | S1-E1-01, S1-E1-03 |
| `supabase/config.toml` | Local Supabase settings; also read by Supabase's GitHub integration | S1-E1-01 |
| `supabase/migrations/` | Every schema change, as SQL files. The only way the database changes (CLAUDE.md rule 3). Staging gets them from Supabase's GitHub integration when main changes | S1-E1-02 onwards |
| `supabase/functions/` | Edge functions (Deno), the only code that may hold the service role key; logic in a plain file next to `index.ts` so Vitest can test it | S1-E13-04 (`storage-sweep`) |
| `supabase/tests/` | pgTAP database tests: an allowed and a denied test for every policy, plus the CI guards (`001` RLS on every table, `002` table kinds and `user_id`, `003` table grants match the policies) | S1-E1-02 onwards |
| `supabase/seed.sql` | The 16 synthetic seed personas (accounts, profiles, staff roles); never real data | S1-E1-02 |
| `supabase/README.md` | The database conventions every migration follows, the account gate and the persona list with the shared test password | S1-E1-02 |
| `e2e/` | Playwright tests in a real browser, with axe accessibility checks. `e2e/support/personas.ts` signs a seed persona in against the local Supabase (no sign-in screen needed). Tests run one at a time, because they share the personas, the seed story and site-wide flags in one database. A test that checks a signed-in screen in one language saves that language on the persona first (the account's language wins), and `e2e/support/animations.ts` waits for slides to stop before the next key | S1-E1-01, S1-E1-04, S1-E1-QA, TOOL-1 |
| `scripts/` | Repository checks: the i18n check, the brand-value check, the generated-types check, the story issue sync (S1-E1-01); the policy-test coverage check and the bundle secret scan (S1-E1-02); and their tests | S1-E1-01, S1-E1-02 |
| `.github/workflows/` | CI (`ci.yml`), the disabled production release, the story issue sync. In `ci.yml` pull requests run only the quick `checks` job; the database and end-to-end jobs run after each merge to main | S1-E1-01; full tests only after the merge, 1 Nov 2026 |
| `.claude/` | Claude Code settings and the SessionStart hook: on every start and resume it puts Node 24 first on PATH (through `CLAUDE_ENV_FILE`), starts Docker for the local Supabase stack if it is down, and installs packages when the lock file changes | S1-E1-01, Tooling (18 Oct 2026) |
| `docs/` | Architecture, Definition of Done, decisions, stories, runbooks, this tour; `mocks.md` (mocks and stubs still on); `epic-reports/` (one report per epic check) | starter kit, then every story |
| `design/` | Boards (source of truth for screens), renders and pictures | starter kit |
| `design/assets/*.svg`, `scripts/doodle-tokens.ts` | The 98 doodles and 16 drawn cover backgrounds; the script that keeps every doodle colour a `--doodle-*` token (Lane B, below) | canvas; Lane B (23 Oct 2026) |

**Where the app runs.** Locally: Vite's dev server plus the Supabase CLI in Docker. Staging: Cloudflare Pages project `ghemotoc` builds `main` (`npm run build`, output `dist`) and gives each pull request a preview link; Supabase's GitHub integration applies migrations to the staging project. Production: a tagged release, approved in GitHub (`.github/workflows/release-production.yml`, switched off until a production project exists).

**Checks.** `npm run checks` (`scripts/run-all-checks.sh`) runs `npm run lint`, `npm run typecheck`, `npm run types:check`, `npm test`, a reset of the local database, `npx supabase test db`, `npm run test:e2e` and `npm run i18n:check`; after a build, also run `npm run scan:bundle`. The reset keeps the database tests independent of what ran before, and e2e puts the seed personas' language back when it ends (`e2e/support/global-teardown.ts`). Run them all locally before you mark a pull request ready for review. CI (`.github/workflows/ci.yml`) runs lint, types, unit tests, i18n and the build on every push to a pull request, drafts included. The two long jobs, database and e2e (about 19 minutes), are skipped on pull requests and run after every merge to main, so the full local run before merging is what guards main. A skipped job counts as passed for the merge rules, so open pull requests as drafts and mark them ready once the local run is green (Robert, 1 Nov 2026: GitHub Actions minutes; before that the CTO's rule of 24 Oct 2026 also ran them on the pull request).

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

**Table grants come before policies (S1-E1-02 fix, 17 Oct 2026).** Postgres checks two things: whether the role may use the table at all (a `grant`), then which rows the policy lets through. The hosted Supabase projects grant nothing to the Data API roles (`anon`, `authenticated`) on a new table, and `supabase/config.toml` sets `auto_expose_new_tables = false` so local works the same way. So every migration that adds a table grants exactly what its policies need: one `grant <command> on public.<table> to <role>` per role and command a policy names, and never `truncate`, `references`, `trigger` or `maintain`. `supabase/migrations/…_fix_table_grants.sql` holds the grants for the tables above, and `supabase/tests/database/003-table-grants-match-policies.test.sql` fails when a policy has no matching grant, when a grant has no policy, or when a new table starts with any privileges. Without the grant, the API answers 401 "permission denied for table", which is what broke the Legal centre on staging.

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

The contact and company details page (S1-E14-02) is a fourth legal document, `contact`, made the same way from `content/legal/04-contact-and-company-details.md` and its Romanian draft. Its addresses come from `src/config/brand.ts` (`{{authoritiesEmail}}`, `{{privacyEmail}}`) and show as email links; Settings and the footer link to it.

## Signing up (S1-E2-01)

```
/join/<code> (an invite link) or /sign-up        src/features/auth/components/SignUpPage.tsx
  │  useFeatureFlags: invite_only on → useInviteCheck → check_invite(code)  (no account touched)
  │  useLegalVersions: the current terms and privacy notice, so the form knows which it shows
  ▼
SignUpForm → useSignUpForm                        src/features/auth/hooks/useSignUpForm.ts
  │  0. src/lib/age.ts: the month only when the year needs it; under 13 (or under 18 in March)
  │     refused on the spot, answers cleared, nothing sent (S1-E2-02; the database repeats it)
  │  1. src/schemas/signUp.ts (zod): email, username, 10+ characters, both passwords the same,
  │     year, terms box. HandleField checks the username as it is typed (check_handle(), open to
  │     visitors since 25 Oct 2026, S1-E2-04) and again just before sending
  │  2. lib/passwordLeak.ts → POST /api/password-check (5 characters of a hash, ADR 0003)
  │  3. api/signUp.ts → supabase.auth.signUp (or signInWithOtp for "Email me a log-in link")
  ▼
auth.users insert → trigger handle_new_auth_user()   …_s1_e2_01_sign_up_trigger.sql (ADR 0002)
  │  sign_up_handle() checks the username again (taken, look-alike, reserved: whole sign-up refused)
  │  profiles row (id = user ID, handle) → use_platform_invite() → consents for terms and privacy
  │  any refusal: the whole insert is undone, nothing kept
  ▼
Supabase emails supabase/templates/confirmation.html (Mailpit locally)
  ▼
/auth/confirm?token_hash=…  → ConfirmEmailPage → verifyOtp → signed in; account_state() is active
  ▼  "Continue"
/ (home). /setup stays for an account made before 25 Oct 2026 without a username (next section)
```

## The country from the connection (S1-E2-10)

```
SignUpPage → useSignUpMarket                         src/features/auth/
  │  GET /api/signup-context  (functions/api/signup-context.ts on Cloudflare;
  │                            server/pages-functions-plugin.ts locally, country from
  │                            LOCAL_FAKE_COUNTRY or a test's X-Fake-Country header)
  │     server/signup-context.ts: request.cf.country → { country, token } (HMAC-SHA256,
  │     SIGNUP_CONTEXT_SECRET, 10 minutes); the IP address is never read or kept
  │  markets (public): is that country open, and its minimum age
  │  once sign-up is public: closed or unknown → /not-open (NotOpenPage)
  ▼
signUp() sends signup_context = token
  ▼
handle_new_auth_user() → verified_signup_country(token) with Vault's signup_context_secret
  → sign_up_market_outcome() (always ok in the invited test, Q6) → profiles.country_code
```

Settings › Account shows it as "Romania · From your connection" (`CountryRow`).

## Checking one's age with Yoti (S1-E2-08a, added 5 Nov 2026; ADR 0010)

Our server talks to Yoti; the browser only follows links, and the database keeps only the result:

```
/age-check (AgeCheckPage, useMyAgeCheck → my_age_check(): the line to check, 13 or 18)
  → "Continue with Yoti" (StartAgeCheckButton) → POST /api/age-check/start
      (server/age-check.ts; functions/api/age-check/[[path]].ts) with the person's sign-in
  → a Yoti session (server/age-check/yoti.ts) → begin_age_check(), signed → age_check_sessions
  → Yoti's hosted page: a selfie or an ID document
Yoti → POST /api/age-check/webhook → Yoti's signature checked → the result fetched from Yoti
  → record_age_check_result(), signed → profiles.age_check_result, age_checked_at, age_check_method
Yoti → /age-check/return (AgeCheckReturnPage) → my_age_check() every 2 s → the message (lib/returnOutcome.ts)
```

`AgeCheckNotice` in `AppLayout` links an account that waits for a check to `/age-check` (hidden while `adults_only` is on). While `YOTI` isn't "real", `server/age-check/stub.ts` plays Yoti with its own page. Tests: `199` in `supabase/tests/database/`, `server/age-check.test.ts`, `src/features/age-check/lib/returnOutcome.test.ts`, `e2e/age-check.spec.ts`.

When a check fails (S1-E2-08b), `ManualCheckPanel` offers "Ask for a manual check":

```
ManualCheckPanel → requestManualAgeCheck() → request_manual_age_check() → manual_age_checks
Staff › Users › Manual age checks (src/features/staff/components/age-checks/ManualAgeChecksPage)
  → useManualAgeChecks → admin_manual_age_checks() (year of birth and attempts, each read logged)
  → "Decide" (ManualDecisionForm) → admin_decide_manual_age_check() → profiles + audit_log + notify()
```

Three nightly jobs belong here too: `invite_new_adults_to_age_check()` (someone now 18 who holds only "13 or over"), `erase_unchecked_accounts()` (the 14-day clean-up) and `purge_old_age_check_attempts()`. Tests: `200` in `supabase/tests/database/`, `e2e/manual-age-check.spec.ts`.

## Parental consent (S1-E2-03, ADR 0011)

An under-16 whose age check passed asks a parent or guardian:

```
/parent-consent (ParentConsentPage, useMyParentConsent → my_parental_consent())
  → AskParentForm → POST /api/parent-consent/request (server/parent-consent.ts) with the writer's sign-in
  → a random token; begin_parental_consent(hash), signed → parental_consents → the email (Mailpit locally)
the parent's email → /parent-consent/answer#<token> (ParentAnswerPage, signed out)
  → useConsentRequest → parental_consent_request(token) → ParentAnswerDetails + ParentAnswerForm
  → POST /api/parent-consent/answer, signed → answer_parental_consent() → active, erased or read-only
```

`ParentConsentNotice` in `AppLayout` links an account that waits for a parent to `/parent-consent`. Staff withdraw from the account page ("Withdraw parental consent", `admin_withdraw_parental_consent()`). Tests: `201` in `supabase/tests/database/`, `server/parent-consent.test.ts`, `e2e/parent-consent.spec.ts`.

## Who may message whom (S1-E9-03)

```
/u/:handle (WriterProfilePage → useWriterProfile → get_writer_profile())   src/features/people/
  → can_message(visitor, writer): blocks, age rules, the writer's messages_from
  → ProfileHeader: "<name> isn't taking messages right now" when it says no, whatever the reason
```

`can_message()` is the one rule the private messages functions (S1-E9-01 onwards) ask first. Tests: `205` in `supabase/tests/database/`, `e2e/messaging-rules.spec.ts`.

## Private messages (S1-E9-01)

Sending a message, from the profile to the other person's top bar:

```
/u/:handle → ProfileHeader "Message" (only when can_message is true) → /messages/:handle
MessagesPage → ChatList (useConversations → my_conversations())          src/features/messages/
            → ChatPanel (useConversation → conversation_with()) + AboutChatPanel
  MessageComposer → send_message(handle, words)
    → conversation_can_send(): can_message() for a new chat, may_keep_writing() for one going on
    → take_rate_limit('message'); a new chat: start_conversation() → accepted, or a request
    → messages, conversations.last_message_at
the other person: MessagesNavLink (useUnreadMessageCount → unread_message_count(), every minute)
  → /messages → Requests: RequestActions → answer_message_request(accept or delete)
  → opening the chat → mark_conversation_read()
```

The open chat asks again every 5 seconds and the list every 15, instead of Realtime (the bell's choice, READ-3). Each message from the other person has `<ReportButton itemType="message">`. Tests: `206` in `supabase/tests/database/`, `e2e/messages.spec.ts`.

## Block and report inside messages (S1-E9-02)

From a chat to the moderator's case page, and blocking:

```
ChatPanel → ChatHeader                                                    src/features/messages/
  Block → ChatBlockDialog → useBlock → set_block() (ends the follows both ways) → back to /messages
    send_message() and conversation_with() then refuse the pair both ways (S1-E9-01)
  Report → <ReportButton itemType="profile">; each message from the other person → itemType="message"
    ReportDialog says the message and up to 20 before it go with it → report_item('message', id)
/staff/moderation/cases/:caseId → CasePage → CaseMessagePanel                src/features/moderation/
  useCaseMessage → admin_case_message() → message_with_context() (the message + up to 20 before it)
    → audit_log 'sensitive_read.case_message'
```

The context is read from the chat when staff open the case; the safeguarding evidence pack gets the same messages through `case_item_content()`. Tests: `207` in `supabase/tests/database/`, `e2e/messages-block-and-report.spec.ts`.

## Message settings and Delete chat (S1-E9-04)

```
/messages "Message settings" or a "Change" link → /settings#messages → MessageSettingsSection     src/features/messages/
  useSaveMessageSettings → set_message_audience() and set_adults_may_message() (16 and 17 only)
About this chat → DeleteChatControl → useDeleteChat → delete_conversation(handle)
  → conversation_members.deleted_at for the caller; my_conversations(), conversation_with() and the
    messages_select_member policy leave out what came before it (chat_cleared_at())
pg_cron 'purge-deleted-chats' nightly → purge_deleted_chats() → keeps held_message_ids() (reported + context)
```

Tests: `208` in `supabase/tests/database/`, `e2e/message-settings.spec.ts`. The epic check walks all four stories together in `e2e/epic-s1-e9.spec.ts`.

## Privacy settings (S1-E13-01)

```
/settings#privacy → PrivacySettingsSection (usePrivacySettings → my_privacy_settings())   src/features/privacy/
  profile radios → set_profile_audience()   library radios → set_library_audience()
  "Show when I'm online" → set_shows_online_status()   who can message you → Change → /settings#messages
/u/:handle → get_writer_profile() → is_limited (no bio, no join month), library_open
  → ProfileLibrary → browse_stories('reader_library', handle) → "View more" → /u/:readerHandle/library
AppLayout → PresenceHeartbeat → note_i_am_online() every minute while switched on
ProfileHeader, ChatHeader, ChatList → useOnlineHandles → who_is_online(handles) → OnlineDot
```

Under-18s start on the most private value of each choice; the database fills the defaults in. Tests: `209` in `supabase/tests/database/`, `e2e/privacy-settings.spec.ts`.

## Download my data and the shared Word builder (S1-E13-02)

```
/settings#download-my-data → DownloadMyDataSection → "Request my data"           src/features/data-export/
  → useStartDataExport → runDataExport (in this tab, ADR 0012):
      request_data_export() → my_data_export() (data_export_tables(), export_row_for_owner())
      → wordInputFrom() → storyToWord() per story (src/lib/word/, chapterTextToWord())
      → buildExportZip() (data.json + stories/<slug>.docx)
      → delete older files → upload to the private exports bucket → finish_data_export() → notify()
  ready line → "Download ZIP" → exportDownloadAddress() (one minute, owner only, seven days)
the "ready" notification → /settings#download-my-data
```

The Word builder in `src/lib/word/` knows nothing about the database: a caller turns rows into a `WordStory`, translates the labels and loads the pictures. S1-E11-09a and S1-E13-05 reuse it. Its twin, the PDF builder in `src/lib/pdf/` (ADMIN-2d: `storyToPdf()`, `planToPdf()`, `chapterTextToPdf()`), takes the very same `WordStory`, `WordPlan` and labels, so a story reads the same in both files; `loadPdfMake.ts` loads pdfmake and its fonts only when the first PDF is built, and blocks every web address while it builds. `buildWordFiles()` and `buildPlanFiles()` take the kinds to make (`['word']`, `['pdf']` or both): Download my data and staff copies make both (`stories/<slug>.docx` and `stories/<slug>.pdf`). A new user table must be added to `data_export_tables()` (test `210` fails until it is). Tests: `210`, `src/lib/word/storyToWord.test.ts`, `src/features/data-export/lib/*.test.ts`, `e2e/download-my-data.spec.ts`.

## Download my stories (S1-E13-05)

```
/settings#download-my-stories → DownloadMyStoriesBlock → Story drop-down, What to include
  (the chapters, the plan from Story Atlas, a JSON copy), All or chosen chapters → "Get my files"
  → useDownloadChoices (choiceProblem(), requestChoices()) → useStartStoriesExport
  → makeStoriesExport (in this tab, ADR 0012):
      request_stories_export(story, chapters, three choices) → 'reused' (same choices, and
        stories_fingerprint() unchanged in the last 24 hours) or 'new' with a .docx, .json or .zip
      → my_data_export() → documentForChoice() (only STORY_TABLES and CHAPTER_TABLES, chosen rows)
      → buildWordFiles() (storyToWord / storyToPdf) + buildPlanFiles() (plansFrom() → planToWord() / planToPdf()) + JSON
      → one file as it is, or buildWordZip() → delete older files → upload → finish_data_export()
  ready line (StoriesExportReady) → "Download Word file", "Download PDF", "Download JSON file" or "Download ZIP"
the "ready" notification (stories_export_ready) → /settings#download-my-stories (useScrollToHash)
```

It reuses Download my data's table, bucket, storage policies and finishing function: `exports.kind` is `my_stories`, `exports.story_id` names the one story (null for all) and `chapter_ids`, `include_chapters`, `include_plan`, `include_data` and `document_format` (`word`, `pdf` or `both`, ADMIN-2d; "Format" in `DocumentFormatChoice`) hold the choices. One copy of each kind is kept. Download my data's ZIP now holds each story's plan too (`stories/<slug>-plan.docx`). **A new table that holds a story's content goes into `STORY_TABLES` (`lib/storiesForData.ts`), `stories_fingerprint()` and, if it is part of the plan, `planForWord.ts`.** Tests: `213`, `src/features/data-export/lib/{runStoriesExport,planForWord}.test.ts`, `e2e/download-my-stories.spec.ts`.

### The EPUB of a completed story (S1-E13-05, PRIVACY part f)

```
Download my stories, one Completed story chosen → EpubSection → "Make an EPUB" → EpubDialog
  (name: the pen name filled in, any name allowed, never stored; title; the cover: the story's
  own or a JPEG or PNG from this device, previewed by EpubCoverField) → "Make EPUB"
  → useMakeEpub: the book's language (the story's, when ro or en) + applyLocaleOverrides()
  → makeEpub() (lib/runEpub.ts, loaded only now): my_data_export() → documentForChoice()
      → the published chapters in order → their pictures → the cover (epubCover.ts draws it on a
        canvas, or redraws the uploaded or picked picture) → the dataExport epub.book words
      → buildEpub() (src/lib/epub/): mimetype, container.xml, content.opf, nav.xhtml, toc.ncx,
        cover, title page, copyright page, one page per chapter (chapterTextToXhtml())
  → saved straight to the device as <slug>.epub: no export row, no upload, no notification
```

Only the writer, only a Completed story, only published chapters, never the Atlas. The copyright page's words are interface text (`dataExport:epub.book.*`), so admins edit them in Interface text; `{{year}}`, `{{author}}`, `{{productName}}`, `{{siteUrl}}` and `{{date}}` are locked there. Tests: `src/lib/epub/buildEpub.test.ts`, `src/features/data-export/lib/runEpub.test.ts`, `e2e/epub.spec.ts`.

## Delete my account (S1-E13-03)

```
/settings#delete-account → DeleteAccountSection → "Delete my account"         src/features/account-deletion/
  → DeleteAccountConfirm → ConfirmLogIn while the log-in is old (password, passkey or a provider with mode=confirm)
  → useRequestAccountDeletion → request_account_deletion() (account_signed_in_recently())
      profile, stories and comments marked deleted at once → account_deletions row (delete_after)
  → AccountClosingGate (in AppLayout) → ClosingAccountPage: "Keep my account" → cancel_account_deletion()
nightly purge-closed-accounts → purge_closed_accounts() → delete_account_data()
  → delete_account_stories() + delete_account_conversation() (content_is_held_for_moderation() keeps what a case holds)
  → every 'delete' table of account_deletion_rules() → erase_closed_account() (the tombstone)
/delete-account (DeleteAccountPage) → the steps, or /settings#delete-account when signed in
```

The user ID is never reused: the profile and the login row stay as an empty tombstone. A new user table must be added to `account_deletion_rules()` (`delete`, `own_step` or `kept` with a reason; test `211` fails until it is). Tests: `211`, `e2e/delete-my-account.spec.ts`.

## The retention clean-ups (S1-E13-04)

```
nightly run-retention-jobs → run_retention_jobs()                     supabase/migrations/…_s1_e13_04_retention_jobs.sql
  → purge_unconfirmed_accounts() → delete_account_data()   (email not confirmed after 7 days)
  → purge_expired_exports(), purge_deleted_pictures(), purge_old_staff_records()
  → purge_old_audit_log() (the one delete refuse_audit_log_change() lets through: rows older than 3 years)
  → fold_old_daily_totals() (chapter_reads and chapter_shares older than 3 years → one row per chapter)
  → record_retention_run() → retention_runs (one row per clean-up, owner and admin read it)
nightly run-storage-sweep → run_storage_sweep() → pg_net → supabase/functions/storage-sweep/index.ts
  → sweep.ts: storage_files_to_sweep() (service role) → Storage API delete, 100 names a call
```

The schedule itself is `docs/retention.md`; every keep time is a setting (`*_keep_*`, `unconfirmed_account_days`). Deleting a row never deletes its file, so a table that points at Storage files must also be read by `storage_files_to_sweep()`. This is the first Supabase Edge Function: the logic is in `sweep.ts` (plain TypeScript, tested by Vitest), and `index.ts` only hands it Deno's settings. Tests: `212`, `supabase/functions/storage-sweep/sweep.test.ts`.

### One journey through the whole epic (S1-E13-QA)

A 14-year-old shows their library to people they follow, then downloads their data:

```
Settings › Privacy radio → usePrivacySettings → set_library_audience() → profiles.library_visible_to
Settings › Download my data → runDataExport → request_data_export() → my_data_export()
  → export_account_of() (the profile, with library_visible_to) + export_tables_of() (data_export_tables())
  → data.json in the ZIP → private exports bucket → finish_data_export() → seven days later
nightly run_retention_jobs() → purge_expired_exports() → the file goes with the Storage sweep
Delete my account → request_account_deletion() → 14 days → purge_closed_accounts() → account_deletion_rules()
```

`data_export_tables()` and `account_deletion_rules()` must name the same tables (test `214`; `exports`, the copy itself, is the one table only deletion names). The epic check walks the five stories together in `e2e/epic-s1-e13.spec.ts` and `214`; its report is `docs/epic-reports/S1-E13.md`.

## The Teacher badge (S1-E2-11)

An adult shows they teach, in onboarding step 3 or in Settings › Teacher badge:

```
TeacherStep / TeacherBadgeSection (useMyTeacherCheck → my_teacher_check())   src/features/teacher-badge/
  school email: SchoolEmailWay → POST /api/teacher-check/link (server/teacher-check.ts) with the person's sign-in
    → a random token; begin_teacher_email_check(domain, hash), signed → teacher_checks → the email (Mailpit locally)
    the email → /teacher-check/confirm#<token> (TeacherConfirmPage) → confirm_teacher_email(token)
    → .edu.ro: the badge at once; anything else: waiting for staff
  proof: ProofWay → preparePicture → Storage teacher-proofs → submit_teacher_proof() → waiting for staff
/staff/schools/teachers (TeacherChecksPage, useTeacherChecks)                 src/features/staff/components/schools/
  → admin_open_teacher_proof() (a logged sensitive read) → the file for a minute
  → the file deleted → admin_decide_teacher_check() → the badge or "Not yet", a notification and the audit log
```

The badge shows on the profile (`get_writer_profile()`'s `is_teacher`, `TeacherBadgePill`). Tests: `204` in `supabase/tests/database/`, `server/teacher-check.test.ts`, `e2e/teacher-badge.spec.ts`.

## Onboarding (S1-E2-06)

A new account past the age check sets up its profile once, at `/setup`:

```
SetupProfileNotice ("Finish setting up your profile", AppLayout) → /setup
/setup (OnboardingPage, useMyOnboarding → my_onboarding())          src/features/onboarding/
  → OnboardingSteps: NameStep → save_my_region()
                     LikesStep → save_my_preferences() → reading_preferences
                     SafetyStep (under-18s) → set_adults_may_message()
  → finish_onboarding() → profiles.onboarded_at → /discover, where "Picked for you"
    is browse_stories('picked') over reading_preferences
Settings › What you like (LikesSettingsSection) → the same writes
```

Tests: `202` in `supabase/tests/database/`, `e2e/onboarding.spec.ts`.

## Google, Apple, Microsoft and passkeys (S1-E2-09)

All behind the `social_login` and `passkey_login` flags (off in March). A provider only replaces the
password: the rest of the sign-up form, and the same database rules, still apply.

```
Sign-up: SignUpForm → SocialSignUp → useSignUpForm.continueWith()       src/features/auth/
  → checks everything but email and password → keeps the answers in sessionStorage
  → signInWithOAuth() → the provider → /auth/social-return (SocialReturnPage)
  → settleSocialReturn() → finish_social_sign_up(kept answers)
       → create_profile_from_sign_up(): the same rules as the sign-up trigger
       → refused: cancel_social_sign_up() removes the account
Log in: OtherWaysToLogIn → signInWithOAuth() or signInWithPasskey()
Settings › Ways to log in: LoginMethodsSection → useLoginMethods       src/features/account/
  → my_login_methods(); Connect: expect_identity_link() → linkIdentity()
  → guard_identity_link() (auth.identities) lets a provider join only when asked for
  → notify_login_method_change() → login_method_added / _removed, always emailed
```

Tests: `203` in `supabase/tests/database/`, `src/features/auth/api/socialReturn.test.ts`,
`e2e/ways-to-log-in.spec.ts` (passkeys with Chrome's virtual authenticator).

## Logging in (S1-E2-05)

```
/sign-in (SignInPage → SignInForm)                     src/features/auth/
  │  useSignInForm → api/signIn.ts signInWithPassword()
  │     1. lib/emailHash.ts: SHA-256 of the email, in the browser
  │     2. sign_in_pause_until(hash)  → paused? stop here (the same for any email)
  │     3. supabase.auth.signInWithPassword
  │        wrong details → record_sign_in_failure(hash) (5 in 15 minutes pause it)
  │        logged in    → clear_my_sign_in_failures()
  ▼
the top bar's AccountMenu (Settings, Log out) → /settings → SignedInDevicesSection
  │  useMySessions → list_my_sessions() / end_my_session() read auth.sessions, never the IP
  │  "Log out of all other devices" → supabase.auth.signOut({ scope: 'others' })
/forgot-password → resetPasswordForEmail → supabase/templates/recovery.html
  ▼
/reset-password?token_hash=… → verifyOtp(recovery) → NewPasswordForm → updateUser
  → signOut({ scope: 'others' }) → Supabase sends supabase/templates/password_changed.html
```

## Seeing and changing one's own email address (S1-E2-05, added 25 Oct 2026)

```
/settings → EmailSettingsSection → useMyEmail           src/features/account/
  │  api/emailAddress.ts fetchMyEmail(): supabase.auth.getUser(), the owner's own record only
  │     (the address lives only in Supabase Auth; profiles and public views never hold it)
  │  NewEmailForm "Change email" → requestEmailChange() → supabase.auth.updateUser({ email })
  ▼
Supabase emails supabase/templates/email_change.html, with its own 6-digit code ({{ .Token }}),
  to the old AND the new address (double_confirm_changes in supabase/config.toml)
  ▼
EmailCodesForm (two EmailCodeField boxes) → useEmailChangeCodes → checkEmailChangeCode()
  → supabase.auth.verifyOtp({ email, token, type: 'email_change' }), once per address
  a right code is locked; once both are right the address has changed (Robert, 25 Oct 2026, 09:15)
```

Tests: `e2e/email-change.spec.ts`, `src/features/account/api/emailAddress.test.ts`.

## An optional birthday (S1-E2-12, added 26 Oct 2026)

```
/settings → BirthdaySettingsSection → BirthdayForm → BirthdayPicker   src/features/account/
  │  useMyBirthday → api/birthday.ts fetchMyBirthday(): profiles.birthday_month and birthday_day
  │     (profiles_select_own: only the owner reads them; no public view carries them)
  │  Save → saveMyBirthday() → set_my_birthday(month, day): a day only with a month, never a year
  ▼
staff: /staff/users/<id> → AccountActions "Correct birthday" → admin_set_birthday()
  owner, admin and moderator only, with a reason; before and after go to the audit log
the year of birth from sign-up never changes (trigger profiles_birth_year_never_changes)
```

Discover's greeting line (S1-E2-13):

```
/discover → GreetingLine                                src/features/discovery/components/
  │  useMyNames (pen name, else username) and useMyGreeting → api/greeting.ts → my_greeting()
  │  my_greeting() → greeting_for(month, day, joined, Romanian date): 'birthday' on the day,
  │     'birthday_month' all that month, 'anniversary' in the joining month from year one, else null
  ▼
lib/greeting.ts greetingKeyFor(): the special words, or good morning, afternoon or evening by the
  reader's own clock (discovery.json "greeting")
```

Tests: `supabase/tests/database/159-birthday-and-anniversary.test.sql`, `src/features/account/api/birthday.test.ts`, `src/features/account/api/greeting.test.ts`, `src/features/discovery/lib/greeting.test.ts`, `e2e/birthday.spec.ts`.

## Adding a public-domain classic (S1-E11-16, part 16a, added 26 Oct 2026)

```
/staff/classics → ClassicsPage → useClassics → api/classics.ts    src/features/staff/
  │  "Add a classic work" → ClassicWorkForm (ClassicAuthorFields, ClassicStoryFields,
  │     ClassicSourceFields; FreeMarketsList with lib/publicDomain.ts as staff type)
  │     → admin_add_classic_author() for a new author, then admin_save_classic_work()
  │        → a draft story owned by the classics account (setting classics_account_handle),
  │          its real author as the byline (classic_authors), details in classic_works
  │  ClassicCard → ClassicTextForm: paste or open a file → lib/splitClassicText.ts (a chapter
  │     at every # heading) → preview, fix titles → admin_set_classic_chapters()
  │  Publish → admin_publish_classic(): only when classic_free_markets() says free in Romania
  │  Unpublish (with a reason) → admin_unpublish_classic()
  ▼
every admin_* function checks staff_may('classics') (owner, admin) and writes the audit log
readers: get_story_page() → story_classic_author() → "Text from: <source edition>" (StorySideColumn)
```

Tests: `supabase/tests/database/160-classic-works.test.sql`, `src/features/staff/lib/splitClassicText.test.ts`, `src/features/staff/lib/publicDomain.test.ts`, `e2e/classics.spec.ts`.

### The classics shelf, research lists, 1 January and typo fixes (S1-E5-06, S1-E11-16 part 16b)

- **Readers:** Discover's "Public-domain classics" shelf is the story list kind `classics` (`list_holds_story()`: stories with a `classic_author_id`). It goes through `listed_stories()` like every list, so ratings, blocks and moderation apply, and "View more" opens `/discover/all/classics`. The shelf is the word `classics` in the `discover_shelves` setting (Staff › Settings › Discover mix); `is_story_list_kind()` is the one list of kinds `browse_stories()` accepts.
- **Import a research list:** `ClassicsImport` reads a CSV from `content/classics` (`lib/parseClassicsCsv.ts`) → `useClassicsImport()` → `admin_import_classics()`. Each row goes through `classic_import_row()` in its own sub-transaction: it finds or adds the author, skips a work already listed (same title and author) and makes a draft with its kind (`classic_kind_from_list()`), category, language and source (`classic_source_title()`), rated All ages. `classic_works.details_checked` is false until staff save the details, and `admin_publish_classic()` refuses (`details_unchecked`) until then.
- **1 January:** `ClassicSuggestionsPanel` → `admin_classic_suggestions()`: the listed authors who died 71 years before this year (free since 1 January) and 70 years before (free next 1 January), with their works (`classic_authors_dying_in()`).
- **Typo fixes:** a published card's "Fix a typo" → `ClassicTypoFix` → `useClassicTypoFix()` → `admin_classic_chapter()` and `admin_fix_classic_typo()`. The fix goes live, a `chapter_revisions` row (reason `edited`) keeps it as a version and the audit log keeps the reason; `classic_fix_is_small()` refuses more than 3 words or 2% of the length.
- **Tests:** `supabase/tests/database/178-classics-shelf-and-import.test.sql`, `e2e/classics-shelf.spec.ts`, `src/features/staff/lib/parseClassicsCsv.test.ts`.

## When something goes wrong: errors, offline and maintenance (S1-E1-05)

```
an error nobody caught (window "error", "unhandledrejection")   src/main.tsx → installGlobalErrorHandlers
a page that fails to draw → the router's errorElement            src/app/router.tsx → ErrorPage
  │  errorReporter.reportError(): at most 5 per page load, no repeats
  │  buildErrorReport(): name, scrubbed message (scrubErrorText), route pattern (useTrackRoutePattern
  │  in AppLayout keeps "/join/:code", never the address), app version, browser family
  ▼  api/clientErrors.ts → rpc report_client_error()
…_s1_e1_05_client_errors.sql: scrubs again, shared limit of 60 a minute, insert into client_errors
  (no user_id); pg_cron deletes rows after 30 days; admin_list_client_errors() for owner and admin

AppLayout: TopBar → OfflineBanner (navigator.onLine) → <main> MaintenanceGate → notices + page
  MaintenanceGate: maintenance_mode on (read every minute) and not is_staff_session() and not a
  log-in or legal page → MaintenancePage ("Check again", "Staff sign-in")
```

The error page shows the first six characters of the stored row's ID as the code to quote ("E-4F7A2C"), so support can find the row without the log keeping anything about the person.

## The admin shell (S1-E11-01)

```
/staff/* (src/app/router.tsx: staffRoutes, loaded only when opened)     src/features/staff/
  │  StaffLayout: skip link, StaffBar (the areas the person may open), the page, StaffFooter
  │     useMyStaffAccess → api/staffAccess.ts → my_staff_areas() + own staff_roles + own handle
  │     a member or a visitor gets StaffAccessRefused instead (the server refused already)
  │  staffAreas.ts: area → page (moderation, users, roles, audit_log; each staff story adds its own)
  ├─ /staff            StaffHomePage: one card per area the person may open
  ├─ /staff/roles      StaffRolesPage (S1-E2-07a, below)
  ├─ /staff/users      UsersPage (S1-E11-02): search → useUserLookup → admin_user_lookup()
  ├─ /staff/users/:id  AccountPage: useAccount → admin_user_account(), admin_account_open_cases(),
  │                      admin_account_sanctions(), admin_search_audit_log(), admin_reveal_email();
  │                      AccountActions → useAccountActions → admin_apply_sanction(),
  │                      admin_reset_pen_name(), admin_sign_out_everywhere(), admin_approve_username()
  ├─ /staff/users/invites  InvitesPage (S1-E11-17), the Users area's second tab (/staff/invites
  │                      redirects): MakeInviteForm → useInviteLinks → api/inviteLinks.ts
  │                      admin_create_invite() (the code once, hashed in invites) / admin_list_invites()
  │                      / admin_revoke_invite(); the link is brand.siteUrl + /join/<code> (S1-E2-01)
  └─ /staff/audit-log  AuditLogPage: AuditLogFilters → useAuditLog → api/auditLog.ts
                         admin_search_audit_log() (one page) / admin_export_audit_log() (CSV rows,
                         the export itself logged as audit_log.exported) → lib/auditLogCsv.ts
  ▼
…_s1_e11_01_admin_shell.sql
  │  is_staff_session(): a staff role AND a session younger than staff_session_hours (12)
  │  staff_signed_in_recently(): a sign-in within staff_fresh_sign_in_minutes (15), from the
  │  token's amr claim; require_role_change_allowed() asks it before any role change
  │  my_staff_areas(): the areas the caller's roles allow (what the menu shows)
  │  log_sensitive_read(kind, …): email_revealed, draft_opened, export_file_opened,
  │  evidence_pack_opened, teacher_proof_opened → log_staff_action()
  ▼
audit_log (append-only: no role, the owner included, can change or delete a row)
```

Invite links (S1-E11-17): an admin makes a link at /staff/users/invites; sign-up at /join/<code> calls `use_platform_invite()` inside the sign-up transaction, once the new profile exists (one conditional UPDATE, so the last place goes once). The audit log gets `invite.created` and `invite.revoked` from the admin, `invite.redeemed` from the new account (its user ID only) and `invite.used_up` from the system (`audit_log.actor = 'system'`, no user ID), never on behalf of the admin (CTO, 24 Oct 2026).

Every staff screen reads and writes only through policies and `admin_*` functions, each of which asks `staff_may()` → `is_staff_session()` (architecture 1.8.1). The menu is built from the same answer, but it is a convenience: the server refuses on its own.

## Reporting something (S1-E10-01)

```
any screen with user content: <ReportButton itemType itemReference itemLabel />   src/features/reporting/
  │  ReportDialog (the browser's <dialog>): ReportReasonList (the enum, src/schemas/report.ts),
  │  details, Send → useReportItem → api/reports.ts → rpc report_item()
  ▼
…_s1_e10_01_reports.sql
  │  report_item(): signed in (any state, architecture 1.7.8) → reportable_item_owner() finds the
  │  item and its owner (one branch per reportable_type; test 042) → not one's own → the same
  │  report within 24 h gives the same reference → the hourly limit → insert into reports
  ▼
reports (user_id = the reporter; read by moderation staff only) → ReportSent shows "R-000123"
```

S1-E10-03a opens a moderation case from the new row; S1-E10-06 adds the reporting pause; S1-E10-02 reuses the dialog on the public form.

## The moderation queue (S1-E10-03a)

```
/staff/moderation (router: staffRoutes)                                src/features/moderation/
  │  ModerationQueuePage: TierSummary (open counts per tier) → QueueFilters → CaseList → CaseRow
  │     useModerationQueue → api/moderationQueue.ts → rpc admin_moderation_queue(filters)
  │     (read again every minute, so "5 h 50 min left" keeps moving: lib/deadline.ts, useNow)
  ├─ /staff/moderation/cases/:caseId
  │     CasePage: CaseReports (admin_case_reports) · CaseDecisions (admin_case_actions)
  │     · DecisionForm → useCase.decide() → rpc admin_decide_case(case, action, note)
  ▼
…_s1_e10_03a_moderation_queue.sql
  │  report_item() (S1-E10-01) now ends with attach_report_to_case(): one open case per item;
  │  the tier from report_reason_tiers (Q5), the deadline from the FIRST report, the more urgent
  │  reason wins, an under-18 reporter and a safeguarding reason are flagged on the case
  │  may_see_case(): moderation staff; a safeguarding case needs the safeguarding permission (Q6)
  │  admin_decide_case(): a note is required → case_actions row → the case and its reports close
  │  → log_staff_action('case.decided', …) in the same transaction
  │  hooks for later stories sit at its end: S1-E10-06 carries the action out, S1-E10-04 sends
  │  the statement of reasons
  ▼
cases (user_id = the reported account), case_actions (user_id = the staff member), reports.case_id
```

An authority order (S1-E10-09) and a flagged picture (S1-E10-05) insert their own cases with `source` set; the seed also holds one of each so the queue shows every tier. S1-E10-03b added claiming (`admin_claim_case()`, `admin_release_case()`: advisory, never a lock), the reason and claimed filters and the search to `admin_moderation_queue()`.

## Sanctions, and what a decision does (S1-E10-06)

```
CasePage → DecisionForm (warn, suspend 1/7/30 days, ban, hide, remove; restrict waits for S1-E11-08)
  │  useCase.decide() → rpc admin_decide_case(case, action, note, suspension_days)
  ▼
…_s1_e10_06_sanctions.sql
  │  admin_decide_case(): closes the case (S1-E10-03a) then carries the action out:
  │    warn/suspend/ban → admin_apply_sanction(): a sanctions row; a ban also sets Supabase's own
  │      auth.users.banned_until, ends every session (sign_out_everywhere) and keeps the email's
  │      keyed hash (banned_email_hashes, HMAC with the Vault secret banned_email_secret, Q8)
  │    hide/remove → moderate_item(): a moderated_items row (hidden: writer and staff still see
  │      it; removed: staff only, "[Removed by the moderation team]" for the rest, Q3)
  │  account_state(): banned, then suspended, right after the email check → is_active_member()
  │  false, so every write policy refuses; reading and downloading data still work
  │  handle_new_auth_user(): refuses a sign-up whose email is on the banned list
  │  report_item(): refuses a reporter with a live reporting_pause (SQLSTATE 55000)
  ▼
CasePage: AccountSanctions (admin_account_sanctions(), Lift → admin_lift_sanction()),
  CaseReports › Pause reporting (admin_pause_reporting(handle)), ModeratedItemNotice › Restore
  (admin_restore_item()); every action asks for a reason and goes to the audit log
AppLayout → SanctionNotice (my_sanctions(): kind and dates only) "Your account is suspended until …"
Sign-in: Supabase answers user_banned → "This account is banned"; the report dialog: "Your
  reporting is paused"
```

Lane A's public read policies add `and not public.is_moderated_away('<type>', id)` (architecture 1.7.11); `moderated_state_of()` tells a screen whether to draw the removed marker.

## Statements of reasons, removal orders and safeguarding (SAFE-3: S1-E10-04, S1-E10-09, S1-E10-10)

```
CasePage → DecisionForm: the action, the note (staff only) and "What we tell the person"
  │  useCase.decide() → rpc admin_decide_case(case, action, note, days, message_to_person)
  │  then sendDueEmails() → POST /api/decision-emails (server/decision-emails.ts, as the moderator)
  ▼
…_s1_e10_04_statements_of_reasons.sql
  │  decide_case() (internal): case_actions → carry the action out (S1-E10-06) →
  │    issue_statement_of_reasons() (not for no_action) → the case closes → audit log
  │  statement_ground_for_case(): the law for illegal reasons and orders, our terms otherwise
  │  notify_case_decided(): the person gets moderation_decision linked to the statement;
  │    each reporter gets report_outcome (removed, acted or no_action, never the sanction)
  │  admin_apply_sanction() from the account page sends its own statement; a queued
  │    statement_of_reasons_needed job (S1-E3-06) becomes one at once (statement_from_job)
  │  admin_due_decision_emails(): notices from the public form waiting for their email
  ▼
statements_of_reasons (user_id = the person; read by them and moderation staff; nobody writes it
directly) · notifications.statement_id
/my-reports (src/features/statements/): my_statements() and my_reports(): the person's own only

Queue → PublicNoticesPanel: each order's alert, who was on call, Acknowledge
  │  …_s1_e10_09_removal_orders.sql: send_on_call_alert() names on_call_now(); the pg_cron job
  │  escalate-on-call-alerts widens it after 15 minutes; admin_acknowledge_on_call_alert()
CasePage → RemovalOrderPanel: admin_order_timeline() · Emergency disable → admin_emergency_disable()
  │  → decide_case(remove) → mark_order_item_disabled(): disabled_at and preserve_until (6 months);
  │  content_is_held_for_moderation() keeps it from every purge until then
/staff/on-call → OnCallRotaPage: admin_on_call_rota(), admin_set_on_call_shift() (owner, admin;
  only people with the on_call permission; shifts never overlap), admin_remove_on_call_shift()

CasePage → SafeguardingPanel (safeguarding cases) or MoveToSafeguarding (any other open case)
  │  …_s1_e10_10_safeguarding.sql: admin_mark_safeguarding(), admin_case_support_contacts()
  │  (the person's country, Romania's as the fallback), admin_build_evidence_pack() (logged as a
  │  sensitive read; never stored), admin_log_referral() → safeguarding_referrals
```

Runbooks: `docs/runbooks/removal-orders.md` and `docs/runbooks/safeguarding.md`. Tests:
`supabase/tests/database/161` to `163`, `server/decision-emails.test.ts`, `e2e/statements.spec.ts`,
`e2e/removal-orders.spec.ts`, `e2e/safeguarding.spec.ts`.

## Safety round two: pictures, appeals, moderator mail and limits (SAFE-4)

**Uploading a picture (S1-E10-05).** Nobody else sees a picture until it passes the check (CLAUDE.md rule 19):

```
Story settings › Cover / Settings › Profile picture (only while the picture_uploads flag is on)
  PictureUploadField → hooks/usePictureUpload → api/pictures.ts
    1. storage.upload() into the private covers or avatars bucket (owner-only rules)
    2. rpc register_picture() → picture_checks row, status pending (rate-limited, S1-E10-12)
    3. POST /api/picture-check with the person's own token
         functions/api/picture-check.ts → server/picture-check.ts
           reads the file with that token, asks server/picture-check/ (stub, or Arachnid Shield
           when PICTURE_CHECK=real; Sightengine too only if PICTURE_CHECK_SIGHTENGINE=on), then rpc record_picture_check() signed with
           PICTURE_CHECK_SECRET
    The field says "Drawings and illustrations only, no photos." (PictureRulesNote, reading the
    picture_allowed_kinds setting). Ratings: useRatingsIMayGive offers under-16s only All ages and
    13+, and the stories_rating_fits_writer trigger refuses more in the database (ADMIN-2e1a).
    4. passed → the cover or avatar shows (StoryCoverArt, AvatarImage, signed short-lived URLs)
       held → a moderation case with the picture blurred (CasePicturePanel); a known abuse
              match is never shown, opens a safeguarding case and is kept 6 months
       pending (a service down) → usePendingPictureRetry tries again, at most 5 times
```

**Pictures that wait for a moderator (ADMIN-2e1b).** Once the check passes, a picture in an All ages or 13+ story, or any picture from someone under 16, is held instead (`picture_needs_person()` inside `record_picture_check()`) with a `picture_review` case. Lowering a story to All ages or 13+ holds its live pictures again (trigger `stories_send_pictures_to_review`). A moderator decides on Moderation › Pictures to check:

```
/staff/pictures → PicturesToCheckPage → hooks/usePicturesToCheck → api/picturesToCheck.ts
  rpc admin_pictures_to_check()      the waiting pictures (signed addresses, no download)
  rpc admin_approve_picture()        green; yellow first raises the story (admin_raise_story_rating)
  rpc admin_reject_picture()         red: a reason, the statement of reasons, then decide_case()
    → the case is decided → apply_picture_decision() shows or removes the picture
```

**Who reviews pictures, and the opening alert (ADMIN-2e2a).** Only staff with the `picture_review` permission (18 or over, never an intern: `is_picture_reviewer()`) use Pictures to check, decide a picture case anywhere (`apply_picture_decision()` refuses others) or read a waiting picture's file (`picture_reader_may_see()`, which every picture bucket's storage policy asks). Owners and admins tick it, and the Intern box, on Staff › Roles (`admin_set_permission()`, `admin_set_intern()`). Every time a staff screen is handed a picture's file:

**Suspected child sexual abuse images (ADMIN-2e2b).** `server/picture-check.ts` adds the file's SHA-256 hash and the uploader's IP address, scrambled with a monthly key (`server/scrambled-ip.ts`, `IP_SCRAMBLE_SECRET`), to the signed verdict; `record_picture_check()` keeps them on `picture_checks` (the scrambled IP only when the uploader sent the request, blanked after 30 days by `blank_old_scrambled_ips()`). An Arachnid Shield match goes to `record_abuse_image_evidence()`, which writes `abuse_image_evidence` and starts the storage sweep, and the server deletes the file at once with the uploader's token (storage policies `abuse_image_files_select_to_delete` and `abuse_image_files_delete`, through `abuse_image_file_may_go()`). A reviewer's red with "Sexual image of a minor" (`RejectPictureForm` with `MinorImageFields`) calls `admin_reject_picture()` with `police_description` and `account_message`: the evidence, the case moved to safeguarding and the account closed (`close_account_for_abuse_image()`, a ban plus its own statement of reasons); the page then deletes the file with the reviewer's sign-in. On the safeguarding case page `AbuseImageEvidencePanel` and `EvidenceActions` read `admin_abuse_image_evidence()` and call `admin_describe_abuse_image()`, `admin_set_evidence_hold()` and `admin_close_account_for_abuse_image()`. The evidence pack carries it (`picture_item_content()`), and `purge_abuse_image_evidence()` deletes it after 5 years unless a legal hold keeps it. Runbook: `docs/runbooks/safeguarding.md`.

**Closed for good, and keeping banned people out (ADMIN-2f1).** A ban (`admin_apply_sanction()` with `ban`, or `close_account_for_abuse_image()`) fires the `sanctions_close_for_good` trigger: `hide_banned_account()` hides the profile, stories, comments, forum posts and the threads only that account posted in, as `moderated_items` rows linked by `sanction_id`, so every public read that asks `is_moderated_away()` leaves them out. Nothing is deleted, and `purge_closed_accounts()` skips an account under a live ban. Lifting the ban (`admin_lift_sanction()`) restores exactly those rows. `banned_email_hash()` hashes `normalised_email()` (lower case, no +tag, no Gmail dots), so a variant of a banned address is refused at sign-up. Throwaway domains: `content/disposable-email-domains/` is loaded into `disposable_email_domains`; the sign-up form asks `email_domain_allowed()` before sending (`src/features/auth/api/signUp.ts`), and `handle_new_auth_user()` refuses them too; the setting `disposable_email_allow` lets a domain through.

**Possible returning users (ADMIN-2f2).** `/api/signup-context` (`functions/api/signup-context.ts`, locally `server/pages-functions-plugin.ts`) adds `ipToken` from `server/signup-ip.ts`: the visitor's IP scrambled under this month's and last month's key (`IP_SCRAMBLE_SECRET`), signed with `SIGNUP_CONTEXT_SECRET`. The sign-up form passes it as `signup_ip` (`src/features/auth/api/signUp.ts`); `create_profile_from_sign_up()` step 7 calls `record_sign_up_ips()`, which checks it with `verified_signup_ips()`, keeps the values in `sign_up_ips` and, through `recently_banned_ip_matches()`, calls `flag_possible_returning_user()`: a `returning_user` case on the new profile and `case_account_links` rows. Never a block. The case page shows them in `CaseAccountLinks` (`src/features/moderation/components/`, with `LinkAccountForm`), through `useCaseAccountLinks` and `admin_case_account_links()`, `admin_link_returning_user()` and `admin_unlink_returning_user()`, which write the audit log.

**Drawn avatars (ADMIN-2g).** Settings › Profile shows `AvatarBuilderSection` (`src/features/avatars/`): a live preview, one drop-down per part from `lib/avatarOptions.ts`, Surprise me, Undo, Save and "Use my initials instead". Save calls `set_my_avatar_recipe()`, which checks the recipe with `avatar_recipe_valid()` and keeps it in `profiles.avatar_recipe`. Every round avatar (`ProfileAvatar`, `ChatAvatar`) asks `profile_avatar_recipe()` through `AvatarImage` and draws it with `lib/drawAvatar.ts` (DiceBear's Open Peeps art, loaded on first use; ADR 0013). Profile picture uploads are gone: no insert policy on the `avatars` bucket any more.

```
admin_pictures_to_check() / admin_case_picture()
  → record_picture_opened()   audit log 'picture.opened' (once per 10 minutes per picture and person)
     → notify(picture_opened_by_staff) to every owner and the usernames in picture_open_alert_handles
        (one row per staff member per hour; always emailed)
  /staff home → PictureOpeningsPanel → admin_recent_picture_openings() (the last seven days)
```

**Pictures in chapters (S1-E3-09).** The same check, for a picture inside a chapter:

```
Chapter editor › Insert › Picture (only while the picture_uploads flag is on)
  PictureInsertDialog (file, alt text, "I have the right to use this picture")
    → useChapterPictureUpload → uploadChapterPicture() (src/features/pictures/api/pictures.ts)
       preparePicture(): redrawn on a canvas, so no location data, at most 1600 px
       chapter-images/<chapter ID>/<ID>.webp, then rpc register_chapter_picture(), then the check
    → a chapterPicture block in the editor, stored as ![alt](picture:<ID>) on its own line
save_chapter_draft() → check_chapter_pictures(): at most 30, each with alt text, each the writer's
get_chapter() → pictures: { <ID>: { state, bucket, path } } → ChapterText → ChapterPicture
  passed: the picture and Report; pending or held: "Picture being checked"; removed: the marker
```

Covers and profile pictures now go through `preparePicture()` too. Tests: `185` in `supabase/tests/database/`, `src/lib/chapter-pictures.test.ts`, `e2e/chapter-pictures.spec.ts`.

**Drawings in chapters (S1-E3-11).** Insert › Drawing opens `DrawingInsertDialog`: `useSketchPad` holds the strokes (pointer or arrow keys), `SketchPadCanvas` paints them with `paintDrawing()` (`src/features/writing/lib/sketchPad.ts`), and "Insert drawing" turns the sheet into a PNG and sends it through the same `uploadChapterPicture()` as any chapter picture, so the drawing is checked and stored as a picture. No new table. Tests: `src/features/writing/lib/sketchPad.test.ts`, `e2e/chapter-drawings.spec.ts`.

**Music and video in chapters (S1-E3-10; ADR 0008).** A writer pastes a link; our server, not the reader's browser, looks it up:

```
Insert › Music or Video (ChapterInsertControls, flag media_embeds) → EmbedInsertDialog
  → parseEmbedLink() (src/lib/embed-links.ts: Spotify, Apple Music, YouTube, Vimeo, Loom only)
  → POST /api/embed (server/embeds.ts; functions/api/embed.ts) → oEmbed title (server/embeds/oembed.ts)
  → register_chapter_embed() as the writer → chapter_embeds → the card ![title](embed:<ID>) in the text
get_chapter() → embeds: { <ID>: { state, service, media_path, title } } → ChapterText → ChapterEmbed
  → nothing from the service until Play → EmbedPlayer (youtube-nocookie.com, Vimeo dnt=1)
```

A card is reportable (`embed`); a moderator removes one card without touching the chapter (CaseEmbedPanel on the case page). ChapterText hands pictures and cards to its drawers through a context, so a re-render never rebuilds a playing card. Tests: `186` in `supabase/tests/database/`, `src/lib/embed-links.test.ts`, `src/lib/chapter-embeds.test.ts`, `server/embeds.test.ts`, `e2e/music-and-video.spec.ts`.

**Design a cover in Canva (S1-E3-12; ADR 0009).** The new tab goes to Canva and back; our server holds the secrets:

```
Story settings › "Design it in Canva" (CanvaCoverLink, flags canva_covers and picture_uploads)
  → new tab /canva/start (CanvaStartPage, useCanvaStart) → PKCE verifier and state in sessionStorage
  → POST /api/canva/design (server/canva.ts; functions/api/canva/[[path]].ts)
      not connected: Canva's consent page → /canva/return?code → POST /api/canva/connect
        → tokens encrypted (server/canva/tokens.ts) → save_canva_connection() → canva_connections
      connected: a blank 1600 × 2560 design, correlation state = the story's ID → Canva's editor
  → Return → /canva/return?correlation_jwt (CanvaReturnPage, useCanvaReturn)
  → POST /api/canva/return: the token checked (server/canva/jwt.ts), the design exported as a PNG
  → uploadPicture() (picture check) → update_my_story(cover upload) → "Your Canva cover is saved"
Settings › Canva (CanvaSettingsSection) → POST /api/canva/disconnect → revoke, disconnect_canva()
```

While `CANVA` isn't "real", `server/canva/stub.ts` plays Canva with its own pages. Tests: `187` in `supabase/tests/database/`, `server/canva.test.ts`, `server/canva/canva-parts.test.ts`, `e2e/canva-covers.spec.ts`.

**Appeals (S1-E10-07).** On `/my-reports` each statement shows until when it can be appealed (six months, DSA art. 20(1)); `AppealSection` → `submit_appeal()`. Staff decide on `/staff/appeals` (`AppealsPage` → `admin_appeals_queue()`, `admin_decide_appeal()`); a moderator never decides an appeal on their own decision. Changing a decision restores the item and lifts the sanction; the person is notified (`appeal_decided`) either way.

**Moderator mail (S1-E10-11).** `/moderator-mail` for members and `/staff/moderator-mail` for staff, `src/features/moderator-mail/`. One shared inbox; replies go out as "The moderation team"; internal notes stay with staff; a reply notifies the member (`moderator_mail_reply`).

**Support tickets (S1-E11-13; ADMIN-2h1).** `/support` for members (Settings links to it) and `/staff/support` for owner, admin and support, `src/features/support/`. Every request is a numbered ticket (`support_tickets`, `support_ticket_messages`, `support_ticket_events` for the history). Members read theirs only through `my_support_tickets()` and `my_support_ticket()` (no notes, no staff names); staff work through `admin_support_*` functions that log every view and change. A Contact us message is saved as a ticket by `server/contact.ts` through `submit_contact_ticket()`, signed with `SUPPORT_TICKET_SECRET`. Email in and out (ADMIN-2h2): a new in-app ticket and every staff answer queue a row in `support_ticket_emails` (triggers); `run-support-email-worker` wakes `/api/support-emails` (`server/support-emails.ts`), which claims them with the notification emails' worker key and sends them with `[#number]` in the subject and our Message-ID. Brevo's inbound parsing posts emails to `/api/support-inbound?key=…`, which signs each one for `receive_support_email()`: it threads by our Message-ID or the number (only for that ticket's person), reopens a waiting ticket, starts a follow-up for a closed one, or starts an email ticket. Views and timers (ADMIN-2h3a): the inbox's saved views are presets of its filters with counts from `admin_support_view_counts()`; each row's first-reply due time comes from `support_first_reply_due()` (working days, the `support_first_reply_target_working_days` setting); `auto-solve-support-tickets` (hourly) solves tickets left pending on the person for `support_auto_solve_days` and queues a polite `auto_solved` email. Canned replies (ADMIN-2h3b): `/staff/support/canned` (`CannedRepliesPage`) lists `support_canned_replies`, changed through `admin_save_canned_reply()` and `admin_delete_canned_reply()` (audit log with before and after words); on a ticket, `CannedReplyPicker` sits in `SupportReplyForm`'s `renderTools` and `lib/fillCannedReply.ts` fills `{{name}}` (the display name from `admin_support_ticket()`) and `{{number}}` in the ticket's language before the words go into the box. Merge and spam (ADMIN-2h4a): `TicketActionsPanel` calls `admin_merge_support_tickets()` (messages move, the merged ticket closes with `merged_into_ticket_id`, a `merged` email tells the person the new number, and `support_ticket_for_email()` follows the pointer) and `admin_mark_support_spam()` (Spam view only, waiting emails cancelled, answers refused by `refuse_reply_to_spam()`, later mail from the sender lands in Spam through `support_sender_is_spam()`). Reports, data requests and retention (ADMIN-2h4b): `TicketLinksPanel` on the ticket page calls `admin_convert_ticket_to_report()`, which saves a `public_notices` row linked to the ticket (`support_ticket_id`, and `support_ticket_number`, which outlives the ticket) and, when the address is one of ours, attaches it to the item's case through `attach_notice_to_case()`; and `admin_open_ticket_data_request()`, which calls `admin_open_data_request()` with the ticket's first day as the received date. `admin_ticket_links()` lists both. The nightly `purge-old-support-tickets` job (`purge_old_support_tickets()`) deletes tickets closed or solved more than `support_ticket_keep_years` ago, and `export_support_tickets_of()` adds the person's tickets, without staff notes, to `export_tables_of()` (Download my data and the staff copy).

**Rate limits (S1-E10-12).** `take_rate_limit(action)` counts `rate_limit_events` per account over the last hour, with a lower limit for an account under 24 hours old (setting `rate_limits`), and raises 54000 with the hint `wait_minutes:<n>`; every form that can hit a limit says how many minutes to wait. A new account's comment may hold one link (`refuse_new_account_links()`, hint `too_many_links`).

**Safety contacts, staff side (S1-E10-13b).** `/staff/safety-contacts` (`src/features/safety/`): support, admins and the owner confirm, change, add or remove contacts, each logged with before and after values; `create_monthly_safety_checks()` (pg_cron, the 1st of each month) opens a check per market that closes once every contact is confirmed; `SafetyContactWarningBanner` warns on every staff page while a contact is 45 days unchecked.

**The accessibility statement and the no-cookie check (S1-E14-03).** `/legal/accessibility` is the fifth Legal centre document, linked from the footer. `scripts/check-third-party.ts` (`npm run third-party:check`, after the build) fails on any web address in the bundle on a host nobody reviewed; `e2e/accessibility-statement.spec.ts` fails on any cookie or unreviewed storage key.

Tests: `164` to `169` in `supabase/tests/database/`, `server/picture-check/*.test.ts`, `e2e/picture-check.spec.ts`, `e2e/appeals-and-mail.spec.ts`, `e2e/safety-contacts-admin.spec.ts`, `e2e/accessibility-statement.spec.ts`.

## Writing to us (S1-E14-04)

```
footer "Contact us" · Settings › Legal · /legal/contact "Write to us" · "Ask a moderator to check it"
  │  /contact (router) → ContactPage → ContactForm                        src/features/contact/
  │     topic chips, the message, the email (a visitor) or the account's email (signed in),
  │     the hidden honeypot field; checked with src/schemas/contact.ts
  │  useContactForm → api/contact.ts → POST /api/contact (JSON)
  ▼
functions/api/contact.ts (Cloudflare) · server/pages-functions-plugin.ts (locally)
  │  server/contact.ts handleContact(): the same zod schema → a filled honeypot gets a reference
  │  and nothing is sent → reference C-<year>-<4 digits> (never stored) → two plain-text emails:
  │    staff: "[C-2026-0482] Account problem", the message, "@handle (user ID …)" or "not signed in",
  │           reply-to the sender
  │    sender: "We've received your message (C-2026-0482)", "we reply within one month"
  ▼
Brevo's HTTP API (BREVO_API_KEY, by hand) on Cloudflare · Mailpit (http://127.0.0.1:54324) locally
```

No table, no log: the message, the email and the IP address are never stored (ADR 0006). Abuse: the honeypot here and a Cloudflare rate-limit rule on `/api/contact`, set by hand (`docs/runbooks/contact-form.md`).

## Reporting without an account and removal orders (S1-E10-02)

```
footer "Report content" · /legal/contact "Report illegal content" / "Authorities: send a removal order"
  │  /report (router) → NoticePage → NoticeForm                            src/features/notices/
  │     the kind (the report reasons, or a removal order), the link, why, name and email
  │     (optional only for child sexual content), the good-faith box, the hidden honeypot;
  │     lib/noticeDraft.ts checks it; src/schemas/notice.ts is the shared contract
  │  useNoticeForm → api/notice.ts → POST /api/notice (JSON)
  ▼
functions/api/notice.ts (Cloudflare) · server/pages-functions-plugin.ts (locally)
  │  server/notice.ts handleNotice(): the schema → a notice that looks like a bot (honeypot or
  │  under 3 seconds) gets a made-up answer; an order never meets this check → signs the fields
  │  with NOTICE_SECRET → rpc submit_public_notice(payload, signature)
  ▼
submit_public_notice() (…_s1_e10_02_public_notices.sql)
  │  checks the signature against Vault's public_notice_secret → public_notices row with an
  │  N-000123 or TCO-0001 reference → item_for_public_address() matches /s/…, /s/…/<code>, /u/…
  │  → attach_notice_to_case(): opens or joins the item's case (an order: one hour from receipt)
  │  → an order logs on_call_alerts at once (the phone alert is S1-E10-09)
  ▼
server/notice.ts emails the acknowledgement (reference and time of receipt) and, for an order,
the support inbox. Staff: the case page's "From the public form" (admin_case_notices), the queue's
orders and "Notices to check by hand" (admin_on_call_alerts, admin_unmatched_notices,
admin_close_unmatched_notice). Deciding a case marks its notices decided for the decision email
(S1-E10-04). purge_old_public_notices() deletes closed notices after 3 years.
```

Set-up by hand: `docs/runbooks/notice-form.md`.

## Copied-work reports (S1-E10-08)

```
story page: the reader selects a passage, presses Report      src/features/reporting/
  │  ReportButton reads the selection (on pointer down too, a mouse press can clear it)
  │  ReportDialog → "Copied from a published work" → CopySourceFields: the selected passage
  │  and the published work's title, author, ISBN or link and matching passage, all optional
  │  api/reports.ts → rpc report_item(…, copy_details)            (the public form: /report sends
  │                                                                copySource, S1-E10-02)
  ▼
reports.copy_source_* and reported_passage (…_s1_e10_08_copied_work.sql)
  ▼
case page: CaseReports → CopiedWorkComparison (the source, the two passages side by side)
  │  AskForDetails → admin_request_report_details() → report_detail_requests
  │     the reporter: Settings → ReportQuestionsSection → my_report_detail_requests(),
  │     answer_report_detail_request()
  │  DecisionForm "Add a public note" (stories and chapters only) → admin_decide_case()
  │     → add_copied_work_note() → copied_work_notes
  ▼
story page: CopiedWorkNote ← story_has_copied_work_note()     src/features/reading/
```

## The helplines for the reader's country (S1-E10-13a)

```
ReportDialog or /legal/contact → <SafetyContactsBlock />                 src/features/safety/
  │  useVisitorCountry: profiles.country_code (signed in) or /api/signup-context (signed out)
  │  useSafetyContacts(country) → api/safetyContacts.ts → safety_contacts (read by everyone)
  │     no row → "Call your local emergency number", the ZZ directories (Child Helpline International,
  │     INHOPE) + rpc note_safety_contact_gap() for staff
  │  CountryPicker: "Not your country?", the ten covered countries, Romania first
  ▼
content/safety-contacts.json (research G4) → scripts/build-safety-contacts-migration.ts
  → …_s1_e10_13a_safety_contacts_seed.sql (generated; never a number typed from memory)
```

## Staff roles (S1-E2-07a)

```
/staff/roles (StaffRolesPage, inside StaffLayout since S1-E11-01)        src/features/staff/
  │  GrantRoleForm → AccountPicker (S1-E11-01b): "Find the account" → useAccountSearch →
  │     api/accountSearch.ts → admin_find_accounts(text) (username start, pen name, whole email;
  │     the email masked; an email match logged) and admin_reveal_email(id) ("Show email", logged)
  │  useStaffRoles → api/staffRoles.ts
  │     admin_list_staff(), admin_grant_role(user ID) / admin_remove_role() / admin_set_permission()
  │     a refusal carries a HINT (no_such_account, reason_missing, last_owner, not_staff, own_role,
  │     owner_only_role, not_allowed, sign_in_again) → failureFromRefusal() → its own sentence
  ▼
…_s1_e2_07a_staff_roles.sql
  │  staff_may(area, access): the caller's role in staff_role_areas (architecture 1.8.3), plus the
  │  permission the row needs, AND is_staff_session() (true for any staff role in March; Google
  │  Workspace sign-in from S1-E2-07b)
  │  every staff policy and admin_* function asks staff_may(); every change → log_staff_action()
  ▼
staff_roles, staff_permissions, audit_log; account_state() answers staff_account for staff
```

On production, the first owner is made once with `bootstrap_first_owner()` from the SQL editor (it can't be called through the API). Staging and local databases don't need it: the seed's `owner` persona already holds the owner role, so the function refuses there. On staging, personal staff accounts (Robert's own, with the owner role, included) get their role from the `owner` persona at /staff/roles.

## Usernames and pen names (S1-E2-04)

```
/setup (SetupPage, SetupForm) or /settings (SettingsPage, AccountNamesSection)   src/features/account/
  │  typing: HandleField → useHandleCheck
  │     1. lib/nameRules.ts answers length, spaces and invisible characters at once
  │     2. after a short pause: api/accountNames.ts → check_handle(candidate)
  │  saving: useNamesForm → useMyNames → set_my_handle() / set_my_pen_name()
  ▼
check_handle() / set_my_handle()                     …_s1_e2_04_handles.sql
  │  has_invisible_characters() → name_word_check():
  │     name_matching_words() folds case, accents, look-alikes (confusable_characters, Unicode
  │     TR39) and digits (0 → o), then name_reserved_reason() (reserved_names + the brand words
  │     in settings) and name_has_listed_word() (username_word_lists), unless a moderator approved
  │     the exact name (username_approvals)
  │  username_skeleton(): another name that looks the same is "taken" (unique index)
  │  30 days between changes (settings); the old name → log_account_change() → audit_log
  ▼
profiles.handle (+ handle_slug, handle_skeleton by trigger), profiles.pen_name
```

The word lists start in `content/username-word-lists/` and reach the database through `scripts/build-word-list-migration.ts`; the look-alike table through `scripts/build-confusables-migration.ts`. A moderator approves a false hit with `admin_approve_username()` (its button arrives with S1-E11-02).

## Creating a story (S1-E3-01)

```
/write (YourWritingPage) → "+ New story" → /write/new (NewStoryPage)      src/features/writing/
  │  the choices: useStoryFormOptions → api/stories.ts → open_story_languages(), categories
  │  typing: StoryBasicsSection, CategoryTagsSection (TagInput merges look-alikes with
  │     lib/tags.ts, the same rule as the database's normalise_tag()), CoverSection
  │     (DrawnCoverPicker, CoverColourSwatches; StoryPreviewAside draws the card live)
  │  saving: useNewStoryForm → src/schemas/story.ts (zod) → api/stories.ts → create_story()
  ▼
create_story(title, blurb, language_code, category_slug, tag_names, cover)   …_s1_e3_01_stories.sql
  │  is_active_member() (the account gate: a read-only account gets {outcome: not_active})
  │  open_story_languages() (the open markets' languages), categories, check_story_cover()
  │  story_slug_for(): the public address, never the user ID
  │  set_story_tags(): normalise_tag(), reuse or add a tags row, at most 10 (trigger)
  ▼
stories (user_id = auth.uid(), cover_kind and the drawn cover's design and colours), story_tags
  │  the writer reads them back through stories_select_own and story_tags_select_own
  ▼
/write lists them (useMyStories); readers see nothing until publish_chapter() (S1-E3-03) sets
first_published_at and get_story_page() (S1-E3-05) serves the public page (ADR 0004).
```

**Automatic covers (S1-E3-13):** the form makes the story's ID (`crypto.randomUUID()`) and hands it to `create_story()`, so `automaticCoverFor(storyId)` can draw the design the story will get before it exists ("Right now: Sky, picked for you automatically"). Nothing is stored for an automatic cover: every screen calls `resolveCoverChoice()` (a drawn choice, else the ID's design), and rows of cards call `designsForRow()` so two neighbours never share a design while a chosen design is never moved.

## Story settings, deletion and the story page (S1-E3-05)

```
/write → "Story settings" → /write/s/<slug>/settings (StorySettingsPage)     src/features/writing/
  │  the same sections as the new story form, filled from the story (useStorySettingsForm),
  │  plus StoryStatusSection (Ongoing | Completed, the comments switch)
  │  saving: storySettingsSchema (zod) → api/stories.ts → update_my_story(slug, changes)
  │  DeleteStoryControl: asked twice → delete_my_story(slug); Undo → restore_my_story(slug)
  ▼
update_my_story(): is_active_member(), my_live_story_id() (the caller's own live story),
  check_story_basics() (shared with create_story()), check_story_cover(), set_story_tags();
  the slug never changes                                           …_s1_e3_05_story_settings.sql
delete_my_story(): deleted_at = now(); restore within content_purge_days (30);
  purge_deleted_stories() runs nightly (pg_cron) and skips content_is_held_for_moderation()
  ▼
/s/<slug> (StoryPage, src/features/reading/) → useStoryPage → get_story_page(slug)
  │  null unless: not deleted, first_published_at set (or the caller owns it) and
  │  not is_moderated_away('story', id) (Lane C's contract) and rating_allows(rating) (S1-E3-06)
  ▼
StoryHeader (cover from resolveCoverChoice(), pills, title, "by <pen name>", blurb, tags) and
StorySideColumn (the writer, "Labels from the writer", and for readers Lane C's shared
<ReportButton itemType="story"> → report_item('story', id), S1-E10-01)
```

Tests: `supabase/tests/database/103-story-settings.test.sql`, `e2e/story-settings.spec.ts`.

## Ratings and labels (S1-E3-06)

```
/write/new and /write/s/<slug>/settings → StoryLabelsSection                  src/features/writing/
  │  LabelCheckbox (Fan fiction, Parody, Deals with abuse or coercion), the content note,
  │  the Rating chips with RatingGuide, "Did you use AI?"
  │  checked by storyLabelsSchema (src/schemas/story.ts): a rating and an AI answer are required;
  │  abuse or coercion needs 16+ or 18+ and a content note (17 Oct 2026)
  ▼
create_story(…, labels) / update_my_story(slug, {labels}) → check_story_labels()
                                                        …_s1_e3_06_ratings_and_labels.sql
  stories.rating, is_fan_fiction, is_parody, deals_with_abuse_or_coercion, content_note,
  ai_disclosure, ai_undisclosed_labelled_at (staff only)
  ▼
get_story_page(slug): readers get null unless rating_allows(rating) (the owner is exempt)
  rating_allows(): age_band() from the year of birth; 18+ also needs the Yoti "18 or over"
  result once adults_only is off (proposal, 23 Oct 2026); a visitor counts as under 16 (L14)
  ▼
StoryLabelPills (src/features/reading/) on the preview, the writer's card and the story page;
StorySideColumn adds the Rating, Labels and AI rows; StoryHeader shows the content note
Staff: admin_raise_story_rating() (never lowers; audit_log; a 'statement_of_reasons_needed'
  job for S1-E10-04) and admin_set_ai_undisclosed_label() (after confirmed reports, Q24);
  the staff screen is S1-E11-08. The jobs table (platform) is the queue other stories read.
```

Tests: `supabase/tests/database/104-ratings-and-labels.test.sql`, `e2e/ratings.spec.ts`.

## The chapter editor and the autosave (S1-E3-02a)

```
"Create and write chapter one" (useNewStoryForm) or "Write chapter one" (NewChapterButton)
  → create_chapter(story_slug) → {ok, code}              …_s1_e3_02a_chapters.sql
  ▼
/write/s/<slug>/c/<code> (ChapterEditorPage)                           src/features/writing/
  │  useChapterDraft → the chapters table (chapters_select_own: the owner only)
  │  useChapterEditor → TipTap with chapterEditorExtensions (only the allowed formatting);
  │    the stored Markdown becomes a document (lib/chapterMarkdown.ts) and back on every save
  │  EditorToolbar (role=toolbar, one tab stop, aria-keyshortcuts), LinkDialog (Ctrl+K)
  │  useAutosave: every 10 s while there are changes, and on blur
  │    → chapterDraftSchema (src/schemas/chapter.ts: no HTML, safe links, ş/ţ corrected)
  │    → api/chapters.ts → save_chapter_draft(code, title, body, expected_version)
  │  EditorAside: SaveStatus (role=status), Publish (S1-E3-03), Story details, Your stories
  ▼
save_chapter_draft(): is_active_member(), the caller's own live chapter (locked), a stale
  expected_version → {status: conflict} (S1-E3-02b shows it), check_chapter_text() (the same
  rules again), count_words(); the draft_version moves on
delete_my_story() / restore_my_story() now take the chapters along
```

Offline, paste and conflicts (S1-E3-02b):

```
every edit → useDeviceKeep: half a second later the title and text go to IndexedDB
  (lib/draftStore.ts, key: the chapter code, with the version they are based on)
offline (useOnlineStatus, S1-E1-05) → nothing is sent; the Saving box says the words are kept
back online, or the editor opens with a device copy → that copy is sent at once
the server has the text → the device copy is forgotten
a conflict → "Keep this version" (save over the server's version) or "Compare versions"
  (CompareVersionsDialog: both side by side; "Keep this one" on the other loads it)
paste → TipTap's transformPastedHTML → lib/pasteCleaning.ts (Word lists, Docs wrappers,
  headings snapped, scripts and pictures out) → the editor's schema → Markdown on save
```

Publishing (S1-E3-03):

```
PublishPanel (in EditorAside) ← useChapterPublishing (keeps the status after each action)
  │  "Publish chapter" / "Schedule chapter" / "Update chapter": the autosave saves first
  │    (saveNow, isAllSaved) so what goes live is what is on screen (Q10)
  │  the date and time are Romania time → src/lib/romania-time.ts → an instant (Q7)
  │  Preview → ChapterPreviewDialog → ChapterText (src/features/reading/, the reader's renderer)
  ▼
publish_chapter() / schedule_chapter() / cancel_schedule() / update_published_chapter() /
unpublish_chapter()                                           …_s1_e3_03_publish.sql
  chapter_publish_now(): draft → published copy, dates, story stamps, a revision,
  a 'chapter_published' job (IDs only; S1-E7-01 reads it)
publish_due_chapters(): pg_cron every minute (docs/runbooks/scheduled-jobs.md)
chapter_is_readable(id): published, not deleted, not moderated away (S1-E4-01a, S1-E6-01)
get_story_page(): public while story_has_readable_chapter(); 'chapters' from story_page_chapters()
  → StoryChapterList on /s/<slug>
```

Managing chapters (S1-E3-04), at `/write/s/<slug>/chapters` ("Manage chapters" on a story card, or the story in the editor's breadcrumb):

```
ManageChaptersPage → ChapterListCard → SortableChapterList (dnd-kit: mouse, touch, keyboard)
  │                     → ManagedChapterRow (handle, pill, meta from lib/chapterListText.ts)
  │                       → ChapterRowActions (arrows, Edit, Rename, Unpublish, Delete)
  │  → RecentlyDeletedChapters (Undo), DeleteChapterDialog (asks first)
  ▼
useManageChapters (the list from api/manageChapters.ts; a new order shows at once)
  ▼
move_chapter() / set_chapter_order() / rename_chapter() / delete_chapter() /
restore_chapter() (+ publish_chapter(), unpublish_chapter())  …_s1_e3_04_manage_chapters.sql
  renumber_story_chapters(): 1, 2, 3… with no gaps
purge_deleted_chapters(): pg_cron 03:29, 30 days after a delete (docs/runbooks/scheduled-jobs.md)
```

Stored format and why: ADR 0005. Tests: `supabase/tests/database/110-chapters.test.sql`, `111-save-chapter-draft.test.sql`, `src/features/writing/lib/chapterMarkdown.test.ts`, `src/schemas/chapter.test.ts`, `src/features/writing/hooks/useAutosave.test.tsx`, `lib/draftStore.test.ts`, `lib/pasteCleaning.test.ts` (Word, Google Docs and hostile fixtures in `src/test/fixtures/paste/`), `e2e/chapter-editor.spec.ts`, `e2e/chapter-editor-offline.spec.ts`; publishing: `112-publish.test.sql`, `113-schedule.test.sql`, `src/lib/romania-time.test.ts`, `ChapterText.test.tsx`, `e2e/publish.spec.ts`; managing: `114-manage-chapters.test.sql`, `src/features/writing/lib/chapterListText.test.ts`, `e2e/manage-chapters.spec.ts`.

The covers bucket and the `picture_uploads` flag (off) are the contract for uploaded covers (`…_s1_e3_01_covers_bucket.sql`); the upload screen is its own story once the picture check (S1-E10-05) exists. `is_moderated_away()` is a stub for Lane C's moderation (shared contract). Tests: `supabase/tests/database/100` to `102`, `e2e/create-story.spec.ts`.

## Reading a chapter (S1-E4-01a)

`/s/<story>/<chapter>`, from a chapter title on the story page, Previous and Next, or a shared link:

```
ChapterReaderPage → useChapter → api/chapter.ts → get_chapter(story_slug, chapter_code)
  │                    reader_visible_story(): live, not moderated away, rating_allows(), not blocked
  │                    chapter_is_readable(): published, not deleted, not moderated away
  │  ChapterBar (Contents, Previous, Next, the progress line from useReadingProgress)
  │  ChapterReaderHeader ("Chapter n of N", H1, "by … · date · n min read")
  │  ChapterText (the Markdown as HTML, 19 px, in the story's language) → ChapterEnd
  ▼
useRecordRead → record_chapter_read(): +1 on today's chapter_reads total, once per tab
```

Speed (S1-E4-01b): the route's loader in `src/app/router.tsx` calls `prefetchChapter()` (`api/chapterPrefetch.ts`) the moment the address matches, so the Supabase library, the session and `get_chapter()` load while the reader's code downloads; `useChapter` takes that answer. The banner slot, `ChapterBannerSlot`, comes after the `<article>` and shows nothing until `pick_banner()` (S1-E12-01; `hooks/useChapterBanner.ts`).

Copying (S1-E4-06a): the text sits in `ProtectedChapterText`, which cancels `contextmenu`, `copy`, `cut` and `dragstart` on the chapter text only (no `user-select: none`, so selecting, find and screen readers still work); `CopyNotice` under the chapter says it makes copying harder and can't stop screenshots (Q9), and `copyWording.test.ts` keeps "can't be copied" out of every locale file. The Publish panel tells the writer the same (`publish.webReadingNote`).

Tests: `140-get-chapter.test.sql`, `141-chapter-reads.test.sql`, `hooks/useRecordRead.test.tsx`, `hooks/useReadingProgress.test.ts`, `components/ChapterReaderPage.test.tsx` (the banner's place), `e2e/chapter-reader.spec.ts`, `e2e/reader-performance.spec.ts` (2 seconds on a throttled phone, the script budget, 200% zoom), `components/ProtectedChapterText.test.tsx`, `copyWording.test.ts`, `e2e/copy-protection.spec.ts`.

## A shared link, before and after it opens (S1-E4-04)

Someone pastes `/s/<story>/<chapter>` into WhatsApp. Two things read it:

```
1. The app's preview robot (no JavaScript):
   GET /s/…  → functions/s/[[path]].ts (Cloudflare; server/pages-functions-plugin.ts locally)
     → server/link-preview.ts: index.html + get_link_preview() with the anon key
     → <title>, og:title "Story · Chapter", og:description "de <pen name> · <blurb>",
       og:image /link-previews/<cover colour>.png (scripts/make-link-preview-images.ts),
       noindex on chapters, JSON-LD on story pages (Q36); 16+ and 18+: the title only
2. The visitor's browser: the same page, then the app starts as usual:
   ChapterReaderPage → get_chapter() → is_teaser? → TeaserPage
       TeaserStoryCard (get_story_page()) · the teaser (teaser_of(): whole paragraphs up to
       600 words, cut in the database) · SignUpPrompt · CopyNotice
     → nothing (a 16+ or 18+ story)? → useStoryPreview → get_link_preview() → NoPreviewNotice
```

Tests: `142-teaser.test.sql`, `server/link-preview.test.ts`, `e2e/teaser.spec.ts`.

## A writer's profile, blocks and follows (S1-E5-05, S1-E6-05)

`/u/<username>`, from "See profile" on a story page, a follower's name, or Settings' "See your profile":

```
WriterProfilePage → useWriterProfile → api/writerProfile.ts → get_writer_profile(handle)
  │                  profile_for_handle(): live, look-alike letters match (username_skeleton())
  │                  null when unknown, moderated away, or this person blocks the reader
  │                  profile_story_cards(): published, not moderated, rating_allows()
  │  ProfileHeader (ProfileAvatar: initials; name; "@handle · Joined"; bio; ProfileStats)
  │     FollowButton → useFollow → writer_follow_state() / follow_writer(handle, should_follow)
  │     ProfileStats' "See who follows you" (own profile) → FollowersDialog → my_followers()
  │  ProfileStories (the shared Shelf of StoryCards, max 20, then "View more")
  ▼  ProfileSafetyCard: ReportButton (profile, by username) · BlockDialog → set_block()
```

Blocks: `blocks` (the blocker's own rows only) and `is_blocked_with()`, which replaced Lane A's stub, so `get_chapter()`, `record_chapter_read()`, `get_story_page()`, the profile and the follow functions all respect a block in both directions. A block ends follows both ways; the blocked person sees "This profile isn't available", never "you are blocked". Follows: `follows_users` and `follows_stories`, written only through `follow_writer()` and `follow_story()` (account gate; a blocked pair silently stays "not following"); the count is public, the list is the writer's only (Q50). The story page shows `FollowButton` twice: on the writer card and as "Follow story" under the title. Settings › "About you" saves the bio with `set_my_bio()`; "Blocked accounts" lists `my_blocked_accounts()` with Unblock.

Tests: `143-writer-profile-and-blocks.test.sql`, `144-follows.test.sql`, `lib/formatting.test.ts`, `e2e/writer-profile.spec.ts`, `e2e/follows.spec.ts`.

## Likes, comments, reactions and downvotes on a chapter (S1-E6-03, S1-E6-01, S1-E6-02, S1-E6-04)

Under the chapter text, on `/s/<story>/<chapter>`:

```
ChapterEnd
  │  LikeButton → useChapterLike → api/likes.ts → chapter_like_state() / like_chapter(story, chapter, should_like)
  │     readable_chapter(): the same rules as get_chapter() (rating, blocks, moderation)
  │     chapter_likes (one row per reader and chapter; the count is public, who liked isn't)
  ▼  ReportButton ("Report chapter", the chapter's row ID; the dialog's file loads on the first press)
```

The popularity job (S1-E5-03) reads `chapter_like_totals()`, which leaves out the writer's own like.

Comments (S1-E6-01) sit under the banner slot, in their own file, fetched when the reader nears the end of the chapter:

```
ChapterComments (reading) ─lazy→ CommentsSection (src/features/comments/)
  │  useChapterComments → chapter_comments(story, chapter, older_than): 20 top-level comments a page,
  │     newest first, each with its replies; readable_chapter(), blocks, moderated_items, comments_enabled
  │  CommentComposer → usePostComment → post_comment(): the account gate, the limit (5 an hour on the
  │     first day, 60 after: wait_minutes in the error's hint), check_comment_text(), a 'comment_posted' job
  │     (lengths: comment_max_characters 3,000; paragraph_comment_max_characters 500 for a paragraph and
  │     its thread, applied by the comments_too_long_for_a_paragraph trigger; useCommentLimit shows them)
  │     Before sending: useKindWordsNudge checks the text against comment_nudge_words in the browser and,
  │     on a match, KindWordsNudge asks "Still want to send this?" (Edit / Send anyway). Nothing is kept
  │     or sent about it (rule 19); staff edit the lists on Staff › Settings (NudgeWordsSection).
  ▼  CommentItem → CommentBody (spoiler cover, markers) · CommentActions: CommentReactions · Reply
                   · Delete → delete_comment()
                   · ReportButton (itemType "comment"; reportable_item_owner() and _summary() have the branch)
```

Reactions (S1-E6-02) start each comment's action row: a chip per kind someone picked, and "Add a reaction" for the six (heart, fire, laugh, wow, sad, star, drawn as SVG in `ReactionIcon.tsx`):

```
CommentReactions → useReactToComment → api/reactions.ts → react_to_comment(comment_id, wanted_kind)
  │  readable_chapter() and comment_state_for_caller() = 'live'; the same kind again (or null) takes it away
  │  adding or changing one: the account gate; comment_reactions (one row per person and comment)
  ▼  chapter_comments() answers each comment's counts and the reader's own (comment_reactions_json())
```

Deleted comments go for good after 30 days (`purge_deleted_comments()`, nightly); a deleted or removed comment keeps its place as a marker only while replies stand under it.

Private downvotes (S1-E6-04) sit in the same row, on other people's live comments:

```
DownvoteButton → useDownvoteComment → api/downvotes.ts → downvote_comment(comment_id, should_downvote)
  │  readable comment, never one's own; adding one: the account gate; under 24 hours old: kept, not counted
  │  comment_downvotes (the voter and moderation staff read it; nobody gets a count)
  ▼  open_downvote_case(): at downvote_case_threshold counted accounts, a 'downvotes' case at seven_days
```

Tests: `148-chapter-likes.test.sql`, `149-comments.test.sql`, `150-comment-reactions.test.sql`, `153-comment-downvotes.test.sql`, `lib/timeAgo.test.ts`, `CommentReactions.test.tsx`, `e2e/chapter-likes.spec.ts`, `e2e/comments.spec.ts`, `e2e/comment-reactions.spec.ts`, `e2e/comment-downvotes.spec.ts`.

## Notifications (S1-E7-01)

The bell in the top bar (`NotificationBell`, while signed in) shows the unread count and opens `/notifications`:

```
chapter_publish_now() ─┐ queues chapter_published        follows_users ─ trigger follows_users_notify
post_comment() ────────┘ queues comment_posted            comment_reactions ─ trigger comment_reactions_notify
          │                                               cases (status → decided) ─ trigger cases_notify_decided
          ▼  run_notification_jobs(), every minute (pg_cron)         │
             notify_chapter_published() · notify_comment_posted()   │
                              └──────────────┬──────────────────────┘
                                             ▼  notify(): never one's own action, never across a block;
                                                grouped rows (reactions an hour, followers a day) count people
                                             notifications (the person told reads only their own rows)
NotificationsPage → hooks/useNotifications → api/notifications.ts → my_notifications()
NotificationBell → hooks/useUnreadNotificationCount (every 60 s and on focus) → my_unread_notification_count()
"Mark all as read" / opening a row → hooks/useMarkNotificationsRead → mark_notifications_read()
```

Reading applies the reader's rules again (`notification_is_shown()`): a chapter they can no longer open (rating, block, moderation) or someone either side now blocks is left out, so the badge and the list always agree. A moderation decision is always shown and `is_required` (DSA art. 17). Answers carry usernames and display names, never a user ID. The words for each kind are picked in `lib/notificationText.ts`; the day headings in `lib/dayGroups.ts` (Romanian time).

Tests: `154-notifications.test.sql`, `lib/notificationText.test.ts`, `lib/dayGroups.test.ts`, `e2e/notifications.spec.ts`.

## Notification emails (S1-E7-02)

Each person picks Instant, Daily digest or Off per kind in Settings › Notifications; account, safety and legal emails (a moderation decision) always go. Cloudflare Pages has no scheduler, so the database wakes the sender:

```
notifications (new row) ─ trigger queue_instant_email ──┐  Instant kinds and moderation decisions
queue_daily_digests(), 06:00 UTC (pg_cron) ─────────────┤  one digest per person of the day's unread
                                                        ▼
                                               email_outbox (never an address or words)
run_email_worker(), every 5 minutes (pg_cron) ─ pg_net POST /api/notification-emails, Bearer worker key
server/notification-emails.ts → email_worker_claim(key): the address, the language and the items,
   read as the recipient (blocks, ratings, moderation, as on their page) → Brevo (Mailpit locally)
   → email_worker_mark_sent(key)
Settings › Notifications → hooks/useEmailSettings → set_notification_email()
email link /unsubscribe?key= (button) or the List-Unsubscribe header (POST /api/unsubscribe)
   → unsubscribe_from_emails(key): every optional kind Off, works signed out
```

The worker key is the Vault secret `email_worker_key` and Cloudflare's `EMAIL_WORKER_KEY` (the same value); `email_worker_url` in the Vault turns the calls on (not set locally, so local pg_cron never calls out; the e2e test wakes the worker itself). Marketing email has a gate before any sender exists: `marketing_email_allowed()` is true only for an adult who opted in, and `set_marketing_email_opt_in()` refuses anyone under 18 (Q50).

Tests: `183-notification-emails.test.sql`, `server/notification-emails.test.ts`, `e2e/notification-emails.spec.ts`.

## Discover and the story lists (S1-E5-01, S1-E5-09, S1-E5-02)

`/discover` from the top bar; a shelf's "View more", a tag on the story page or "View more" on a profile open a list page:

```
DiscoverPage
  │  CategoryLinks (links to /discover/c/<slug>, the categories table)
  ▼  DiscoverShelf × (the order of the setting discover_shelves) → useStoryShelf (21 rows)
StoryListPage (listFromParams() picks the list from the address; requestFromAddress() the filters)
  │  StoryListHeader (breadcrumb, eyebrow, title, "n stories") · StoryListFilters (chips, language)
  ▼  StoryGrid ("Load more", 24 a page) → useStoryList
both → api/storyLists.ts → browse_stories(list_kind, list_key, filters, sort_order, page_size, page_offset)
         listed_stories(): published, readable chapter, not moderated, rating_allows(), not is_blocked_with()
         list_holds_story(): which list; story_card_json(): one card, never a user ID
```

There is no new table: everything is read through the functions. A shelf asks for 21 so it knows there are more than 20 (rule 20) and passes the total to "View more". A follow or a block refreshes every list (the `story-list` query key).

The six sorts (S1-E5-02) are lines of `browse_stories()`'s order, titles and writer names in the ICU Romanian collation (`"ro-x-icu"`); a picked sort goes into the address and into `sessionStorage` (`lib/sortMemory.ts`) for the next list in this tab.

Tests: `151-browse-stories.test.sql`, `152-story-list-sorts.test.sql`, `lib/listAddresses.test.ts`, `lib/sortMemory.test.ts`, `e2e/discover.spec.ts`.

### Popularity (S1-E5-03)

```
pg_cron compute-story-scores (every hour) → compute_story_scores()
  story_signals(): reads (chapter_reads totals), likes and comments (never the writer's own),
  read-through; story_share_points(): shares (chapter_shares totals, S1-E4-05); each halved every ranking_half_life_days; weights ranking_weight_*; never downvotes
  ▼  story_scores (one number per story; staff may read it, readers only see the order)
browse_stories('popular' | 'rising', …, sort_order 'popular') orders by it; list_default_sort()
get_story_page() → 'stats' {likes, comments} → StoryStats on the story page
```

Popular is every list's default except New stories (newest), Recently updated and the follows shelf (last chapter). New and rising holds writers whose first story came out within `rising_writer_days`. Discover's shelf order is the public setting `discover_shelves`, read through `usePublicSettings().wordsOf()`. "How ranking works" links to the terms, section 5 (DSA art. 27), which `LegalSectionCard` gives the id `section-5`.

Tests: `155-story-scores.test.sql`, `e2e/ranking.spec.ts`.

## The March test numbers (S1-E15-02)

`/staff/metrics` for the owner and admins (board AdminMetrics, screen 8.7):

```
pg_cron count-daily-metrics (04:07 UTC) → run_daily_metrics() → compute_daily_metrics(day)
  writers_published_by_market() · signed_up_reader_count() · return_rate_on() · chapter_reads totals
  ▼  daily_metrics (one total per day, metric and market; no user ID; 3 years)
MarchNumbersPage → hooks/useMarchNumbers → api/marchNumbers.ts → admin_march_numbers(days)
  (owner and admin only: may_see_march_numbers(); the targets are settings march_target_*)
```

The return rate is an approximation from daily totals (architecture 1.7.9): reads of chapter N+1 in its first 7 days over reads of chapter N before N+1 came out. Nothing can follow one reader.

Tests: `156-daily-metrics.test.sql`, `lib/marchNumbers.test.ts`, `e2e/staff-metrics.spec.ts`.

## Live numbers and the compliance log (S1-E11-04)

The same `/staff/metrics` page, below the March numbers (board AdminMetrics):

```
MetricsOverviewSections → hooks/useMetricsOverview → api/metricsOverview.ts → admin_metrics_overview()
  sign_ups_by_age_group() (groups from the year of birth, never the year) · age_check_numbers()
  · cases_by_tier(30) (cases by tier; "in time" = decided by the deadline)
AnalyticsCards → lib/analytics (status from the VITE_ANALYTICS_* settings, the event count; no database)
ComplianceLogSection → hooks/useComplianceLog → api/complianceLog.ts
  → admin_compliance_log(for_export) (compliance_log_entries + removal orders from public_notices
    + launch_task()) · admin_log_compliance_entry() · admin_complete_compliance_entry()
    · admin_set_launch_date()   (owner and admin only: staff area compliance_log; each one audited)
  → lib/complianceLogCsv.ts + lib/downloadCsv.ts for "Export DSA log (CSV)"
```

A done entry is proof and can't be changed. The ANCOM notice is due 45 days after the `launch_date` setting (Law 50/2024).

Tests: `184-metrics-and-compliance-log.test.sql`, `lib/metricsOverview.test.ts`, `lib/complianceLogCsv.test.ts`, `lib/complianceEntryForm.test.ts`, `e2e/staff-compliance-log.spec.ts`.

## Epic S1-E1 at a glance (checked by S1-E1-QA)

What the Foundations epic left in place, and where to find it. The epic report, `docs/epic-reports/S1-E1.md`, lists what works, the known gaps and the steps Robert does by hand.

| Kind | Where | Story |
| --- | --- | --- |
| Screens | `/` (`src/features/website/` since CMS-1b; first `src/features/home/`) and `/design` (`src/features/design-system/`, local and staging only), inside the shell in `src/app/shell/` | S1-E1-01, S1-E1-03 |
| Hooks | `useThemePreference` (`src/features/theme/hooks/`), `useInterfaceLanguage` and `useAccountLanguage` (`src/features/language/hooks/`) | S1-E1-03, S1-E1-04 |
| Supabase calls | `src/features/language/api/profileLocale.ts`, through the one client in `src/lib/supabase.ts` | S1-E1-04 |
| Tables | `profiles`, `staff_roles`, `feature_flags`, `settings`, `audit_log` | S1-E1-02, S1-E1-04 |
| Functions | the account gate (`age_band()`, `is_active_member()`, `is_staff()`, `is_staff_session()`), `log_staff_action()`, `set_my_locale()` | S1-E1-02, S1-E1-04 |
| Jobs | none yet; the first `pg_cron` jobs come with S1-E3-03 (scheduled chapters) | |
| Tests | `supabase/tests/database/` (one file per table, `090` for the epic), `e2e/` (`epic-s1-e1.spec.ts` walks the epic's journeys and runs axe on every screen), `scripts/` (repository checks) | each story, S1-E1-QA |

**One main journey through the whole epic:** kid_14_waiting opens the app on a second device. `index.html` runs `public/theme-init.js` (light or night before the first paint, S1-E1-03) → `src/main.tsx` starts the translations in this browser's language, Romanian on a first visit (S1-E1-01, S1-E1-04) → the router draws `AppLayout` with the top bar, the page and the footer (S1-E1-03) → `useAccountLanguage` asks Supabase for the stored session, then reads `profiles.locale` → Postgres checks `profiles_select_own` and returns only kid_14_waiting's own row (S1-E1-02) → the screen switches to English. If kid_14_waiting tried to publish, the write policy would ask `is_active_member()`, which says no: under 16 and read-only in March (S1-E1-02). `e2e/epic-s1-e1.spec.ts` walks this journey.

## Epic S1-E2 at a glance (checked by S1-E2-QA)

What the Accounts epic left in place. The epic report, `docs/epic-reports/S1-E2.md`, lists what works, the known gaps and the stubs still on.

| Kind | Where | Story |
| --- | --- | --- |
| Screens | `/sign-up`, `/join/<code>`, `/auth/confirm`, `/sign-in`, `/forgot-password`, `/reset-password`, `/not-open` (`src/features/auth/`); `/setup`, `/settings` (`src/features/account/`); `/staff/roles` (`src/features/staff/`); `/legal/*` (`src/features/legal/`) | 2-01, 2-02, 2-04, 2-05, 2-07a, 2-10, 14-01, 14-02 |
| Hooks | `useSignUpForm`, `useSignUpMarket`, `useSignInForm`, `useMyNames`, `useHandleCheck`, `useMySessions`, `useStaffRoles` | each story |
| Server code | `functions/api/password-check.ts`, `functions/api/signup-context.ts` (Cloudflare Pages), shared with local development through `server/` | 2-01, 2-10 |
| Tables | `invites`, `consents`, `legal_documents`, `legal_document_versions`, `markets`, `sign_in_failures`, `username_approvals`, `reserved_names`, `username_word_lists`, `confusable_characters`, `staff_permissions`, `staff_role_areas`, new `profiles` columns | each story |
| Functions | the sign-up trigger `handle_new_auth_user()`, `account_state()` with its new steps, `check_handle()`, `set_my_handle()`, `set_my_pen_name()`, the log-in pause, `list_my_sessions()`, `staff_may()` and the `admin_*` role functions | each story |
| Tests | `supabase/tests/database/015` to `028` and `091` (the epic), `e2e/epic-s1-e2.spec.ts` and each story's spec | each story, S1-E2-QA |

**One main journey through the whole epic:** an invited adult opens `/join/<code>` → `SignUpPage` asks `check_invite()`, the current legal versions and `/api/signup-context` (the country, signed) → the form checks the year with `src/lib/age.ts` → `supabase.auth.signUp` → the trigger `handle_new_auth_user()` checks the age and the country token, creates the profile, takes an invite place (S1-E11-17 moved it after the profile, so the log can name the new account) and records the consents → the confirmation email (Mailpit) → `/auth/confirm` → `/setup` → `set_my_handle()` → `account_state()` answers `active`. `e2e/epic-s1-e2.spec.ts` walks it, then logs out and in and resets the password.

## Epic S1-E3 at a glance (checked by S1-E3-QA)

What the writing epic left in place. The epic report, `docs/epic-reports/S1-E3.md`, lists what works, the known gaps and the stubs still on.

| Kind | Where | Story |
| --- | --- | --- |
| Screens | `/write` (Your writing), `/write/new`, `/write/s/<story>/settings`, `/write/s/<story>/c/<chapter>` (the editor), `/write/s/<story>/chapters` (Manage chapters) in `src/features/writing/`; the story page `/s/<story>` in `src/features/reading/` | 3-01, 3-05, 3-02a, 3-04 |
| Shared pieces | `src/components/covers/` (drawn and automatic covers), `src/components/ui/Doodle.tsx`, `src/lib/romania-time.ts`, `src/lib/safe-links.ts`, `ChapterText` (the reader's renderer) | 3-01, 3-13, 3-03 |
| Hooks | `useNewStoryForm`, `useStorySettingsForm`, `useStoryActions`, `useMyStories`, `useChapterDraft`, `useChapterEditor`, `useAutosave` (with `useDeviceKeep`, `useDeviceDraft`), `useChapterPublishing`, `useManageChapters` | each story |
| Tables | `categories`, `tags`, `stories`, `story_tags`, `chapters`, `chapter_revisions`, `jobs` (a queue staff read; S1-E7-01 and S1-E10-04 consume it) | 3-01, 3-02a, 3-06 |
| Functions | `create_story()`, `update_my_story()`, `delete_my_story()`/`restore_my_story()`, `get_story_page()`, `rating_allows()`, `create_chapter()`, `save_chapter_draft()`, the publishing functions with `chapter_publish_now()` and `chapter_is_readable()`, the chapter management functions, `admin_raise_story_rating()`, `admin_set_ai_undisclosed_label()` | each story |
| Jobs (pg_cron) | `publish-due-chapters` (every minute), `purge-deleted-stories` (03:23), `purge-deleted-chapters` (03:29); `docs/runbooks/scheduled-jobs.md` | 3-03, 3-05, 3-04 |
| Tests | `supabase/tests/database/100` to `114` and `092` (the epic), `e2e/epic-s1-e3.spec.ts` and each story's spec | each story, S1-E3-QA |

**One main journey through the whole epic:** adult_writer opens `/write/new` → `useNewStoryForm` checks the answers with `src/schemas/story.ts` and calls `create_story()` (the rating and labels checked again by `check_story_labels()`) and `create_chapter()` → the editor opens on chapter one → `useAutosave` sends `save_chapter_draft()` every 10 seconds and on blur → "Publish chapter" saves first, then `publish_chapter()` → `chapter_publish_now()` copies the draft, stamps the story and queues a `chapter_published` job → `get_story_page()` now shows the story to readers whose age `rating_allows()` → Manage chapters reorders with `move_chapter()` → a scheduled chapter goes live through `publish_due_chapters()`. `e2e/epic-s1-e3.spec.ts` walks it in the browser and `092-epic-s1-e3.test.sql` in the database.

<!-- Lane B: demo content (23 Oct 2026). -->
## Demo content (Lane B, 23 Oct 2026)

Thirty-six synthetic stories (and, once their texts arrive, about 20 public-domain classics) live as Markdown files and reach staging as one generated top-up:

```
content/demo-stories/demo-NN.md        front matter (writer, rating, cover, tags, blurb) + "## " chapters
content/classics/texts/classic-*.md    the same, plus author, author_died, source_edition
        │  npm run demo:build  →  scripts/build-demo-content.ts
        │     checks every rule (lengths, ratings, ș/ț, no HTML), fixed ids, refuses on any problem
        ▼
supabase/staging-topups/demo-content-2a.sql   pasted into staging's SQL editor; also runs locally
        │  creates the 5 synthetic writers + the classics account (the agreed exception), the stories,
        │  their tags (set_story_tags) and their chapters already published (check_chapter_text,
        ▼  count_words), with fixed ids so a second run adds nothing
public.stories, story_tags, chapters   read by Discover, the story page and the reader (Lane A)
```

- The rules the writers follow are in `content/demo-stories/README.md`; the five stories Robert reads whole are marked `sample: yes`.
- Tests: `scripts/build-demo-content.test.ts` (the parser, every rule, the SQL shape, and that the committed SQL matches the files).
- Classics show their real author (S1-E5-06, 25 Oct 2026): the classics stay owned by the classics account, and `stories.classic_author_id` points at `classic_authors` (name, year of death; public, no accounts). `story_writer_name()` puts the author on every byline (`story_card_json()`, `get_story_page()`, `get_chapter()`, `get_link_preview()`), and the story page shows `ClassicAuthorCard` instead of the writer card, with no Follow or profile. The build writes each classic's author into part 2a and on its own into `supabase/staging-topups/classic-authors.sql`, for a staging database that already ran 2a. Staff add classics later with "Add a classic work" (S1-E11-16). Tests: `supabase/tests/database/158-classic-authors.test.sql`, `e2e/classic-authors.spec.ts`.
- Part 2b, `supabase/staging-topups/demo-content-2b.sql` (TOOL-3), is hand-written and runs after 2a: follows, chapter likes, comments with some writer replies, emoji reactions and 30 days of read totals, made only by the active adult test accounts and never across a block. Every choice comes from an md5 of the story, chapter and person (`pg_temp.demo_number()`), so a second run makes the same choices and adds nothing. Each story gets a fixed popularity from its slug, so shelves and the ranking differ. Tests: `scripts/demo-content-2b.test.ts` (the file's shape) and `npm run demo:check-2b` (runs 2a and then 2b twice on the local database and checks the rules).

## Epic S1-E4 at a glance (checked by S1-E4-QA)

What the reading epic left in place. The epic report, `docs/epic-reports/S1-E4.md`, lists what works, the known gaps, the stubs still on and Lane A's by-hand list for staging.

| Kind | Where | Story |
| --- | --- | --- |
| Screens | the reader `/s/<story>/<chapter>` (`ChapterReaderPage`), the teaser and "No preview for this story" on the same address for signed-out visitors (`TeaserPage`, `NoPreviewNotice`), all in `src/features/reading/` | 4-01a, 4-04 |
| Shared pieces | `ProtectedChapterText` and `CopyNotice` (copy off, Q9), `ChapterBannerSlot` (empty until S1-E12-01), `formatRomaniaShortDate()` and `dateLocaleFor()` in `src/lib/romania-time.ts` (British dates in English) | 4-06a, 4-01b, 4-01a |
| Hooks | `useChapter` (with `api/chapterPrefetch.ts`), `useRecordRead`, `useReadingProgress`, `useChapterBanner`, `useStoryPreview` | 4-01a, 4-01b, 4-04 |
| Server code | `functions/s/[[path]].ts` → `server/link-preview.ts` (Open Graph tags, JSON-LD, noindex); `public/link-previews/` from `scripts/make-link-preview-images.ts` | 4-04 |
| Tables | `chapter_reads` (daily totals per chapter, never who read) | 4-01a |
| Functions | `get_chapter()` (the teaser for visitors), `record_chapter_read()`, `get_link_preview()`, `is_blocked_with()` (a stub until S1-E5-05); internal `reader_visible_story()`, `teaser_of()`, `word_total()`; the setting `teaser_length` (600) | 4-01a, 4-04 |
| Tests | `supabase/tests/database/140` to `142` and `093` (the epic), `server/link-preview.test.ts`, `e2e/epic-s1-e4.spec.ts` and each story's spec (`chapter-reader`, `reader-performance`, `copy-protection`, `teaser`) | each story, S1-E4-QA |

**One main journey through the whole epic:** someone pastes `/s/<story>/<chapter>` into WhatsApp → the preview robot gets the page from `functions/s/[[path]].ts`, which asks `get_link_preview()` and writes the Open Graph tags (`server/link-preview.ts`) → a visitor opens it: the route's loader starts `get_chapter()` early (`prefetchChapter()`), which answers with `is_teaser` and the first 600 words → `TeaserPage` shows the story card, the teaser (copy off) and "Log in to read on" → signed in, the same address gives the whole chapter in `ChapterReaderPage`; `useRecordRead` adds one to today's total in `chapter_reads`. `e2e/epic-s1-e4.spec.ts` walks it in the browser and `093-epic-s1-e4.test.sql` in the database.

## Epic S1-E6 at a glance (checked by S1-E6-QA)

What the comments, reactions and follows epic left in place. The epic report, `docs/epic-reports/S1-E6.md`, lists what works, the known gaps and the stubs still on.

| Kind | Where | Story |
| --- | --- | --- |
| Screens | the like button and the comments under the chapter (`src/features/reading/components/LikeButton.tsx`, `src/features/comments/`), Follow on the writer's profile and the story page (`src/features/people/components/FollowButton.tsx`) | 6-03, 6-01, 6-02, 6-04, 6-05 |
| Tables | `chapter_likes`, `comments`, `comment_reactions`, `comment_downvotes`, `follows_users`, `follows_stories` | each story |
| Functions | `like_chapter()`, `chapter_comments()`, `post_comment()`, `delete_comment()`, `react_to_comment()`, `downvote_comment()` (with `open_downvote_case()`), `follow_writer()`, `follow_story()`; every one asks `readable_chapter()` or the profile's rules first | each story |
| Jobs | `purge-deleted-comments` nightly; `post_comment()` queues `comment_posted` for notifications | 6-01 |
| Tests | `148`, `149`, `150`, `153`, `144` and `096` (the epic); `e2e/epic-s1-e6.spec.ts` and each story's spec | each story, S1-E6-QA |

**One main journey through the whole epic:** teacher opens `/s/<story>/<chapter>` → `ChapterComments` loads `CommentsSection` after the text → "Post comment" calls `post_comment()`, which asks `readable_chapter()` (rating, blocks, moderation) and `is_active_member()` before saving → the list reads again through `chapter_comments()`, each comment shaped by `comment_json()` with its reactions and `downvoted_by_me` → a heart goes through `react_to_comment()`, a downvote through `downvote_comment()`, which may open a `D-` case in the moderation queue. `e2e/epic-s1-e6.spec.ts` walks it in the browser and `096-epic-s1-e6.test.sql` in the database.

## Epic S1-E7 at a glance (checked by S1-E7-QA)

What the notifications epic left in place for March. The epic report is `docs/epic-reports/S1-E7.md`.

| Kind | Where | Story |
| --- | --- | --- |
| Screens | the bell in the top bar (`NotificationBell`) and `/notifications` (`NotificationsPage`), in `src/features/notifications/` | 7-01 |
| Tables | `notifications` (the person told reads their own) | 7-01 |
| Functions | `notify()`, `run_notification_jobs()`, the triggers on `follows_users`, `comment_reactions` and `cases`; `my_notifications()`, `my_unread_notification_count()`, `mark_notifications_read()`; `notification_is_shown()` applies the reader's rules when they look | 7-01 |
| Jobs | `run-notification-jobs` every minute, `purge-old-notifications` nightly | 7-01 |
| Tests | `154` and `097` (the epic); `e2e/notifications.spec.ts`, `e2e/epic-s1-e7.spec.ts` | 7-01, S1-E7-QA |

**One main journey:** adult_writer presses Publish → `publish_chapter()` queues `chapter_published` → within a minute `run_notification_jobs()` gives each follower of the writer or the story one row → teacher's bell asks `my_unread_notification_count()` and shows 1 → the page lists "Lia Scrie published Chapter 2 of …" through `my_notifications()`, which leaves out anything teacher may not open → "Read now" opens the chapter and marks the row read.

## Epic S1-E5 at a glance (checked by S1-E5-QA)

What the discovery epic has in place. S1-E5-08, the public home page, and S1-E5-07, the seasonal doodle, came in CMS-1; journey 6 of the check walks from the home page to a story. The epic report is `docs/epic-reports/S1-E5.md`.

| Kind | Where | Story |
| --- | --- | --- |
| Screens | `/discover` (`DiscoverPage`), the See all, category, tag and writer list pages (`StoryListPage`) in `src/features/discovery/`; the writer profile `/u/:handle` in `src/features/people/`; the stats row on the story page (`StoryStats`) | 5-01, 5-09, 5-02, 5-03, 5-05 |
| Tables | `story_scores` (staff may read it); `blocks` (S1-E5-05); the lists add no table of their own | 5-03, 5-05 |
| Functions | `browse_stories()` with `listed_stories()`, `list_holds_story()`, `list_default_sort()`; `compute_story_scores()` and `story_signals()`; `get_writer_profile()`, `set_block()`; `get_story_page()`'s `stats` | 5-01, 5-02, 5-03, 5-05 |
| Settings | `discover_shelves` and `rising_writer_days` (public), `ranking_weight_*`, `ranking_half_life_days`, `ranking_window_days` | 5-03 |
| Jobs | `compute-story-scores`, 13 minutes past every hour | 5-03 |
| Tests | `151`, `152`, `155` and `098` (the epic); `e2e/discover.spec.ts`, `e2e/ranking.spec.ts`, `e2e/writer-profile.spec.ts`, `e2e/epic-s1-e5.spec.ts` | 5-01 to 5-09, S1-E5-QA |

**One main journey:** teacher likes a chapter in the reader (`like_chapter()`) → on the hour `compute_story_scores()` adds the like, halved for every 7 days of age, to the story's score → a visitor opens `/discover/c/fiction` → `StoryListPage` asks `browse_stories('category', 'fiction')` with no sort → `list_default_sort()` says popular → the story comes first, as long as `rating_allows()`, the blocks and the moderation checks let this reader see it.

## Epic S1-E15 at a glance (checked by S1-E15-QA)

What the March numbers epic left in place for March. The epic report is `docs/epic-reports/S1-E15.md`.

| Kind | Where | Story |
| --- | --- | --- |
| Screens | `/staff/metrics` (`MarchNumbersPage`, `MarchTargetCard`, `MarchNumberLists`) in `src/features/staff/components/metrics/` | 15-02 |
| Tables | `daily_metrics` (owner and admins read it); fed by `chapter_reads` (S1-E4-01a) | 15-02 |
| Functions | `compute_daily_metrics()`, `run_daily_metrics()`, `writers_published_by_market()`, `signed_up_reader_count()`, `return_rate_on()`, `admin_march_numbers()` | 15-02 |
| Settings | `march_target_writers`, `march_target_readers`, `march_target_return_rate`, `daily_metrics_keep_years` | 15-02 |
| Jobs | `count-daily-metrics`, 04:07 UTC every day | 15-02 |
| Tests | `156` and `099` (the epic); `lib/marchNumbers.test.ts`; `e2e/staff-metrics.spec.ts`, `e2e/epic-s1-e15.spec.ts` | 15-02, S1-E15-QA |

**One main journey:** teen_17 opens a chapter → `record_chapter_read()` adds one to the day's total in `chapter_reads`, keeping nothing about teen_17 → at 04:07 UTC `run_daily_metrics()` stores yesterday's totals in `daily_metrics` → the owner opens `/staff/metrics` → `useMarchNumbers` calls `admin_march_numbers()`, which checks `may_see_march_numbers()` and answers totals only.

## Epic S1-E10 at a glance (checked by S1-E10-QA)

What the Safety epic has in place so far. The epic report, `docs/epic-reports/S1-E10.md`, lists what works, the open Must stories, the known gaps and the stubs still on.

| Kind | Where | Story |
| --- | --- | --- |
| Screens | the Report dialog (`src/features/reporting/`), the safety block (`src/features/safety/`), `/staff/moderation` and `/staff/moderation/cases/:id` (`src/features/moderation/`), the sanction notice (`src/features/account/`) | 10-01, 10-13a, 10-03a, 10-06 |
| Hooks | `useReportItem`, `useSafetyContacts`, `useVisitorCountry`, `useModerationQueue`, `useCase`, `useSanctions`, `useMySanctions` | each story |
| Tables | `reports`, `safety_contacts`, `safety_contact_gaps`, `report_reason_tiers`, `cases`, `case_actions`, `sanctions`, `banned_email_hashes`, `moderated_items` | each story |
| Functions | `report_item()`, `reportable_item_owner()`, `reportable_item_summary()`, `attach_report_to_case()`, `admin_moderation_queue()`, `admin_decide_case()`, `admin_apply_sanction()`, `admin_lift_sanction()`, `admin_pause_reporting()`, `is_moderated_away()`, `account_state()` (suspended, banned), `note_safety_contact_gap()` | each story |
| Tests | `supabase/tests/database/042` to `045` and `094` (the epic), `e2e/epic-s1-e10.spec.ts` and each story's spec | each story, S1-E10-QA |

**One main journey through the whole epic:** a reader presses `<ReportButton>` → `ReportDialog` shows the helplines (`SafetyContactsBlock`) and the reasons → `report_item()` stores the report and `attach_report_to_case()` opens or joins the item's case with its tier and deadline → the moderator opens `/staff/moderation`, the case page, and sends a decision → `admin_decide_case()` closes the case and calls `admin_apply_sanction()` → `account_state()` answers `suspended` and every write policy refuses → the person sees `SanctionNotice`. `e2e/epic-s1-e10.spec.ts` walks it.

## Content settings, markets and languages (S1-E11-03, S1-E11-05; CMS-1a)

The owner and admins change how the platform works from `/staff/settings` (`src/features/settings/`), with no migration and no release.

- **Where it starts:** `SettingsPage` checks the person holds the `settings` area (`useMyStaffAccess`), then shows the sections: flags (`FlagsSection`), every named setting grouped by `lib/settingGroups.ts` (`ValueSettingsSection`), the Discover mix (`DiscoverMixEditor`), rate limits (`RateLimitsEditor`), categories, reserved names, the username word lists, and markets and languages (`MarketsSection`).
- **How one click travels:** an admin switches a flag → `useSettingsAdmin().change()` → `api/settingsAdmin.ts` → `admin_set_flag()` checks `staff_may('settings', 'act')`, updates `feature_flags` and writes `settings.flag` to `audit_log` with the before and after state, all in one transaction → the hook reads the flags again, and every other visitor's app re-reads public flags and settings within a minute (`useFeatureFlags`, `usePublicSettings`).
- **Keeping a value's shape:** `admin_set_setting()` asks `setting_value_problem()` first, so a number stays a number, nothing goes below zero, a list doesn't repeat an item and an object keeps its parts. The reason word comes back as the error's hint and `SettingsFailureNotice` words it.
- **Markets and languages:** `languages` (one row per BCP 47 code, with its status) and `staff_languages` (who reads what, set on Staff › Roles by `StaffLanguages`). `admin_set_language_status()` refuses to open a language no moderator reads; `admin_set_market()` refuses Ready or Open without the legal check, Open without an open language, and lets only the owner open a market. `markets.is_open` follows `markets.status` by trigger, so sign-up (S1-E2-10) is unchanged. The new story form now lists every language and shows the closed ones as "coming" (`story_language_choices()`).
- **Tests:** `supabase/tests/database/170-settings-admin.test.sql`, `171-markets-and-languages.test.sql` and `e2e/settings-admin.spec.ts`.

## The website CMS, notices and help (S1-E11-06, S1-E11-10, S1-E11-12, S1-E5-08; CMS-1b)

Website pages get their text only from the CMS, never from the locale files (decided 17 Oct 2026, 19:14). For March the content lives in the app's database behind one contract, `WebsiteContentStore` (`src/features/website/api/websiteContentStore.ts`), so moving it to the website's own database later swaps only the store.

- **Where it starts (visitors):** `/` is `WebsiteHomePage`, `/help` is `HelpCentrePage`, `/help/:slug` is `HelpPageView`, and `NoticeStrip` sits in `AppLayout` above every page. Each reads through `useWebsiteContent(kind, schema)` → `appDatabaseStore().readLive()` → `website_content()`, which picks the visitor's market (the country from the connection) and language, falls back to Romania in English, and returns only live, published rows. If a read fails the page shows the last copy it saw (`lib/lastKnownContent.ts`).
- **Where it starts (staff):** `/staff/website`, `/staff/website/notices` and `/staff/website/help` are `WebsiteAdminPage`, open to the owner and admins only (`staff_may('website_cms', 'act')`). Staff pick a market and language (`MarketLanguagePicker`), edit with counted fields and a live preview, then save a draft or publish with a "show from" date (`PublishControls`).
- **How one click travels:** Publish → `useWebsiteEditor().act({ kind: 'publish', draft })` → `admin_save_cms_draft()` then `admin_publish_cms_version()`. The second checks the role, asks `cms_content_problems()` for empty, too-long or broken-link fields (refused with the list as the error's hint, read back by `websiteErrorFrom()` and shown under each field), marks the version published and writes `website.published` to `audit_log` with the before and after copy, in one transaction.
- **One table:** `cms_versions` holds every version of every kind (home page, notice, help page, question): one draft per entry, published versions with their "show from" date, and removals. Version 1 (the 16 Oct 2026 copy) is seeded by `…_s1_e11_06_website_content_v1.sql` with no `user_id`.
- **Tests:** `supabase/tests/database/172-website-cms.test.sql`, `e2e/website-cms.spec.ts` and the unit tests in `src/features/website/lib/`.

## Interface text and email templates (S1-E11-18, S1-E11-19; CMS-1c)

Admins change the app's own words, and the Auth emails', from Staff › Website without a release. The locale files stay the default and what `npm run i18n:check` checks; overrides live in `interface_text_overrides`, one version per key and BCP 47 locale.

- **Where it starts (the app):** `src/main.tsx` calls `installInterfaceTextOverrides()` (`src/lib/interface-text-overrides.ts`) right after the translations start. In the background it reads `published_interface_text(locale)` once per language and writes each override over the file text; a namespace that loads later gets its overrides when it is added. If the read fails, the file text stays.
- **Where it starts (staff):** `/staff/website/interface-text` and `/staff/website/emails` (`src/features/interface-text/`). The key list comes from the bundled locale files (`lib/localeCatalogue.ts`), so the admin site can't invent a key.
- **How one click travels:** Publish → `useInterfaceTextEditor().act()` → `admin_save_interface_text()` (checks the role, refuses an empty text, changed placeholders or the literal product name, fixes ş and ţ) → `admin_publish_interface_text()` (logs `interface_text.published` with the before and after text) → every visitor's app shows it on its next load.
- **Emails:** `functions/api/send-email.ts` → `server/send-email.ts` is the Supabase Auth Send Email hook: it checks the Standard Webhooks signature, picks the email and language, lays the `email:` overrides over `email.json` and sends through Brevo. It is switched on by hand (GO-LIVE); until then Auth uses `supabase/templates/`.
- **Tests:** `supabase/tests/database/173-interface-text.test.sql`, `e2e/interface-text.spec.ts`, `server/send-email.test.ts` and the unit tests next to each file.

## Seasonal doodles (S1-E11-11, S1-E5-07; CMS-1d)

A small drawing beside Discover's heading changes with the season and on special days. The owner and admins plan it; the app's database keeps the schedule (B30).

- **Where it starts (readers):** `DiscoverPage` shows `<SeasonalDoodle place="discover">` (`src/features/seasonal/`). `useSeasonalDoodle()` asks `current_seasonal_doodle(today, 'discover')` once a minute; the shortest occasion that covers today wins, so Halloween beats Autumn. If the read fails, no doodle shows. The doodle is decorative: `alt=""`, `aria-hidden`, beside the heading, never over it.
- **Where it starts (staff):** `/staff/website/seasonal` (`SeasonalTab`). Add or Change opens `OccasionForm`; Save → `admin_save_occasion()` (checks the website area, refuses a last day before the first or a yearly range of a year or more, logs `seasonal.saved` with before and after) → the schedule and the doodle are read again. Remove → `admin_remove_occasion()` (soft delete, `seasonal.removed`).
- **The year view:** `OccasionYearView` uses `occasionCovers()`, the same rule as the database's `occasion_covers()`, to list each month's occasions and count any day with no doodle.
- **Tests:** `supabase/tests/database/174-seasonal-occasions.test.sql`, `e2e/seasonal-doodles.spec.ts`, `src/features/seasonal/lib/seasonalCalendar.test.ts`.

## Landing pages (S1-E11-14; CONTESTS-13a1)

A landing page is a page at its own address, `/c/<name>`, for a contest, a campaign or some information. Admins build it from fixed blocks (hero, text, key dates, who can enter, prize, how to enter, rules, questions and answers) in Romanian and English side by side; there is no free HTML and no colour of their own, only four brand themes.

- **Where it starts (visitors):** `/c/:slug` is `LandingPageScreen` (`src/features/landing-pages/`). `usePublicLandingPage()` → `fetchPublicLandingPage()` → `landing_page(slug)`, which returns the live version (never a draft or a scheduled one) with `state` "live", or "ended" from its take-down date; an archived page, or one with nothing live, is Not found. `LandingPageView` draws the theme band and the one h1, then `LandingBlockView` for each block, in the visitor's interface language.
- **Where it starts (staff):** `/staff/website/landing-pages` is `LandingPagesTab` inside `WebsiteAdminPage` (owner and admins only). `NewLandingPageForm` → `admin_create_landing_page()` (refuses a badly formed, reserved or taken address). `?page=<id>` opens `LandingPageEditor`: the form (`LandingEditorForm`, `BlockCard` with Up, Down and Remove, `BlockLanguageColumn` for each language, `BlockSharedFields`, `QuestionItemsFields`, `AddBlockRow`), a phone and desktop `LandingPreview`, `LandingPublishBar` and `LandingVersionHistory`.
- **How one click travels:** Publish → `useLandingPageEditor().act({ kind: 'publish', draft })` → `admin_save_landing_page_draft()` then `admin_publish_landing_page()`, which asks `landing_page_problems()` for what is missing (a hero first, every required field in both languages, a contest's key dates and Rules link, dates in order) and refuses with the list as the hint, which `labelOfField()` turns into "Block 3: Rules, English: Link text". The limits live twice, in `src/schemas/landingPages.ts` (`landingFieldRules`) and `landing_block_field_rules()`, so the counters and the server agree. Each create, publish, restore and archive writes `landing_page.*` to `audit_log`.
- **Tables:** `landing_pages` (address, type, archived) and `landing_page_versions` (one draft per page, published versions with "show from" and "take down on"). `c` is a reserved name, so no username can take the address.
- **Tests:** `supabase/tests/database/261-landing-pages.test.sql`, `e2e/landing-pages.spec.ts`, `src/features/landing-pages/lib/blocks.test.ts`.

### Pictures and featured stories (CONTESTS-13a2a)

- **Pictures:** a Hero or Text block may hold one picture. `BlockPictureField` → `useLandingPictureUpload()` → `uploadLandingPicture()` puts it in the private `landing-pictures` bucket (only owner and admins may upload, `landing_picture_upload_allowed()`), then `register_landing_picture()` starts the usual picture check. A landing picture always waits for a moderator (`picture_needs_person()`), and `landing_picture_problems()` refuses to publish until it is approved and has alt text in both languages. The editor polls `admin_landing_picture_states()` every 15 seconds while a picture isn't ready.
- **Featured stories:** a `featured` block picks 1 to 12 stories by address or one approved tag. `landing_featured_cards()` reads them through `listed_stories()` (moderation, restriction, class-only, blocks and the reader's rating) and then keeps only ratings for the youngest group the page is for (`landing_youngest_ratings()`, 13 to 15 when there is no Who can enter block). `FeaturedStoriesBlock` draws them as a `Shelf`.
- **The public read:** `landing_page()` now also returns `pictures` (only visible ones, `landing_page_pictures()`) and `featured` (cards per block id); `fetchPublicLandingPage()` returns them as `extras`.
- **Tests:** `supabase/tests/database/262-landing-pictures-featured.test.sql`, `e2e/landing-pictures-featured.spec.ts`.

### Remind me (CONTESTS-13a2b)

- **The block:** a `remind_me` block (heading and optional intro) needs a Key dates block on the page, one per page (`landing_page_problems()`). `landing_page()` returns `reminder` ({opens_on, is_open, is_set} for this reader, `landing_reminder_json()`), so `usePublicLandingPage()` keeps its cache per signed-in person.
- **How one tap travels:** `RemindMeBlock` → `useLandingReminder()` → `setLandingReminder()` → `set_landing_reminder(slug, wanted)`, which asks a visitor to log in (hint `sign_in`), refuses once entries are open (`already_open`) and adds or removes the reader's one row in `landing_page_reminders` (RLS: a reader reads their own; nobody writes directly).
- **The job:** `send_landing_reminders()` runs every hour (pg_cron `send-landing-reminders`). On the day entries open (Romanian time) it calls `notify()` once per reminder with the kind `landing_entries_open` and marks it sent; no email (the kind has no email default). `notification_json()` adds `landing_page` (address and both titles), and `landingEntriesOpenText()` names the page in the reader's language and links to `/c/<slug>`.
- **Tests:** `supabase/tests/database/263-landing-remind-me.test.sql`, `e2e/landing-remind-me.spec.ts`.

### Link previews and links to landing pages (CONTESTS-13a2c)

- **Shared links:** `functions/c/[[path]].ts` on Cloudflare (and `server/pages-functions-plugin.ts` locally) hands `/c/<name>` to `handleLandingLink()` in `server/landing-preview.ts`, which reads the public `landing_page()` and writes the hero's Romanian title and introduction, the Open Graph and Twitter tags and the theme's picture from `public/link-previews/` into index.html. A page with nothing live gets noindex; if the database can't be reached the page goes out unchanged.
- **Links from the CMS:** `cms_link_problems()` accepts `/c/<name>` in a notice, a help page or an answer while that landing page exists and isn't archived.
- **Tests:** `server/landing-preview.test.ts`, `supabase/tests/database/264-landing-page-links.test.sql`, `e2e/landing-link-preview.spec.ts`.

## Contests (S1-E11-15; CONTESTS-13b1)

A contest belongs to one landing page of type contest (S1-E11-14): the page tells visitors about it, the contest row holds what the database needs to take entries. Owner and admins run them from Staff › Contests; writers enter from a story's settings.

- **Where it starts (staff):** `/staff/contests` is `StaffContestsPage` (`src/features/contests/`). `NewContestForm` → `useStaffContests().create()` → `admin_create_contest(landing_slug)`, which refuses a page that isn't a contest page or already has one. `/staff/contests/:contestId` is `ContestEditorPage`: `ContestForm` → `admin_save_contest(id, details)` (names, entry window, results day, age groups, markets, languages, what counts, word limit, prize, who delivers it, judges and the rules help page). `ContestOpenPanel` shows `admin_contest_problems()` and calls `admin_open_contest()`.
- **What opening needs:** `contest_problems()` = `contest_detail_problems()` (every detail filled in, dates in order) plus `contest_landing_problems()` (the page is live, its Rules block links to `/help/<key>`, and that help page is published in Romanian and English for every contest market). An open contest can still be saved, but never into a state with problems (hint `breaks_open_contest`).
- **Where it starts (writers):** `StoryContestCard` in `StorySettingsPage` → `useStoryContests(slug)` → `contest_entry_options(story_slug)`, the open contests taking entries today with this story's problems (`contest_story_problems()`: not readable, class only, language, rating, word limit) and the writer's entry, if any. Enter → `enter_contest()`; Withdraw → `withdraw_contest_entry()`, only while entries are open.
- **Rules in the database:** entries open from `entries_open_on` to `entries_close_on`, both days included, in Romanian time (`contest_takes_entries_today()`); the writer's age group and country must be among the contest's (`contest_writer_fits()`); when 13 to 15 is one of the groups, only All ages and 13+ stories may enter; one valid entry per writer per contest (partial unique index `contest_entries_one_per_writer`).
- **Tables:** `contests` (staff read only, `contests_select_staff`) and `contest_entries` (the writer reads their own, staff read all; written only through the functions). `contest_entries` is in `data_export_tables()` and `account_deletion_rules()`.
- **Tests:** `supabase/tests/database/265-contests.test.sql`, `e2e/contests.spec.ts`.

### Entries and disqualifying (CONTESTS-13b2a)

- **The list:** once a contest is open, `ContestEditorPage` shows `ContestEntriesSection` → `useContestEntries()` → `fetchContestEntries()` → `admin_contest_entries(id)`: each entry by pen name and age group only (never the user ID or year of birth), with the story, rating, published words, date and status.
- **How one click travels:** Disqualify → `DisqualifyForm` (a reason is required) → `disqualifyContestEntry()` → `admin_disqualify_contest_entry(entry, reason)`, which issues a statement of reasons (`issue_statement_of_reasons()`, action `contest_disqualified`, ground key `contest_rules`), notifies the writer, sets `contest_entries.statement_id` and writes the audit log.
- **The appeal:** the writer appeals from My reports and decisions like any decision (S1-E10-07). `decider_of_statement()` names the admin who disqualified, and `undo_decision_for_appeal()` makes the entry valid again when a moderator overturns it. A disqualified entry still holds the writer's one place, so `contest_entry_options()` returns it and `StoryContestCard` links to the decision.
- **Tests:** `supabase/tests/database/266-contest-entries-disqualify.test.sql`, `e2e/contests.spec.ts`.

### Judging, results and prizes (CONTESTS-13b2b)

- **Judging:** once entries close (`contest_entries_have_closed()`), the Placing column (`PlacingControl` in `EntryJudging.tsx`) → `useContestEntries().judge({ kind: 'placing' })` → `admin_set_contest_placing()` stores `contest_entries.award` (winner or finalist). Only owner and admins choose; there is no public vote.
- **Publishing:** `ContestResultsPanel` → `admin_publish_contest_results()` (needs a winner) sets `contests.results_published_at`. `landing_page()` then returns `results` from `contest_results_json()`: pen names only, winners first, a story link only when `listed_stories()` lets the visitor see it. `LandingPageView` shows them with `ContestResultsBlock`.
- **Prizes:** `PrizeControl` → `admin_mark_contest_prize_sent(entry, parent_consent_on_file)`, which refuses a winner under 16 (or of unknown age) until staff confirm a parent's or guardian's consent is on file. Only the date and that confirmation are stored, never the delivery details.
- **Tests:** `supabase/tests/database/267-contest-results.test.sql`, `e2e/contests.spec.ts`.

### Contest certificates (CONTESTS-13b2c)

- **Issuing:** once the results are published, "Issue certificates" in `ContestResultsPanel` → `useContestEntries().judge({ kind: 'certificates' })` → `admin_issue_contest_certificates()`. Every valid entry gets one row in `certificates` with `contest_id` set (winner, finalist or participant) through `write_contest_certificate()`; running it again only changes a certificate whose placing changed. Each writer gets a `certificate_issued` notification pointing at the contest's landing page (`certificateIssuedWhat()` in `notificationText.ts`).
- **The writer:** `my_certificates()` adds `is_contest` and `contest_name` (both languages). `CertificateSheet` prints the contest's name in the sheet's language, our signature only and the contest footer; `CertificatePage` hides `PrintedNameForm`, because a real name is stored only with a class certificate (CLAUDE.md rule 5). The check page (`verify_certificate()`) works as for any certificate.
- **Tests:** `supabase/tests/database/268-contest-certificates.test.sql`, `e2e/contests.spec.ts`, `src/features/certificates/api/certificates.test.ts`.

## Tags: approval and names in each language (CMS-1e)

A tag is one idea with a name in each language (Fantasy, Fantezie). A name nobody used before waits for the moderation team; readers see approved tags only.

- **Where it starts (writers):** the tag box, `TagInput` (`src/features/writing/components/`), reads `useTagCatalogue()` (`src/features/tags/`). A name typed in another language becomes the interface language's name, the recommended tags sit under the box (`TagSuggestions`), and a tag staff haven't approved says "(waiting for approval)". Saving calls `create_story()` or `update_my_story()` → `set_story_tags()`, which finds each name's tag in any language with `tag_for_name()` or makes a new waiting tag.
- **Where it starts (readers):** `get_story_page()` sends approved tags only; `StoryHeader` shows each in the reader's language and links to the tag page, where `list_holds_story()` finds the tag by any of its names.
- **Where it starts (staff):** `/staff/tags` (`TagsAdminPage`), for owner, admin and moderator. Approve or Save the names → `admin_name_tag()` (a name in every interface language, none taken by another tag; logged `tag.approved` or `tag.named`). Reject → `admin_reject_tag()` (the tag leaves every story, each writer gets a `tag_rejected` notification, logged `tag.rejected` with the reason). `/staff/tags/missing` lists approved tags without a name in a newly opened language.
- **Tests:** `supabase/tests/database/175-tags.test.sql`, `e2e/tags.spec.ts`, `src/features/tags/lib/tagCatalogue.test.ts`.

### Rank badges on the cover (CMS-1g)

Under a story's cover the story page shows where it stands in its tags ("#3 in Owls"), and the writer may pick which tags those badges show.

- **Readers:** `StoryHeader` → `RankBadges` → `useTagRanks()` → `story_tag_ranks()`. For each approved tag it calls `story_rank_in_tag()`, which ranks the story inside `listed_stories('tag', …)` by the tag page's popular order (`story_scores`, then the newer story, then the address). `listed_stories()` holds only the stories this reader may see, so ranks follow the reader's age, blocks and moderation. A story with no score, or a tag with fewer than `rank_badge_min_stories` (5) stories, shows no rank. The cover shows the 3 best ranks, or the writer's picks.
- **Writers:** Story settings → `RankBadgePicker` (one chip per approved tag with its rank) → `useSaveRankBadgePick()` → `set_rank_badge_tags()`, which saves up to 3 tag IDs in `stories.rank_badge_tag_ids` (null means automatic). It saves on its own, apart from the form's Save button.
- **Tests:** `supabase/tests/database/176-tag-rank-badges.test.sql`, `e2e/tag-rank-badges.spec.ts`, `src/features/tags/lib/rankPick.test.ts`.

## Search (S1-E5-04)

One search field finds stories, writers and tags, in Romanian and English, with or without diacritics.

- **Where it starts:** `SearchForm` (`src/features/search/`) on Discover and on `/search` → `SearchPage` → `useSearchResults()`. Stories come from `useStoryShelf()` with the list kind `search`, so `browse_stories('search', term)` → `listed_stories()` → `list_holds_story()` → `story_matches_search()`. That keeps the age rating, blocks, moderation and drafts in one place, the same as every other list.
- **How a story matches:** `story_search_text()` folds the title, blurb, the writer's username and pen name, a classic's author and every language's name of its approved tags (lower case, no marks, ş and ţ corrected, as `normalise_tag()`). `story_matches_search()` takes a Romanian or English word match (`search_query()`, stemmed, so "povestea" finds "Povești") or a plain "contains" match for a word typed in part. `story_search_rank()` puts title matches first; the See all page (`/search/stories`, the shared `StoryListPage`) sorts by `relevance` ("Best match"), a sort only search accepts.
- **Writers and tags:** `search_writers()` lists only writers with a story this reader may see, so a search never turns up a minor's account, and never answers a user ID. `search_tags()` finds approved tags by any of their names. Their See all pages are `/search/writers` and `/search/tags` (`SearchGroupPage`).
- **Tests:** `supabase/tests/database/177-search.test.sql`, `e2e/search.spec.ts`, `src/features/search/lib/searchAddresses.test.ts`, `src/features/discovery/lib/listAddresses.test.ts`.

## The library and the reader's place (S1-E4-03; READ-4a)

- Screen 3.7 is `/library` (`src/features/library/components/LibraryPage.tsx`): "Continue reading" (`my_library()`), the shelves (Reading, Saved for later, Finished, each `browse_stories('library', <shelf>)` with its See all page at `/library/<shelf>`) and "What you follow" (`my_follows()`).
- How a place travels: the reader screen (`ChapterReaderPage`) measures the progress (`useReadingProgress`), `useSavedPlace` saves it 3 seconds after scrolling stops and when the reader leaves → `save_reading_position()` → `reading_positions` (one row per chapter) and `library_entries` (the story joins Reading, and Finished at the end of a completed story). Next time, `my_place_in_chapter()` brings it back and `SavedPlaceOffer` offers "Go back there".
- The story page's "Start reading" / "Continue chapter n" and the Library drop-down are `StoryReadingActions` → `story_library_state()` and `set_library_shelf()`.
- Both tables are readable by their owner only; nobody else ever sees what someone reads. Tests: `supabase/tests/database/179-library.test.sql`, `e2e/library.spec.ts`.

## Reading settings (S1-E4-02; READ-4b)

- On screen 3.5 a signed-in reader gets "Reading settings" in the chapter bar (`ReadingSettingsControl` → `ReadingSettingsPanel`): font (Inter, Serif, Dyslexia-friendly), text size (14 to 28 px), line spacing, line width and theme (Light, Sepia, Night).
- How a change travels: the panel calls `change()` in `useReadingSettings`, which replaces the cached settings at once (so the text changes straight away) and saves the whole set 600 ms later → `save_reading_settings()` → `reading_settings` (one row per reader). Another device reads the row when the chapter opens.
- How the text gets its look: `useReadingLook` joins the settings with the device's own text size (the page's root font size, read once; 19 px at the normal 16) and puts CSS variables (`--reading-font-size` and so on) on the box around the text; `src/styles/index.css` reads them in `.tmc-chapter-text--reader`. Sepia and Night wrap the text in `.tmc-reading-page` (Night with `data-theme="night"`, so it reuses the night tokens).
- The row is readable by its owner only. Tests: `supabase/tests/database/180-reading-settings.test.sql`, `src/features/reading/lib/readingStyle.test.ts`, `e2e/reading-settings.spec.ts`.

## Reading place and comfort (IDEAS-1 part a)

Robert's picks of 31 Oct 2026, ideas 4, 6, 7 and 8 (`/mnt/project-files/feature-ideas/2026-10-31.md`).

- "You are here" (idea 4): on the story page, `StoryChapterList` asks `story_library_state()` (through `useStoryLibraryState`) for the reader's place and puts "You are here, 42%" beside that chapter. It links to `/s/<story>/<chapter>#resume`; `ChapterReaderPage`'s `AboveText` remembers the "#resume" once and `SavedPlaceOffer` (with `goesAtOnce`) scrolls straight to the place and takes the hash off the address.
- Atkinson Hyperlegible (idea 6): a fourth font in the panel. It is self-hosted from `@fontsource/atkinson-hyperlegible` (imported in `src/styles/fonts.css`, so no outside font site), and `lib/readingStyle.ts` maps the new `reading_font` value to it.
- Night by the clock (idea 7): two times the reader picks, kept in `reading_settings` (`night_by_clock`, `night_from`, `night_until`; there is no preset hour). `hooks/useChapterTheme.ts` reads the device's clock once when a chapter opens and asks `lib/nightByClock.ts` whether it falls inside the hours (a span past midnight is fine). A theme picked by hand while the clock decides is kept for that chapter only, in a small store the panel and the page share.
- The reading ruler (idea 8): `reading_settings.reading_ruler`. `components/ReadingRuler.tsx` (loaded only when it is on) measures the text's lines from the browser's boxes for the words (`lib/rulerLines.ts`), and draws a tinted band behind the line under the pointer; the Up and Down keys move it a line at a time. It is `aria-hidden`, so screen readers read the chapter as before.
- How a setting travels: the same as the other reading settings: `ReadingComfortFields` → `change()` → `save_reading_settings()` (now with four more arguments, each with a default, so older calls still work).
- Tests: `supabase/tests/database/215-reading-comfort.test.sql`, `lib/nightByClock.test.ts`, `lib/rulerLines.test.ts`, `e2e/reading-comfort.spec.ts`.

## The private reading streak (IDEAS-1 part b)

Idea IDEA-20261031-13, with Robert's comments of 31 Oct 2026.

- Where it lives: `src/features/reading-habit/` holds the calls (`api/readingHabit.ts`), the hooks and the rules; the Library shows it as "Your reading days" (`src/features/library/components/ReadingHabitNote.tsx` and `ReadingHabitSettings.tsx`).
- How a minute travels: the chapter reader calls `useReadingMinutes()`. Only while the streak is on, once a minute, if the tab is visible and the reader scrolled, pressed a key or touched in the last two minutes (`lib/activeReading.ts`), it calls `add_reading_minute()` → `reading_minutes` (one row per reader per day, on the reader's own clock; a second minute within 45 seconds is ignored, so two tabs can't count double).
- How the note reads it: `my_reading_habit()` returns the target, the reminder, the days read since Monday and today's minutes. `start_reading_habit()`, `save_reading_habit()` and `stop_reading_habit()` change it; stopping deletes the minutes too.
- The reminder: the pg_cron job `send-reading-reminders` (every five minutes, `send_reading_reminders()`) sends one in-app `reading_reminder` notification a day to a reader short of their target at their chosen time. Never the next day, never by email, and never between 22:00 and 07:00 for anyone under 18 (quiet hours, Q50); the save refuses such a time too.
- Privacy: both tables are readable by their owner only, are in Download my data and are deleted with the account; minutes are kept 14 days (`purge_old_reading_minutes()` in the nightly retention run).
- Tests: `supabase/tests/database/216-reading-streak.test.sql`, `src/features/reading-habit/lib/*.test.ts`, `e2e/reading-streak.spec.ts`.

## Readers to writers (IDEAS-1 part c)

Ideas IDEA-20261031-3, -10 and -11, with Robert's comments of 31 Oct 2026.

- "I finished it": on a story on the reader's Finished shelf, `StoryReadingActions` shows `FinishedThanksButton` (`src/features/library/components/`) → `useFinishedThanks()` → `send_finished_thanks()`, which checks the account gate, that the story is visible (so never across a block), not the reader's own and on their Finished shelf, records `finished_thanks` (once per reader per story) and calls `notify()` with the `story_finished` kind and the story's ID. No text from the reader, no email. `story_library_state()` says `thanks_sent`, so the button reads "Sent". The writer's row is worded by `finishedText()` in `src/features/notifications/lib/notificationText.ts` and opens the story.
- Sharing a whole story: `StoryHeader` builds a `SharedStory` (`src/features/sharing/lib/sharedStory.ts`; no user ID) and shows `StoryShareButton` on every public story. It opens the system share sheet on a phone (`lib/systemShare.ts`, shared with the chapter's button) or copies `storyShareLink()` and opens `StoryShareDialog`, whose chat preview copies what `server/link-preview.ts` sends for `/s/<story>`: the cover colour, title, pen name and blurb, or only the title and rating for 16+ and 18+. Nothing is counted. `ShareLinkRow` and `SharePrivacyNote` are shared with the chapter's dialog.
- A writer's card colour: "Colour for quote and picture cards" (`CardColourField` in `StoryStatusSection`) → `update_my_story()` with `card_colour` → `stories.card_colour` (one of the nine palette keys, or null). `share_options()` returns it as `card_colour`; `QuoteCardDialog` and `PictureCardDialog` start in it (`backgroundByKey()` in `lib/quoteCard.ts`) and the reader can still change it with `BackgroundPicker`, which the picture card now has too.
- Tests: `supabase/tests/database/217-readers-to-writers.test.sql`, `src/features/sharing/lib/sharedStory.test.ts`, `src/features/sharing/lib/shareLink.test.ts`, `e2e/readers-to-writers.spec.ts`.

## Lines and stops, for writers (IDEAS-1 part d)

Ideas IDEA-20261031-1 (most-loved lines) and -5 (where readers stop). Totals only, never who.

- Counting a passage share: `PassageLinkButton` and the picture card's Copy and Save pass the shared blocks (`SpotRange`) to `lib/countShare.ts`, which calls `record_passage_share()` instead of `record_chapter_share()`. It counts the chapter share as before (`add_chapter_share()`, same rate limit) and adds one to `paragraph_shares` for each paragraph in the range: a total per chapter, paragraph fingerprint (`paragraph_key_of()`, S1-E6-06) and day. Nothing says who shared. The writer's own shares don't count.
- The writer's panel: `YourWritingPage` → `ChapterInsights` (a drop-down of the writer's published chapters) → `useChapterInsights()` → `api/insights.ts` → `writer_chapter_insights()`, which answers only the chapter's own writer. It returns `loved_lines` from `writer_loved_lines()` (the five paragraphs with the most shares plus other people's visible paragraph comments, each with its first words from `paragraph_excerpt()`) and `stops` from `writer_reader_stops()` (readers' `reading_positions` on the chapter in tenths, or nothing below five readers). Every count goes through `shown_count()`, so 1 to 4 reads "fewer than 5". `LovedLines` and `ReaderStopsBar` draw them; the bar is decoration and each tenth is also written out.
- Tests: `supabase/tests/database/218-writer-insights.test.sql`, `e2e/writer-dashboard.spec.ts` ("Lines and stops").

## Paragraph links and "Most shared this week" (IDEAS-1 part e)

Ideas IDEA-20261031-2 and -9.

- A notification opens the paragraph: `notification_json()` adds `comment_place` for a comment, a reply or reactions (`comment_paragraph_json()`, S1-E6-06: the paragraph's number today, "earlier" or null). `notificationText()` adds `#paragraph-4` or `#paragraph-earlier` to the chapter's address (`src/lib/paragraph-link.ts`). In the reader, `useParagraphComments` starts with that thread open through `hooks/useLinkedParagraphThread.ts`, which, once the markers are drawn, scrolls the thread's marker to the middle of the screen and focuses it.
- "Most shared this week": the story list `shared` (`list_holds_story()`: shared at least once in the last 7 days) in its own order, the sort `shared` (`story_shares_this_week()`, totals from `chapter_shares`, never who), which `browse_stories()` accepts only on that list. Discover shows it after "New and rising" (`discover_shelves`), with a See all page at `/discover/all/shared`. The reader's age, blocks and moderation apply as on every list (`listed_stories()`).
- Tests: `supabase/tests/database/219-paragraph-links-and-most-shared.test.sql`, `src/lib/paragraph-link.test.ts`, `notificationText.test.ts`, `listAddresses.test.ts`, `e2e/paragraph-links-most-shared.spec.ts`.

## Library shelves in Download my data (IDEAS-1 part f)

Idea IDEA-20261031-12 (GDPR art. 15 and 20).

- `my_data_export()` adds `library` from `export_library_of()`: each shelf entry with its shelf, the story's title, the writer's name, its address (`/s/<story>`, or null when the reader can no longer open it) and when it was shelved. `tables.library_entries` still has the raw rows.
- In the browser, `makeDataExport()` runs `withLibraryLinks()` (`src/features/data-export/lib/libraryForExport.ts`), which turns each address into a full link with `brand.siteUrl`, and adds `library.csv` (`libraryCsvFile()`: a heading line in the reader's language, one line per story, UTF-8 with a byte-order mark) to the ZIP.
- Tests: `supabase/tests/database/220-library-in-my-data.test.sql`, `runDataExport.test.ts`, `e2e/download-my-data.spec.ts`.

## Sharing a chapter and the quote card (S1-E4-05, S1-E4-07; READ-4c)

- Where it lives: `src/features/sharing/` (see its README). The reader screen adds `ShareButtonWhenNear` to `ChapterEnd`'s row (it fetches `ShareButton` when the row nears the screen, `src/lib/use-is-near.ts`) and `QuoteShareWatcher` under the chapter (it fetches `QuoteShareBar` on the first selection); `reading/lib/toSharedChapter.ts` hands them only public things (address, titles, number, pen name).
- How a share travels: Share → on a touch screen with a share menu, `navigator.share()`; otherwise `copyText()` and the lazily loaded `ShareDialog` → `lib/countShare.ts` (fetched after the share) → `record_chapter_share()` → `chapter_shares` (a total per chapter per day, never who) → the hourly `compute_story_scores()` adds `story_share_points()` with the `ranking_weight_shares` setting. The link is `lib/shareLink.ts`: the chapter's address on the brand's website, with no query string.
- How a quote card travels: selecting text in `[data-protected-text]` → `useQuoteSelection` (once per frame) → the bar, if `quote_card_state()` allows it (fetched on the first selection by `QuoteShareWatcher`; signed in, readable, the writer's `stories.quote_cards_enabled` on) → `LoadedQuoteDialog` (fetched on the first press) → `QuoteCardDialog` draws the card on a canvas (`lib/quoteCard.ts`, never stored) → the first Copy image or Save image calls `make_quote_card()`, which records `quote_cards` (one per reader per chapter, Q17) and counts a share. "already_made" opens `QuoteLimitDialog`.
- The writer's switch: "Quote cards" in `StoryStatusSection` → `update_my_story()` with `quote_cards_enabled`.
- Both actions have hourly limits in the `rate_limits` setting (`chapter_share`, `quote_card`). Tests: `supabase/tests/database/181-share-and-quote-cards.test.sql`, `src/features/sharing/lib/*.test.ts`, `e2e/share.spec.ts`.

## Forum categories, forums and subforums (S1-E8-01; FORUMS-1a)

- Where it lives: `src/features/forums/` (see its README) and `supabase/migrations/…_forums1_a_forum_categories.sql`.
- One table, three levels: `forums` holds categories (no parent, level 0), forums (level 1) and subforums (level 2); the trigger `forums_set_level()` sets the level and refuses a fourth. `forum_names` holds each one's name and description per interface language, like tag names: forums are staff content, never locale-file text.
- How the index travels: `/forums` → `ForumsPage` → `useForumIndex()` → `forum_index(language_code)` (anyone, signed out included) → `lib/forumTree.ts` puts pinned categories first in staff order, then the rest by latest activity (Q45). `/forums/:forumSlug` (`ForumPage`) reuses the same read for its breadcrumb and the forums inside it. Part b fills in the counts and the latest post.
- How staff change them: `/staff/forums` (owner and admin, the `settings` area) → `useForumAdmin()` → `admin_list_forums()`, `admin_save_forum()`, `admin_delete_forum()`, each logged in `audit_log`. Refusals come back as field hints ("ro:empty", "parent:too_deep", "slug:taken").
- Threads never close on their own (S1-E8-01, criterion 3): no job touches forums; test 221 checks `cron.job`.
- Tests: `supabase/tests/database/221-forum-categories.test.sql`, `src/features/forums/lib/*.test.ts`, `e2e/forums.spec.ts`.

## Forum threads and posts (S1-E8-02; FORUMS-1b)

- Where it lives: `src/features/forums/` (`api/forumThreads.ts`, `api/forumWrites.ts`, the thread components) and `supabase/migrations/…_forums1_b_threads_and_posts.sql`.
- Three tables, read only through functions: `forum_threads` (a public `thread_number` for the address, `last_post_at` for the list's order, Q45), `forum_posts` (`post_number` #1, #2… fixed for good, so a permalink never moves) and `forum_post_revisions` (earlier versions of edited posts; only moderators read them).
- How a thread travels: `/forums/:forumSlug` → `ThreadList` → `useThreadList()` → `forum_thread_list()`; `/forums/:forumSlug/:threadNumber?post=7` → `ThreadPage` → `useForumThread()` → `forum_thread()` (reads at least as far as #7, then the page scrolls to and focuses `#post-7`). Both apply blocks and moderation and never answer a user ID.
- How a post is written: `NewThreadPage` (`start_forum_thread()`), `ReplyForm` (`reply_to_forum_thread()`), `PostEditForm` (`edit_forum_post()`), `PostActions` (`delete_forum_post()`). Each goes through `require_forum_writer()` (the account gate and the post limit) and `check_forum_post_text()` (no HTML, no script links: rule 8). Refusals come back as hints ("body:html", "wait_minutes:12") that `lib/forumFailures.ts` turns into words under the right field.
- Safe display: `ForumPostText` draws only bold, italic, links, quotes and lists (react-markdown with `skipHtml`); links get `rel="nofollow ugc noopener"`.
- Reporting: `forum_thread` and `forum_post` are reportable types with their branches in the four shared functions; `ReportButton` sits on the thread and on every post.
- Account deletion and retention: closing an account turns its posts into "Post deleted" markers; `delete_account_forum_posts()` and the nightly `purge-deleted-forum-posts` erase the words 30 days on, keeping only what a case holds.
- Tests: `supabase/tests/database/222-forum-threads-and-posts.test.sql`, `src/features/forums/**/*.test.ts(x)`, `e2e/forum-threads.spec.ts`.

## Forum quotes and the quick reply (S1-E8-03; FORUMS-1c)

- Where it lives: `src/features/forums/hooks/useQuotePicks.ts` (the posts picked to quote), `components/ForumQuoteBlock.tsx` (one quote), `PostActions` ("Quote" and the "Add to quotes" chip), `ReplyForm` (the quick reply box, with the picked quotes above it) and `supabase/migrations/…_forums1_c_quotes.sql`.
- How a quote travels: "Quote" on #2 → `useQuotePicks().quoteOnly()` (that post alone, then focus moves to the reply box `#forum-reply-box`) → `ReplyForm` draws the pick from the posts on the page → "Post reply" → `reply_to_forum_thread(thread_number, body, quoted_posts)` → `forum_quotes_for_reply()` checks each is a live post of this thread the replier can read and puts them in thread order → `forum_posts.quoted_post_ids`.
- How a quote is drawn: `forum_thread()` → `forum_post_json()` → `forum_quote_json()` for each quoted post, as it is now. A reply stores which posts it quotes, never a copy of their words, so a post that is deleted, removed by staff or hidden from the reader by a block shows a marker in every quote instead of its words.
- Tests: `supabase/tests/database/223-forum-quotes.test.sql`, `src/features/forums/api/forumWrites.test.ts`, `e2e/forum-quotes.spec.ts`.

## Read and unread in the forums (S1-E8-04; FORUMS-1d)

- Where it lives: `src/features/forums/api/forumReads.ts`, `hooks/useForumReads.ts`, `components/UnreadDot.tsx`, `MarkReadButton.tsx`, `NewForYou.tsx`, and `supabase/migrations/…_forums1_d_read_and_unread.sql`.
- The rule (the phpBB pattern): a post is new to a reader when someone else wrote it, they can read it, it came after `forum_read_since()` (the latest of their account's creation, their "Mark all as read" and the mark on its forum) and its number is after the last one they saw in that thread (`forum_thread_reads`). `forum_first_unread_post()` and `forum_unread_post_count()` apply it; `forum_has_unread()` asks it of every thread in a forum and the forums inside it.
- How a mark travels: the thread page → `useMarkThreadRead()` with the highest post number on screen → `mark_forum_thread_read()` (only moves forward). "Mark as read" / "Mark all as read" → `MarkReadButton` → `mark_forums_read(slug | null)` → one `forum_read_marks` row per forum inside, or one for the board. After a mark, the index, the lists and "New for you" read again.
- Where it shows: `forum_index()`'s `has_unread` (the dot on each forum), `forum_thread_summary_json()`'s `is_unread` and `first_unread_post` (the dot on each thread, and the list's link opens at the first new post), `forum_new_for_you()` (the side card). A visitor gets null: no dots.
- Privacy: both tables are readable only by their owner, in Download my data, and deleted with the account.
- Tests: `supabase/tests/database/224-forum-read-marks.test.sql`, `src/features/forums/api/forumReads.test.ts`, `e2e/forum-read-marks.spec.ts`.

## Sticky and locked threads, and "Don't bump" (S1-E8-05; FORUMS-1e)

- Where it lives: `src/features/forums/api/forumModeration.ts`, `hooks/useForumModeration.ts`, `components/ThreadModeration.tsx`, `LockedThreadNote.tsx`, the Pinned and Locked pills in `ThreadRow`, "Don't bump" in `ReplyForm`, and `supabase/migrations/…_forums1_e_sticky_and_locked.sql`.
- The columns: `forum_threads.is_sticky`, `locked_at`, `locked_by_user_id`, `lock_reason` and `bumped_at`. The forum's list is ordered by `bumped_at`, not `last_post_at`: a reply with "Don't bump" moves `last_post_at` (so "Latest post" and the unread checks stay true) but leaves `bumped_at`.
- How a moderator's change travels: the thread page's `ThreadModeration` (shown only when `forum_thread_header_json()` says `can_moderate`) → `useModerateThread()` → `admin_set_forum_thread_sticky()`, `admin_lock_forum_thread()` or `admin_unlock_forum_thread()` → `forum_thread_for_moderation()` checks `staff_may('moderation', 'act')` and the reason → the change and `log_staff_action()` in the same transaction.
- How a locked thread refuses: `reply_to_forum_thread()` raises hint `thread:locked`; the header's `can_reply` is false, so `ReplyForm` draws `LockedThreadNote` instead of the box. The note names "the moderation team", never the moderator.
- The list: `forum_thread_list()` puts every sticky thread first on the first page only, then pages the rest by `bumped_at`; "Show more threads" passes the last thread's `bumpedAt`.
- Tests: `supabase/tests/database/225-forum-sticky-and-locked.test.sql`, `src/features/forums/api/forumModeration.test.ts`, `e2e/forum-sticky-and-locked.spec.ts`.

## Forum search (S1-E8-10; FORUMS-1f)

- Where it lives: `src/features/forums/api/forumSearch.ts`, `hooks/useForumSearch.ts`, `lib/forumSearchAddress.ts`, `components/ForumSearchForm.tsx` (on the forum index and the results page), `ForumSearchPage.tsx` and `ForumSearchResultRow.tsx`, and `supabase/migrations/…_forums1_f_forum_search.sql`. Architecture 1.7.3 calls it `search_posts()`; it is `search_forum_posts()`.
- How a search travels: the field → `/forums/search?q=…&forum=…&author=…` (the router's static path wins over `/forums/:forumSlug`, and the `forums_slug_not_search` constraint keeps any forum from taking "search") → `useForumSearch()` → `search_forum_posts()` → each live post the reader may read (`forum_post_state_for_caller()`, `forum_thread_is_shown()`: deleted, hidden, removed and blocked people drop out) matched on `forum_post_search_text()` with the story search's `search_fold()`, `search_query()` and `search_like_pattern()` → thread titles first, then by closeness, 20 at a time.
- The forum filter takes a category, forum or subforum and searches everything inside it (`forum_and_children()`); the author filter takes a username with or without "@". Spaces come with S1-E8-06.
- Tests: `supabase/tests/database/226-forum-search.test.sql`, `src/features/forums/api/forumSearch.test.ts`, `lib/forumSearchAddress.test.ts`, `e2e/forum-search.spec.ts`.

## Sharing a passage or a picture (S1-E4-11; WRITE-5e)

- Blocks: a chapter's stored Markdown is cut into blocks at blank lines, counted from 1, by `src/lib/chapter-blocks.ts` and by the SQL `chapter_blocks()` the same way. `ChapterText` runs `reading/lib/numberBlocks.ts` as a rehype step, which marks each top-level part with `data-block` and `data-block-end` and highlights a shared passage.
- How a passage link travels: a selection in the chapter text → `QuoteShareBar` (as for quote cards) → `PassageLinkButton` reads the blocks from the selection's parts (`selectedBlocks()` in `lib/quoteSelection.ts`) → copies `/s/<story>/<chapter>/p<first>-<last>` (`passageShareLink()`, at most five blocks, no sharer ID) → counts a share.
- How a picture card travels: `ChapterText` draws the reader's `pictureShare` component (the lazily loaded `PictureShareButton`) under each visible picture → it asks `share_options()` (the writer's `picture_sharing_enabled` and the rating) → `PictureCardDialog` fetches the picture as a file (`usePictureBitmap`), draws the card (`lib/pictureCard.ts`, the quote card's footer) and copies or saves it.
- Opening a spot link: the router's `/s/:storySlug/:chapterCode/:spot` → `ChapterReaderPage` reads the spot with `parseSpot()` → `ChapterText` highlights it → `SharedPassageNotice` scrolls to it and moves focus there.
- The preview: `server/link-preview.ts` reads the spot from the address and asks `get_shared_passage()` (`server/shared-passage.ts`) for the passage, which takes the blurb's place in `og:description`. The database refuses 16+ and 18+, a wrong range, text while the passage switch is off and a picture unless its switch is on and its check passed.
- The writer's switches: "Quote cards and passage links" (`quote_cards_enabled`) and "Sharing pictures" (`picture_sharing_enabled`) in `StoryStatusSection` → `update_my_story()`.
- Tests: `supabase/tests/database/188-share-passages-and-pictures.test.sql`, `src/lib/chapter-blocks.test.ts`, `server/shared-passage.test.ts`, `e2e/share-passages.spec.ts`.

## Cookieless analytics and the event catalogue (S1-E15-01, S1-E15-03; READ-4f)

A screen that wants to count something calls `trackEvent('<object_action>', {…})` from `src/lib/analytics/track.ts`:

```
screen or hook → trackEvent(name, properties)   only names and properties in src/lib/analytics/catalogue.ts
   → off (no VITE_ANALYTICS_* variables), or the browser says Do Not Track: nothing leaves
   → otherwise one fetch without cookies to Plausible or Umami (Q49 OPEN), reported against the site root
```

No script, no cookie, no page views, no personal data (ADR 0007). `docs/analytics-events.md` lists every event with where it fires; `catalogue.test.ts` fails the build when the document and the code disagree. To add an event: a line in `catalogue.ts`, a row in the document, then the call.

Tests: `src/lib/analytics/track.test.ts`, `src/lib/analytics/catalogue.test.ts`.

## Epic S1-E11 at a glance (checked by S1-E11-QA)

What the Admin epic has in place so far. The epic report, `docs/epic-reports/S1-E11.md`, lists what works, the open Must stories, the known gaps and the stubs still on.

| Kind | Where | Story |
| --- | --- | --- |
| Screens | `/staff` (the shell and home), `/staff/audit-log`, `/staff/invites`, `/staff/roles` (`src/features/staff/`), `/staff/settings` (`src/features/settings/`), `/staff/website` and its tabs (`src/features/website/`, `src/features/interface-text/`, `src/features/seasonal/`) | 11-01, 11-17, 2-07a, 11-03, 11-05, 11-06, 11-10, 11-12, 11-18, 11-19, 11-11 |
| Hooks | `useMyStaffAccess`, `useAuditLog`, `useInviteLinks`, `useStaffRoles` | each story |
| Tables | `audit_log` (append-only), `invites`, `staff_roles`, `staff_permissions`, `staff_role_areas`, the settings `staff_session_hours` and `staff_fresh_sign_in_minutes` | 1-02, 2-01, 2-07a, 11-01, 11-17 |
| Functions | `is_staff_session()` (12 hours), `staff_signed_in_recently()`, `my_staff_areas()`, `log_sensitive_read()`, `admin_search_audit_log()`, `admin_export_audit_log()`, `admin_create_invite()`, `admin_revoke_invite()`, `admin_list_invites()`, `use_platform_invite()` | each story |
| Tests | `supabase/tests/database/040`, `041`, `095` and `260` (the epic, rounds one and two), `e2e/epic-s1-e11.spec.ts`, `e2e/epic-s1-e11-round-2.spec.ts` and each story's spec | each story, S1-E11-QA |

**One main journey through the whole epic:** the admin opens `/staff/invites` → `admin_create_invite()` returns the code once and logs `invite.created` → an adult opens `/join/<code>` → the sign-up trigger calls `use_platform_invite()`, which takes the last place and logs `invite.used_up` on behalf of the maker → the owner opens `/staff/audit-log` → `admin_search_audit_log()` finds both rows. `e2e/epic-s1-e11.spec.ts` walks it. Round two (ADMIN-2) walks a support ticket through the rest of the area: `admin_convert_ticket_to_report()` opens a case on a story → the moderator finds it in `/staff/moderation`, then the story in `/staff/stories` (`admin_search_stories()`) and restricts it (`admin_set_story_visibility()`, a statement of reasons to the writer) → `admin_open_ticket_data_request()` starts a data request on the same ticket. `e2e/epic-s1-e11-round-2.spec.ts` and `260` walk it.

<!-- Lane B: doodles through the tokens (23 Oct 2026). -->
## Doodles through the tokens (Lane B, 23 Oct 2026)

The hand-drawn doodles live in `design/assets/*.svg`, next to the 16 drawn cover backgrounds (viewBox `0 0 100 160`, which keep their colours in night mode, `src/lib/cover-colours.ts`). A doodle holds no fixed colour: every fill is written `style="fill:var(--doodle-ink, #2a0e33)"`, the token for a doodle drawn inline in a page, the light value as a fallback for a file opened on its own. The nine `--doodle-*` tokens are in `src/styles/tokens.css`, light and night.

```
canvas export (fixed hex)  →  npm run doodles:tokens  →  design/assets/<id>.svg (tokens + fallback)
                               scripts/doodle-tokens.ts
CI: npm run doodles:check  →  fails on any raw hex, a fallback that drifted or a token missing
/design#doodles            →  src/features/design-system/doodleFiles.ts (bundles the SVG text)
                               → DoodleSection → DoodleTile (inline, aria-hidden, captioned)
```

- When new doodles arrive from the canvas: drop the files in `design/assets/`, run `npm run doodles:tokens`. A colour with no token stops the script and names the file; add the token to both theme blocks in `tokens.css` and to the map in the script, then run it again.
- Tests: `scripts/doodle-tokens.test.ts` (the rewrite and the check), `src/features/design-system/components/DoodleSection.test.tsx` (three samples resolve in both themes), `e2e/doodles.spec.ts` (the colours the browser really draws).
- Night values are a proposal signed off on the /design sheet; change them in `tokens.css` only, never in the SVG files.

## Start here

Read in this order; each file's header comment says what it is for and where things go next.

1. `CLAUDE.md`: the rules, then `docs/architecture.md` sections 1.5 to 1.7 and `docs/definition-of-done.md`.
2. `index.html` → `src/main.tsx` → `src/app/AppProviders.tsx` → `src/app/router.tsx`: how the app starts.
3. `src/features/website/components/HelpPageView.tsx` and `hooks/useWebsiteContent.ts`: a small public page, from the URL to the database and back.
4. `src/config/brand.ts` and `src/lib/i18n.ts`: where the name and the words come from.
5. `src/locales/ro/common.json` and `src/locales/en/common.json`: the interface text.
6. `src/styles/tokens.css`, `src/components/ui/README.md` and `/design` in the running app (`npm run dev`, then open /design): how screens look and which components to reuse.
7. `supabase/README.md`, then `supabase/migrations/` in order, `supabase/seed.sql` and `supabase/tests/database/010-profiles.test.sql`: the database side and how a policy is tested.
8. `.github/workflows/ci.yml`: what has to pass before anything merges, and when the long jobs run (not on drafts, not for documentation-only changes).
9. `src/features/language/`: the first feature that saves to the database, from drop-down to SQL function (traced above).
10. `e2e/home.spec.ts`, `e2e/language.spec.ts` and `scripts/`: how the checks prove each rule.

## Comments on a paragraph (S1-E6-06; WRITE-5f)

- Start at `src/features/reading/components/ChapterReaderPage.tsx`: `useParagraphCommentCounts` asks `paragraph_comment_counts()` for the count beside each paragraph and puts it in `ParagraphCommentsContext`.
- `ChapterText` draws each top-level paragraph in a `.tmc-paragraph-row` with the addon the reader passes in, `ParagraphCommentMarker`. Its block number is the same one the share links use (`src/lib/chapter-blocks.ts` and `chapter_blocks()` in SQL).
- Pressing a marker fetches `src/features/comments/components/ParagraphThread.tsx` (through `LazyParagraphThread`), which reads `paragraph_comments()` and posts with `post_paragraph_comment()`. Replies, reactions, downvotes and the Report button are the ordinary comment pieces.
- How a comment stays on its paragraph: it stores the paragraph's number and a fingerprint of its words (`paragraph_key_of()`). `paragraph_now()` finds the paragraph with the same fingerprint nearest that number in the chapter as published now; none means "an earlier version" (`EarlierVersionComments`).
- The thread sits inside the protected text, so `data-paragraph-thread` tells the copy protection and the "Share quote" bar to leave it alone.

## Story Atlas: a story's plan (S1-E17-01 to S1-E17-06; ATLAS-a)

- One story, two sides: New story (`create_story()`) also makes the story's plan, through the trigger `stories_make_plan`. "Plan" on each card in Your writing and "Plan this story" in the chapter editor lead to `/plan/s/:storySlug`; `/plan` (`AtlasHomePage`) opens the story planned last on this device (`src/features/atlas/lib/lastPlannedStory.ts`).
- Start at `src/features/atlas/components/StoryAtlasPage.tsx`: `useStoryPlan` reads `story_plan()` and hands out the savers. `AtlasTopBar` holds the story switcher (the same list as Your writing, `useMyStories`), "Write" and "New story" (`/write/new?from=plan`, which `useNewStoryForm` sends back to the plan).
- `AtAGlance` lays out the cards. Every field is a `PlanTextField`, `PlanSelectField` or `WordTargetField`, each saving by itself through `useAutosaveField` (a short pause, or on leaving the field) with a `SaveNote` under it. The plan's own fields go to `update_story_plan()`; the title, genre and audience go to `update_my_story()`, so Story settings shows the same values.
- Delete is the writer section's own `DeleteStoryControl`; purging the story deletes its plan too.
- The text is in `src/locales/*/atlas.json`, registered when Story Atlas first renders (`registerAtlasTranslations.ts`).

## Story Atlas: characters (S1-E17-08 to S1-E17-13; ATLAS-b)

- `AtlasSectionNav` under the top bar switches between At a glance and Characters (`/plan/s/:storySlug/characters/:characterId?`).
- Start at `src/features/atlas/components/CharactersPage.tsx`: `useStoryCast` reads `story_cast()` and hands out every changer. `CastList` groups and filters the cast (`lib/castGroups.ts`); `CharacterSheet` (keyed by the character, so switching saves what was waiting) holds `CharacterIdentityFields`, `CharacterPictureSection`, four `SheetGroupSection`s, `CustomValuesSection` and `DeleteCharacterSection`, all saving through `update_story_character()`.
- A picture: `uploadAtlasPicture()` in `src/features/pictures/api/pictures.ts` prepares, uploads, registers and checks it; `set_character_picture()` puts it on the sheet. `CharacterAvatar` shows it once it passed, or the initials (`lib/characterInitials.ts`).
- On the at-a-glance page, `CastAtAGlance` shows the cast count and `CharacterFieldsSection` adds, removes and brings back the writer's own fields.

## Story Atlas: connections (S1-E17-14 to S1-E17-16; ATLAS-c)

- Start at `src/features/atlas/components/ConnectionsPage.tsx` (`/plan/s/:storySlug/connections`, the third item in `AtlasSectionNav`). It reads the same `story_cast()` as the Characters page, whose answer now carries `relationships`.
- One click: "Add relationship" in `AddRelationshipForm` → `useRelationshipChangers().relate` → `addRelationship()` in `api/characters.ts` → `add_character_relationship()` → a row in `story_character_relationships` (read back only by the writer, `story_character_relationships_select_own`) → the cast is refreshed and every view redraws.
- `RelationshipMap` places the nodes with `lib/relationshipMap.ts` and draws each line in its category's colour and dash (`lib/relationshipCategories.ts`, colours `--atlas-line-*` in `src/styles/tokens.css`); the nodes are real links to the sheets, and `RelationshipList` under "All relationships" is the same data for screen readers.
- `FamilyTreeView` builds the generations with `lib/familyTree.ts` and draws them with `lib/familyTreeLayout.ts`.
- On each sheet, `CharacterRelationshipsSection` lists the character's relationships both ways and adds new ones.

## Story Atlas: the bible (S1-E17-17 and S1-E17-18; ATLAS-d)

- On screen it is **Story world** (renamed by Robert on 2 Nov 2026, ADMIN-2a2); the code, tables and functions still say "bible". The old `/bible` addresses redirect through `OldBibleAddressRedirect`.
- Start at `src/features/atlas/components/BiblePage.tsx` (`/plan/s/:storySlug/world` and `…/world/:entryId`, the fourth item in `AtlasSectionNav`). `useStoryBible` reads `story_bible()`: the sections in order and every entry.
- Every new story plan gets the seven default sections from `make_bible_sections()` (called by `make_story_plan()`); a default section with an empty name shows its translated default name (`hooks/useBibleSectionName.ts`).
- One click: "New entry" in `BibleContents` → `useStoryBible().createEntry` → `create_bible_entry()` → a row in `story_bible_entries` → the page opens it with `?edit`, where `BibleEntryEditor`'s fields save by themselves through `update_bible_entry()`.
- Reading mode is `BibleEntryView` with `BibleMarkdown` (no raw HTML, safe links only, `rel="nofollow ugc noopener"`). `BibleSectionsManager` renames, moves (drag or Up and Down) and deletes sections; `delete_bible_section()` refuses one that still has entries.

## Story Atlas: chapter planning and the writing view (S1-E17-23 to S1-E17-26; ATLAS-e)

- The writing view is the chapter editor (`src/features/writing/components/ChapterEditorPage.tsx`) with four pieces from `src/features/atlas/components/`: `WritingChapterList` (left on a laptop, last on a phone), `ChapterPlanPanel` (under the aside), `ChapterWordsLine` (under the text) and `FocusModeToggle` (hides the list and the plan).
- Every chapter has a private `chapter_plans` row, made by the `chapters_make_chapter_plan` trigger. Readers never read it: it sits in its own table, read only by the writer (`chapter_plans_select_own`).
- One click: picking a point of view in `ChapterPlanBasics` → `useChapterPlan().saveFields` → `saveChapterPlanChange()` in `api/chapterPlans.ts` → `update_chapter_plan()` → the plan and the chapter list are read again, so a new word target shows in both.
- Scenes (`ChapterScenesSection`, `ChapterSceneRow`) go through `add_chapter_scene()`, `update_chapter_scene()`, `move_chapter_scene()` and `delete_chapter_scene()`. Characters present are `PresentCharacterChips` → `set_chapter_character_present()`.
- On each character sheet, `CharacterAppearancesSection` reads `character_appearances()`: the chapters the character is the point of view of or present in.

## Story Atlas: the storyline (S1-E17-19 to S1-E17-22; ATLAS-f)

- `/plan/s/:storySlug/storyline` is `StorylinePage`: a view toggle (`ChoiceChips`: Board, Timeline, POV lanes) remembered on the device by `lib/storylineView.ts`, then `ChapterBoard`, `TimelineView` or `PovLanesView`. One reading, `story_storyline()` through `useStoryline`, feeds all three.
- The board's columns and moves are plain functions in `lib/boardColumns.ts` (one column per act, then "No act"; `orderAfterMove()` works out the book's new order). One click: "Move Calmul earlier" on a `BoardCard` → `useBoardMoves().move` → `placeChapterOnBoard()` in `api/storyline.ts` → `place_chapter_on_board()`. When published chapters would change order the database answers `needs_confirmation` and nothing moves until the writer says "Move it" in `BoardMoveDialog`, as Manage chapters asks (S1-E3-04).
- Chapter numbers in the plan count only chapters of the type "chapter" (`chapterNumbers()`, used by the board, the timeline, the lanes and the writing view's list through `useChapterLabels`).
- Timeline events live in `story_events` (`add_story_event()`, `update_story_event()`, `delete_story_event()`); `lib/timeline.ts` sorts them with dated chapters and lists the undated ones apart.

## Story Atlas: questions and ideas, and marketing (S1-E17-27 to S1-E17-29; ATLAS-g)

- `/plan/s/:storySlug/ideas` is `IdeasPage`: `IdeaQuickAdd` (a type and one line; Enter sends the form and the box clears) and the list of `IdeaItem`s, filtered Open, Done or All by `lib/ideaFilters.ts`. One click: ticking Done → `useStoryIdeas().save(id, { is_done: true })` → `saveStoryIdeaChange()` in `api/ideas.ts` → `update_story_idea()`, which records the day it was done the first time and keeps it.
- `/plan/s/:storySlug/marketing` is `MarketingPage`: `MarketingFields` and `BackCoverPreview`. The logline, genre, audience and publishing route are the same fields as At a glance (`useStoryPlan`); the blurb, comparable titles, hooks, query pitch and launch notes save through `useStoryMarketing` → `update_story_marketing()`, whose row is made on the first save. `hooks/useStoryChoiceOptions.ts` gives both pages the same genre and audience lists.

## Story Atlas: search and [[Name]] cross-links (S1-E17-30, S1-E17-31 and S1-E17-12; ATLAS-h)

- The search box sits in `AtlasTopBar` on every Story Atlas page (`AtlasSearchBox`). One click: Enter → `/plan/s/:storySlug/search?q=…` (`AtlasSearchPage`) → `useStorySearch` → `searchStory()` in `api/search.ts` → `search_story()`, which reads every searchable item through `story_search_texts()` and answers each match with a snippet. `lib/searchGroups.ts` groups them by type, `HighlightedSnippet` marks the match (bold and underlined, matching as `atlas_fold()` does), and `lib/itemAddress.ts` says where each result opens.
- `[[Name]]` links: `lib/crossLinks.ts` finds and resolves them against `story_link_targets()` (through `useLinkTargets`, ignoring capitals). Reading views draw them with `CrossLink` (`CrossLinkText` for plain text, `BibleMarkdown` for entries); editing fields show `CrossLinkChips`. Components find the open story with `useOpenStorySlug`.
- "Mentioned in" on a character sheet is `CharacterMentionsList` → `character_mentions()`.

## Story Atlas for readers (S1-E17-32 to S1-E17-35; ATLAS-i)

- The writer's switches: `/plan/s/:storySlug/readers` (`ReaderViewPage`, the Readers tab) turns areas on with `PublicAreaSwitches`; each character, relationship, section, entry and event has `ItemVisibilityControls` ("Keep private" and, for characters, entries and events, "Readers see it from" a chapter), and a sheet has `SheetPartsControls`. One click: tick → `usePlanVisibility` → `api/readerView.ts` → `set_story_public_areas()` / `set_plan_item_privacy()` / `set_plan_item_show_from()` / `set_character_public_parts()` → the plan tables' new columns.
- What readers see: the story page shows `StoryWorldLinks` (reading feature) when an area is on; `/s/:storySlug/atlas/:areaPath(/:characterId)` is `PublicPlanPage` → `usePublicPlan` → `api/publicPlan.ts` → `get_public_story_plan()`, which applies the story's own read rules (a readable chapter, the rating, blocks, moderation), leaves out private items and holds back anything whose chapter the reader hasn't reached (`reading_positions`). `PublicPlanView` draws the area with `PublicCast`, `PublicCharacter`, `PublicConnections` (the writer's map and tree, with `addressOf`), `PublicWorld` and `PublicTimeline`.
- "Preview as a reader": `/plan/s/:storySlug/preview(/…)` (`PlanPreviewPage`) → `preview_story_plan()`, the same answer with each chapter guard shown by `PlanGuardPill`.
- `[[Name]]` links on reader pages resolve only to public items: `ReaderLinksContext` (`hooks/useCrossLinks.ts`) gives `CrossLink` the public targets from `lib/publicPlanAreas.ts`.
- Reporting: every public item is `atlas_item` in `reportable_type`, so `ReportButton` works on characters, relationships, custom sections, entries and events, and moderators hide or remove them one by one (`is_moderated_away('atlas_item', id)`).

## Spaces people create (S1-E8-06; FORUMS-2a)

- Where it lives: `src/features/spaces/` (`api/spaces.ts`, `hooks/useSpaces.ts`, `hooks/useSpaceNameCheck.ts`, `lib/spaceLook.ts`, `lib/spaceFailures.ts` and the pages in `components/`), and `supabase/migrations/…_forums2_a_spaces.sql`. Tables: `spaces` and `space_members`.
- The one idea to know: every space owns one hidden forum (`forums.space_id`, address `space-<space>`), so its threads and posts are ordinary forum threads and posts. Quoting, read marks, sticky and locked, search and reporting all work in a space with no new code. `forum_index()`, `admin_list_forums()` and the public forum policies leave space forums out; `ForumPage` moves `/forums/space-<name>` to `/spaces/<name>`.
- How a click travels: "Join space" (`SpaceJoinActions`) → `useMembership().join()` → `join_space()` → a `space_members` row, `active` for an open space and `pending` where the owner approves → the owner's `SpaceRequestsCard` → `decide_space_join_request()`.
- Who may read, join and post is decided in SQL, once: `space_may_read()`, `space_may_join()`, `space_may_post()` (from `age_band()`: under 16, or 16 and over). Posting is checked by the `refuse_space_writer` trigger on `forum_threads` and `forum_posts`, so no forum write function needed to change; its hints (`space:join`, `space:pending`, `space:age`) become plain words in `forumWriteErrorFrom()`.
- `space_json()` leaves the age group out for anyone outside it, so an adult never learns a space is for under-16s.
- Tests: `supabase/tests/database/227-spaces.test.sql`, `src/features/spaces/api/spaces.test.ts`, `e2e/spaces.spec.ts`.

## Space moderators (S1-E8-07; FORUMS-2b)

- Where it lives: `src/features/spaces/api/spaceModeration.ts`, `hooks/useSpaceModeration.ts`, `lib/spacePowers.ts`, `lib/spaceLogText.ts`, the Moderators card on the settings page (`SpaceModeratorsCard`, `SpaceModeratorRow`, `SpaceAddModerator`, `SpacePowerChoices`), `SpaceMembersPage` (`/spaces/<name>/members`) and `SpaceLogPage` (`/spaces/<name>/log`); `supabase/migrations/…_forums2_b_space_moderators.sql`. New table: `space_moderation_log`.
- The one idea to know: a moderator is a `space_members` row with role `moderator` and a list of `powers` (`posts`, `members`, `settings`; `mail` later). One SQL function answers "may the caller do this here?": `space_may_act(space, power)`. It is true for the owner, a moderator holding the power and our moderation staff (`staff_may('moderation', 'act')`), so staff override any space (criterion 3).
- How a click travels: "Make moderator" → `useSetSpaceModerator()` → `set_space_moderator()` (owner or staff only) → the row's role and powers → `log_space_action()` writes `space_moderation_log` (and `audit_log` when staff acted).
- Pin and lock reuse the forums' `admin_*` functions: `forum_thread_for_moderation()` lets in someone with the posts power in the thread's space, and `log_thread_moderation()` writes the space's log instead of the audit log for a space thread.
- The log is read by the owner and staff only (`space_log()` and the table's policy); staff show as "the moderation team", never by name.
- Tests: `supabase/tests/database/228-space-moderators.test.sql`, `src/features/spaces/api/spaceModeration.test.ts`, `e2e/space-moderators.spec.ts`.

## Space banners, join notifications and search by space (S1-E8-06, S1-E8-10; FORUMS-2c)

- Where it lives: `src/features/spaces/api/spaceBanner.ts`, `hooks/useSpaceBanner.ts`, `SpaceBannerBand` (the header's band) and `SpaceBannerPictureCard` (settings); `uploadSpaceBanner()` in `src/features/pictures/api/pictures.ts`; the two notification kinds in `src/features/notifications/lib/notificationText.ts`; `spaceFilterOptions()` in `src/features/forums/lib/forumSearchAddress.ts`; `supabase/migrations/…_forums2_c_space_banners_and_notifications.sql`.
- Banner pictures follow the Story Atlas pattern: a private `space-banners` bucket with one folder per space ID, `register_space_banner()` (pending its check), then `set_space_banner_picture()` (the settings power; logged in the space's log). `space_json()` sends `banner_picture` as `picture_state_json()`, and the band draws the picture only once it passed (rule 19); until then everyone sees the colour.
- How a click travels: "Choose a banner picture" → `useSpaceBannerChange().upload` → Storage upload → `register_space_banner()` → `/api/picture-check` → `set_space_banner_picture()` → the old file, if any, is deleted (`space_banners_delete_own` keeps one moderators still need).
- Join notifications need no change to the join functions: the `space_members_notify` trigger calls `notify()` when a `pending` row is added (to the owner and moderators with the members power, one row per space per day) and when it becomes `active` (to the person, with no actor). `notifications.space_id` carries the space, and `notification_json()` shows `{slug, name}` while the reader may see it.
- The forum search filter lists spaces as "Space: <name>" with their hidden forum's slug; `search_forum_posts()` already filters by it. `forums_refuse_space_forum_change` keeps staff's forum tools off a space's forum.
- Tests: `supabase/tests/database/229-space-banners-and-notifications.test.sql`, `src/features/notifications/lib/notificationText.test.ts`, `src/features/forums/lib/forumSearchAddress.test.ts`, `e2e/space-banners-and-notifications.spec.ts`.

## Private class spaces and invite codes (S1-E8-11; CLASSES-a)

- Where it lives: `src/features/spaces/api/classSpaces.ts`, `hooks/useClassSpaces.ts`, `ClassInviteCard` (with `ClassInviteFields` and `NewClassInviteCode`) on the settings page, `JoinClassPage` at `/class/<code>`; `supabase/migrations/…_classes_a_enums.sql` and `…_classes_a_class_spaces.sql`. No new table: `spaces.kind` (`open` or `class`) and `invites.space_id`.
- The one idea to know: a class space is an ordinary space with `kind = 'class'`, so threads, posts, moderators and the log all work as before. The same access functions decide everything: `space_may_read()` lets in only staff, the owner and fully active members; `space_card_visible()` hides the card from everyone outside; `space_may_join()` refuses "Join" (only a code gets you in). `spaces_class_is_private` keeps it members-only even against a direct update.
- Starting one: `create_class_space()`, for adults with the Teacher badge only (`profiles.teacher_badge_since`). Part b puts it on the new space form: a teacher with the badge sees "What kind of space?" and picks Class space (`NewSpacePage` → `useCreateClassSpace`).
- Invite codes live in the shared `invites` table (purpose `class_space`), stored as a hash only, so the teacher sees the code once. `make_class_invite()` ends the old code and makes a new one; `end_class_invite()` stops it; `class_invite()` says how many places are used, never the code. Each is in the space's log.
- How a click travels: the student opens `/class/<code>` → `class_invite_preview()` (anyone; only the class's name, and only for a working code) → "Join the class" → `join_class_space()` → a `space_members` row and one place used → the class, or "You're in" while the account still waits (a parent's consent, for example).
- Tests: `supabase/tests/database/232-class-spaces.test.sql`, `src/features/spaces/api/classSpaces.test.ts`, `e2e/class-spaces.spec.ts`.

### The end of the school year, the waiting list and typing a code (CLASSES-b)

- Where it lives: `src/features/spaces/api/classTools.ts`, `hooks/useClassTools.ts`, `ClassLockCard` and `ClassWaitingCard` on the settings page, `ClassAboutCard` beside a class's threads, `ClassCodeForm` on `/class`; `supabase/migrations/…_classes_b_class_tools.sql`.
- The lock: `spaces.locks_at`, set by `create_class_space()` to the next 1 July 00:00, Romanian time (`next_class_lock_at()`). Once that time passes, `space_is_locked()` is true and `space_may_post()` says no to everyone, so nobody starts a thread, replies or edits a post (`forum_posts_refuse_locked_edit`), the code stops working and nobody new joins. Members still read. Nothing runs on a timer: the time itself is the switch.
- `set_class_lock()` (the settings power) changes the date, locks now (a time in the past) or unlocks (no time); each is in the space's log. The date field sends "YYYY-MM-DD 00:00:00 Europe/Bucharest" and Postgres works out summer or winter time.
- `class_waiting_members()` (the members power) lists members who joined but can't read yet, with the reason from `account_state()` (age check, a parent's consent, account), never an age.
- Typing a code: "Join a class" on the Forums page's Spaces card and on the Spaces page opens `/class`, where `ClassCodeForm` sends the student on to `/class/<code>`.
- Tests: `supabase/tests/database/233-class-tools.test.sql`, `src/features/spaces/api/classTools.test.ts`, `e2e/class-tools.spec.ts`.

### Stories shared only with a class (CLASSES-c)

- Where it lives: `src/features/spaces/api/classStories.ts`, `hooks/useClassStories.ts`, `StoryClassCard` ("Who can read it" in Story settings), `ClassStoriesCard` above a class's threads and `ClassStoriesPage` at `/spaces/<slug>/stories`; `supabase/migrations/…_classes_c_class_stories.sql`.
- The data: `stories.class_only` and `stories.class_space_id`. If the class is deleted the link empties but `class_only` stays true, so the story never turns public by accident.
- One gate, `story_class_allows()`, sits inside the shared reading helpers (`chapter_is_readable()`, `story_has_readable_chapter()`, `reader_visible_story()`, the cover picture), so every page and chapter read obeys it: only the writer, the class's fully active members and the moderation team read a class-only story. Public lists and profiles leave it out entirely, even for classmates; a new chapter only tells followers who are in the class.
- `set_story_class()` takes only the writer's own story (`my_live_story_id()`), so a teacher can never make a student's story public. `my_class_choices()` offers only classes the writer is in and that aren't locked. `class_space_stories()` is the class page's list.
- No ad or banner shows on class stories or class spaces (Robert, 2 Nov 2026); banners are still stubbed, so bundle 14 builds that rule into `pick_banner()`.
- Tests: `supabase/tests/database/234-class-stories.test.sql`, `src/features/spaces/api/classStories.test.ts`, `e2e/class-stories.spec.ts`.

### The staff pilot set-up and archiving a class (CLASSES-d)

- Where it lives: `src/features/staff/api/staffClassSpaces.ts`, `hooks/useStaffClassSpaces.ts` and `components/schools/` (`ClassSpacesPage` at `/staff/schools/classes`, `NewClassSpaceForm`, `StaffClassCard`, `StaffClassActions`, `StaffClassSchoolForm`, `SchoolsTabs`); `ClassArchiveCard` in a class's settings; `supabase/migrations/…_classes_d_pilot_setup.sql`.
- `insert_class_space()` is the one place a class row is made, shared by the teacher's `create_class_space()` and the staff's `admin_create_class_space()` (Schools access, a named teacher with the badge, the school's name; audit log). The teacher owns it from the start, so every teacher tool works the same.
- `spaces.school_name` prints on class certificates (part e). `admin_set_class_school()` corrects it, logged.
- Staff make the class's code with the teacher's own `make_class_invite()` (platform moderators act in any space) and see it once in the same `NewClassInviteCode` panel, with Print.
- `archive_class_space()` (the settings power, or staff) sets `spaces.archived_at` and locks the class now. `set_class_lock()` then refuses (`space:archived`), so nobody unlocks it again; members still read it. Part e counts the 30 days before printed names go from `archived_at`.
- Tests: `supabase/tests/database/235-class-pilot-setup.test.sql`, `src/features/staff/api/staffClassSpaces.test.ts`, `e2e/class-pilot-setup.spec.ts`.

### Writing certificates (CLASSES-e; S1-E8-12)

- Where it lives: `src/features/certificates/` (`api/certificates.ts` and `api/classCertificates.ts`, `hooks/useCertificates.ts` and `hooks/useClassCertificates.ts`, `lib/certificateDate.ts` and `lib/pickedResults.ts`; the components `MyCertificatesPage` at `/certificates`, `CertificatePage` at `/certificates/:certificateId` with `PrintedNameForm` and `CertificateSheet`, `VerifyCertificatePage` at `/verify`, `ClassCertificatesPage` at `/spaces/:spaceSlug/certificates` with `ClassResultsForm`, and `ClassCertificatesCard` in a class's settings); `StaffCertificatesPage` and `StaffCertificateCard` in `src/features/staff/components/schools/` (Staff › Schools › Certificates); `supabase/migrations/…_classes_e_enums.sql` and `…_classes_e_certificates.sql`.
- How a click travels: the teacher picks a result per student and presses "Approve and sign" → `useIssueClassCertificates().issue` → `issue_class_certificates()` (the settings power, and only the class's own teacher signs; `signed_at` is the electronic signature, the proposal for OPEN Q71) → one `certificates` row per student with a fresh code from `new_certificate_code()`, a `certificate_issued` notification and a line in the class's log.
- The real name (CLAUDE.md rule 5's one exception): only `certificates.printed_name`, written by the student through `set_certificate_printed_name()`, read back only by `my_certificates()`; the teacher's list, staff and the check page never see it. `purge_class_certificate_names()` in `run_retention_jobs()` deletes it 30 days after `spaces.archived_at`, and the sheet then prints the pen name.
- Archiving: `archive_class_space()` now also sends the teacher a `class_archived` notification, which `email_delivery_for()` always emails (`server/notification-emails.ts`, `notificationEmails.classArchived`).
- The PDF: `CertificateSheet` is real text in the certificate's own language (`i18n.getFixedT`), with `lang` set; the print styles in `src/styles/index.css` print only the sheet as an A4 page, and the browser's "Save as PDF" keeps it as tagged text (proposal while the PDF tool is OPEN, Q49).
- The check: `verify_certificate(code)` for anyone answers valid, revoked, retired (deleted with its account: the code alone is kept in `retired_certificate_codes` by a trigger) or unknown, never a name. Staff revoke through `admin_revoke_certificate()` (Schools access, audit log).
- Tests: `supabase/tests/database/236-certificates.test.sql`, `src/features/certificates/api/certificates.test.ts`, `src/features/certificates/lib/certificateLib.test.ts`, `server/notification-emails.test.ts`, `e2e/certificates.spec.ts`.

## Forum signatures and moderators' change requests (S1-E8-08; FORUMS-2d)

- Where it lives: `src/features/forums/api/forumSignatures.ts`, `hooks/useForumSignatures.ts`, `lib/signatureLimits.ts`; the components `SignatureBody` (the shared drawing), `ProfileSignatureCard` (board 6.1), `SignatureSettingsSection` with `SignatureWordsForm` and `SignaturePictureControls` (Settings, `#forum-signature`), `ChangeRequestNotice` and `CustomisationChangeForm` (staff); `uploadSignaturePicture()` in `src/features/pictures/api/pictures.ts`; `src/lib/animated-picture.ts`; `supabase/migrations/…_forums2_d_signatures.sql`.
- The signature is two columns on `profiles` (words, at most 300 characters and three lines, and one picture). `forum_post_json()` adds `signature` to every post (`signature_json()`), and `ForumPostCard` draws it only from 768 px up (`hidden md:block`, Q25). It belongs to the profile, so reporting the profile covers it and a moderator hiding the profile hides it too.
- One still picture: `storePicture()` refuses a moving PNG or WebP (`isAnimatedPicture()`), and the redraw on a canvas keeps only a still frame anyway; `server/picture-check.ts` holds a moving file that reached Storage some other way (`withStillPictureRule()`). The picture shows only once its check passed (rule 19).
- How a click travels: "Save signature" → `useSignatureChange().save` → `set_my_signature()` (the account gate, the limits) → the old picture's file is deleted.
- Change requests (Q29): "Ask for a change" on the staff account page or on a space's banner card → `admin_request_customisation_change()` (moderation staff, audit log) → a required `customisation_change_requested` notification. Changing the signature or banner closes the request (`close_customisation_requests_on_change` triggers); otherwise the `remove-unchanged-customisations` cron job (every 10 minutes) clears it after 24 hours and sends a statement of reasons.
- Tests: `supabase/tests/database/230-forum-signatures.test.sql`, `src/lib/animated-picture.test.ts`, `src/features/forums/lib/signatureLimits.test.ts`, `server/picture-check.test.ts`, `src/features/notifications/lib/notificationText.test.ts`, `e2e/forum-signatures.spec.ts`.

## Writer ranks (S1-E8-09; FORUMS-2e)

- Where it lives: `supabase/migrations/…_forums2_e_ranks.sql` (the `writer_rank` enum, `rank_for()`, the `writer_ranks` table, `refresh_writer_rank()` and its triggers, `profile_rank()`); `src/features/forums/lib/writerRanks.ts` (the ladder and the progress bar), `api/writerRanks.ts`, `hooks/useWriterRank.ts`; the components `RankChip`, `ProfileRankChip`, `RankPanel` with `RankLadder` and `RankProgressBar`, and `RankSticker` (the doodle on the profile picture).
- The ladder (criterion 2): New writer at the first published chapter, Writer at 5, Storyteller at 15 chapters or 30,000 words, Novelist at 100,000 words. Only published, undeleted chapters of undeleted stories that no moderator hid or removed count; forum posts never do (criterion 1). Nobody can set a rank: there is no `admin_*` function for it.
- How it stays current: triggers on `chapters` (publish, unpublish, delete, words), `stories` (delete) and `moderated_items` (hide, remove, restore) call `refresh_writer_rank()`, which counts again and saves one row per writer. The row is private to its owner; everyone else reads the rank through `profile_rank(handle)` (rank, chapters, words; null for a blocked reader or a private profile) or a post's `author_rank`, never a user ID.
- Where it shows: the gold pill beside the name on the profile (`ProfileHeader`) and on every forum post (`ForumPostCard`, criterion 5), the rank card at the top of the profile's side column, and the rank's sticker on the profile picture (`ProfileAvatar`).
- Tests: `supabase/tests/database/231-writer-ranks.test.sql`, `src/features/forums/lib/writerRanks.test.ts`, `e2e/writer-ranks.spec.ts`.

### One journey through the whole epic (S1-E8-QA)

The epic lives in three feature folders: `src/features/forums/` (categories, threads, posts, quotes, read marks, sticky and locked, search, signatures and ranks), `src/features/spaces/` (spaces, their moderators, banners, classes and their codes) and `src/features/certificates/`. Every space and every class owns one hidden forum named `space-<slug>`, so a thread in a class goes through the same functions as one in the main forums. A student replies in their class and later gets a certificate:

```
Class page (SpacePage) → useSpace → space_page() → the class's hidden forum
Thread page → useForumThread → forum_thread() (blocks, moderation, age group, class membership)
Reply box (ReplyForm) → useReplyToThread → reply_to_forum_thread() → account gate (is_active_member()) → space_may_post()
  → forum_posts (numbered for good) → mark_forum_thread_read() → "New for you" for everyone else
Teacher › Certificates → issue_class_certificates() → certificates → notify('certificate_issued')
Notifications › Open my certificates → /certificates → my_certificates() → CertificateSheet → print
```

The account gate is the one place minors are held back: while `adults_only` is on (the March test) an under-18 reads every forum and their class but can't post, and kid_14_waiting waits for a parent. The epic check walks the twelve stories together in `e2e/epic-s1-e8.spec.ts` and `supabase/tests/database/237-epic-s1-e8.test.sql`; its report is `docs/epic-reports/S1-E8.md`.

## Every story in the admin site (S1-E11-07; ADMIN-2a)

- **Where it starts:** Staff › Stories, `/staff/stories` (`src/features/staff/components/stories/StaffStoriesPage.tsx`), and one story at `/staff/stories/:storyId` (`StaffStoryPage.tsx`).
- **How a search travels:** the search box and filters write the address (`?q=…&status=…`, `src/features/staff/lib/staffStoryFilters.ts`), `useStaffStories` reads it and calls `searchStaffStories()` in `api/staffStories.ts`, which calls `admin_search_stories()` (`supabase/migrations/20261211100001_admin2_a_every_story.sql`). That function checks `staff_may('stories', 'view')` first, then matches the title, the writer's current username (look-alikes folded), an earlier username from the audit log (`profile.handle_changed`) or the user ID, applies the filters and returns 50 rows a page built by `admin_story_row()`.
- **What staff never see here:** a year of birth (only "under 18", from `age_band_from_birth()`), an email or a chapter's words. A draft chapter shows no title. Changing a story is S1-E11-08 (ADMIN-2b), which adds its controls to the story page for those with `staff_may('story_changes')`.
- **Tests:** `supabase/tests/database/238-every-story-in-admin.test.sql`, `src/features/staff/lib/staffStoryFilters.test.ts`, `e2e/staff-stories.spec.ts`.

## Staff change a story (S1-E11-08, part 08a; ADMIN-2b1)

- Screen: `/staff/stories/:storyId` (`src/features/staff/components/stories/StaffStoryPage.tsx`). Owner, admin and moderator get "Who can find it", "Settings and details" and a Hide button on each chapter; support only looks.
- One click: `StaffStorySettingsForm` → `useChangeStaffStory` → `api/staffStoryChanges.ts` → `admin_change_story_settings()` (migration `…_admin2_b1_change_story.sql`) → `admin_story_change_target()` checks the role and the reason → the writer's own checks (`check_story_basics()`, `check_story_labels()`, `set_story_tags()`) → `admin_record_story_change()` writes `story_revisions` and the audit log, then a statement of reasons (hide, restrict, raised rating) or a `story_changed_by_staff` notification.
- Tables: `story_revisions` (every staff change, before and after) and `story_restrictions` (restricted stories: still open from a link, left out of `listed_stories()`), both `kind: staff`.
- The writer's side: `src/features/notifications/lib/staffChangeText.ts` says what changed and quotes why; never who on the staff.
- Tests: `supabase/tests/database/239-staff-change-a-story.test.sql`, `e2e/staff-story-changes.spec.ts`.

## A story's version history, Restore and removing a passage (S1-E11-08, part 08b; ADMIN-2b2)

- Screen: the same `/staff/stories/:storyId`. `StaffStoryHistory` lists every staff change newest first (who, when, before and after, the reason); `ChapterPassageForm` under each published chapter opens its words in a read-only field.
- Removing a passage: `PassageRemovalFields` → `lib/passageSelection.ts` (the selected words plus which copy of them) → `useChangeStaffStory` → `admin_remove_chapter_passage()` (migration `…_admin2_b2_history_and_passages.sql`) → `admin_passage_place()` finds that copy → `admin_swap_chapter_words()` puts the marker (setting `removed_passage_marker`, in the story's language) in the published words and the draft → `admin_record_story_change()` (a `passage` version with no words, the audit log, a statement of reasons) → the original goes into `removed_passages` (`kind: staff`).
- Restore: `VersionRestoreForm` → `admin_restore_story_revision()`, which reuses the b1 functions with the version's "before" values (settings, story or chapter visibility) or `admin_put_back_passage()`, then sets `story_revisions.restores_revision_id`.
- Reading a removed passage: `RemovedPassageReveal` → `admin_removed_passage()`, which logs the read; a safeguarding case's passage needs the safeguarding permission.
- Tests: `supabase/tests/database/240-story-history-and-passages.test.sql`, `src/features/staff/lib/storyVersionText.test.ts`, `e2e/staff-story-history.spec.ts`.

## Staff hide a story's title or cover (S1-E11-08; ADMIN-2b3)

- Screen: the same `/staff/stories/:storyId`. `StaffStoryCover` shows the real cover (drawn, automatic or the uploaded picture through `StoryCoverArt`); `StaffStoryPresentationForm` ("Title and cover") hides or shows either one with a reason.
- Hiding: `useChangeStaffStory` → `admin_set_story_presentation()` (migration `…_admin2_b3_hide_title_cover.sql`) sets `stories.title_hidden_at` or `cover_hidden_at` → `admin_record_story_change()` (a `presentation` version, the audit log, a statement of reasons `title_hidden` or `cover_hidden`; showing again sends a notification). The writer's own title and cover never change.
- What readers get: every public read of a story goes through `story_as_shown()`, which swaps a hidden title for the setting `hidden_title_marker` (in the story's language) and a hidden cover for the automatic one, unless the caller is the writer or staff with the Stories area. It is used by `listed_stories()`, `reader_visible_story()` (so `get_chapter()` too), `story_card_json()`, `get_story_page()`, `get_link_preview()`, `profile_story_cards()`, `export_library_of()`, `public_plan_json()` and `notification_json()`. `story_search_text()` leaves a hidden title out; `story_cover_picture()` and `picture_is_visible()` (Storage) hold back a hidden uploaded cover.
- Showing again on its own: the trigger `stories_clear_hidden_presentation` clears the hide when the writer changes the title or picks another cover. Restore on a `presentation` version calls `admin_set_story_presentation()` with the "before" state.
- New code that shows a story's title or cover to readers must read the row through `story_as_shown()` (or a function above that already does).
- Tests: `supabase/tests/database/241-hide-title-and-cover.test.sql`, `src/features/staff/lib/storyVersionText.test.ts`, `src/features/notifications/lib/notificationText.test.ts`, `e2e/staff-story-presentation.spec.ts`.

## Data requests: the log, the deadline and the identity check (S1-E11-09, part 09a; ADMIN-2c1)

- Screens: Staff › Data requests (`/staff/data-requests`, the list, nearest deadline first, with "Overdue", "Due in 2 days" or "On time" pills), `/staff/data-requests/new` (find the person by username, pen name, email or user ID through `admin_user_lookup()`, then the type, how it arrived, the date received and a note) and `/staff/data-requests/:requestId` (the facts, the identity check, more time and closing). The menu shows the area to owner, admin and support (`staff_role_areas`, `data_requests`). Code: `src/features/data-requests/`.
- One click: `StaffDataRequestPage` → `useStaffDataRequest` → `api/dataRequests.ts` → `admin_ask_data_request_confirmation()`, `admin_extend_data_request()` or `admin_close_data_request()` (migration `…_admin2_c1_data_requests.sql`). Each checks `staff_may('data_requests', 'act')`, changes the row in `data_requests` and writes the audit log. Staff read the table through the policy `data_requests_select_staff`; nothing writes it directly.
- The deadline: `due_on` is one month from `received_on` (a table check); an extension moves `extended_to` by one or two months from `due_on`, only while the first month lasts, and sends the person a `data_request_extended` notice with the reason. `data_request_urgency()` gives the pill: overdue, alert (2 days), reminder (7 days), on time (**proposal** for the reminder and alert of criterion 2).
- The identity check: a request made in the app needs none; one by email or post starts at "not asked". "Ask them to confirm" sends a `data_request_confirm` notice (always on, emailed to the account's own address) that opens Settings › Data requests (`MyDataRequestsSection`, through `my_data_requests()`), where the signed-in person answers with `answer_data_request()`. Signing in is the check; the answer is in the audit log. An under-16's request goes to the parent or guardian instead (part c3, below).
- Notices: `notifications.data_request_id`, `notify()`, `email_delivery_for()` (both kinds required), `notification_json()` (`data_request`: reference, deadline, reason); the in-app words are in `src/features/notifications/lib/dataRequestNoticeText.ts` and the email lines in `server/notification-emails.ts` (`dataRequestConfirm`, `dataRequestExtended` in `email.json`).
- Tests: `supabase/tests/database/242-data-requests.test.sql`, `src/features/data-requests/lib/dataRequestDates.test.ts`, `src/features/notifications/lib/notificationText.test.ts`, `server/notification-emails.test.ts`, `e2e/data-requests.spec.ts`.

## Data requests: building and sending the copy (S1-E11-09, part 09a; ADMIN-2c2; ADR 0012)

- Where: "The copy" panel on `/staff/data-requests/:requestId`, for a request for a copy or to move the data (`DataRequestCopyPanel`). It says why the copy can't be sent yet (`lib/dataRequestCopyRules.ts`: identity not checked, "not me", an under-16's request from outside their account, which is the parent's path in part c3), or offers "One ZIP of everything" or "Each file on its own".
- One click: `DataRequestCopyForm` → `useDataRequestCopy` → `lib/runDataRequestCopy.ts` (loaded only then) → `admin_data_request_export()` (the person's data, exactly as `my_data_export()` gives it, logged) → the Download my data builders (`buildWordFiles()`, `buildPlanFiles()`, `libraryCsvFile()`, `buildExportZip()`, words in the person's language through `useWordLabels(language)`) → `admin_open_data_request_copy()` (one `exports` row per file, kind `data_request`, owned by the person, random names) → upload to the `exports` bucket (policy `exports_insert_staff`) → `admin_finish_data_request_copy()` (ready for seven days, sizes from storage, `data_requests.copies_sent`, audit log, `data_request_copy_ready` notice, always emailed). Migration `…_admin2_c2_data_request_copy.sql`.
- The person: Settings › Data requests lists the files (`my_data_requests()` → `files`) with a Download button each (`MyDataRequestFiles` → `ExportDownloadButton`), through the existing owner-only policy `exports_select_own`. The person can't upload into or finish a staff copy (`export_upload_allowed()`, `finish_data_export()`).
- Staff opening a file: `DataRequestFiles` → `admin_open_data_request_file()` writes the audit row first; the policy `exports_select_staff_opened` then lets that staff member read that file for five minutes.
- The nightly clean-up (`purge_expired_exports()`, `run-storage-sweep`, S1-E13-04) removes the files after seven days; the request keeps only their names and sizes.
- Tests: `supabase/tests/database/243-data-request-copy.test.sql`, `src/features/data-requests/lib/runDataRequestCopy.test.ts`, `dataRequestCopyRules.test.ts`, `e2e/data-requests.spec.ts`.

## Data requests: the parent's or guardian's path for under-16s (S1-E11-09 criterion 5; ADMIN-2c3)

- When: a request about someone under 16 that didn't come from their own account (by email or post). It goes through the parent or guardian who agreed to the account (`parental_consents`, S1-E2-03), never an address taken from the request.
- Asking: "Ask the parent or guardian" (`DataRequestIdentityPanel`) → `useStaffDataRequest` → `api/dataRequestParent.ts` `postParentLink('ask')` → `POST /api/data-request-parent/ask` (`server/data-request-parent.ts`; on Cloudflare `functions/api/data-request-parent/[[path]].ts`) → a random token, signed `data-request-ask|<request id>|<hash>` with `PARENTAL_CONSENT_SECRET` → `admin_ask_data_request_parent()` (staff check, agreed consent, keeps only the hash, `goes_to_parent`) → the email (`dataRequestParent` texts in `email.json`) with `/data-request/parent#<token>`.
- The parent: `DataRequestParentPage` (signed out) → `useParentLink` → `data_request_parent_link()` and `answer_data_request_parent()`. The person can't answer for them (`answer_data_request()` refuses) and isn't asked in Settings.
- The copy: built as in c2; `admin_finish_data_request_copy()` sends the person no notice on this path and `my_data_requests()` hides the files. `useDataRequestCopy` then calls `POST /api/data-request-parent/send` → `admin_send_data_request_parent_copy()` (a second signed token) → the one-time link email. "Send the link again" (`DataRequestParentLink`) makes a new one.
- Opening: "Open the files" → `open_data_request_parent_copy()`; the first opening starts one hour (proposal), during which policy `exports_select_parent_link` lets the files download signed out (`ParentCopyPanel` → `ExportDownloadButton`).
- Migration `…_admin2_c3_data_request_parent.sql`. Tests: `supabase/tests/database/244-data-request-parent.test.sql`, `server/data-request-parent.test.ts`, `src/features/data-requests/api/dataRequestParent.test.ts`, `e2e/data-requests.spec.ts`.

## Ad slots on public pages (S1-E12-01; SPONSORS-a1)

- Where: the chapter's end, the story page (under the chapter list), Discover (after the first shelf) and Library (after the shelves) in part a1; Search (wide after the results, portrait beside them from 1200 px), Forums and a thread (wide, plus a side box on desktop; in a thread below the reply box), a public space, a writer profile, the teaser (after the sign-up prompt) and the list pages (`StoryListPage`: a wide banner on the classics, a card after the stories on every See all list) in part a2. Each page puts one `<PageAdSlot>` per slot with its page key, the slot's position (1 or 2, never more: decided 17 Oct 2026, 11:53) and what the page is about (category, tag, language; the story or space only to keep class pages free of ads, Q70).
- One read: `PageAdSlot` → `usePageAds` → `api/ads.ts` `fetchPageAds()` → `page_ads(page_key, context)` (security definer; reads `ad_slots`, `ads_are_barred()`, `house_ad_candidates()`). Nothing about the reader is sent or read, so a signed-out visitor and a signed-in reader see the same ads.
- Until sponsors (part b) and the network (part d) exist, every slot holds a house ad: a live landing page of ours first, then "Start writing", "Read the classics" or "Open the forums" (never the one for the page itself), in an order that changes daily and per page. `AdBox` draws the label ("From us"), the creative (`HouseAdCreative`) and "Why this ad?" (`lib/whyThisAd.ts`).
- Migration `…_sponsors_a1_ad_slots.sql`. Tests: `supabase/tests/database/270-ad-slots.test.sql`, `src/features/ads/lib/whyThisAd.test.ts`, `src/features/ads/api/ads.test.ts`, `e2e/ads.spec.ts`.

## Sponsor campaigns (S1-E12-02; SPONSORS-b1)

- Tables: `sponsors` (a name and a website), `sponsor_campaigns` (sponsor, placement, page targeting by category, tag and language, the creative, link, optional discount code, dates and the review) and `ad_blocked_categories` (what no ad may promote; the fixed rows can never be removed). Owner and admin read them; everyone reads the blocked list.
- Staff writes go through `admin_save_sponsor()`, `admin_save_sponsor_campaign()` (always back to draft), `admin_submit_sponsor_campaign()`, `admin_review_sponsor_campaign()` (approve needs every check in `sponsor_review_checks()` and an approved picture, see `require_sponsor_approval_ready()`), `admin_end_sponsor_campaign()`, `admin_add_ad_blocked_category()` and `admin_remove_ad_blocked_category()`, each checking `staff_may('sponsors', 'act')` and writing the audit log. `admin_sponsor_campaigns()` lists them with `sponsor_campaign_problems()`.
- The creative is uploaded to the private `sponsor-creatives` bucket under the campaign's ID and recorded by `register_sponsor_creative()`; `picture_needs_person()` sends every one to a moderator.
- On the pages: `page_ads()` fills each slot with `sponsor_ad_for_slot()` (a live campaign whose placement covers the slot, see `sponsor_placement_slots()`, and which matches the page's context) before `house_ad_for_slot()`. `sponsor_credit('category' | 'contest', key)` gives the "Sponsored by" line; nothing that lists or ranks stories reads it.
- Migrations `…_sponsors_b1_enums.sql` and `…_sponsors_b1_campaigns.sql`. Tests: `supabase/tests/database/271-sponsor-campaigns.test.sql`, `src/schemas/ads.test.ts`. The staff screens come in part b2 and the sponsored ad's look in part b3.

## Staff › Sponsors (S1-E12-02; SPONSORS-b2)

- Routes `/staff/sponsors` (`StaffSponsorsPage`) and `/staff/sponsors/campaigns/:campaignId` (`CampaignEditorPage`, `new` for a new campaign), in the staff menu after Contests for staff with the sponsors area.
- One click: "Approve" on a review card → `ReviewQueue` → `useSponsorChanges()` → `api/sponsors.ts` `reviewCampaign()` → `admin_review_sponsor_campaign()` (checks the role, every review check and the picture, writes the audit log) → `sponsor_campaigns`; the lists are read again and the card leaves the queue.
- The creative: `CampaignCreativeUpload` → `uploadSponsorCreative()` (`src/features/pictures/api/pictures.ts`) → the `sponsor-creatives` bucket → `register_sponsor_creative()` → the picture check, so a moderator sees it before approval is possible.
- Folder guide: `src/features/sponsors/README.md`. Test: `e2e/sponsors-admin.spec.ts`.

## A sponsor's ad on the pages (S1-E12-02; SPONSORS-b3)

- A slot whose ad has `kind: 'sponsor'` is drawn by `SponsorAdCreative` inside `AdBox` (which still draws the "Sponsored" pill): the picture through `useSponsorPicture()` (a signed address that Storage gives only for a checked picture), the line in the reader's language, "Visit the site" with `rel="sponsored nofollow noopener noreferrer"` and, when there is one, the discount code with a Copy button (`DiscountCode`). "Why this ad?" names the sponsor (`lib/whyThisAd.ts`).
- "Sponsored by": `SponsoredByLine` → `useSponsorCredit()` → `fetchSponsorCredit()` → `sponsor_credit('category' | 'contest_page', slug)`. Category lists show it under the heading (`StoryListHeader`); a contest's page shows it above the page (`LandingPageScreen`). Migration `…_sponsors_b3_credit_by_page.sql` added the `contest_page` kind, keyed by the page's address.
- Tests: `supabase/tests/database/272-sponsor-credit-by-page.test.sql`, `src/features/ads/lib/whyThisAd.test.ts`, `e2e/sponsored-ads.spec.ts`.

## Sponsor reports (S1-E12-03; SPONSORS-c)

- Counting: `SponsorAdCreative` and `SponsoredByLine` call `useSponsorImpression()` when they appear and `countSponsorEvent(key, 'click')` when their link is followed (`src/features/ads/hooks/useSponsorCounting.ts`) → `recordSponsorEvent()` → `record_sponsor_event(ad_key, event_kind)` → one row per campaign and day in `campaign_daily_stats` (two totals, no user column, no cookie). Only a live campaign counts.
- Reading: the campaign editor's Report section (`CampaignReport`) → `useCampaignReport()` → `fetchCampaignReport()` → `admin_sponsor_campaign_report()` (owner and admin), every day of the run so far with zeros for quiet days; "Download CSV" builds `day,impressions,clicks` in `lib/campaignReportCsv.ts` and hands it to `downloadCsv()`.
- Migration `…_sponsors_c_reports.sql`. Tests: `supabase/tests/database/273-sponsor-reports.test.sql`, `src/features/sponsors/lib/campaignReportCsv.test.ts`, `e2e/sponsored-ads.spec.ts`.

## The ad network (S1-E12-04; SPONSORS-d; ADR 0014)

- Server: `page_ads()` fills each slot with a sponsor, then `landing_house_ad_for_slot()`, then `network_ad_for_slot()` (only a wide slot, once per page, only while the `ad_network` flag is on and the publisher ID and ad unit settings are set), then `house_ad_for_slot()`.
- Browser: `AdBox` → `NetworkAdCreative`, which waits until the slot is in view, then `lib/adNetwork.ts` adds the AdSense script once and asks for one non-personalised ad. If the script fails, our "Start writing" ad shows instead.
- Migration `…_sponsors_d_ad_network.sql`. Tests: `supabase/tests/database/274-ad-network.test.sql`, `src/features/ads/lib/whyThisAd.test.ts`, `e2e/ad-network.spec.ts`.

## Booking sponsors into slots and our own house ads (S1-E12-05; SPONSORS-e1)

- Tables: `ad_bookings` (an approved campaign in one slot for some days, with the categories, tags and languages it matches) and `house_ads` (our own ads in Română and English, leading to a path on our own site). Only owner and admin read them.
- Staff functions, each logged in the audit log: `admin_book_ad_slot()`, `admin_change_ad_booking()` and `admin_cancel_ad_booking()` (a clash with another booking of the same slot is refused, naming the campaign; `require_free_ad_slot()` locks the slot so two admins can't both pass), `admin_save_house_ad()`, `admin_archive_house_ad()`, `admin_house_ads()` and `admin_ad_placements()` (each slot against the next six weeks: booked, house, network or free).
- One click on a public page: `usePageAds()` → `page_ads()` → `fill_ad_slot()` for each slot: `booked_sponsor_ad_for_slot()` (a booked slot never goes to another sponsor that day, `ad_slot_is_booked()`), else a campaign by its placement, then `staff_house_ad_for_slot()`, `landing_house_ad_for_slot()`, `network_ad_for_slot()` and `house_ad_for_slot()`. In the browser, `HouseAdCreative` draws a staff house ad (kind `staff`) with its own words and link.
- Migration `…_sponsors_e1_bookings.sql`. Tests: `supabase/tests/database/275-ad-bookings.test.sql`, `src/features/ads/components/HouseAdCreative.test.tsx`.

## Staff › Sponsors › Placements (S1-E12-05; SPONSORS-e2)

- On `/staff/sponsors`, after the review queue: `PlacementsSection` shows the fill order, `PlacementGrid` (every slot against the next six weeks from `admin_ad_placements()`, with "Preview with the ad network on"), `BookSlotForm`, `BookingList` and `HouseAdsSection`.
- One click: "Check and book" → `BookSlotForm` → `usePlacementChanges()` → `api/placements.ts` `bookSlot()` → `admin_book_ad_slot()` (locks the slot, refuses a clash with the booking already there in the error's detail, writes the audit log) → `ad_bookings`; everything under Sponsors is read again, so the grid shows Booked.
- Folder guide: `src/features/sponsors/README.md`. Tests: `src/features/sponsors/lib/placementWords.test.ts`, `e2e/sponsor-placements.spec.ts`.

## Why a story is 16+ or 18+, and the network ads it keeps off (S1-E3-06, S1-E12-04; SPONSORS-f)

- Column `stories.rating_reasons` (enum `story_rating_reason`: sexual content, nudity, graphic violence, strong language, drugs, self-harm, dark themes). The trigger `story_rating_reasons_fit_rating()` empties it below 16+.
- The writer ticks the reasons in `RatingReasons` (under the rating chips in `StoryLabelsSection`); `labelRules` in `src/schemas/story.ts` asks for at least one for 16+ and 18+, and picking 18+ with none ticked starts on "Sexual content". Saved through `create_story()` and `update_my_story()`, checked by `check_story_labels()`.
- Staff change them in `StaffRatingReasons` (Staff › Stories › a story › Settings) through `admin_change_story_settings()`, versioned and logged like any setting.
- One click on a story page: `page_ads()` → `fill_ad_slot()` asks `network_ads_barred()`; a story with sexual content, nudity or graphic violence ticked skips the network step, so our own ads fill the slot. Sponsors are not affected.
- Migration `…_sponsors_f_rating_reasons.sql`. Tests: `supabase/tests/database/276-rating-reasons.test.sql`, `src/schemas/story.test.ts`, `src/features/staff/lib/staffStorySettingsDiff.test.ts`.

## Epic check: banners and sponsor slots (S1-E12-QA)

- The epic in one journey: staff approve a campaign (`StaffSponsorsPage`, `admin_review_sponsor_campaign()`) → book it into a slot (`PlacementsSection` → `admin_book_ad_slot()` → `ad_bookings`) → a reader opens the page (`PageAdSlot` → `usePageAds()` → `page_ads()` → `fill_ad_slot()`: booked sponsor, campaign by placement, staff house ad, landing page, the network unless `network_ads_barred()` or `ads_are_barred()`, built-in house ad) → `AdBox` shows it and `record_sponsor_event()` counts the view and click in `campaign_daily_stats` → the admin reads `admin_sponsor_campaign_report()` on the campaign's page.
- Tests walking the epic: `supabase/tests/database/277-epic-s1-e12.test.sql` and `e2e/epic-s1-e12.spec.ts`; each story's own tests are listed in its section above.

## Who can read a story: Public, Unlisted or Private (NEW-1)

- Column `stories.visibility` (enum `story_visibility`), public for a new story. The writer changes it in Story settings › Who can read it (`StoryVisibilitySection`), saved by `set_my_story_visibility()` after `update_my_story()`.
- Two gates in the database: `story_visibility_allows()` (a private story opens only for its writer) sits in `chapter_is_readable()`, `story_has_readable_chapter()` and `reader_visible_story()`, so every reading path, comment, like, follow and share obeys it; `story_listing_allows()` sits in `listed_stories()`, so an unlisted story is in no list, search or tag page, only in libraries (on someone else's, only for viewers who saved or follow it). `profile_story_cards()` leaves both out of the writer's public profile, and `notify_chapter_published()` tells only the story's own followers about an unlisted story, and nobody about a private one.
- Migration `…_new1_who_can_read.sql`. Tests: `supabase/tests/database/278-who-can-read.test.sql`, `e2e/story-visibility.spec.ts`.

## Downloads and privacy: the guide, saving stories before deleting, how long we keep things (IDEAS-2a)

- "READ ME FIRST" guide: `makeDataExport()` (and a staff copy's ZIP, `runDataRequestCopy.ts`) calls `exportGuideFile()` in `src/features/data-export/lib/exportGuide.ts`, which writes a plain-text page in the person's language from the `guide.*` keys in `dataExport.json`; `buildExportZip()` puts it first. `exportGuide.test.ts` reads the newest `data_export_tables()` and `export_tables_of()` from the migrations and fails when an exported table has no line in both languages.
- "Download your stories first": `DownloadStoriesFirst` (data-export) inside `DeleteAccountConfirm` makes every story's files with Download my stories' defaults, without leaving the delete step; it shows only to someone with stories.
- "How long we keep things": `HowLongWeKeep` at the foot of Settings › Privacy → `useRetentionPeriods()` → `retention_periods()`, which reads the same settings the clean-up jobs use, so a staff change shows at once.
- Migration `…_ideas2_a_how_long_we_keep.sql`. Tests: `supabase/tests/database/279-retention-periods.test.sql`, `src/features/data-export/lib/exportGuide.test.ts`, `e2e/downloads-and-privacy.spec.ts`.

## A sample EPUB for beta readers and "About the writer" (IDEAS-2b)

- In Download my stories, one story with "Only the chapters I choose" and at least one chapter ticked shows a second `EpubSection` in sample mode (`sampleChapterIds`). `EpubDialog` passes the chapters on in `EpubForm.chapterIds`, with `withAboutWriter` from its "Add an About the writer page" checkbox.
- `makeEpub()` (`runEpub.ts`) accepts any of the writer's stories for a sample, keeps each chapter's number in the story, names the file `<slug>-sample.epub` and fills `sample` and `aboutWriter` on the book. `buildEpub()` (`src/lib/epub`) prints the sample's label and chapter list on the title and copyright pages, and adds `about.xhtml` after the chapters.
- Tests: `src/lib/epub/buildEpub.test.ts`, `src/features/data-export/lib/runEpub.test.ts`, `e2e/sample-epub.spec.ts`.

## An email when a private message arrives, with quiet hours (IDEAS-2c1)

- Settings › Messages ends with "Emails about messages" (`MessageEmailSettings`), read through `my_message_settings()` (its `email` part, parsed in `api/messageEmails.ts`) and saved with `set_message_emails()` via `useSaveMessageEmails()`. The choices are four columns on `profiles`; empty means the default for the age group (`message_email_choices()`). Under-18s keep quiet hours that cover 22:00 to 07:00 (Q50).
- A new message → trigger `queue_message_email()` → one `email_outbox` row per chat (delivery `message`, `conversation_id`, `send_after` from `message_email_send_time()`: 5 minutes on, or the end of quiet hours, Romanian time). `email_worker_claim()` waits for `send_after`, then asks `message_email_items()`, which drops the email when the chat was read, declined or blocked. `server/notification-emails.ts` writes it: who wrote and a link to `/messages/<username>`, never the words.
- Migration `…_ideas2_c1_message_emails.sql`. Tests: `supabase/tests/database/280-message-emails.test.sql`, `server/notification-emails.test.ts`, `e2e/message-emails.spec.ts`.

## A kind "No thanks" and what a teen's parent agreed to (IDEAS-2c2)

- "No thanks" under a message request (`RequestActions`) → `answerRequest(…, 'no_thanks')` → `say_no_thanks_to_request()`, which closes the request and sets `conversations.said_no_thanks_at`. `conversation_with()` and `my_conversations()` tell the sender (`said_no_thanks`, `ask_again_from`); `ChatPanel`'s `NoThanksNote` draws the fixed reply from `messages.json`, so nothing new is written in anyone's name. `conversation_can_send()` lets the sender write again after 30 days, and `send_message()` turns that into a new request.
- `ParentConsentSummary` (parent-consent) in Settings shows "Your parent or guardian agreed on <date>" and what it covers, or after a withdrawal what still works; `ParentConsentNotice` says plainly on every page when consent was withdrawn. Both read `my_parental_consent()` through `useMyParentConsent()`.
- Migration `…_ideas2_c2_no_thanks.sql`. Tests: `supabase/tests/database/281-no-thanks.test.sql`, `e2e/no-thanks-and-consent.spec.ts`.

## The furthest place and a Canva cover that arrives by itself (IDEAS-2d)

- `reading_positions.furthest_percent` keeps the furthest place a reader ever reached in a chapter; trigger `keep_furthest_reading_place()` moves it on whenever `save_reading_position()` saves a place, and never back. `percent` stays the latest place, for "Continue reading". The writer dashboard's `writer_chapter_numbers()` counts a reader as finished by the furthest place, and "Where readers stop" (`writer_reader_stops()`) uses it too.
- Story settings: `useMyStories()` reads the stories again when the tab gets focus; `useArrivingCover()` (called by `useStorySettingsForm()`) sees a cover saved from another tab (Canva's return page), puts it in the form and refreshes its picture; `ArrivedCoverNote` shows it with its check state.
- Migration `…_ideas2_d_furthest_place.sql`. Tests: `supabase/tests/database/282-furthest-place.test.sql`, `src/features/writing/hooks/useArrivingCover.test.tsx`, `e2e/canva-covers.spec.ts`.


## Picture links show the picture in chat previews (IDEAS-2f)

- A link to one picture in a chapter (`/s/<story>/<chapter>/p3`) → `server/link-preview.ts` asks `get_shared_picture()`; when the picture may be shared (under 16+, the writer's "Sharing pictures" switch on, its check passed), og:image is `/api/picture-preview/<story>/<chapter>/<block>` with `summary_large_image`, otherwise the cover colour's square as before.
- `/api/picture-preview/…` (`functions/api/picture-preview/[[path]].ts` → `server/picture-preview.ts`) asks `get_shared_picture()` again on every fetch and reads the file from `chapter-images` as a visitor, through the existing `chapter_images_select_visible` policy; it answers 404 for anything else and lets chat apps keep the picture for an hour at most.
- Migration `…_ideas2_f_picture_previews.sql`. Tests: `supabase/tests/database/283-picture-previews.test.sql`, `server/picture-preview.test.ts`, `server/link-preview.test.ts`, `e2e/share-passages.spec.ts`.

## A notice when a writer's rank goes up, and the rank on story cards (IDEAS-3a)

- Ranks are worked out by `refresh_writer_rank()` (FORUMS-2e). Its new last step calls `announce_writer_rank()`, which sends one quiet `rank_reached` notification (category "stories", never an email) only when the new rank is above `profiles.highest_rank_notified`, then raises that mark. New writer, the rank a first chapter gives, is remembered but never announced. A writer who drops a rank and climbs back is not told twice.
- The bell: `notification_json()` adds `writer_rank` and the writer's own handle; `src/features/notifications/lib/rankReachedText.ts` writes "Your rank: you’re now a Storyteller. Well done." with a link to the profile, and `NotificationIcon` shows the rank's sticker.
- Story cards: `story_card_json()` adds `writer.rank` through `story_card_writer_rank()`, which leaves it out for classics, for a profile the reader may not open and when the writer blocked the reader. `ListedStoryCard` shows the compact `RankChip`; the story page's writer card (`StorySideColumn`) shows `ProfileRankChip`.
- Migrations `…_ideas3_a_rank_enums.sql` (the enum value, alone because Postgres can't use a new value in the same transaction) and `…_ideas3_a_ranks.sql`. Tests: `supabase/tests/database/284-rank-notifications.test.sql`, `src/features/notifications/lib/notificationText.test.ts`, `e2e/rank-notifications.spec.ts`.

## A printable class invite sheet and "Who has replied" (IDEAS-3b)

- **The sheet:** class settings › Invite your class › Make a code → `NewClassInviteCode` shows the code with `ClassInviteQrCode` beside it. The QR code is worked out in the browser by `src/features/spaces/lib/qrModules.ts` (the qrcode-generator library, MIT) and drawn as one SVG path, black on white, so the link never leaves the device. Print → the `.class-invite-sheet` print styles in `src/styles/index.css` hide everything else, so the paper holds only `ClassInviteSheet`: the class's name, the code, the QR code, the link and the end date.
- **Who has replied:** a thread in a space → `ThreadPage`'s side column → `ClassRepliesPanel` → `useClassThreadReplies()` → `class_thread_replies()`. The function answers only for whoever holds the class's "members" power (`space_may_act()`) and null for everyone else, so students never see the panel. It lists the class's active members other than the owner, split by whether they have a live post in the thread.
- Migration `…_ideas3_b_who_has_replied.sql`. Tests: `supabase/tests/database/285-class-thread-replies.test.sql`, `src/features/spaces/lib/qrModules.test.ts`, `src/features/spaces/api/classThreadReplies.test.ts`, `e2e/class-invite-sheet.spec.ts`.

## The class link as the invitation (IDEAS-3c)

- While sign-up is by invitation (`invite_only`), a working class code opens sign-up too. A signed-out student on `/class/<code>` (`JoinClassPage` → `SignedOutJoin`) gets "Create an account with this code", which opens sign-up at `/join/<code>`. `check_invite()` answers `valid` for a class code that `class_invite_opens_sign_up()` allows: not revoked, not past its date, a place left, and the class neither locked nor removed.
- At sign-up, `create_profile_from_sign_up()` step 5 calls `use_sign_up_invite()`. A platform invite goes through `use_platform_invite()` as before. A class code takes one place, makes the new account an active member of the class, writes `member_joined` in the class's log and `invite.redeemed` (purpose `class_space`) in the audit log. A code that has ended refuses the sign-up, which leaves no account, and the page asks for a normal invitation.
- Migration `…_ideas3_c_class_link_invitation.sql`. Tests: `supabase/tests/database/286-class-link-sign-up.test.sql`, `e2e/class-link-sign-up.spec.ts`.

## Joining spaces: a welcome note and a note with a request (IDEAS-3d)

- The owner (or a moderator with the settings power) writes a welcome note in Space settings (`SpaceWelcomeNoteCard` → `set_space_welcome_note()`); `check_space_text(note, 'welcome')` keeps it to 500 characters and refuses HTML. `space_viewer_json()` sends it as `welcome_note` to members and the people who run the space, and `show_welcome` is true for a member until they press "Got it" (`SpaceWelcomeNote` → `dismiss_space_welcome()`, which sets `space_members.welcome_seen_at`).
- In a space that approves each request, "Join space" opens `SpaceJoinRequestForm`: `join_space(slug, note)` keeps an optional note of at most 200 characters in `space_join_notes` (its own table, reportable as `space_join_note`). `space_join_requests()` sends each request's live note, and `SpaceRequestsCard` shows it with a Report button. Only the people who decide that space's requests can report a note (`reportable_item_owner()`); a hidden note leaves the list.
- Migrations `…_ideas3_d_enums.sql` and `…_ideas3_d_joining_spaces.sql`. Tests: `supabase/tests/database/287-joining-spaces.test.sql`, `e2e/joining-spaces.spec.ts`.

## Help threads with an answer, and threads from a chapter passage (IDEAS-3f)

- **"This answered it":** a thread's starter sees the button on every live reply by someone else (`forum_post_json()` sends `can_mark_answer`). `PostActions` → `AnswerButton` → `useMarkAnswer()` → `mark_forum_thread_answer()`, which keeps the reply in `forum_threads.answer_post_id`; pressing it again on the marked reply ("Not the answer") takes the mark away. The thread page shows `ThreadAnswerNote` above the posts (from `forum_thread_header_json()` "answer"), the reply gets an "Answer" pill in `ForumPostCard`, and the forum's list shows "Answered" in `ThreadRow` (`forum_thread_summary_json()` "is_answered"). An answer that was deleted or hidden stops counting (`forum_answer_post()`).
- **"Discuss in the forums":** the chapter reader's selection bar (`QuoteShareBar`) asks `usePassageDiscussion()` → `passage_discussion_allowed()` once per chapter: the same gate as sharing a passage (`shareable_chapter()`, the writer's switch, never 16+ or 18+) plus a public story that isn't class-only or restricted by staff. `DiscussPassageButton` builds the first post with `src/features/sharing/lib/passageThread.ts` (the passage quoted, then the passage link) and opens `/forums/book-talk/new` with it in the router's state; `NewThreadPage` hands it to `NewThreadForm` as `initialBody`. Nothing is posted until the reader adds a title and presses "Post the thread".
- Migration `…_ideas3_f_forum_help_and_passages.sql`. Tests: `supabase/tests/database/288-forum-help-and-passages.test.sql`, `src/features/forums/api/forumAnswers.test.ts`, `src/features/sharing/lib/passageThread.test.ts`, `e2e/forum-help-and-passages.spec.ts`.

## Handing a space over to a moderator (IDEAS-3e)

- The owner opens Space settings › Hand over this space (`SpaceHandoverCard`), picks one of the space's moderators and presses "Offer the space" → `useOfferHandover()` → `offer_space_handover()`. The offer sits on the space (`spaces.handover_to_user_id`, `handover_offered_at`), the moderator gets a `space_handover_offered` notification, and the log says "offered the space to". `space_handover_refusal()` decides who may take a space over: an active moderator, in its age group, and a teacher for a class. The owner can take the offer back (`cancel_space_handover()`).
- The moderator sees `SpaceHandoverOffer` at the top of the space (`space_viewer_json()` → `handover`, shown only to the owner and the moderator it is for) and accepts or declines → `answer_space_handover()`. Accepting makes them the owner and the old owner a moderator with every power; the log says who handed over to whom.
- The owner column: `spaces.user_id` is guarded by `refuse_space_owner_change()` instead of `refuse_user_id_change()`. It refuses every change except the one `answer_space_handover()` makes, which sets a transaction-local flag naming the space, and only to the person the offer was for (Robert, 4 Nov 2026; architecture 1.6).
- Migrations `…_ideas3_e_enums.sql` and `…_ideas3_e_space_handover.sql`. Tests: `supabase/tests/database/289-space-handover.test.sql`, `src/features/notifications/lib/notificationText.test.ts`, `e2e/space-handover.spec.ts`.
