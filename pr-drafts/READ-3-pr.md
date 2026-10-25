<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #59
Closes #63
Closes #62
Closes #66

Bundle READ-3: private downvotes on comments, in-app notifications (the bell and the Notifications page) and the epic checks for S1-E6 and S1-E7. One commit per story.

## What changed

**S1-E6-04 Private downvote** (`…_s1_e6_04_downvotes.sql`)
- `comment_downvotes` (one per person and comment) and `downvote_comment(comment_id, should_downvote)`: only on a live comment the reader may read, never their own; adding one goes through the account gate, taking it back always works.
- Nobody gets a count, the author included: `comment_json()` answers only `downvoted_by_me`. Moderation staff can read the rows.
- An account under 24 hours old (`downvote_new_account_hours`) is kept but not counted. At `downvote_case_threshold` (5) counted accounts the comment enters the queue once, as a `downvotes` case (`D-000001`) at the lowest tier (`seven_days`). Downvotes never reach ranking (Q22).
- The Downvote chip in each comment's actions with "Downvote sent. It's private…"; the queue and case page show the "Private downvotes" source and signal.

**S1-E7-01 In-app notifications** (`…_s1_e7_01_notifications.sql`, `src/features/notifications/`)
- `notifications`: one row per person told. Kinds: new chapter (followers of the writer or the story), comment on your chapter, reply to your comment, reactions on your comment (grouped within an hour), new followers (grouped within a day) and moderation decisions (`is_required`, always on, DSA art. 17).
- `run_notification_jobs()` turns the queued `chapter_published` and `comment_posted` jobs into rows every minute (pg_cron); reactions, follows and decided cases notify through triggers.
- Reading applies the reader's own rules (`notification_is_shown()`): ratings, blocks and moderation, so the list and the badge always agree. Answers carry usernames, never a user ID.
- The bell in the top bar with the unread count (every minute and on focus) and the page at `/notifications` (board 6.2): "What's new", the unread line, "Mark all as read", filter chips with counts, Today, Yesterday, Earlier this week and Older, "Show older", the "Decisions about your posts" card.
- Kept 90 days (`notifications_keep_days`), a decision a year; purged nightly.

**S1-E6-QA and S1-E7-QA**: browser and database journeys across the epics with the seed personas (`e2e/epic-s1-e6.spec.ts`, `e2e/epic-s1-e7.spec.ts`, tests `096` and `097`), the reports `docs/epic-reports/S1-E6.md` and `S1-E7.md`, and the code tour's epic summaries. The S1-E7 check found two breaks, fixed here (see the report).

## Acceptance criteria

**S1-E6-04**

| Criterion | Test |
| --- | --- |
| Nobody sees a downvote count, the author included | `153`, `e2e/comment-downvotes.spec.ts`, `096` |
| At the threshold of distinct accounts, the comment enters the queue at the lowest priority | `153` (threshold, one case, `seven_days`, `downvotes` source) |
| An account under 24 hours old isn't counted | `153` (pending_check) |
| Forum posts | after March, with S1-E8 (Follow-ups) |

**S1-E7-01**

| Criterion | Test |
| --- | --- |
| A followed writer publishes: followers are told | `154`, `097`, `e2e/epic-s1-e7.spec.ts` (journey 2) |
| Reactions within an hour are grouped into one | `154`, `097`, `lib/notificationText.test.ts` |
| The bell's badge shows the count and "Mark all as read" clears it | `154`, `e2e/notifications.spec.ts` |
| A moderation decision arrives and can't be switched off | `154`, `097`, `e2e/notifications.spec.ts` ("Always on") |

**S1-E6-QA and S1-E7-QA**: the journeys with `adult_writer`, `teen_17`, `kid_14_ok` and `kid_14_waiting` pass; axe at 390, 768 and 1440 px; every policy has an allowed and a denied test; the code tour covers both epics; the reports list what works, the gaps and the stubs.

## Definition of Done

