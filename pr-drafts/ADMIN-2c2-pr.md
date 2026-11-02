<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Part of #107

Bundle 12 ADMIN-2, part c2: building and sending a data request's copy to the person (S1-E11-09, part 09a; screen 8.12; ADR 0012). Part c is now in three: c1 the log (#288), c2 the copy for the person, c3 the parent's or guardian's path for under-16s (a one-time link to the checked email address and its own download page), which closes #107.

## What changed
- **Building the copy (criteria "an export starts" and "the machine-readable copy").** A new "The copy" panel on a request for a copy or to move the data. Staff build it in their own browser, as ADR 0012 planned: `admin_data_request_export()` gives exactly what Download my data gives the person (every story by user ID, so earlier names, drafts and unpublished chapters are in), and the Download my data builders make the Word file of every story and plan and the library spreadsheet, in the person's language. Reading the data is logged.
- **One ZIP or file by file (criterion "staff can send one file per story or one zip of all").** "One ZIP of everything" (`D-000001-copy.zip`: data.json, the Word files, library.csv) or "Each file on its own" (the same files one by one).
- **Only when it may go (criteria 4 and 5).** The copy is refused until the identity check is done (made in the app, or the person confirmed), after "No, it wasn't me", for requests that aren't for a copy or a move, and for an under-16's request that didn't come from their own account (the parent's path, part c3). The panel says which, before anyone presses a button; the database checks again.
- **Sending (criterion "the files are ready").** The files go to the private exports bucket as a new export kind, `data_request`, owned by the person, under random names, ready for seven days. The person gets a notice they can't switch off, also emailed to the account's own address ("We never send your data by email"), which opens Settings › Data requests, where each file has a Download button that works only when signed in (the existing owner-only storage policy). A new copy for the same request replaces the earlier one.
- **Names, sizes and logged opening (criterion "staff see the file names and sizes").** Staff see each file's name, size (from storage, never from the browser) and last day. "Open" writes the audit row first; only then, for five minutes, may that staff member read that file (a new storage policy). Nobody else on the team can.
- **The log (criterion "a request is closed").** `data_requests.copies_sent` keeps when each copy was sent, until when and which files with their sizes, never their contents; it stays after closing. The files themselves go after seven days with the existing nightly clean-up (S1-E13-04).
- **The person can't touch a staff copy.** `export_upload_allowed()` and `finish_data_export()` now leave `data_request` exports out.
- **Database.** Two migrations: the enum values (`export_kind` `data_request`, notification kind `data_request_copy_ready`), then the columns, checks, two storage policies, four `admin_*` functions, `admin_data_request()` and `my_data_requests()` with the files, and the notice plumbing.
- `ExportDownloadButton` now takes the file name instead of the whole export, so Settings › Data requests reuses it; Download my data's word hooks take an optional language.

## How it was tested
- Database test `243-data-request-copy.test.sql` (45 checks): a moderator, the content editor and the person refused; refused before the identity check, after "not me", for a delete request and for an under-16's request by email, allowed for a 14-year-old's own request in the app; the staff copy equals `my_data_export()`; the read is logged; bad file lists refused; files owned by the person with matching endings; allowed and denied for `exports_insert_staff` (support upload; a moderator can't) and `exports_insert_own` (the person can't fill a staff copy) and `exports_select_own` (the person reads, nobody else); the person can't finish it; nothing sent before the files arrive; sizes from storage; seven days; the log, the audit row, the required notice and email; allowed and denied for `exports_select_staff_opened` (only after a logged open, only that staff member, not once expired); a file opens only from its own request; a second copy replaces the first and the log keeps both; closing keeps the record and refuses a new copy. Tests `210`, `213` and `242` still pass.
- Unit tests: the copy run (the calls in order; one ZIP with every file; file by file with the right types; a refusal stops it), file names, file types, when a copy may be sent, the notice's words and the email.
- Browser test `e2e/data-requests.spec.ts`: support build and send a ZIP for a request made in the app, see its name, open it (a download); the person follows the notice to Settings and downloads it. The axe views now include a file waiting and a copy sent. `download-my-data`, `download-my-stories`, `notifications` and `notification-emails` still pass.
- Screenshots of the copy panel and the person's files at 1440 and 390 px checked by eye.

## Local check run
LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand
Nothing: no SQL top-up, no new secrets and no new settings.

## Board mismatches
- AdminDataRequests (8.12) draws an "Export everything" files panel with per-story Word and PDF rows; here the copy is one panel with the format choice, and PDF comes with part d (12d). The files list shows the names and sizes, as the board does.

## Questions for Robert
- Staff copies leave out pictures that haven't passed their check yet (the Word file says "Picture: <alt text>" instead), so support never see an unchecked picture. Say if you'd rather the copy always held every picture.
- The ZIP is called `D-000001-copy.zip` (the request's reference). Say if you'd like another name.

## Follow-ups
- Part c3: the parent's or guardian's path for under-16s (S1-E11-09 criterion 5), which closes #107.
- Part d: PDF files alongside the Word files.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
