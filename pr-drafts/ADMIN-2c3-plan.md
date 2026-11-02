# ADMIN-2c3 plan: the parent's or guardian's path for under-16s (S1-E11-09 criterion 5; closes #107)

## Flow
1. Staff, on a request about an under-16 that came from outside their account (email or post), press "Ask the parent or guardian". The browser posts to `/api/data-request-parent/ask` with the staff sign-in. Our server makes a 32-byte token, signs `data-request-ask|<request id>|<hash>` with PARENTAL_CONSENT_SECRET (no new secret) and calls `admin_ask_data_request_parent()`, which checks staff, an agreed parental consent on record (S1-E2-03), stores only the hash and answers the parent's address and language. The server emails the parent `/data-request/parent#<token>`.
2. The parent opens the link signed out, sees which account and which request, and answers "Yes, we asked for it" or "No, we didn't" (`answer_data_request_parent()`, anon, the token is the key). The request records confirmed or denied, when, and that the parent checked it.
3. Staff build the copy as in c2. For a parent's request the person gets no notice and their Settings list doesn't show the files; the browser then posts to `/api/data-request-parent/send`, the server signs a second token and `admin_send_data_request_parent_copy()` stores it; the parent gets a one-time link to the same page.
4. The parent presses "Open the files" (`open_data_request_parent_copy()`): the first press starts one hour (proposal) in which the files can be downloaded; after that the link says it was used. Files still expire after 7 days. A storage policy (`exports_select_parent_link`, anon) allows only files of that request, ready and unexpired, within that hour.

## Database (one migration)
- `data_requests`: goes_to_parent, parent_check_token_hash, parent_copy_token_hash, parent_copy_sent_at, parent_copy_opened_at.
- New: data_request_parent_is_signed, data_request_parent_consent, admin_ask_data_request_parent, data_request_parent_link, answer_data_request_parent, admin_send_data_request_parent_copy, open_data_request_parent_copy, export_parent_link_open_allowed + policy.
- Changed: data_request_json (new fields), admin_data_request_copy_target (parent path allowed once confirmed), admin_finish_data_request_copy (no notice to the child on the parent path), my_data_requests (no files on the parent path).

## Tests
- pgTAP 244: every function allowed and denied, signature, consent on record, the answer, copy rules, one-time hour, storage policy allowed and denied.
- Unit: server route (ask, send, failures), emails, copy rules.
- e2e: staff ask the parent, Mailpit link, parent answers, staff send, Mailpit link, parent opens and downloads; axe on the parent page.