- [x] Strict TypeScript, ESLint and Prettier pass; readable-code rules (headers, doc and step comments, complexity under 10).
- [x] Generated types up to date (`types:check`).
- [x] RLS on `comment_downvotes` and `notifications`, each policy with an allowed and a denied test; grants match (`003`).
- [x] No user ID on any screen or in any answer (tested in `154`).
- [x] Romanian and English for every line; ș and ț checked.
- [x] axe clean at 390, 768 and 1440 px; keyboard (chips are buttons with `aria-pressed`, rows are links).
- [x] Doodle and icon files are SVG; the empty state's doodle passes the overlap check.
- [x] Retention, code tour, board fixes, mocks and the jobs runbook updated.
- [ ] Robert's check on staging (by hand below).

## Screenshots

Taken at 390, 768 and 1440 px for `/notifications` as adult_writer (not attached: the session can't upload images). At 1440 px the list sits beside the decisions card; at 390 px the top bar wraps, the chips wrap onto two rows and the card follows the list, with nothing cut off or scrolling sideways.

## Local check run

Clean start on `a17ae49` (`npm ci`, `supabase stop --no-backup` and `start`, `npm run build`, `npm run checks`, `npx wrangler pages functions build`):

| Check | Result |
| --- | --- |
| Lint, typecheck, types:check | passed |
| Vitest | 90 files, 558 tests passed |
| pgTAP (after `db reset`) | 62 files, 1,345 tests passed |
| Playwright with axe | 725 passed, 1 skipped (37.2 min) |
| i18n and migrations checks | passed |
| Pages Functions build | compiled |

## Decisions taken

- The badge is read every minute and when the tab comes back into view, not through Realtime: one less moving part for March. Realtime can replace it without changing the table.
- Grouping windows: reactions on one comment within an hour (the story's proposal), new followers within a day. Both are settings.
- What a person sees is decided when they look, with their own rules, instead of when the row is written; so a rating change or a block takes effect at once, and the badge never counts something the list hides. A grouped row with a blocked person keeps the others.
- A decision's notification says what was decided and links to the item. The statement of reasons and the appeal link join it in SAFE-3 (S1-E10-04, S1-E10-07).
- Downvote threshold 5 and the 24-hour rule are settings, changed by migration until S1-E11-03.
- The board's bell dot became a count, as the story asks; the Settings link, "Your choices", "Unread only" and the data download, certificate and mention rows wait for their stories (`docs/board-fixes.md`).
- A comment notification opens the chapter, not the comment, because comments load after the chapter text.
- The board's two header doodles are left out (they would meet the heading at 768 px); the sleeping cat stays on the empty state.

<details><summary>New Romanian lines (for Robert to read)</summary>

- "label": "Vot negativ"
- "sent": "Vot negativ trimis. E privat: nimeni nu vede un număr, nici măcar scriitorul. Doar moderatorii se uită la el."
- "read_only": "Contul tău nu poate da încă vot negativ."
- "other": "Nu am putut salva votul negativ. Verifică conexiunea și încearcă din nou."
- "reportContent": "Raportează conținut"
- "notifications": "Notificări"
- "notificationsUnread_one": "Notificări, {{count}} nouă"
- "notificationsUnread_few": "Notificări, {{count}} noi"
- "notificationsUnread_other": "Notificări, {{count}} de noi"
- "picture_check": "Verificare de imagine"
- "downvotes": "Voturi negative private"
- "reports": "Raportări: {{count}}"
- "downvotes": "Vot negativ de la mai multe conturi"
- "eyebrow": "Notificări"
- "title": "Ce e nou"
- "newSince_one": "{{count}} notificare nouă de când te-ai uitat ultima dată."
- "newSince_few": "{{count}} notificări noi de când te-ai uitat ultima dată."
- "newSince_other": "{{count}} de notificări noi de când te-ai uitat ultima dată."
- "caughtUp": "Le-ai văzut pe toate."
- "markAllRead": "Marchează toate ca citite"
- "markFailed": "Nu le-am putut marca drept citite. Verifică conexiunea și încearcă din nou."
- "loadFailed": "Nu am putut încărca notificările. Verifică conexiunea și încearcă din nou."
- "showOlder": "Arată notificări mai vechi"
- "aboutLabel": "Despre notificări"
- "signedOut": "Intră în cont ca să-ți vezi notificările."
- "logIn": "Intră în cont"
- "label": "Arată"
- "all": "Toate"
- "replies": "Răspunsuri"
- "follows": "Urmăriri"
- "stories": "Povești"
- "staff": "Echipa"
- "today": "Azi"
- "yesterday": "Ieri"
- "thisWeek": "Mai devreme săptămâna asta"
- "older": "Mai vechi"
- "someone": "Cineva"
- "two": "{{first}} și {{second}}"
- "many_one": "{{first}}, {{second}} și încă {{count}} persoană"
- "many_few": "{{first}}, {{second}} și încă {{count}} persoane"
- "many_other": "{{first}}, {{second}} și încă {{count}} de persoane"
- "moderationTeam": "Echipa de moderare:"
- "chapterOfStory": "capitolul {{position}} din {{story}}"
- "newChapter": "a publicat {{where}}."
- "commentOnChapter": "a comentat la {{where}}."
- "commentReply": "ți-a răspuns la comentariul de la {{where}}."
- "commentReactions": "a reacționat la comentariul tău de la {{where}}."
- "newFollower": "a început să te urmărească."
- "reactions_one": "{{count}} reacție"
- "reactions_few": "{{count}} reacții"
- "reactions_other": "{{count}} de reacții"
- "story": "povestea ta"
- "chapter": "capitolul tău"
- "comment": "comentariul tău"
- "profile": "profilul tău"
- "other": "postarea ta"
- "no_action": "un moderator a verificat o raportare despre {{item}} și nu a luat nicio măsură, așa că nu se schimbă nimic."
- "hide": "un moderator a ascuns {{item}} de ceilalți."
- "remove": "un moderator a șters {{item}}, pentru că încalcă regulile."
- "restrict": "un moderator a limitat cine poate vedea {{item}}."
- "warn": "un moderator ți-a trimis un avertisment despre {{item}}."
- "suspend": "un moderator ți-a suspendat contul pentru o vreme. Decizia privește {{item}}."
- "ban": "un moderator ți-a închis contul. Decizia privește {{item}}."
- "public_note": "un moderator a adăugat o notă la {{item}}."
- "readNow": "Citește acum"
- "openChapter": "Deschide capitolul"
- "reply": "Răspunde"
- "seeWho": "Vezi cine"
- "seeProfile": "Vezi profilul"
- "seeIt": "Vezi"
- "alwaysOn": "Mereu pornite"
- "unread": "Necitită"
- "title": "Le-ai văzut pe toate"
- "body": "Capitolele noi, răspunsurile și urmăririle vor apărea aici."
- "heading": "Decizii despre ce ai postat"
- "body": "Când un moderator ia o decizie despre ceva ce ai postat, afli mereu aici. Nu le poți opri."

One to judge: the bell's spoken name for 20 or more reads "Notificări, {{count}} de noi"; "Notificări, {{count}} noi" may sound better.

</details>

## By hand

1. After the merge, the migrations reach staging through Supabase's GitHub integration. Check the jobs with `select jobname, schedule from cron.job;`: `run-notification-jobs` every minute and `purge-old-notifications` at 03:41.
2. Follow one test account from another, comment on its chapter and publish a chapter: within a minute the bell shows the count.
3. Read the Romanian lines above.

## Follow-ups

- Forum post downvotes with the forums (S1-E8).
- A notification link that opens the exact comment (needs the comments to load with an anchor).
- Tell reporters the outcome, and add the statement of reasons and appeal link to decision notifications (SAFE-3).
- Notification settings and email digests (S1-E7-02, after March).

## Lawyer

The decision notification and the downvote case touch moderation decisions and statements of reasons: **needs the lawyer's review before launch** (DSA art. 17 wording of each decision line).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
