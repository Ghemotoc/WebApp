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
| `account_state()`: parental consent | under-16s are always `awaiting_parental_consent` (or `minor_not_admitted` while `adults_only` is on) | S1-E2-03 | same |
| `account_state()`: age check | while `adults_only` is on, adults are active without a Yoti check | S1-E2-08 | same |
| The country of the connection, locally | `server/pages-functions-plugin.ts` answers `/api/signup-context` with `LOCAL_FAKE_COUNTRY` (Romania by default) or a test's `X-Fake-Country` header, signed with `SIGNUP_CONTEXT_SECRET` from the environment | stays for local development and tests; Cloudflare's own country is used on staging and production (`functions/api/signup-context.ts`) | real on staging once `SIGNUP_CONTEXT_SECRET` and the Vault secret are set (by-hand list); without them every country counts as unknown, which the invited test still admits |
| Markets | seeded by migration; no screen yet | S1-E11-05 | same |
| Maintenance mode switch | the `maintenance_mode` flag is switched in the SQL editor (supabase/README.md, "Error log and maintenance mode") | S1-E11-03 (settings screen) | same |
| Reading the error log | owner and admin run `admin_list_client_errors()` or read `client_errors` in the SQL editor; no screen yet | S1-E11-01 (admin site) | same |
| Signing in for tests | e2e tests still sign personas in from code (`e2e/support/personas.ts`) where the log-in screen isn't what is tested; `e2e/sign-in.spec.ts` uses the real screen | stays for tests only | the log-in screen works on staging (S1-E2-05) |
| The log-in pause | works through our screens only; Supabase's per-address limits cover direct calls | a per-account Auth hook, if the paid plan allows it (Q12) | same |
| Changing the password while logged in | use "Forgot your password?" | S1-E2-09 (Ways to log in) | same |
| Contact points on /legal/contact | the report form and Contact us are named in the text, but people reach us through the email links on the page | S1-E10-02 (report form) and S1-E14-04 (Contact us) | same |
| Company details on /legal/contact | placeholders, shown highlighted, until the company is registered (Q55, OPEN) | a new version of the contact page once the company exists | same |
| Legal texts | version 0.1 of the terms, privacy notice and guidelines are drafts, in English and in a Romanian draft translation, marked as such in the Legal centre | the lawyer's review, then a new version made with `scripts/build-legal-migration.ts` (S1-E14-01) | same |
| "After the invited test" labels | lines of the legal drafts that start only after the March test carry a label (`content/legal/after-the-invited-test.json`) | the version published when sign-up opens to the public | same |
| `reportable_type` | holds `profile` only; `reportable_item_owner()` and `reportable_item_summary()` have the profile branch only | each user-content story adds its value and its branches (S1-E3-01 first; architecture 1.7.11) | same |
| "Ask a moderator to check it" (a username or pen name refused by mistake) | opens the Contact us form with the account topic and the name filled in (S1-E14-04); a moderator approves with `admin_approve_username()` by SQL | S1-E11-02 (the approve button on the account page) | same |
| The helpdesk behind Contact us | messages arrive as emails in the support inbox through Brevo; locally in Mailpit | S1-E11-13 (tickets in the admin site; a ready-made helpdesk through its API, product OPEN) | **Brevo: `BREVO_API_KEY` by hand** |
| Username word lists | drafts in `content/username-word-lists/`; the Romanian one waits for Robert's check (Q4) | Robert's check, then a new migration from `scripts/build-word-list-migration.ts`; the editing screen is S1-E11-03 | same |
| Look-alike letters | Unicode's 10.0.0 list (from the MIT `unicode-confusables` package, because unicode.org was out of reach from the build session) | a newer list from unicode.org with `scripts/build-confusables-migration.ts` | same |
| Settings › Account | username, pen name and the Legal centre link only; the board's other rows and tabs come with their stories | S1-E2-05, S1-E2-10, S1-E13-01 and others | same |
| ş and ţ on save | corrected as people type in the shared text fields, in the chapter editor's zod schema and on the server (`normalise_romanian_letters()`, `save_chapter_draft()`; S1-E3-02a). Story titles, blurbs and tags are corrected as typed; their server functions call `normalise_tag()` or trim only | Done for chapters; the story functions can call `normalise_romanian_letters()` in a later story | same |

## Lane A: writing and reading (S1-E3, S1-E4)

