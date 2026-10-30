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
| `src/features/writing/` | The writer's side: `/write` (Your writing), `/write/new` (the new story form), `/write/s/:storySlug/settings` (story settings, delete and undo), `/write/s/:storySlug/c/:chapterCode` (the chapter editor and its autosave), the tag rule, the Markdown converters, `create_story()`, `update_my_story()`, `save_chapter_draft()`; see its README | S1-E3-01, S1-E3-05, S1-E3-02a |
| `src/features/reading/` | The reader's side: `/s/:storySlug` (the story page) through `get_story_page()`, the label pills, the chapter reader and, for signed-out visitors, the teaser and the "No preview" notice; see its README | S1-E3-05, S1-E3-06, S1-E4-01a, S1-E4-04 |
| `src/features/people/` | Writer profiles (`/u/:handle`) through `get_writer_profile()`, blocks (`set_block()`, the block dialog, Settings' "Blocked accounts"), the bio, and the shared `<FollowButton>` for writers and stories; see its README | S1-E5-05, S1-E6-05 |
| `src/features/discovery/` | Discover (`/discover`), and one list page for every See all, category, tag and writer list (`/discover/all/:listKind`, `/discover/c/:categorySlug`, `/discover/t/:tag`, `/u/:handle/stories`), all through `browse_stories()`; filters and sort live in the address; see its README | S1-E5-01, S1-E5-09, S1-E5-02 |
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
| `design/assets/*.svg`, `scripts/doodle-tokens.ts` | The 98 doodles and 16 drawn cover backgrounds; the script that keeps every doodle colour a `--doodle-*` token (Lane B, below) | canvas; Lane B (23 Oct 2026) |

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
           reads the file with that token, asks server/picture-check/ (stub, or Sightengine and
           Arachnid Shield when PICTURE_CHECK=real), then rpc record_picture_check() signed with
           PICTURE_CHECK_SECRET
    4. passed → the cover or avatar shows (StoryCoverArt, AvatarImage, signed short-lived URLs)
       held → a moderation case with the picture blurred (CasePicturePanel); a known abuse
              match is never shown, opens a safeguarding case and is kept 6 months
       pending (a service down) → usePendingPictureRetry tries again, at most 5 times
```

**Appeals (S1-E10-07).** On `/my-reports` each statement shows until when it can be appealed (six months, DSA art. 20(1)); `AppealSection` → `submit_appeal()`. Staff decide on `/staff/appeals` (`AppealsPage` → `admin_appeals_queue()`, `admin_decide_appeal()`); a moderator never decides an appeal on their own decision. Changing a decision restores the item and lifts the sanction; the person is notified (`appeal_decided`) either way.

**Moderator mail (S1-E10-11).** `/moderator-mail` for members and `/staff/moderator-mail` for staff, `src/features/moderator-mail/`. One shared inbox; replies go out as "The moderation team"; internal notes stay with staff; a reply notifies the member (`moderator_mail_reply`).

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
  read-through; each halved every ranking_half_life_days; weights ranking_weight_*; never downvotes
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

## Epic S1-E11 at a glance (checked by S1-E11-QA)

What the Admin epic has in place so far. The epic report, `docs/epic-reports/S1-E11.md`, lists what works, the open Must stories, the known gaps and the stubs still on.

| Kind | Where | Story |
| --- | --- | --- |
| Screens | `/staff` (the shell and home), `/staff/audit-log`, `/staff/invites`, `/staff/roles` (`src/features/staff/`), `/staff/settings` (`src/features/settings/`), `/staff/website` and its tabs (`src/features/website/`, `src/features/interface-text/`, `src/features/seasonal/`) | 11-01, 11-17, 2-07a, 11-03, 11-05, 11-06, 11-10, 11-12, 11-18, 11-19, 11-11 |
| Hooks | `useMyStaffAccess`, `useAuditLog`, `useInviteLinks`, `useStaffRoles` | each story |
| Tables | `audit_log` (append-only), `invites`, `staff_roles`, `staff_permissions`, `staff_role_areas`, the settings `staff_session_hours` and `staff_fresh_sign_in_minutes` | 1-02, 2-01, 2-07a, 11-01, 11-17 |
| Functions | `is_staff_session()` (12 hours), `staff_signed_in_recently()`, `my_staff_areas()`, `log_sensitive_read()`, `admin_search_audit_log()`, `admin_export_audit_log()`, `admin_create_invite()`, `admin_revoke_invite()`, `admin_list_invites()`, `use_platform_invite()` | each story |
| Tests | `supabase/tests/database/040`, `041` and `095` (the epic), `e2e/epic-s1-e11.spec.ts` and each story's spec | each story, S1-E11-QA |

**One main journey through the whole epic:** the admin opens `/staff/invites` → `admin_create_invite()` returns the code once and logs `invite.created` → an adult opens `/join/<code>` → the sign-up trigger calls `use_platform_invite()`, which takes the last place and logs `invite.used_up` on behalf of the maker → the owner opens `/staff/audit-log` → `admin_search_audit_log()` finds both rows. `e2e/epic-s1-e11.spec.ts` walks it.

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
