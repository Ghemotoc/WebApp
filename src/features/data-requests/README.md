# Data requests

Requests to see, move, correct or delete someone's data: the staff log with its deadlines, and the person's own list in Settings (bundle ADMIN-2, part c1; story S1-E11-09, part 09a; screen 8.12; GDPR art. 12). Building and sending the copy, and the parent's path for under-16s, come with part c2.

- `api/dataRequests.ts`: the staff calls (`admin_open_data_request()`, `admin_data_requests()`, `admin_data_request()`, `admin_extend_data_request()`, `admin_ask_data_request_confirmation()`, `admin_close_data_request()`), with the answers checked by zod.
- `api/myDataRequests.ts`: the person's calls (`my_data_requests()`, `answer_data_request()`).
- `hooks/useStaffDataRequests.ts`, `hooks/usePersonSearch.ts` (finds the person through the Users look-up), `hooks/useDataRequestWords.ts` and `hooks/useMyDataRequests.ts`.
- `lib/dataRequestDates.ts`: dates in words, days left, the pill colour and the extensions still allowed.
- `components/staff/`: `StaffDataRequestsPage` (the list), `NewDataRequestPage` with `NewDataRequestForm` and `DataRequestPersonPicker`, and `StaffDataRequestPage` with `DataRequestDetails`, `DataRequestIdentityPanel`, `DataRequestExtendForm` and `DataRequestCloseForm`.
- `components/MyDataRequestsSection.tsx` and `MyDataRequestRow.tsx`: Settings › Data requests (id `data-requests`), shown once the person has a request; the two notices link here.
- Text: `src/locales/{ro,en}/dataRequests.json` (`registerDataRequestsTranslations.ts`).
- The database side: `supabase/migrations/…_admin2_c1_enums.sql` and `…_admin2_c1_data_requests.sql`; tests `242` and `e2e/data-requests.spec.ts`.
