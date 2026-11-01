# Data export

Settings › Download my data, and the run that makes the copy. Built by S1-E13-02 (bundle PRIVACY, part b); Download my stories by S1-E13-05 (part e) and its EPUB (part f). Board: `design/boards/Settings.dc.html` (6.3, the Download my data tab). Design: ADR 0012 (the ZIP is built in the person's own browser).

- `components/DownloadMyDataSection.tsx`: the panel on `/settings` (id `download-my-data`): what the copy holds, then `ExportStatus` (Request my data, preparing, ready with Download ZIP and Make a new copy, or failed with Try again).
- `lib/runDataExport.ts`: the eight steps, from `request_data_export()` to `finish_data_export()`; `lib/exportRunStore.ts`: the small store the panel reads (`useDataExportRun`), which loads the run (and the Word and ZIP libraries) only when a copy is asked for.
- `components/DownloadMyStoriesBlock.tsx`: Download my stories at the foot of the panel (id `download-my-stories`): the Story drop-down, `StoriesFileChoices` (the chapters, the plan from Story Atlas, a JSON copy), `ChapterChoice` (all or chosen chapters) and Get my files; `hooks/useDownloadChoices.ts` holds the choices; `StoriesExportReady.tsx` is its ready line and `ExportDownloadButton.tsx` the download button both panels share.
- `lib/runStoriesExport.ts`: from `request_stories_export()` to `finish_data_export()`; `lib/storiesForData.ts` narrows the data file to the chosen stories and chapters (the JSON copy is that file); `hooks/useStoriesExport.ts` holds its hooks.
- `lib/planForWord.ts`: each story's Story Atlas rows as a plan for `src/lib/word/planToWord.ts`, in both downloads.
- `lib/storiesForWord.ts`: the data file's stories and chapters in the shape of the shared Word builder (`src/lib/word/`, which S1-E11-09a and S1-E13-05 reuse).
- `lib/pictureForWord.ts`: draws a chapter picture again as PNG, because Word can't read WebP.
- `lib/buildExportZip.ts`: `data.json` plus `stories/<slug>.docx` in one ZIP.
- `components/EpubSection.tsx`, `EpubDialog.tsx` and `EpubCoverField.tsx`: the EPUB of a completed story (PRIVACY part f), offered in Download my stories when one Completed story is chosen; `hooks/useMakeEpub.ts` makes and saves it; `lib/runEpub.ts` gathers the published chapters, pictures and words for `src/lib/epub/buildEpub.ts`; `lib/epubCover.ts` draws the cover on a canvas. Nothing is uploaded or stored: the name on the book stays in the browser (rule 5).
- `api/dataExport.ts` and `hooks/useDataExport.ts`: the calls and the hooks.
- Text: `src/locales/{ro,en}/dataExport.json` (`registerDataExportTranslations.ts`), including the words printed in the Word files.
- The database side: `supabase/migrations/…_s1_e13_02_download_my_data.sql`; tests `210` and `e2e/download-my-data.spec.ts`; for Download my stories `…_s1_e13_05_download_my_stories.sql`, test `213` and `e2e/download-my-stories.spec.ts`.
- `lib/libraryForExport.ts` (IDEAS-1 part f): the library shelves from `my_data_export()` get full links (`withLibraryLinks()`) and go into the ZIP as `library.csv` too (`libraryCsvFile()`). The database side: `supabase/migrations/…_ideas1_f_library_in_my_data.sql`; test `220`.
