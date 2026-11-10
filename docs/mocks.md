# Mocks still switched on

Checked against the code on 8 Nov 2026 (QA-9): rows for pieces that are now built were removed.

A story is not Done while its mock is still on for staging (CLAUDE.md rule 17).

| Mock | Replaces | Story that removes it | Flag on staging |
| --- | --- | --- | --- |
| No mocks are switched on for staging. Every screen and test runs against the real local Supabase (Docker); unit tests use small stand-ins inside the test files only | | | |
| Emails go to Mailpit (the local mail catcher) | the email provider, Brevo (decided 17 Oct 2026, 19:43) | Robert's SMTP set-up (S1-E2-01 by-hand list); on staging until then, Supabase's built-in sender, which only mails the project team | none |
| `PASSWORD_CHECK_STUB=1` in the end-to-end tests: the leaked-password check answers from a fixed list (`server/pages-functions-plugin.ts`) | Have I Been Pwned's range service | stays for tests only; staging and production use the real service through `functions/api/password-check.ts` | none |

## Signals not counted yet

| Signal | Today | Story that adds it |
| --- | --- | --- |
| Shares in the popularity score (`ranking_weight_shares`, S1-E5-03) | counted as 0, because nothing records a share yet; the weight is ready | S1-E4-05 (share and quote card, after March) |

## Stubs and stand-ins still in place (epic S1-E1, checked by S1-E1-QA)

These are not mocks of an outside service: they are the safe, simple version of a piece that a later story finishes. Each one fails safe (it refuses rather than allows).

| Stub | What it does today | Story that finishes it | On staging |
| --- | --- | --- | --- |
| `is_staff_session()` | Google Workspace sign-in is built (S1-E2-07b, ADR 0015) but switched on only by the Vault secret `staff_email_domain`. While it is missing, any staff-role session from the normal log-in counts, as in March (S1-E2-07a); every staff rule reaches it through `staff_may()` | GO-LIVE step 7.2: set the secret (`docs/runbooks/staff-sign-in.md`) | **normal log-in until GO-LIVE** |
| `account_state()`: parental consent | under-16s are always `awaiting_parental_consent` (or `minor_not_admitted` while `adults_only` is on) | S1-E2-03 | same |
| `account_state()`: age check | while `adults_only` is on, adults are active without a Yoti check; the check itself is built (S1-E2-08a) | GO-LIVE: `YOTI=real`, then `adults_only` off | same |
| The Yoti stand-in | The age check is built (S1-E2-08a; ADR 0010). While `YOTI` isn't "real" (always locally and in e2e), `/api/age-check/…` uses the stand-in: its own check page at `/api/age-check/stub/check` with Pass with a selfie, Pass with an ID document, Fail and Cancel, and notifications signed with a fixed stand-in key. It lets anyone pass, so it must never be on where minors can join. Manual checks (S1-E2-08b) need no stand-in: staff decide on Users › Manual age checks | GO-LIVE: Yoti's contract and DPA, `YOTI=real`, `YOTI_API_KEY`, `YOTI_SDK_ID`, `YOTI_NOTIFICATION_PUBLIC_KEY` and `AGE_CHECK_SECRET` in Cloudflare, `age_check_secret` in Vault, the webhook address registered with Yoti | **stand-in until GO-LIVE** |
| The country of the connection, locally | `server/pages-functions-plugin.ts` answers `/api/signup-context` with `LOCAL_FAKE_COUNTRY` (Romania by default) or a test's `X-Fake-Country` header, signed with `SIGNUP_CONTEXT_SECRET` from the environment | stays for local development and tests; Cloudflare's own country is used on staging and production (`functions/api/signup-context.ts`) | real on staging once `SIGNUP_CONTEXT_SECRET` and the Vault secret are set (by-hand list); without them every country counts as unknown, which the invited test still admits |
| Signing in for tests | e2e tests still sign personas in from code (`e2e/support/personas.ts`) where the log-in screen isn't what is tested; `e2e/sign-in.spec.ts` uses the real screen | stays for tests only | the log-in screen works on staging (S1-E2-05) |
| The log-in pause | works through our screens only; Supabase's per-address limits cover direct calls | a per-account Auth hook, if the paid plan allows it (Q12) | same |
| Changing the password while logged in | Settings › Ways to log in sends the "Forgot your password?" email; there is no change-in-place form | none planned: the reset email is the change path (S1-E2-09) | same |
| Company details on /legal/contact | placeholders, shown highlighted, until the company is registered (Q55, OPEN) | a new version of the contact page once the company exists | same |
| Legal texts | version 0.1 of the terms, privacy notice and guidelines are drafts, in English and in a Romanian draft translation, marked as such in the Legal centre | the lawyer's review, then a new version made with `scripts/build-legal-migration.ts` (S1-E14-01) | same |
| "After the invited test" labels | lines of the legal drafts that start only after the March test carry a label (`content/legal/after-the-invited-test.json`) | the version published when sign-up opens to the public | same |
| The helpdesk behind Contact us | built as tickets in our own tables (S1-E11-13): Contact us and emails to the support inbox become tickets at Staff › Support; email in arrives through Brevo's inbound parsing at `/api/support-inbound`; the outside helpdesk product stays OPEN | GO-LIVE: `SUPPORT_INBOUND_KEY`, `SUPPORT_TICKET_SECRET` and `BREVO_API_KEY` by hand (docs/runbooks/contact-form.md) | **set by hand** |
| Username word lists | drafts in `content/username-word-lists/`; the Romanian one waits for Robert's check (Q4) | Robert's check, then a new migration from `scripts/build-word-list-migration.ts`; the editing screen is S1-E11-03 | same |
| Look-alike letters | Unicode's 10.0.0 list (from the MIT `unicode-confusables` package, because unicode.org was out of reach from the build session) | a newer list from unicode.org with `scripts/build-confusables-migration.ts` | same |
| ş and ţ on save | corrected as people type in the shared text fields, in the chapter editor's zod schema and on the server (`normalise_romanian_letters()`, `save_chapter_draft()`; S1-E3-02a). Story titles, blurbs and tags are corrected as typed; their server functions call `normalise_tag()` or trim only | Done for chapters; the story functions can call `normalise_romanian_letters()` in a later story | same |

