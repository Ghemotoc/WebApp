<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E13-02 (Download my data). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 8 PRIVACY, part b: Settings › Download my data. It makes one ZIP with a machine-readable data file of everything about the account and every story as a Word file. This PR also builds the shared Word builder that S1-E11-09a and S1-E13-05 will reuse. Board: Settings 6.3, the Download my data tab. Law: GDPR art. 15 and 20.

## What changed

- **The one design choice (ADR 0012, a proposal):** the ZIP is built in the person's own browser.
  - Our server functions run on Cloudflare's free plan, which allows 10 ms of processor time a request, far too little for Word files and a ZIP.
  - The database still decides everything that matters: what goes in, who may upload and download, the seven days and the notification.
  - The alternatives are a Supabase Edge Function or Cloudflare's paid plan. Either would run the same Word builder.
- **Database:** `20261115100001_s1_e13_02_enums.sql` adds the `data_export_ready` notification kind; `20261115100002_s1_e13_02_download_my_data.sql` adds the rest.
  - **The table `exports`** (kind: user_action), with RLS: the person reads their own rows (`exports_select_own`), and every write goes through the functions. Each file has a random name, never the user ID.
  - **The private bucket `exports`** (200 MB, ZIP only), with three policies:
    - `exports_insert_own`: the person adds the file of their own open export;
    - `exports_select_own`: they read it only while it is ready and less than seven days old (criterion 3);
    - `exports_delete_own`: they delete their own files.
  - **`my_data_export()`** answers the data file:
    - the user ID;
    - the account: email, when it was confirmed, the ways to log in, and the profile with the year of birth and the age check result, date and method;
    - the person's rows of every table in the one list `data_export_tables()`: stories, chapters (drafts included), revisions, comments, reactions, sent messages, follows, blocks, library, reading settings, notifications, consents, reports they made, appeals, statements of reasons, Story Atlas notes and the rest.
    - `export_row_for_owner()` drops other people's user IDs. It names the person you follow, blocked, wrote to or reported by username instead. It also drops secrets (`*_hash`, `*_token`, `*_key`), the parent's email and staff's internal appeal note.
  - **Every new user table must join the list.** Database test 210 fails when a table marked `kind: user_content` or `kind: user_action` is in neither list, so each later content type adds itself (as the story asks).
  - **Left out, each with its reason in the list:**
    - the Canva connection, which holds keys to the person's Canva account;
    - the unsubscribe key, a secret;
    - the email queue, whose notifications are already included;
    - short-lived steps: Yoti sessions, connecting a way to log in, and rate-limit counters;
    - moderators' username approvals.
  - **`request_data_export()`** allows three requests an hour, and replaces a copy still being built.
  - **`finish_data_export()`** needs the uploaded file and takes its size from storage, never from the browser. It marks the copy ready for seven days, drops older copies and sends the notification.
- **The shared Word builder** (`src/lib/word/`, using `docx` 9.5.1) follows S1-E11-09's rules:
  - the file opens with the title, the pen name, the user ID, the dates created, first published and last updated, and the status;
  - every chapter follows in order, each on a new page, with its title, status and dates;
  - the document language is set from the story, so ă, â, î, ș and ț read and spell-check as Romanian;
  - the title is Word's Title, chapters are Heading 1 and the text's headings are Heading 2 and 3;
  - bold, italic, links, quotes, real bullet and numbered lists, and the scene break all carry over;
  - pictures are included with their alt text. WebP is redrawn as PNG, because Word can't read WebP. A picture that can't be loaded leaves "Picture: <alt text>".
  - music and video cards are listed as links.
- **Screens:**
  - **Settings › Download my data** (`src/features/data-export/`), as a panel like the others. It lists what the copy holds, then shows one of four states:
    - Request my data, with the one-month line;
    - preparing, with the board's clock and "keep this tab open";
    - ready, saying until when the link works, with the size and the number of Word files, "Download ZIP" and "Make a new copy";
    - failed, with Try again.
  - **Download ZIP** asks Storage for a one-minute address for the signed-in owner, so the link needs sign-in.
  - **The new notification**, "Your account: your copy of your data is ready to download", opens the panel.
- **Inside the ZIP:** `data.json` (pretty-printed UTF-8) and `stories/<slug>.docx`.
- **Text:** a new `dataExport.json` (the panel and the words printed in the Word files), plus two lines in `notifications.json`. All in ro and en.
- **Docs:**
  - ADR 0012;
  - `docs/code-tour.md`, `supabase/README.md` and `docs/retention.md` (a row for exports);
  - `docs/board-fixes.md`;
  - the feature README.

## How it was tested

