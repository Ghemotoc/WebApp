<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14d IDEAS-3, part d of 6: joining spaces. These are ideas 6 and 9 from the 2 November list, which Robert approved on 2 Nov 2026 at 22:01. The ideas have no story issue.

## What changed

- **A welcome note for new members (idea 6).**
  - Space settings has a new "Welcome note" card for anyone with the settings power: the owner, a moderator given it, or our moderation team.
  - A new member sees the note once, at the top of the space, with "Got it". After that it doesn't come back. The owner, who wrote it, never sees it there.
  - A note with HTML or over 500 characters is refused with a plain message (criterion 2). An empty note removes it.
  - The note is shown only to members and the people who run the space, never to readers outside. A report of the space covers it.
  - Changing the note writes "changed the welcome note" in the space's log.
  - Members who were already in the space when a note is first written also see it once. I chose this because the note is just as useful to them; it is one line to change if Robert wants new members only.
- **A note with a request to join (idea 9).**
  - In a space that approves each request, "Join space" opens an optional note field (at most 200 characters, no HTML) with "Send request" and "Cancel" (criterion 1).
  - The owner and moderators with the members power see the note under the request, quoted, with its own Report button (criterion 2).
- **Making the note reportable (CLAUDE.md rules 6 and 15).**
  - The note lives in its own table, `space_join_notes`, with the writer's `user_id`. Its one policy lets the writer read their own notes.
  - It is a new reportable type, `space_join_note`, with branches in `reportable_item_owner()`, `reportable_item_summary()` and `case_item_content()`.
  - Only the people who decide that space's requests can report it, so a note never reaches anyone else through the report form.
  - A note our moderators hide or remove leaves the request list. The note stays after its request is decided, so a report about it can still be looked at.
  - It is in Download my data, and it is deleted with the account.
- **Database changes:**
  - New columns `spaces.welcome_note` and `space_members.welcome_seen_at`.
  - New functions `set_space_welcome_note()` and `dismiss_space_welcome()`.
  - `join_space()` takes an optional `note`.
  - `space_viewer_json()` gains `welcome_note` and `show_welcome`.
  - `space_join_requests()` gains each request's `note`.
  - `check_space_text()` knows the two new fields.
  - Two settings: `space_welcome_max_characters` (500) and `space_join_note_max_characters` (200).
- `docs/code-tour.md` and the spaces README have a section on this part.

## Tests

- `supabase/tests/database/287-joining-spaces.test.sql` (18 tests) covers:
  - saving the note, refusing HTML or more than 500 characters, and refusing someone without the power;
  - the note showing once for a new member, never for the owner, and not reaching outsiders;
  - a request carrying its note, and refusing more than 200 characters;
  - the allowed and denied tests for `space_join_notes_select_own`;
  - the owner reading and reporting the note, an outsider being unable to report it, and a hidden note leaving the list.
- `e2e/joining-spaces.spec.ts` covers:
  - the owner saving a note, with HTML refused;
  - a new member seeing it once;
  - a request sent with a note;
  - the owner seeing the note with its Report button;
  - axe on the space with its welcome note at 390, 768 and 1440 px, light and night, ro and en.

## Local check run

Fast checks, run locally on this branch (GitHub Actions is blocked by billing):

- Lint, Prettier, `tsc -b`, `types:check`, `i18n:check` and `migrations:check`: passed.
- Vitest: 232 files, 1,461 tests passed.
- Database (`supabase test db`): 197 files, 4,534 tests passed, including the new `287-joining-spaces` (18 tests).
- Wrangler compile, the build with and without env, and `third-party:check`: passed.
- e2e (joining-spaces, spaces, space-moderators, space-banners-and-notifications, report-dialog): 79 of 79 passed.
- The first run caught four places that list every table or click "Join space" on an approving space. All four are fixed in the second commit:
  - test 021's list of what a signed-out visitor sees;
  - test 228's expected viewer;
  - the Download my data guide's line for the new table, in ro and en;
  - `spaces.spec` and `space-banners-and-notifications.spec`, which now press "Send request" after "Join space".

## By hand

Nothing.

## Follow-ups

None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