## Lane A: writing and reading (S1-E3, S1-E4)

| Stub | What it does today | Story that finishes it | On staging |
| --- | --- | --- | --- |
| Flag `picture_uploads` (off, public) | Uploads are built (S1-E10-05, and pictures in chapters in S1-E3-09): Story settings, Settings and the chapter editor's Picture button and Insert › Drawing show only while the flag is on, and the picture check runs on every file. Locally and in e2e `/api/picture-check` uses the stub provider (`PICTURE_CHECK=stub`: a file passes unless its name ends `_fail`, `_gore`, `_match` or `_down`). The flag stays off on staging until the real services are set up (GO-LIVE) | GO-LIVE: Arachnid Shield keys and `PICTURE_CHECK=real`, then the flag on (Sightengine is off since 2 Nov 2026 and needs no key unless `PICTURE_CHECK_SIGHTENGINE=on`) | off |
| Flag `media_embeds` (off, public) and the oEmbed stub | Music and video cards in chapters are built (S1-E3-10): the editor's Video link button and Insert › Music show only while the flag is on. Locally and in e2e `/api/embed` uses the oEmbed stub (`OEMBED` unset: a link containing `notfound` has no video, one containing `down` can't be reached, anything else is "Test <Service> title"); `OEMBED=real` asks the services | GO-LIVE: `OEMBED=real` in Cloudflare, the privacy notice line, the official service logos, then the flag on | off |
| Flag `canva_covers` (off, public) and the Canva stand-in | Design it in Canva is built (S1-E3-12; ADR 0009): Story settings shows the button only while `canva_covers` and `picture_uploads` are on. While `CANVA` isn't "real" (always locally and in e2e), `/api/canva/…` uses the stand-in: its own consent page (Allow, Cancel) and editor (Return) at `/api/canva/stub/…`, a stand-in token key, and a drawn 1600 × 2560 PNG as the export | GO-LIVE: the Canva developer app and its review, `CANVA=real`, `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET` and `CANVA_TOKEN_KEY` in Cloudflare, the privacy notice line, Canva's official logo, then the flag on | off |
| The "AI-written, not disclosed" label | `admin_set_ai_undisclosed_label()` exists and is tested (staff only, logged), but no screen calls it and nothing counts the `ai_label_confirmed_reports` (3) confirmed reports. Raising a rating is built: Stories › a story › Settings, and the picture review (`admin_raise_story_rating()`) | a later moderation story (no story ID yet) | same |
| The link preview picture | a plain square in the drawn cover's colour (plum for automatic covers and for 16+ and 18+ stories), `public/link-previews/<colour>.png`; the full title sits beside it as text in every app's card. Drawing the cover with its title (satori and resvg, Q13 option A) takes 30 to 50 ms of processor time a picture and about 240 ms the first time, and Cloudflare's free plan allows 10 ms a request, so Q13's fallback B is used (S1-E4-04) | none planned: option A comes back if the site moves to Cloudflare's paid plan (30 s a request), or if the picture is drawn once when a chapter is published, in a Supabase edge function (its limit is 2 s), which needs Robert's choice | same |
| Avatars | drawn avatars (DiceBear Micah, head and shoulders, from the avatar editor) or initials on a glass bead; uploaded pictures stay behind `picture_uploads` | GO-LIVE (the flag on) | same |
| Analytics | `trackEvent()` sends nothing: `VITE_ANALYTICS_PROVIDER` isn't set, so the adapter is off (ADR 0007) | GO-LIVE: Robert picks Plausible or Umami Cloud (Q49) and sets the three build variables | **set by hand** |
| Notification emails | queued and sent by `/api/notification-emails`, which the database wakes through pg_net; until the Vault has `email_worker_url` and `email_worker_key` and Cloudflare has `EMAIL_WORKER_KEY`, the emails wait in `email_outbox` and nothing leaves (locally, the e2e test wakes the worker itself and the emails go to Mailpit) | GO-LIVE (S1-E7-02 by-hand list) | **set by hand** |
| The Storage sweep | `run-storage-sweep` does nothing until the Vault has `storage_sweep_url` and `storage_sweep_key` and the `storage-sweep` Edge Function is deployed with `STORAGE_SWEEP_KEY`; until then a deleted row's file stays in Storage (locally nothing is ever swept; database test 212 checks the list of files and Vitest the function) | GO-LIVE (S1-E13-04 by-hand list) | **set by hand** |
| The bell's count | read every minute and when the tab comes back into view, not pushed (READ-3 decision) | Realtime, when it is worth one more moving part (no story yet) | same |