- **pgTAP `210-download-my-data` (36 tests):**
  - **The one list:** every user_content and user_action table is in it; every table left out says why; every listed table exists.
  - **Asking:** signed out is refused. A copy gets a random ZIP name that is never the user ID. Asking again replaces the unfinished copy.
  - **The data file:**
    - it holds the user ID, email, username, pen name, year of birth, the age check, consents, stories with Romanian letters intact, drafts, only the person's own comments and only their sent messages, settings, and reports naming the reported person by username;
    - nowhere in it is another person's user ID or a secret.
  - **The file:**
    - it can't be finished before the upload;
    - nobody can upload under someone else's name, or a name that isn't an open export;
    - it can't be read while still being built;
    - once finished, it is ready for seven days, its size comes from storage and the notification is sent;
    - only the owner reads it, and nobody after seven days;
    - someone else's delete leaves it, and the owner's delete removes it.
  - **Policies:** each has an allowed and a denied test.
- **Vitest:**
  - `storyToWord.test.ts` (8): builds real .docx files and reads their XML back, covering the opening details, Romanian letters and `ro-RO`, real headings in order, chapter dates, every Markdown piece, links, a picture with its alt text, a missing picture, and embeds as links.
  - `storiesForWord.test.ts` (4), `runDataExport.test.ts` (3: the eight steps in order, the ZIP's contents, and a failure becoming a state) and `fileSize.test.ts` (2).
- **e2e `download-my-data.spec.ts` (14):**
  - adult_writer requests, waits for "Your file is ready", gets the notification and downloads `my-data-<date>.zip`;
  - the downloaded ZIP holds `data.json` with their user ID and email, and a Word file whose text has "Țara de sub ape";
  - teen_17 can't get a download address for adult_writer's copy, while the owner can;
  - axe and no sideways scroll at 390, 768 and 1440 px, light and night, ro and en.
- **Screenshots:** checked by eye: the idle, preparing and ready states and the notification, in ro and en, at 390 and 1440 px.

## Local check run

On Node 24, locally:

- Static checks (lint, typecheck, types:check, i18n:check, migrations:check, Prettier, the third-party build check) all pass.
- Vitest: 1,008 of 1,008 pass.
- Database (pgTAP): 120 files, 2,752 tests, all pass, including the new `210-download-my-data` (36 tests).
- Wrangler compiles the Pages Function.
- End to end (`download-my-data`, `privacy-settings`, `notifications`, `teacher-badge`, `message-settings`): 86 passed.
- The first run caught two things, both fixed before this PR:
  - a missing English plural key (`readySize_few`);
  - the Word and ZIP libraries had landed in the Settings page's bundle (about 500 kB). They now load only when a copy is asked for (`exportRunStore.ts` imports the run on demand).
  - The third-party check now lists the Word files' XML namespaces and two library help links, none of which is ever loaded.
- Screenshots of the idle, preparing and ready states and the notification, in ro and en, at 390 and 1440 px, were checked by eye.

## By hand

- Nothing on staging: no SQL top-up and no new secret. The migration creates the `exports` bucket.

## Board mismatches

In `docs/board-fixes.md`:
- Download my data is a panel, not a tab.
- "You can leave this page" becomes "keep this tab open until it's ready", because the file is built in the browser (ADR 0012).
- "Forum posts" is left out of the list until forums exist. The list names the account details and the reports, which criterion 2 puts in the copy. The ready line adds the size and "Make a new copy".

## Questions for Robert (OPEN or not in the story, built as proposals)

- **Where the ZIP is built (ADR 0012):** in the person's browser, because of Cloudflare's 10 ms limit. A server job needs a Supabase Edge Function deploy pipeline or Cloudflare's paid plan. Shall I keep the browser build?
- **Which words go into the Word files:** each chapter's latest draft, the writer's newest words. The published copy stays in the data file.
- **Deleted items:** stories and chapters the writer deleted are left out of the Word files but stay in the data file until they are purged, because we still hold them.
- **Left out of the data file:** Canva keys, the unsubscribe key, the email queue, short-lived steps, moderators' username approvals, the parent's email address and staff's internal appeal note. Sanctions are explained through the statements of reasons, which are included.
- **Limits:** three requests an hour, one copy kept at a time, and 200 MB a file.

## Follow-ups

- S1-E13-04: the nightly clean-up of expired exports and their files (and any file a closed tab left behind).
- S1-E11-09a: an admin version of `my_data_export()` for staff requests, built in the staff member's browser with the same builder.
- S1-E13-05: Download my stories reuses `storyToWord()` and the `exports` table (a new `export_kind`).
- Forum posts join the data file through `data_export_tables()` when forums arrive (S1-E8).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
