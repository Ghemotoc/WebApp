# ADR 0012: The "Download my data" ZIP is built in the person's own browser

- **Date:** 1 November 2026
- **Status:** Proposed by the builder (PRIVACY-b, S1-E13-02). Robert to confirm; the alternatives below stay open.

## Context
S1-E13-02 asks for one ZIP with a machine-readable JSON file of everything about the account plus every story as a Word (.docx) file, made by a background job, with a download link that needs sign-in and expires after seven days. S1-E11-09a (staff data requests) and S1-E13-05 (Download my stories) reuse the same Word builder.

Our server functions run as Cloudflare Pages Functions on the free plan, which allows 10 ms of processor time a request (measured for the link preview picture, docs/mocks.md). Building Word files and a ZIP takes far longer than that. Supabase Edge Functions allow 2 s but this project has no deploy pipeline for them yet (`supabase/functions/` is empty). Q49's recommendation was the `docx` library in an edge function.

## Decision
- **The browser builds the files.** The signed-in person's own tab reads `my_data_export()` with their own token, turns every story into a Word file with the shared Word builder (`src/lib/word/`, the `docx` library) and zips the data file and the Word files (`jszip`). It runs in the background of the open tab: the person can keep using the app, and the panel asks them to keep the tab open.
- **The database decides what matters.** What goes in (`my_data_export()` and the one list `data_export_tables()`, checked by database test 210), who may upload (only into their own open export, under a random file name) and download (only the owner, only while ready, for seven days), and the notification (`finish_data_export()`, which also takes the file's size from storage, never from the browser).
- **Storage, not a server, holds the file.** A private `exports` bucket; a download address is signed for one minute, for the signed-in owner only.
- **One copy at a time.** A new copy replaces the older one: the browser deletes the older file, and `finish_data_export()` drops its row. The nightly clean-up of expired exports and any file left behind is S1-E13-04.

## Consequences
- No service key and no new processor; nothing the person can change in their browser reaches anyone else's data, because every read and write is their own under row-level security.
- A very large account builds on a slow phone more slowly; the Word files are built one story at a time.
- If the tab closes halfway, the copy isn't made; asking again starts afresh (a copy still being built is replaced).
- Staff requests (S1-E11-09a) build the same ZIP in the staff member's browser from an admin version of `my_data_export()` (`admin_data_request_export()`, ADMIN-2c2, 2 Nov 2026), or the same files one by one; they are exports of kind `data_request`, owned by the person, who downloads them signed in. Staff upload them through their own storage policy and can open one only after the opening is logged.
- **Alternatives, if Robert prefers a server job:** a Supabase Edge Function (2 s of processor time a request, needs a deploy pipeline), or Cloudflare's paid plan (30 s a request). Either would run the same `src/lib/word/` builder; only `runDataExport.ts` would move.