| Stub | What it does today | Story that finishes it | On staging |
| --- | --- | --- | --- |
| Flag `picture_uploads` (off, public) | The `covers` bucket (private, JPEG/PNG/WebP, 5 MB) and its owner-only rules exist; `create_story()` refuses an upload cover and the form shows no upload tab or Canva button (decided 23 Oct 2026: no picture uploads in the demo; the contract only) | the cover-upload story once the picture check (S1-E10-05) is real: the tall and square upload, the crop tool and `IMAGE_CHECK=stub` for local work; Canva is S1-E3-12 | same |
| Raising a rating and the "AI-written, not disclosed" label | `admin_raise_story_rating()` and `admin_set_ai_undisclosed_label()` exist and are tested (staff only, logged, a `statement_of_reasons_needed` job queued), but no screen calls them yet and nobody counts confirmed reports | S1-E11-08 (the story in admin) calls them; S1-E10-04 sends the statement of reasons from the job; S1-E10 counts the `ai_label_confirmed_reports` (3) confirmed reports | same |
| The chapter's banner | `useChapterBanner()` answers no banner, so the slot below the chapter (`ChapterBannerSlot`) shows nothing: no box, no placeholder (S1-E4-01b) | S1-E12-01 replaces the hook's body with `pick_banner(context)` | same |
| The link preview picture | a plain square in the drawn cover's colour (plum for automatic covers and for 16+ and 18+ stories), `public/link-previews/<colour>.png`; the full title sits beside it as text in every app's card. Drawing the cover with its title (satori and resvg, Q13 option A) takes 30 to 50 ms of processor time a picture and about 240 ms the first time, and Cloudflare's free plan allows 10 ms a request, so Q13's fallback B is used (S1-E4-04) | none planned: option A comes back if the site moves to Cloudflare's paid plan (30 s a request), or if the picture is drawn once when a chapter is published, in a Supabase edge function (its limit is 2 s), which needs Robert's choice | same |
| The comments switch | stored on the story and shown on the page; nothing enforces it yet | S1-E6-01 hides existing comments and refuses new ones while it is off | same |
| `is_moderated_away(type, id)` | answers false: nothing is hidden or removed by a moderator yet (shared contract with Lane C; guarded so Lane C's real function replaces it) | S1-E10-01 and the moderation stories | same |
| Avatars | every avatar is the person's initials on the plum gradient (`ProfileAvatar`), because picture uploads stay off (`picture_uploads`, decided 23 Oct 2026); story S1-E5-05's avatar upload waits for the picture check | SAFE-4 (S1-E10-05) adds the avatar upload behind the same flag | same |
| Online status | `profiles.shows_online_status` is stored, off for everyone; nothing shows online status, and there is no switch yet | S1-E13-01 (privacy settings) | same |
| Notification settings | every notification kind is on for everyone, in the app only; the page has no Settings link or "Your choices" card | S1-E7-02 (email and digests, after March) | same |
| The bell's count | read every minute and when the tab comes back into view, not pushed (READ-3 decision) | Realtime, when it is worth one more moving part (no story yet) | same |
| A decision's notification | says what was decided and links to the item; no statement of reasons or appeal link yet | S1-E10-04 and S1-E10-07 (SAFE-3) | same |
| Doodle colours | the SVG files carry the boards' own ink colours; night mode shows them as they are | Lane B's `--doodle-*` tokens and recoloured files | same |

## Stubs and stand-ins from Lane C (safety and admin, from 23 Oct 2026)

| Stub | What it does today | Story that finishes it | On staging |
| --- | --- | --- | --- |
| The fresh sign-in (15 minutes) | asked only before a role change (`require_role_change_allowed()`); exports for someone else, "Emergency disable" and removing part of a writer's text ask the same question when their stories land (S1-E11-01) | S1-E11-09a, S1-E10-09, S1-E11-08 | same |
| Invites under Users | Invites has its own menu entry until the Users area exists (S1-E11-17) | S1-E11-02 (the Invites tab on 8.5) | same |
| The Report button's home | on the story page (Lane A), the writer profile (S1-E5-05), the reader and each comment; the reporter isn't told the outcome in Notifications yet (the reported person is, since S1-E7-01) | S1-E10-04 (telling the reporters, SAFE-3) | same |
| Safety contacts | seeded from `content/safety-contacts.json` by a generated migration; a change is a new migration from the changed file; the international fallback links (Child Helpline International, INHOPE) were checked by the CTO on 24 Oct 2026 | S1-E10-13b (the editing screen and the monthly check) | same |
| The admin menu | shows Moderation, Roles, Invites and Audit log only; every other area appears when its page is built (`src/features/staff/staffAreas.ts`) | each staff story (S1-E11-02 next) | same |
| A decision's effect | `admin_decide_case()` carries warn, suspend, ban, hide and remove out (S1-E10-06); no statement of reasons is sent yet, and "restrict" is refused until the story that defines it. The case page says so under the button | S1-E10-04 (the statement of reasons and telling the reporters), S1-E11-08 (restrict) | same |
| Banned emails | `banned_email_hash()` needs the Vault secret `banned_email_secret`; the seed sets a local value; without it on staging a ban still works but the email isn't blocked from signing up again | Robert's by-hand step (S1-E10-06) | **set by hand** |
| The removed marker | `moderated_state_of()` answers hidden or removed; a hidden or removed profile, story or chapter simply isn't shown to readers ("This profile isn't available"); no public screen draws "[Removed by the moderation team]" yet, because that marker belongs in lists of comments and posts | S1-E6-01 (comments) | same |
| Cases from orders and picture checks | the queue's one-hour tier and the picture-check source show seeded cases only (`TCO-0001`, `P-0001`, `P-0002`); nothing inserts them yet | S1-E10-09 (removal orders), S1-E10-05 (the picture check) | same, from the top-up `S1-E10-03a.sql` |
| The queue's board extras | search, the reason and claimed filters, claiming, timers, the side panel, the picture-check panel and the removal-order banner are not built | S1-E10-03b, S1-E10-05, S1-E10-09 | same |
