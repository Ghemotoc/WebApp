<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #111

Bundle 13 CONTESTS, part a2a: pictures and featured stories on landing pages (S1-E11-14 criteria 5 and 6). Remind me and the link preview follow in part a2b.

## What changed

- **A picture in a Hero or Text block.** Admins upload a drawing (JPEG, PNG or WebP, up to 5 MB) to the private `landing-pictures` bucket. It goes through the usual picture check, and every landing picture then waits for a moderator, because the page is public and has no rating of its own. Publishing is refused until the picture is approved and has alt text in Romanian and English. The editor shows the picture's state and refreshes it every 15 seconds while it waits.
- **Featured stories block.** Picks 1 to 12 stories by their addresses, or one approved tag. Visitors see the stories through the same public list every shelf uses (moderation, restriction, class-only and blocks), and only those rated for the youngest age group the page is for (13 to 15 when the page has no Who can enter block). Shown as a normal shelf.
- **The public read** (`landing_page()`) now returns the page's visible pictures and the featured cards, so a removed picture or story drops off at once.
- **Records:** a builder proposal row in decisions, the code tour and the feature's README.

## How it was tested

- Database test 262 (24 tests): who may upload (owner and admin yes; moderator and member no); registering starts a check; a landing picture always needs a moderator; publishing refused for a picture that isn't approved, missing alt text, a picture in the wrong block, an unknown picture; featured blocks refused with 0 or 13 stories, an unknown address or an unknown tag; visitors see approved pictures only; featured cards keep only stories for the youngest group and drop a moderated story.
- Unit tests in `lib/blocks.test.ts` (11 tests), including the featured block and story addresses read from text.
- e2e `e2e/landing-pictures-featured.spec.ts`: an admin uploads a Hero picture, Publish waits for approval, a moderator approves it, the page publishes, and a visitor sees the picture with its alt text and the featured story.

## Local check run

Run on the branch head before opening (Node 24, local Supabase), then rebased onto main after #307 (this branch's own base):

- lint, prettier, typecheck, types:check, i18n:check, migrations:check, third-party check: pass
- `npm test` (Vitest): 220 files, 1378 tests, all pass
- `npx supabase db reset && npx supabase test db`: 172 files, 4151 tests, all pass
- `npm run test:e2e` for this part and the one before (`e2e/landing-pictures-featured.spec.ts`, `e2e/landing-pages.spec.ts`): 29 passed (the pictures spec first stopped on a Storage clean-up step, now removed, and passed when run again)
- Wrangler build of the Pages Functions and the production build: pass

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- Nothing. The bucket is made by the migration.

## Board mismatches

- None: no board draws landing pages yet.

## Questions for Robert

None blocking. Please read the new Romanian text in `src/locales/ro/landingPages.json`.

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
