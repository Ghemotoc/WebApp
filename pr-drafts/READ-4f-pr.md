<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #134
Closes #136

This is part (f) of the READ-4 bundle in Robert's full-app plan:
- S1-E15-01, cookieless product analytics;
- S1-E15-03, the event catalogue.

S1-E11-04 (staff metrics and the compliance log) follows as part 4g.

## What changed

- **One adapter, `src/lib/analytics/track.ts` (S1-E15-01).** `trackEvent(name, properties)` sends one `fetch` per event, without credentials, to the provider's events address.
  - No script, no cookie or storage, and no page views.
  - Every event is reported against the site's root, so a URL with a username or a story in it never leaves.
  - Nothing is sent while Do Not Track or Global Privacy Control is on.
  - It speaks both candidates' event APIs, Plausible and Umami Cloud. **The choice is OPEN (Q49), so it is off:** nothing is sent until `VITE_ANALYTICS_PROVIDER`, `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_SITE` are set (GO-LIVE). The reasoning is in ADR 0007.
- **The catalogue (S1-E15-03).**
  - `src/lib/analytics/catalogue.ts` types every event and its exact properties, so TypeScript refuses anything else.
  - `docs/analytics-events.md` lists each event with what fires it, its properties, where it fires and its story.
  - `catalogue.test.ts` fails the build when the two lists differ, a name isn't `object_action`, or a `trackEvent()` call in `src/` names an uncatalogued event (criterion 2).
- **Ten events wired, none with personal data:**
  - `language_changed` (the language);
  - `sign_up_completed`;
  - `story_created` (the category slug);
  - `chapter_published` and `chapter_scheduled`;
  - `report_submitted` (the reason and the item type only);
  - `writer_followed` and `story_followed`;
  - `chapter_shared` (copy link or share sheet). It is sent from the lazily loaded share counter, so the reader's script budget is unchanged;
  - `quote_card_saved`.
- **Docs:** ADR 0007, analytics-events, mocks (analytics is off) and code-tour.

## How it was tested

- Unit `track.test.ts` (5 tests):
  - the configuration is off unless all three variables are set and the provider is known;
  - Do Not Track and Global Privacy Control both mean no;
  - nothing is sent while off;
  - one request goes out without cookies, carrying only the site root and the catalogued properties, never the page the person was on;
  - the Umami shape is right.
- Unit `catalogue.test.ts` (3 tests): the document matches the code, names are `object_action`, and no call uses an uncatalogued name.

## Local check run

| Check | Result |
| --- | --- |
| lint, typecheck, types:check, i18n:check, migrations:check | pass |
| unit tests | 773 passed |
| db reset + test db | 93 files, 1,976 tests, PASS (no database change) |
| functions build | compiled |
| e2e: the screens that now send an event (chapter-editor, create-story, follows, language, publish, reader-performance, report-dialog, share, sign-up, writer-profile) | 115 passed, 1 failed. The failure is the reader's "first paragraph within 2 seconds on a throttled phone" timing, at 2.1 s. It already runs at 2.3 to 2.4 s on main on this machine (noted in builder status), and it isn't this change: the reader's "under 40 KB of script" test passed |

The full e2e suite runs once before the bundle's last part merges.

## By hand (GO-LIVE)

1. Choose Plausible or Umami Cloud (Q49).
2. Sign its data processing agreement, and add it to the processor list and the privacy notice (lawyer).
3. In Cloudflare, under Settings, Variables and Secrets, set:
   - `VITE_ANALYTICS_PROVIDER` (`plausible` or `umami`);
   - `VITE_ANALYTICS_ENDPOINT` (for example `https://plausible.io/api/event` or `https://cloud.umami.is/api/send`);
   - `VITE_ANALYTICS_SITE` (the Plausible domain or the Umami website ID).
4. Redeploy.

Nothing on staging until then.

## Follow-ups

- More events from the candidate list (`sign_up_refused`, `story_completed`) when they are worth counting.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
