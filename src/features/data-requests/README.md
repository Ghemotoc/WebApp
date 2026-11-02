# Data requests

Requests to see, move, correct or delete someone's data: the staff log with its deadlines, and the person's own list in Settings (bundle ADMIN-2, part c1; story S1-E11-09, part 09a; screen 8.12; GDPR art. 12). Part c2 adds building and sending the copy (ADR 0012: built in the staff member's browser with the Download my data builders, downloaded by the person signed in); the parent's path for under-16s is part c3.

- `api/dataRequests.ts`: the staff calls (`admin_open_data_request()`, `admin_data_requests()`, `admin_data_request()`, `admin_extend_data_request()`, `admin_ask_data_request_confirmation()`, `admin_close_data_request()`), with the answers checked by zod.
- `api/dataRequestCopy.ts`: the copy's calls (`admin_data_request_export()`, `admin_open_data_request_copy()`, the upload, `admin_finish_data_request_copy()`, `admin_open_data_request_file()`).
- `api/myDataRequests.ts`: the person's calls (`my_data_requests()`, `answer_data_request()`), with the copy's files.
- `hooks/useStaffDataRequests.ts`, `hooks/usePersonSearch.ts` (finds the person through the Users look-up), `hooks/useDataRequestWords.ts` and `hooks/useMyDataRequests.ts`.
- `lib/dataRequestDates.ts`: dates in words, days left, the pill colour and the extensions still allowed.
- `lib/dataRequestCopyRules.ts` (why a copy can't be sent yet) and `lib/runDataRequestCopy.ts` (building and sending it, start to finish), with `hooks/useDataRequestCopy.ts`.
- `components/staff/`: `StaffDataRequestsPage` (the list), `NewDataRequestPage` with `NewDataRequestForm` and `DataRequestPersonPicker`, and `StaffDataRequestPage` with `DataRequestDetails`, `DataRequestIdentityPanel`, `DataRequestExtendForm`, `DataRequestCloseForm` and `DataRequestCopyPanel` (with `DataRequestCopyForm`, `DataRequestFiles` and `DataRequestCopiesSent`).
- `components/MyDataRequestsSection.tsx`, `MyDataRequestRow.tsx` and `MyDataRequestFiles.tsx`: Settings › Data requests (id `data-requests`), shown once the person has a request; the three notices link here.
- Text: `src/locales/{ro,en}/dataRequests.json` (`registerDataRequestsTranslations.ts`).
- The database side: `supabase/migrations/…_admin2_c1_enums.sql` and `…_admin2_c1_data_requests.sql`, then `…_admin2_c2_enums.sql` and `…_admin2_c2_data_request_copy.sql`; tests `242`, `243` and `e2e/data-requests.spec.ts`.
