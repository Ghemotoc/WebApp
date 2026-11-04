<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14d IDEAS-3, part b of 6: classes. These are ideas 3 and 5 from the 2 November list, which Robert approved on 2 Nov 2026 at 22:01. The ideas have no story issue.

## What changed

- **A printable class invite sheet with a QR code** (idea 3).
  - A new class code now shows a QR code of its joining link next to the code, so students can scan it from the board.
  - Print now prints only a clean sheet: the class's name, the code in large letters, the QR code, the link and the date the code stops working. Before, it printed the whole settings page.
  - The QR code is worked out in the browser by `qrcode-generator` (MIT, no dependencies, pinned to 2.0.4) and drawn as an SVG. Nothing is fetched and the link never leaves the device. This is a bundled library, not a third-party script, so rule 7 needs no ADR. `third-party:check` passes.
- **"Who has replied" for a class thread** (idea 5).
  - The new `class_thread_replies(thread_id)` splits a class's active members, other than the owner, into "Replied" and "Not yet", by name only.
  - It answers only for whoever holds the class's "members" power: the teacher, a space moderator with that power, or platform moderation staff. Everyone else gets null.
  - The thread page's side column shows the panel to the teacher, closed until they open it. Students and visitors never see it.
  - There is no new table, column or policy. The teacher already sees every post and member, so the panel only does the counting.
- `docs/code-tour.md` has a section on this part.
- A test fix outside this part: `e2e/class-stories.spec.ts` picks the class card by its text. Since NEW-1 (#327), story settings has a second group also named "Who can read it".

## Tests

- `supabase/tests/database/285-class-thread-replies.test.sql` (9 tests) covers:
  - the teacher's two lists, without the teacher, by name only;
  - nothing for a student, someone outside the class or a visitor;
  - a removed post no longer counting;
  - nothing for a thread outside any class.
- `qrModules.test.ts` covers the code's shape, that it is the same each time, that empty text is refused, and the SVG path.
- `classThreadReplies.test.ts` covers reading the lists, null for a student, and a failed call.
- `e2e/class-invite-sheet.spec.ts` covers:
  - the QR code holding exactly the joining link;
  - print showing only the sheet with all five parts;
  - the link opening Join a class;
  - the teacher's panel and its lists, and no panel for a student;
  - axe on the class thread with the panel open at 390, 768 and 1440 px, light and night, ro and en.

## Local check run

Fast checks, run locally on this branch (GitHub Actions is blocked by billing):

- Lint, Prettier, `tsc -b`, `types:check`, `i18n:check` and `migrations:check`: passed.
- Vitest: 1,458 of 1,459 tests passed. The one failure was the brand-value check: the new QR test's example link named the product. It now uses `site.example`, and the check and the QR tests pass (9 of 9).
- Database (`supabase test db`): 195 files, 4,504 tests passed.
- Wrangler compile, the build with and without env, and `third-party:check`: passed.
- e2e (class-invite-sheet, class-spaces, class-tools, class-stories, forum-threads, spaces): 88 of 89 passed.
  - The one failure was `class-stories.spec`, and it is not from this part. Since NEW-1 (#327), story settings has two groups named "Who can read it", so the spec's locator matched both.
  - The spec now picks the class card by its text, and it passes (4 of 4).

## By hand

Nothing.

## Follow-ups

None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
