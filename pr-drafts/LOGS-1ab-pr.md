<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Robert, 6 Nov 2026, 06:48 UTC: "for any profile that we have created, we should be having a log as well for whatever action our staff has done, and also a place for them to leave comments."

This is parts a and b of bundle LOGS-1. The call log and the Staff › Logs screens (parts c and d) follow in their own PR.

## What changed

- **Staff notes on every account (part a).**
  - New table `account_staff_notes` (kind: staff). `user_id` is the account, `author_user_id` the staff member.
  - Notes are append-only: no update or delete grant, so nobody signed in can change or remove one.
  - `admin_add_account_note()` adds a note for anyone with the Users area (owner, admin, moderator, support), in a staff session. It writes `account.note_added` to the audit log, without the words (rule 12).
  - `admin_account_notes()` reads one page, newest first, with the author's username and the total count.
  - Kept 3 years like the audit log: `purge_old_account_staff_notes()`, nightly at 03:53 UTC.
  - `data_export_held_tables()` lists the table as left out of the automatic export, with the reason (notes can name other people or a safeguarding concern; staff copy them in by hand on request). Lawyer to check.
  - Account page: a "Staff notes" section with the form, the notes (plain text, line breaks kept) and a pager.
- **Full staff history on the account (part b).**
  - The account page now shows every audit row about the account, 20 to a page, instead of the 10 newest. Still owner and admin only, the roles that read the audit log (architecture 1.8.3).
  - Its link opens `/staff/audit-log?target=<user ID>`, already filtered to the account.
- **Docs:**
  - `docs/code-tour.md`, `docs/retention.md` and `docs/decisions.md`;
  - the staff README;
  - the privacy notice drafts in English and Romanian (a line on staff notes in "What we get from others" and in "How long we keep it").

## Tests

- `supabase/tests/database/300-account-staff-notes.test.sql` (17 tests):
  - allowed and denied for `account_staff_notes_select_staff`;
  - who may add a note, and that the audit row holds no words;
  - append-only;
  - paging and the purge.
- `021-signed-out-reads` gains the new table.
- `src/features/staff/api/accountNotes.test.ts`: the mapping and every failure reason.
- `e2e/account-notes.spec.ts`, in a real browser:
  - support adds a note and a moderator reads it;
  - paging, "Page 1 of 2";
  - the owner's history and the filtered audit log link;
  - the editor is refused;
  - axe at 390, 768 and 1440 px, light and night, ro and en.

## Local check run

Run in the cloud container on this branch (GitHub Actions is blocked by billing):

- Prettier, lint (no errors), `tsc -b`, `types:check`, `i18n:check` and `migrations:check`: passed.
- Vitest: 243 files, 1,515 tests passed.
- Database: after `supabase db reset`, all 210 files passed, among them 021 and the new 300.
- e2e: `account-notes` and `user-management`, 43 of 43 passed, after a database reset with one worker. The build passed as part of that run.

## By hand

Nothing. The migration reaches staging through Supabase's GitHub integration as usual.

## Follow-ups

- The lawyer to confirm leaving staff notes out of the automatic data export and copying them in by hand (GDPR art. 15(4) and art. 23).
- If Robert wants moderators and support to see a trimmed staff history too (actions without before and after values), that is a small change. Today only owner and admin see it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
