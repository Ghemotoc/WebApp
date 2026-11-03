<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #111

Bundle 13 CONTESTS, part a2c: shared landing pages get a link preview, and the CMS can link to them (S1-E11-14 criterion 13). This closes the landing page part of the story except the Sponsor block, which waits for approved sponsor campaigns (bundle 14b). Contests themselves follow in 13b.

## What changed

- **Link previews for /c/ pages.** A new Pages Function, `functions/c/[[path]].ts`, does for landing pages what `/s/` does for stories: WhatsApp, Instagram and other apps that read the HTML see the hero's title and introduction (in Romanian, as the interface opens in Romanian) and a plain picture in the page's theme colour. Only the live version is read, through the public `landing_page()`. A live page is indexable; an unknown, archived or not yet live address gets noindex; if the database can't be reached the page still loads. Locally the same handler runs through `server/pages-functions-plugin.ts`.
- **Links from notices, help pages and answers.** The CMS publish check now accepts `/c/<name>` while that landing page exists and isn't archived, so a notice banner can point at a contest page. Any other `/c/` address is still a broken link.
- **Records:** the code tour and the feature's README.

## How it was tested

- Unit tests `server/landing-preview.test.ts` (8): reading /c/ addresses, the hero's title and introduction, a long introduction shortened at a word, the tags escaped, noindex for an unknown page, and the page unchanged when the database is down.
- Database test 264 (5): a link to an existing landing page is fine, with or without a final slash; a missing or archived page is a broken link; other unknown addresses are still refused.
- e2e `e2e/landing-link-preview.spec.ts`: the raw HTML of a live page carries the tags and no noindex, an unknown page carries noindex, and the page opens in the browser.

## Local check run

LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- Nothing. The function reads the same VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY Cloudflare already gives `/s/`.

## Board mismatches

- None: no board draws landing pages yet.

## Questions for Robert

None.

## Follow-ups

- The Sponsor block (criterion 6) waits for approved sponsor campaigns in bundle 14b.
- A Discover featured slide and a house ad (S1-E12-05) can link to a landing page once those exist.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
