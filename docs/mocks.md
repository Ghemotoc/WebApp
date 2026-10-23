# Mocks still switched on

A story is not Done while its mock is still on for staging (CLAUDE.md rule 17).

| Mock | Replaces | Story that removes it | Flag on staging |
| --- | --- | --- | --- |
| No mocks are switched on for staging. Every screen and test runs against the real local Supabase (Docker); unit tests use small stand-ins inside the test files only | | | |
| Emails go to Mailpit (the local mail catcher) | the email provider, Brevo (decided 17 Oct 2026, 19:43) | Robert's SMTP set-up (S1-E2-01 by-hand list); on staging until then, Supabase's built-in sender, which only mails the project team | none |
| `PASSWORD_CHECK_STUB=1` in the end-to-end tests: the leaked-password check answers from a fixed list (`server/pages-functions-plugin.ts`) | Have I Been Pwned's range service | stays for tests only; staging and production use the real service through `functions/api/password-check.ts` | none |

## Stubs and stand-ins still in place (epic S1-E1, checked by S1-E1-QA)

These are not mocks of an outside service: they are the safe, simple version of a piece that a later story finishes. Each one fails safe (it refuses rather than allows).

| Stub | What it does today | Story that finishes it | On staging |
| --- | --- | --- | --- |
| `is_staff_session()` | true for any staff-role session, from the normal login; every staff rule reaches it through `staff_may()` (S1-E2-07a) | S1-E2-07b (Google Workspace sign-in) | same |
| `/staff/roles` | a small plain page outside the admin shell | S1-E11-01 moves it into the admin site | same |
| `account_state()`: parental consent | under-16s are always `awaiting_parental_consent` (or `minor_not_admitted` while `adults_only` is on) | S1-E2-03 | same |
| `account_state()`: sanctions | no suspensions or bans are checked yet | S1-E10-06 | same |
| `account_state()`: age check | while `adults_only` is on, adults are active without a Yoti check | S1-E2-08 | same |
| The country of the connection, locally | `server/pages-functions-plugin.ts` answers `/api/signup-context` with `LOCAL_FAKE_COUNTRY` (Romania by default) or a test's `X-Fake-Country` header, signed with `SIGNUP_CONTEXT_SECRET` from the environment | stays for local development and tests; Cloudflare's own country is used on staging and production (`functions/api/signup-context.ts`) | real on staging once `SIGNUP_CONTEXT_SECRET` and the Vault secret are set (by-hand list); without them every country counts as unknown, which the invited test still admits |
| Markets | seeded by migration; no screen yet | S1-E11-05 | same |
| Maintenance mode switch | the `maintenance_mode` flag is switched in the SQL editor (supabase/README.md, "Error log and maintenance mode") | S1-E11-03 (settings screen) | same |
| Reading the error log | owner and admin run `admin_list_client_errors()` or read `client_errors` in the SQL editor; no screen yet | S1-E11-01 (admin site) | same |
| Invites | four test codes seeded by `supabase/seed.sql`; no screen makes new ones yet | S1-E11-17 (admin screen and `admin_create_invite()`) | loaded with the seed (`docs/runbooks/staging-reset-and-seed.md`) |
| Signing in for tests | e2e tests still sign personas in from code (`e2e/support/personas.ts`) where the log-in screen isn't what is tested; `e2e/sign-in.spec.ts` uses the real screen | stays for tests only | the log-in screen works on staging (S1-E2-05) |
| The log-in pause | works through our screens only; Supabase's per-address limits cover direct calls | a per-account Auth hook, if the paid plan allows it (Q12) | same |
| Changing the password while logged in | use "Forgot your password?" | S1-E2-09 (Ways to log in) | same |
| Contact points on /legal/contact | the report form and Contact us are named in the text, but people reach us through the email links on the page | S1-E10-02 (report form) and S1-E14-04 (Contact us) | same |
| Company details on /legal/contact | placeholders, shown highlighted, until the company is registered (Q55, OPEN) | a new version of the contact page once the company exists | same |
| Legal texts | version 0.1 of the terms, privacy notice and guidelines are drafts, in English and in a Romanian draft translation, marked as such in the Legal centre | the lawyer's review, then a new version made with `scripts/build-legal-migration.ts` (S1-E14-01) | same |
| "After the invited test" labels | lines of the legal drafts that start only after the March test carry a label (`content/legal/after-the-invited-test.json`) | the version published when sign-up opens to the public | same |
| `reportable_type` | holds `profile` only | each user-content story adds its value (S1-E3-01 first) | same |
| "Ask a moderator to check it" (a username or pen name refused by mistake) | opens an email to the support address with the name in the subject; a moderator approves with `admin_approve_username()` | S1-E14-04 (Contact us) and S1-E11-02 (the approve button on the account page) | same |
| Username word lists | drafts in `content/username-word-lists/`; the Romanian one waits for Robert's check (Q4) | Robert's check, then a new migration from `scripts/build-word-list-migration.ts`; the editing screen is S1-E11-03 | same |
| Look-alike letters | Unicode's 10.0.0 list (from the MIT `unicode-confusables` package, because unicode.org was out of reach from the build session) | a newer list from unicode.org with `scripts/build-confusables-migration.ts` | same |
| Settings › Account | username, pen name and the Legal centre link only; the board's other rows and tabs come with their stories | S1-E2-05, S1-E2-10, S1-E13-01 and others | same |
| ş and ţ on save | corrected as people type, in the shared text fields; not yet on the server | S1-E3-02 (zod schemas) | same |

## Lane A: writing and reading (S1-E3, S1-E4)

| Stub | What it does today | Story that finishes it | On staging |
| --- | --- | --- | --- |
| Flag `picture_uploads` (off, public) | The `covers` bucket (private, JPEG/PNG/WebP, 5 MB) and its owner-only rules exist; `create_story()` refuses an upload cover and the form shows no upload tab or Canva button (decided 23 Oct 2026: no picture uploads in the demo; the contract only) | the cover-upload story once the picture check (S1-E10-05) is real: the tall and square upload, the crop tool and `IMAGE_CHECK=stub` for local work; Canva is S1-E3-12 | same |
| `content_is_held_for_moderation(type, id)` | answers false: the nightly purge deletes every story (and, from S1-E3-04, chapter) past its 30 days; nothing is under report yet | S1-E10-01 and S1-E10-04 fill it in, so content under an open report is kept for the moderators | same |
| Raising a rating and the "AI-written, not disclosed" label | `admin_raise_story_rating()` and `admin_set_ai_undisclosed_label()` exist and are tested (staff only, logged, a `statement_of_reasons_needed` job queued), but no screen calls them yet and nobody counts confirmed reports | S1-E11-08 (the story in admin) calls them; S1-E10-04 sends the statement of reasons from the job; S1-E10 counts the `ai_label_confirmed_reports` (3) confirmed reports | same |
| "Report this story" on the story page | an email to the support address with the story's address in the subject | Lane C's `<ReportButton>` from `src/features/reporting` (S1-E10-01) replaces `ReportStoryLink` in `src/features/reading/components/StorySideColumn.tsx` | same |
| The comments switch | stored on the story and shown on the page; nothing enforces it yet | S1-E6-01 hides existing comments and refuses new ones while it is off | same |
| `is_moderated_away(type, id)` | answers false: nothing is hidden or removed by a moderator yet (shared contract with Lane C; guarded so Lane C's real function replaces it) | S1-E10-01 and the moderation stories | same |
| Doodle colours | the SVG files carry the boards' own ink colours; night mode shows them as they are | Lane B's `--doodle-*` tokens and recoloured files | same |
