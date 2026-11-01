# PRIVACY-b plan: S1-E13-02 Download my data, with the shared Word builder

## The one design choice: where the ZIP is built

The Cloudflare free plan gives a Pages Function 10 ms of processor time (docs/mocks.md, link
preview), so Word files and a ZIP can't be built there. Supabase Edge Functions (2 s) have no
deploy pipeline yet. Proposal (ADR 0012): the person's own browser builds the files with their own
token, using the shared Word builder, and uploads the ZIP to a private `exports` bucket. The
database decides everything that matters: what goes in (`my_data_export()`), who may upload and
download (storage policies), the seven-day expiry and the notice. Flagged for Robert.

## Database (one migration and an enum migration)

- `20261115100001_s1_e13_02_enums.sql`: notification_kind `data_export_ready`.
- `20261115100002_s1_e13_02_download_my_data.sql`:
  - enums `export_kind` ('all_my_data'; S1-E13-05 adds its own) and `export_state` ('building',
    'ready');
  - table `exports` (kind: user_action): user_id, kind, state, file_name (random `<uuid>.zip`,
    never the user ID), file_size, story_count, ready_at, expires_at; RLS select own; grants
    select to authenticated; writes only through functions;
  - private bucket `exports` (200 MB, application/zip); policies: insert only into a building
    export of the caller's, select only while ready and not expired, delete own files;
  - `data_export_tables()`: every user_content and user_action table, either included (the
    caller's rows) or left out with a reason; database test 210 fails when a new table is in
    neither list ("each later content type adds itself");
  - `export_row_for_owner(jsonb)`: drops other people's IDs (`*_user_id`, `*_user_ids`) and
    secrets (`*_hash`, `*_token`, `*_key`, `parent_email`), and turns followed, blocked, recipient
    and reported IDs into handles;
  - `my_data_export()`: format, made_at, user_id, account (email, ways to log in, the profile with
    the age check), and every included table;
  - `request_data_export()`, `finish_data_export(export_id, file_size, story_count)`,
    `my_data_exports()`, `delete_my_data_export(export_id)`; notification on finish;
  - rate limit `data_export` 3 an hour;
  - notification_category and the notifications text for the new kind.

## Front end

- `src/lib/word/`: the shared Word builder (`storyToWord.ts` builds one .docx per story to
  S1-E11-09's rules: title, pen name, user ID, dates, status, every chapter in order with its
  dates; real headings; Romanian letters; pictures with alt text; embeds as links;
  `markdownToWord.ts` turns the chapter Markdown subset into Word paragraphs).
- `src/features/data-export/`: api, `buildDataExport.ts` (JSON plus Word files into one ZIP with
  jszip), hooks, `DownloadMyDataSection` in Settings (id `download-my-data`), README.
- Notifications: the new kind's words, linking to Settings › Download my data.
- Locales en and ro: `dataExport.json` plus notification and Word labels.

## Tests

- pgTAP 210: policies allowed and denied, the registry, the JSON's contents, the functions.
- Vitest: the Markdown to Word conversion, storyToWord (real headings, Romanian letters, embeds as
  links, pictures), the ZIP builder, the api.
- Playwright `download-my-data.spec.ts`: request, build, ready, download the ZIP and read it.

## Docs

ADR 0012, code tour, supabase README, retention (exports: 7 days; the file purge is S1-E13-04),
mocks (none), decisions (none: proposals in the PR), board-fixes if the board differs.
