<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Closes #107

Bundle 12 ADMIN-2, part c3: the parent's or guardian's path for under-16s (S1-E11-09 criterion 5, and "for a parent, a one-time link to the checked email address"; screen 8.12). With c1 (#288) and c2 (#289) this finishes S1-E11-09 part 09a; PDF files (09b) come with part d.

## What changed
- **Ask the parent or guardian (criterion 5).** On a request about someone under 16 that came by email or post, the identity panel now offers "Ask the parent or guardian" instead of asking the child. Our server (`server/data-request-parent.ts`, `POST /api/data-request-parent/ask`) makes a random token, signs it with the parental consent secret (its own prefix, so no new secret) and `admin_ask_data_request_parent()` stores only its hash. The email goes to the parent who agreed to the account in the parental consent (S1-E2-03), never to an address taken from the request. Without an agreed parent the button says so and nothing is sent. Staff never see the link and can't store one of their own: the database refuses a hash our server didn't sign.
- **The parent's page.** `/data-request/parent#<token>`, signed out, in the language the parent agreed in: "Did you ask for @handle's data?" with "Yes, we asked for it" or "No, nobody in our family asked". The answer, its time and that the parent gave it are kept on the request (criterion 4: "the method and result are logged"). The child can't answer for the parent, and Settings doesn't ask them to.
- **The copy goes to the parent only.** Once the parent confirms, staff build the copy as in c2. On this path the child gets no notice and doesn't see the files in Settings; instead our server signs a second token and emails the parent a one-time link (`POST /api/data-request-parent/send`, `admin_send_data_request_parent_copy()`). Staff see when it was emailed and first opened, and can send a new link.
- **One-time link (proposal: one hour).** The parent presses "Open the files"; the first opening starts one hour in which the files download signed out (new storage policy `exports_select_parent_link`), then the link says it was used. The files still go after seven days.
- **Database.** One migration: five columns on `data_requests`; new functions `admin_ask_data_request_parent()`, `data_request_parent_link()`, `answer_data_request_parent()`, `admin_send_data_request_parent_copy()`, `open_data_request_parent_copy()` and helpers; `data_request_json()`, `admin_data_request_copy_target()`, `admin_finish_data_request_copy()`, `my_data_requests()` and `answer_data_request()` updated for the path.
- **Emails.** A new `dataRequestParent` group in `email.json` (ro and en), admin-editable like every email, with locked placeholders.
- Test 243 now counts only its own "file opened" audit rows, so rows an earlier browser test left behind don't fail it.

## How it was tested
- Database test `244-data-request-parent.test.sql` (38 checks): a moderator can't ask; an unsigned or self-made link is refused; adults, requests made in the app and accounts without an agreed parent are refused; the email goes to the consent's address; asking again replaces the link; the audit rows never hold the parent's address; the page shows no user ID or email; the child can't answer and isn't asked; yes and no are stored once; no copy after "no"; no copy link before a copy or with the ask signature; the child gets no notice or files; allowed and denied for `exports_select_parent_link` (nothing before opening, the file within the hour, nothing after it, nothing for another member); a new link replaces the old. Tests `201`, `242` and `243` still pass.
- Unit tests: the server route (signed hash, token only in the email after "#", the parent's language, refusals, a failed email, 503 and 404), the front end's reading of the links and refusals, and the copy rules on the parent's path.
- Browser test `e2e/data-requests.spec.ts`: support ask the parent of a 14-year-old; the parent opens the emailed link signed out and confirms; support send the copy; the child gets no notice; the parent opens the one-time link and downloads the ZIP; the staff page shows it was opened. Axe and no sideways scroll on the parent's page (both links) at 390, 768 and 1440 px, light and night, ro and en. `parent-consent`, `download-my-data` and `notifications` still pass.
- Screenshots of the staff panels and the parent's page at 1440 and 390 px checked by eye.

## Local check run
LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand
Nothing new: the route uses the parental consent secret and the Brevo key already listed for GO-LIVE. When the record of processing is written (GO-LIVE), add that the parent's address from the consent is also used to check and answer data requests about their child.

## Board mismatches
- AdminDataRequests (8.12) has no parent's path drawn; the button sits in the identity panel and the link's state in "The copy", in the same plain style. The parent's page follows the parental consent page's card (board 2.4).

## Questions for Robert
- The one-time link works for one hour after the parent first opens it (the story says "one-time" without a length). Say if you'd like longer, or a single download per file instead.
- On the parent's path the child isn't told the copy was sent and doesn't see the files in Settings, so the copy goes only to the checked parent. Say if the child should also see it.
- A request about an under-16 whose parent never agreed (the account can only read) has nobody to check with: the page says to answer by post or ask the person to make it from their own account. Say if you'd rather staff could check another way.

## Follow-ups
- Part d: PDF files alongside the Word files (S1-E11-09 part 09b).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
