# ADMIN-2c2 plan: building and sending the copy (S1-E11-09a, second half)

Part c is now split in three: c1 (merged, #288) the log; **c2 the copy for the person themselves**; c3 the parent's or guardian's path for under-16s (one-time link to the checked email address, a public download page), which closes #107. The parent path needs its own server function, token and page, so it is its own part.

## Criteria in c2
1. Staff build the copy in their own browser (ADR 0012's "staff requests build the same ZIP in the staff member's browser from an admin version of my_data_export()"): `admin_data_request_export(request_id)` returns exactly what `my_data_export()` returns for the person (every story by user ID, so earlier names, drafts and unpublished chapters are in). Reading it is a sensitive read and is logged.
2. Staff choose "One ZIP of everything" (data.json, a Word file per story and per plan, library.csv) or "Each file on its own" (the same files one by one). The Word files use the shared builder, in the person's language.
3. Only when the identity check is done (made in the app, or the person confirmed); never after "No, it wasn't me"; only for "a copy" or "move my data"; a request about an under-16 not made inside their own account is refused here (hint parent_needed, part c3).
4. Sending: the files go to the private exports bucket as exports of a new kind `data_request`, owned by the person, ready for 7 days. The person gets a required notice, also emailed to the account's own address, that opens Settings › Data requests, where the files download only when signed in (the existing exports_select_own policy). Nothing goes to any other address.
5. Staff see the file names and sizes and when they stop working. "Open" is possible but logged: `admin_open_data_request_file()` writes the audit row, and the storage policy lets that staff member read the file only for 5 minutes after their own logged open.
6. The log keeps which files were sent and when (`data_requests.copies_sent`: names and sizes, never contents); the files themselves are removed after 7 days by the nightly clean-up (S1-E13-04, unchanged).
7. Moderator and content editor refused, as in c1.

## Database
- Enum migration: export_kind `data_request`; notification kind `data_request_copy_ready`.
- `exports`: `data_request_id`, `display_name`, `built_by_user_id`; checks that only `data_request` rows have them; file name check also allows .csv; bucket allows text/csv.
- `export_upload_allowed()` and `finish_data_export()` leave `data_request` rows out (the person can't upload into or finish a staff copy).
- Storage policies: `exports_insert_staff` (staff upload into a copy they are building), `exports_select_staff_opened` (5 minutes after a logged open).
- Functions: `admin_data_request_export(id)`, `admin_open_data_request_copy(id, files jsonb)`, `admin_finish_data_request_copy(id)`, `admin_open_data_request_file(id, export_id)`; `admin_data_request()` gains `language`, `files` and `copies_sent`; `my_data_requests()` gains `files`.
- Notification plumbing for the new kind (required, emailed, staff category, link to Settings).

## Tests
- pgTAP 243: allowed and denied for both new storage policies; every refusal (identity, denied, type, under-16, closed, role); the export equals my_data_export(); files and sizes from storage; the person's notice and email; the person can download, can't upload into or finish the staff copy; copies_sent kept after closing; logged open.
- Unit: the copy run (ZIP and separate), file sizes, the notice and email words.
- E2E: support build and send a ZIP for a confirmed request; the person downloads it from Settings; staff see names and sizes and open one (logged); refusals shown; axe at 390, 768, 1440.
