<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14c IDEAS-2, part f: picture links show the picture in chat previews (idea IDEA-20261101-12, approved on 2 Nov 2026, 22:00). This idea has no story issue. It is the last part of IDEAS-2.

## What changed

- A link to a picture in a chapter (the "Share picture" link, `/s/<story>/<chapter>/p3`) now previews in WhatsApp, Messenger and the like with the picture itself, as a large card, with its alt text (criterion 1).
- This happens only when the picture may be shared, the same rule the "Share picture" button already follows. That means all three of:
  - the story is under 16+;
  - the writer's "Sharing pictures" switch is on;
  - the picture's check has passed (rule 19).

  A picture still in its check, removed, or from a 16+ or 18+ story keeps today's preview, the cover colour (criterion 2).
- The picture comes from our own address, `/api/picture-preview/<story>/<chapter>/<block>`. On every request it checks again that the picture may be shared, then reads the picture as a visitor, with no service key. Anything else gets "not found".
  - Chat apps may keep the picture for an hour at most, so a picture removed by a moderator stops showing within the hour.
  - The address names the story, chapter and spot, never a file or a user ID.
- No new table, policy or personal data.

## Tests

- The new database test `283-picture-previews` (10 tests):
  - a visitor gets a passed picture, and its path holds the chapter's ID, never the writer's;
  - nothing for a picture still in its check, text, a music card, the switch off, a 16+ story or a removed picture;
  - the storage policy lets a visitor read only the passed file.
- New unit tests: `server/picture-preview.test.ts` (5) and one more in `server/link-preview.test.ts`.
- `share-passages.spec.ts`:
  - the picture link's og:image is our address, and it answers with the PNG;
  - a paragraph keeps the colour square;
  - with the switch off, the picture link keeps the colour square and the address answers 404.

## Local check run

These fast checks ran locally (GitHub Actions is blocked by billing). Parts d, e and f are stacked, so one run on the top of the stack (part f, which holds this branch's commits) covers all three:

- Lint, Prettier, `tsc -b`, `types:check`, `i18n:check` and `migrations:check`: passed.
- Vitest: 231 files, 1,455 tests passed.
- Database (`supabase test db`): 193 files, 4,482 tests passed, including the new `282-furthest-place` and `283-picture-previews`.
- Wrangler compile, the build with and without env, and `third-party:check`: passed.
- e2e (canva-covers, share-passages, share, teaser, story-settings, writer-dashboard, library, chapter-pictures, chapter-reader, readers-to-writers): 100 passed.

## By hand

Nothing. Cloudflare already has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Questions for Robert

None.

## Follow-ups

None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