## Stubs and stand-ins from Lane C (safety and admin, from 23 Oct 2026)

| Stub | What it does today | Story that finishes it | On staging |
| --- | --- | --- | --- |
| The fresh sign-in (15 minutes) | asked before a role change (`require_role_change_allowed()`) and before deleting one's own account only; Robert decided on 8 Nov 2026 that "Emergency disable", removing part of a writer's text and exports for someone else don't ask ("an overkill"), so architecture 1.8.3's proposal is dropped | nothing: decided | same |
| Safety contacts | seeded from `content/safety-contacts.json`; staff edit them at Staff › Safety contacts (S1-E10-13b), with the monthly check panel | nothing | same |
| Banned emails | `banned_email_hash()` needs the Vault secret `banned_email_secret`; the seed sets a local value; without it on staging a ban still works but the email isn't blocked from signing up again | Robert's by-hand step (S1-E10-06) | **set by hand** |
| The on-call phone alert | an order's alert is a row in `on_call_alerts` naming who was on call; it escalates to everyone with the on-call permission after `on_call_escalation_minutes` (15) and shows on the queue with Acknowledge, but no phone or SMS is sent: the alert only logs (architecture 1.7.3, B26) | the phone alert story, once the SMS or push provider is chosen (OPEN) | same |
| Decision emails to people who used the public form | sent by `/api/decision-emails` right after a decision, as the moderator, because Cloudflare Pages has no scheduler; any that fail wait for the queue's "Send waiting decision emails" button. The words are draft text in `server/decision-emails.ts` | S1-E11-19 moves them into the admin-editable templates; a scheduled sender if Pages gains one | same |
