<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14c IDEAS-2, part b: a sample EPUB for beta readers and an "About the writer" page (ideas IDEA-20261101-3 and -4, approved on 2 Nov 2026, 22:00: the writer picks any chapters, as many or as few as they like). These ideas have no story issue.

## What changed

- **A sample EPUB (idea 3):**
  - In Download my stories, pick one story, tick "Only the chapters I choose" and tick at least one chapter. A new box, "A sample EPUB for beta readers", appears, with "Make a sample EPUB".
  - It works for ongoing and finished stories. The whole-book EPUB is still offered only for completed stories.
  - The book holds only the ticked chapters that are published, and each keeps its number in the story ("Chapter 3" stays Chapter 3).
  - Its title page and copyright page say "Sample" ("Fragment" in Romanian) and list the chapters it holds.
  - It is saved as `<slug>-sample.epub`. As before, everything is made in the browser and nothing is stored.
- **"About the writer" (idea 4):**
  - The EPUB form, for the whole book and for a sample, has "Add an About the writer page", off unless ticked.
  - When ticked, the book ends with the writer's public bio and a link to their public profile, `/u/<username>`, after the chapters and in the table of contents. Nothing that isn't already public goes in.
- `buildEpub()` takes two new optional parts of the book, `sample` and `aboutWriter`. The reading order is cover, front pages, contents, chapters, then the back page.

## Tests

- `buildEpub.test.ts`:
  - "Sample" and the chapter list on both front pages, well-formed;
  - nothing about a sample in a whole book;
  - About the writer is last in the reading order, its bio escaped, its link right, and only when asked.
- `runEpub.test.ts`:
  - a sample holds only the chosen published chapters with their story numbers, under the `-sample` name;
  - its front pages list them;
  - a sample with no published chapter is refused;
  - the whole book is still refused for an ongoing story;
  - the About page appears when ticked and not otherwise.
- The new e2e test `sample-epub.spec.ts`:
  - the box shows only once chapters are ticked;
  - a Romanian sample of chapters 1 and 3 says "Fragment" and lists them, with the bio and profile link at the back;
  - unticked, there is no About page;
  - axe on the dialog and no sideways scrolling at 390, 768 and 1440 px.

## Local check run

Fast checks, run locally on this branch (GitHub Actions is blocked by billing):

- Lint, Prettier, `tsc -b`, `types:check`, `i18n:check` and `migrations:check`: passed.
- Vitest: 228 files, 1,440 tests passed.
- Database (`supabase test db`): 189 files, 4,430 tests passed.
- Wrangler compile and the build with and without env, plus `third-party:check`: passed.
- e2e (sample-epub, epub, download-my-stories, download-my-data, downloads-and-privacy, data-requests): 107 passed and 1 failed. The failure was in the new test's clean-up: it set adult_writer's bio to empty, which the column refuses. It now puts the seed's bio back, and `sample-epub.spec.ts` passes 5 of 5.

## By hand

Nothing.

## Questions for Robert

None. "Fragment" is my Romanian word for "Sample"; tell me if you prefer "Mostră".

## Follow-ups

None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
