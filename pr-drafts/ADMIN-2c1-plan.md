# ADMIN-2c1 plan: the data request log (S1-E11-09a, first half)

Bundle 12 part c is split like part b: c1 the request log, deadline, extension and identity check; c2 building the copy (the S1-E13-02 ZIP built in the staff member's browser from an admin export, ADR 0012), sending it with a sign-in link that lasts seven days, file names and sizes, logged opening, and the parent's path for under-16s.

## Criteria in c1
1. New request: find the person by user ID, handle or email; type (copy, move, correct, delete, other); how it arrived (in the app, email, post); date received.
2. Deadline one month from receipt, shown; reminder 7 days before and alert 2 days before (proposal: "Due in N days" and "Overdue" pills, the list sorted by nearest deadline; no outside alert channel exists yet).
3. Extend by up to two more months with a reason, only within the first month; the person is told (required notification, emailed).
4. Identity check for a request that didn't come from the signed-in account: "Ask them to confirm" sends a required notification (emailed to the account's own address) that opens Settings › Data requests, where the signed-in person confirms or says it wasn't them. Method and result logged; nothing goes to any other address. A request recorded as "in the app" counts as checked by sign-in.
5. Closed request keeps user ID, type, dates, identity check, who handled it; never files.
6. Moderator and content editor refused; support, admin, owner allowed (`staff_may('data_requests', 'act')`, seeded in S1-E2-07a).

## Database
- Enums `data_request_type`, `data_request_channel`, `data_request_state`, `data_request_identity`; notification kinds `data_request_confirm`, `data_request_extended` (separate enum migration).
- Table `data_requests` (kind: staff): reference D-000001, user_id (the person), type, channel, received_on, due_on, extended_to, extension_reason, extension_told_at, identity method and result with times, state, closed_at, outcome note, handled_by_user_id, created_by_user_id. RLS: one policy, staff select (`staff_may('data_requests','act')`); the person reads their own requests only through `my_data_requests()`, which leaves out staff notes; no direct writes.
- Functions: `admin_open_data_request(...)`, `admin_data_requests(filter)`, `admin_data_request(id)`, `admin_extend_data_request(id, months, reason)`, `admin_ask_data_request_confirmation(id)`, `admin_close_data_request(id, outcome)`, `my_data_requests()`, `answer_data_request(reference, is_mine)`. Each admin one writes the audit log. The person is found with the existing `admin_user_lookup()` (owner, admin and support may search; a search by email is logged).
- Required emails for the two new notification kinds.

## Tests
- pgTAP 242 (44 checks): allowed and denied for the policy; roles; deadline maths (31 Jan → 28 Feb); extension limits and first-month rule; confirmation only by the person, logged; no answer twice; close.
- Unit: deadline wording. E2E: support opens, asks confirmation, the person confirms in Settings, support extends and closes; moderator refused; axe at 390, 768, 1440.
