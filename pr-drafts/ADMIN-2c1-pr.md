<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Part of #107

Bundle 12 ADMIN-2, part c1: the data request log, its deadlines, extensions and the identity check (S1-E11-09, part 09a; screen 8.12). Part c2 adds building and sending the copy, the files list and the parent's path for under-16s, and closes #107.

## What changed
- **Staff › Data requests (criterion 1).** A new menu item for owner, admin and support. "Log a request" finds the person by username, pen name, whole email address or user ID (the existing Users look-up, which logs a search by email), then records what they asked for (a copy, move, correct, delete, other), how it arrived (in the app, by email, by post), the date received and a note for the team.
- **The deadline (criterion 2).** One month from the date received, shown on the list and the request. The list puts the nearest deadline first, with pills: "Due in 7 days" and fewer from a week before (the reminder), a red-tinted pill from 2 days before (the alert), and "Overdue" after it (**proposal**: there is no outside alert channel yet).
- **More time (criterion 3).** Staff can add one or two more months, never more than two in all, with a reason, and only while the first month lasts. The person gets a notice they can't switch off, also by email, with the new deadline and the reason.
- **The identity check (criterion 4).** A request made in the app needs none. For one by email or post, "Ask them to confirm" sends the person a notice they can't switch off, emailed to the account's own address, leading to a new Settings › Data requests panel where, signed in, they answer "Yes, it was me" or "No, it wasn't me". Signing in to the account is the check; nothing is ever sent to an address from the request. The method and the answer are in the audit log.
- **Under 16 (criterion 5, first half).** A request about an under-16 is marked on the staff page and "Ask them to confirm" is refused for it, because it goes through the parent or guardian, which part c2 builds.
- **Closing (criterion "a request is closed").** Staff close a request with what was done. The log keeps the user ID, type, dates, deadline, identity check and who handled it, never files, and a closed request can't be changed.
- **Who may use it (last criterion).** The server refuses moderators and content editors; owner, admin and support can use it.
- **Database.** Two migrations: the enums and two notification kinds, then `data_requests` (kind: staff, one read policy, no direct writes), the `admin_*` functions, `my_data_requests()` and `answer_data_request()`, and the notice plumbing (`notifications.data_request_id`, `notify()`, `email_delivery_for()`, `notification_json()`).
- The e2e file from part b3 had one line left unformatted on main; Prettier's fix rides along here.

## How it was tested
- Database test `242-data-requests.test.sql` (44 checks): moderator, editor and member refused; no such person, a date in the future and a long note refused; support, admin and the owner log requests; 31 January is due on 28 February; overdue on the list; the audit log rows; allowed and denied for `data_requests_select_staff` (support read, a moderator and the person don't, a visitor is refused); extension needs a reason, at most two months, more than before, only in the first month; the person's two required notices, emailed; the notice carries the reason; no check for an in-app request; under-16 refused; only the person answers, once; their list has no staff notes; the answer is logged; no asking again; closing needs an outcome; a closed request keeps its record and can't change. Test `021` gains the new table.
- Unit tests: dates in words, days left, pill colours and the extensions still allowed; the two notices' words and links; the two emails (subject, reference, deadline in words, reason, no unsubscribe link).
- Browser test `e2e/data-requests.spec.ts`: support log a request from the menu, ask the person to confirm; the person follows the notice to Settings and says yes; support see it confirmed, extend and close it; a moderator has no menu item and is refused at the address; axe and no sideways scrolling on the list and a request at 390, 768 and 1440 px in both themes and languages. `notifications`, `notification-emails`, `user-management` and `staff-story-presentation` still pass. `staff-shell` and the admin epic check `epic-s1-e11` now expect Data requests in the owner, admin and support menus (the epic check was also still missing Stories from part a; both pass).
- Screenshots of the list, a request and the Settings panel at 1440 and 390 px checked by eye.

## Local check run
LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand
Nothing: no SQL top-up, no new secrets and no new settings.

## Board mismatches
- AdminDataRequests (8.12) draws the list and the chosen request side by side on one page; this part uses three pages (the list, a new request, one request), which reflow more simply at 390 px. The person's handle links to their account in Users, as the board's "Open in Users".
- The board's search box (request number, handle, email or user ID) and status chips are left out: the list shows open requests nearest deadline first, or all. A search can follow once there are enough requests to need it.
- The board's "Legal basis" panel (GDPR articles 12 to 20) is left out; its points are in the page's intro and the form hints. The files panel ("Export everything") comes with part c2.

## Questions for Robert
- How long should the data request log be kept? I've written 3 years after a request is closed in `docs/retention.md` as a **proposal** (our proof that we answered in time); nothing deletes it yet. Worth adding to the lawyer's list.
- The reminder (7 days) and alert (2 days) show only as pills on the list. Say if you want an email or a phone alert to staff as well.

## Follow-ups
- The Users account page could have "Open a data request" so staff start one from the account (S1-E11-02's note); today they find the person again on the new request form.
- A support ticket that asks for data will open a request here once support tickets exist (S1-E11-13).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
