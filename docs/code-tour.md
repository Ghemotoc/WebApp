# Code tour

The map for a new developer: where the app starts, how one click travels to the database and back, where each kind of thing lives, and what to read first. Created by S1-E1-01. Every story that adds a feature, table, edge function or job adds a few lines here in the same pull request (CLAUDE.md, Readable code).

Today the app is a skeleton: one home page, the brand config, translations and CI (S1-E1-01), the database baseline with its seed personas (S1-E1-02), the design tokens, light and night mode, the app shell and the /design components page (S1-E1-03), the Romanian and English interface with the language saved to the account (S1-E1-04), the Legal centre with versioned terms, privacy notice and guidelines (S1-E14-01), and invite-only sign-up with email confirmation (S1-E2-01). Sections below say which later story fills in each part, so you can tell what exists from what is planned.

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
| `src/features/legal/` | The Legal centre (`/legal/:documentSlug`) and the "We've updated our Terms" notice; see its README | S1-E14-01 |
| `src/features/auth/` | Who is signed in (`useSession`), sign-up (`/sign-up`, `/join/<code>`), email confirmation (`/auth/confirm`) and the top bar's "Join for free"; sign-in comes with S1-E2-05 | S1-E14-01, S1-E2-01 |
| `src/features/flags/` | The public feature flags for screens that change with them (`useFeatureFlags`) | S1-E2-01 |
| `src/features/errors/` | Our own error log's browser side: the global handlers, the router's error page ("Something went wrong on our side") and the scrubbing before anything is sent; see its README | S1-E1-05 |
| `src/features/maintenance/` | The maintenance page and the gate in AppLayout that shows it while `maintenance_mode` is on (staff and the log-in pages excepted) | S1-E1-05 |
| `src/features/offline/` | The "You're offline" / "You're back online" banner under the top bar | S1-E1-05 |
| `src/config/appVersion.ts` | The build's version for error reports: the short commit on Cloudflare, `local` elsewhere (set in `vite.config.ts`) | S1-E1-05 |
| `src/schemas/` | zod rules shared by forms and (later) edge functions, starting with `signUp.ts` | S1-E2-01 |
| `src/lib/age.ts` | The age rules from a year (and month), the same as the database's `age_band_from_birth()` and `sign_up_age_outcome()` | S1-E2-02 |
| `functions/`, `server/` | Cloudflare Pages Functions (`functions/api/…`, run by Cloudflare next to the site) and their logic (`server/`), served locally by `server/pages-functions-plugin.ts`; the first is the leaked-password check (ADR 0003) | S1-E2-01 |
| `supabase/templates/` | The Supabase Auth emails in Romanian and English, generated by `npm run emails:build` from `src/locales/*/email.json` and the brand config; never edited by hand | S1-E2-01 |
| `content/legal/`, `scripts/build-legal-migration.ts` | The legal drafts (English, and Romanian draft translations in `ro/`) and the script that turns a new version into a migration | S1-E14-01 |
| `src/features/design-system/` | The /design page: every token and component on one page, with live contrast ratios | S1-E1-03 |
| `src/config/brand.ts` | Product name, site, email addresses, social handle and company name (front end only) | S1-E1-01, S1-E1-03 |
| `src/features/writing/` | The writer's side: `/write` (Your writing), `/write/new` (the new story form), `/write/s/:storySlug/settings` (story settings, delete and undo), `/write/s/:storySlug/c/:chapterCode` (the chapter editor and its autosave), the tag rule, the Markdown converters, `create_story()`, `update_my_story()`, `save_chapter_draft()`; see its README | S1-E3-01, S1-E3-05, S1-E3-02a |
| `src/features/reading/` | The reader's side: `/s/:storySlug` (the story page) through `get_story_page()`, the label pills; later the chapter reader and the teaser; see its README | S1-E3-05, S1-E3-06 |
| `src/components/covers/` | `DrawnCover` (every cover we draw: the 16 designs, the 9-colour palette, the full title at every size), `coverDesigns.ts` (the designs, colours and pattern artwork from the NewStory board) and `automaticCover.ts` (a skipped cover gets a design from the story's ID; `designsForRow()` keeps two neighbours in a row apart) | S1-E3-01, S1-E3-13 |
| `src/components/ui/Doodle.tsx`, `src/assets/doodles/` | The decorative doodles (`data-doodle="background"` or `"widget"`, hidden under 1000 or 600 px), copied from design/assets with readable names; `e2e/support/doodles.ts` fails a screen when a doodle meets text or a control | S1-E3-01 |
| `src/features/<feature>/` | One folder per feature: `components/` (screens), `hooks/` (data hooks), `api/` (Supabase calls) and a `README.md` | each feature story; `home/` by S1-E1-01 |
| `src/lib/` | Shared helpers: `i18n.ts` (translations), `utils.ts` (`cn` for class names), `database.types.ts` (generated, never edited by hand), `supabase.ts` (the one browser client, loaded on demand; null without settings), `language-preference.ts` (the language kept in this browser), `romanian-text.ts` (ş and ţ become ș and ț), `query-retry.ts` (a refused read, 401 or 403, isn't retried; api/ functions keep the response status as the error's cause), and later `platform/` adapters | S1-E1-01, S1-E1-02, S1-E1-04, S1-E2-QA |
| `src/locales/ro/`, `src/locales/en/` | All interface text, one JSON file per namespace; same keys in both | S1-E1-01, S1-E1-04 |
| `src/styles/` | `tokens.css` (every colour, light and night, plus fonts, radii and shadows, all from the boards), `fonts.css` (self-hosted fonts), `index.css` (global rules: focus ring, reduce motion, tmc-* classes), `contrast-pairs.ts` (the pairs CI checks) | S1-E1-01, S1-E1-03 |
| `src/schemas/` | zod schemas shared with edge functions | first story with a form or function |
| `src/test/` | Test set-up; later fixtures and MSW mocks | S1-E1-01 |
| `public/` | Files copied as they are into `dist/`: `_redirects` (every address serves `index.html` on Cloudflare Pages) and `theme-init.js` (light or night before the first paint) | S1-E1-01, S1-E1-03 |
| `supabase/config.toml` | Local Supabase settings; also read by Supabase's GitHub integration | S1-E1-01 |
| `supabase/migrations/` | Every schema change, as SQL files. The only way the database changes (CLAUDE.md rule 3). Staging gets them from Supabase's GitHub integration when main changes | S1-E1-02 onwards |
| `supabase/functions/` | Edge functions (Deno), the only code that may hold secrets | first story with a function |
| `supabase/tests/` | pgTAP database tests: an allowed and a denied test for every policy, plus the CI guards (`001` RLS on every table, `002` table kinds and `user_id`, `003` table grants match the policies) | S1-E1-02 onwards |
| `supabase/seed.sql` | The 16 synthetic seed personas (accounts, profiles, staff roles); never real data | S1-E1-02 |
| `supabase/README.md` | The database conventions every migration follows, the account gate and the persona list with the shared test password | S1-E1-02 |
| `e2e/` | Playwright tests in a real browser, with axe accessibility checks. `e2e/support/personas.ts` signs a seed persona in against the local Supabase (no sign-in screen needed). Tests run one at a time, because they share the personas, the seed story and site-wide flags in one database. A test that checks a signed-in screen in one language saves that language on the persona first (the account's language wins), and `e2e/support/animations.ts` waits for slides to stop before the next key | S1-E1-01, S1-E1-04, S1-E1-QA, TOOL-1 |
| `scripts/` | Repository checks: the i18n check, the brand-value check, the generated-types check, the story issue sync (S1-E1-01); the policy-test coverage check and the bundle secret scan (S1-E1-02); and their tests | S1-E1-01, S1-E1-02 |
| `.github/workflows/` | CI (`ci.yml`), the disabled production release, the story issue sync. In `ci.yml` the small `changes` job runs `scripts/only-docs-changed.sh` to decide whether a pull request changes only documentation | S1-E1-01; `changes` job 24 Oct 2026 |
| `.claude/` | Claude Code settings and the SessionStart hook: on every start and resume it puts Node 24 first on PATH (through `CLAUDE_ENV_FILE`), starts Docker for the local Supabase stack if it is down, and installs packages when the lock file changes | S1-E1-01, Tooling (18 Oct 2026) |
| `docs/` | Architecture, Definition of Done, decisions, stories, runbooks, this tour; `mocks.md` (mocks and stubs still on); `epic-reports/` (one report per epic check) | starter kit, then every story |
| `design/` | Boards (source of truth for screens), renders and pictures | starter kit |

**Where the app runs.** Locally: Vite's dev server plus the Supabase CLI in Docker. Staging: Cloudflare Pages project `ghemotoc` builds `main` (`npm run build`, output `dist`) and gives each pull request a preview link; Supabase's GitHub integration applies migrations to the staging project. Production: a tagged release, approved in GitHub (`.github/workflows/release-production.yml`, switched off until a production project exists).

**Checks.** `npm run checks` (`scripts/run-all-checks.sh`) runs `npm run lint`, `npm run typecheck`, `npm run types:check`, `npm test`, a reset of the local database, `npx supabase test db`, `npm run test:e2e` and `npm run i18n:check`; after a build, also run `npm run scan:bundle`. The reset keeps the database tests independent of what ran before, and e2e puts the seed personas' language back when it ends (`e2e/support/global-teardown.ts`). Run them all locally before you mark a pull request ready for review. CI (`.github/workflows/ci.yml`) runs lint, types, unit tests, i18n and the build on every push to a pull request, drafts included. The two long jobs, database and e2e (about 19 minutes), wait until the pull request is marked ready for review, start only after the short checks pass, and skip pull requests that change only documentation (`docs/`, `prompts/`, `*.md`). Every push to main runs everything. A skipped job counts as passed for the merge rules, so open pull requests as drafts and mark them ready once the local run is green (CTO, 24 Oct 2026: GitHub Actions minutes).

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
  │  1. src/schemas/signUp.ts (zod): email, 10+ characters, both passwords the same, year, terms box
  │  2. lib/passwordLeak.ts → POST /api/password-check (5 characters of a hash, ADR 0003)
  │  3. api/signUp.ts → supabase.auth.signUp (or signInWithOtp for "Email me a log-in link")
  ▼
auth.users insert → trigger handle_new_auth_user()   …_s1_e2_01_sign_up_trigger.sql (ADR 0002)
  │  profiles row (id = user ID) → use_platform_invite() → consents for terms and privacy
  │  any refusal: the whole insert is undone, nothing kept
  ▼
Supabase emails supabase/templates/confirmation.html (Mailpit locally)
  ▼
/auth/confirm?token_hash=…  → ConfirmEmailPage → verifyOtp → signed in; account_state() is handle_missing
  ▼  "Continue"
/setup → choosing a username (next section) → account_state() is active
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
  │  staffAreas.ts: area → page (roles, audit_log; each staff story adds its own)
  ├─ /staff            StaffHomePage: one card per area the person may open
  ├─ /staff/roles      StaffRolesPage (S1-E2-07a, below)
  ├─ /staff/invites    InvitesPage (S1-E11-17): MakeInviteForm → useInviteLinks → api/inviteLinks.ts
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

Invite links (S1-E11-17): an admin makes a link at /staff/invites; sign-up at /join/<code> calls `use_platform_invite()` inside the sign-up transaction, once the new profile exists (one conditional UPDATE, so the last place goes once). The audit log gets `invite.created` and `invite.revoked` from the admin, `invite.redeemed` from the new account (its user ID only) and `invite.used_up` from the system (`audit_log.actor = 'system'`, no user ID), never on behalf of the admin (CTO, 24 Oct 2026).

Every staff screen reads and writes only through policies and `admin_*` functions, each of which asks `staff_may()` → `is_staff_session()` (architecture 1.8.1). The menu is built from the same answer, but it is a convenience: the server refuses on its own.

## Staff roles (S1-E2-07a)

```
/staff/roles (StaffRolesPage, inside StaffLayout since S1-E11-01)        src/features/staff/
  │  useStaffRoles → api/staffRoles.ts
  │     admin_list_staff(), admin_user_id_for_handle(),
  │     admin_grant_role() / admin_remove_role() / admin_set_permission()
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
StorySideColumn (the writer, "Labels from the writer", "Report this story": an email until
Lane C's ReportButton lands)
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
## Demo content for the investor demo (Lane B, 23 Oct 2026)

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
- Likes, comments and follows between the writers come with part 2b, after S1-E6.

## Start here

Read in this order; each file's header comment says what it is for and where things go next.

1. `CLAUDE.md`: the rules, then `docs/architecture.md` sections 1.5 to 1.7 and `docs/definition-of-done.md`.
2. `index.html` → `src/main.tsx` → `src/app/AppProviders.tsx` → `src/app/router.tsx`: how the app starts.
3. `src/features/home/components/HomePage.tsx` and its test: the smallest complete feature.
4. `src/config/brand.ts` and `src/lib/i18n.ts`: where the name and the words come from.
5. `src/locales/ro/common.json` and `src/locales/en/common.json`: the interface text.
6. `src/styles/tokens.css`, `src/components/ui/README.md` and `/design` in the running app (`npm run dev`, then open /design): how screens look and which components to reuse.
7. `supabase/README.md`, then `supabase/migrations/` in order, `supabase/seed.sql` and `supabase/tests/database/010-profiles.test.sql`: the database side and how a policy is tested.
8. `.github/workflows/ci.yml`: what has to pass before anything merges, and when the long jobs run (not on drafts, not for documentation-only changes).
9. `src/features/language/`: the first feature that saves to the database, from drop-down to SQL function (traced above).
10. `e2e/home.spec.ts`, `e2e/language.spec.ts` and `scripts/`: how the checks prove each rule.
