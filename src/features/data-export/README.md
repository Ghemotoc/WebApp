# Data export

Settings › Download my data, and the run that makes the copy. Built by S1-E13-02 (bundle PRIVACY, part b). Board: `design/boards/Settings.dc.html` (6.3, the Download my data tab). Design: ADR 0012 (the ZIP is built in the person's own browser).

- `components/DownloadMyDataSection.tsx`: the panel on `/settings` (id `download-my-data`): what the copy holds, then `ExportStatus` (Request my data, preparing, ready with Download ZIP and Make a new copy, or failed with Try again).
- `lib/runDataExport.ts`: the eight steps, from `request_data_export()` to `finish_data_export()`, and the small store the panel reads (`useDataExportRun`).
- `lib/storiesForWord.ts`: the data file's stories and chapters in the shape of the shared Word builder (`src/lib/word/`, which S1-E11-09a and S1-E13-05 reuse).
- `lib/pictureForWord.ts`: draws a chapter picture again as PNG, because Word can't read WebP.
- `lib/buildExportZip.ts`: `data.json` plus `stories/<slug>.docx` in one ZIP.
- `api/dataExport.ts` and `hooks/useDataExport.ts`: the calls and the hooks.
- Text: `src/locales/{ro,en}/dataExport.json` (`registerDataExportTranslations.ts`), including the words printed in the Word files.
- The database side: `supabase/migrations/…_s1_e13_02_download_my_data.sql`; tests `210` and `e2e/download-my-data.spec.ts`.
