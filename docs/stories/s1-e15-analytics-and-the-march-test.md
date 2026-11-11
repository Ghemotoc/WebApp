> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E15 Analytics and the March test

**Back end and build order:** section 1.7, group H (screen 8.7), wave 5.

##### S1-E15-01 Cookieless product analytics

As the founder, I want simple usage numbers without cookies so that I learn what works without tracking anyone.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E1-01
- **Acceptance criteria:**
  - Given the analytics tool, when it is installed, then it uses no cookies, stores no user IDs and is hosted in the EU.
  - Given any event, when it is sent, then it is on the event catalogue and carries no personal data.
- **Legal and compliance:** recommendation (Q49, pending Robert): Plausible or Umami Cloud, both cookieless and hosted in the EU. Choice OPEN. Moves after the March MVP (section 1.13).

##### S1-E15-02 First-party metrics for the March test

As the founder, I want the March test numbers calculated from our own database so that I know whether Stage 1 works.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E4-01 (daily `chapter_reads` totals), S1-E3-03; S1-E4-03 once it lands (it moved after March, section 1.13)
- **Updated:** 17 Oct 2026, 12:34 (Robert): only aggregated data, never per-reader records; the return rate is an aggregate approximation; aggregated metrics are kept 3 years.
- **Acceptance criteria:**
  - Given the metrics job, when it runs daily, then it reports writers with at least one published chapter (in total and by open market), signed-up readers and the return rate.
  - Given the return rate, when it is calculated, then it is computed from daily totals only: reads of chapter N+1 within 7 days of its release divided by reads of chapter N, shown with the label "approximation" because totals can't tell whether the same readers came back (decided 17 Oct 2026, 12:34).
  - Given any metric, when it is stored, then it is aggregated; no per-reader record is stored or used and no individual-level export exists (decided 17 Oct 2026, 12:34).
  - Given the stored metrics, when they are 3 years old, then they are deleted (Robert's default retention for aggregated data, decided 17 Oct 2026, 12:34; S1-E13-04).
- **Legal and compliance:** decided 16 Oct 2026: the target is 20 writers publishing, from any open market. The 200 readers and 30% return targets are still proposals, not final.

##### S1-E15-03 Event catalogue

As a developer, I want one list of analytics events so that tracking stays consistent and private.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E15-01
- **Acceptance criteria:**
  - Given `docs/analytics-events.md`, when an event is added, then it has an `object_action` name, its properties and where it fires.
  - Given the code, when CI runs, then any event name not in the catalogue fails the build.
- **Legal and compliance:** keeps personal data out of analytics.

##### S1-E15-04 Investor numbers (ANALYTICS-1a)

As the owner, I want the numbers an investor asks for counted from our own database so that I can show how the platform grows without a tracker.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E15-02
- **Added:** 11 Nov 2026 (Robert's queue, bundle ANALYTICS-1; research doc "Research: reading analytics and suggestions").
- **Acceptance criteria:**
  - Given a signed-in member using the app, when the first minute of a day is noted, then the day's active-member total goes up by one, and each later minute (at most one every 45 seconds) adds to the day's minutes in the app, and to minutes reading while a chapter is open.
  - Given the member's own row, when it is stored, then it holds only their last day in the app and when their last minute was noted, overwritten each time; nobody else, staff included, can read it.
  - Given a reader who reaches 95% of a chapter for the first time, when the place is saved, then the day's finished total for that chapter goes up by one.
  - Given the nightly job, when it runs, then it stores for yesterday: active members, weekly and monthly active members, sign-ups, stories read, chapters read, chapters finished, minutes in the app, minutes reading, writers publishing and rolling retention at 1, 7 and 30 days.
  - Given the owner or an admin in a staff session, when they open Metrics, then they see the latest numbers, a table by month with the change from the month before and a spreadsheet download of the daily totals; anyone else is refused by the database.
- **Legal and compliance:** totals only; the one row per member is a last-seen date, like a sign-in time, so no history of a member's days is kept (decided 17 Oct 2026, 12:34). Signed-out visitors aren't counted. Totals are kept 3 years.

##### S1-E15-05 Ranking place (ANALYTICS-1b)

As a writer, I want to see my story's place in its category so that I know it is being read.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E5-03, S1-E15-04
- **Acceptance criteria:**
  - Given the hourly ranking job, when it scores a story, then follows, finished chapters weighted by reading time and growth over 7 days count beside reads, likes, comments, shares and read-through, each with a weight in settings.
  - Given a story in its category's first 100 by score, when anyone who may read it opens its page, then it shows "#3 in Fantasy"; staff see the same place on the story in Stories.
  - Given a story with no score or below place 100, when its page opens, then no place is shown.

##### S1-E15-06 Suggestions from reading (ANALYTICS-1c)

As a reader, I want stories suggested from what I and other readers finished so that I find my next story, and I want to know why each row is there.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E4-03, S1-E5-11
- **Acceptance criteria:**
  - Given a story page or the end of a story's latest chapter, when it shows, then "More by" lists the writer's other stories the reader may see, and "Stories like this" lists stories finished by at least 5 of the same readers.
  - Given the nightly job, when it pairs stories, then only the Finished shelves of members whose switch is on count, and only the pair counts are kept.
  - Given a member with the switch on and a finished story, when Discover opens, then a "Because you read" row shows stories paired with it, worked out then and never stored.
  - Given any of these rows, when the reader asks "Why am I seeing this?", then one sentence says where the row comes from.
  - Given an adult, when they join, then "Suggestions from my reading" is on; given anyone under 18, then it is off and they may turn it on themselves (13 to 15 without a parent).
- **Legal and compliance:** the pairs are aggregates with the small-number rule; blocks, ratings and moderation apply through the same list rules as every shelf.

##### S1-E15-QA Epic check: Analytics and the March test

As the founder, I want every story in this epic tested together end to end so that the pieces work with each other, not just alone.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E15-02
- **Added:** 17 Oct 2026, 12:36 (Robert, chat): every epic ends with a quality-check story, and every prompt has a quality check built in. It covers the epic's March MVP stories and comes last among them in the build order. The epic's after-March stories (S1-E15-01, S1-E15-03) get the same check when they land (proposal).
- **Main journeys:** after test reading, the daily job produces the March numbers and staff with the right role see them, aggregates only.
- **Acceptance criteria:**
  - Given the epic's stories are merged, when the end-to-end suite runs, then Playwright tests walk the main journeys across those stories with the seed personas `adult_writer`, `teen_17`, `kid_14_ok` and `kid_14_waiting` and the staff personas the epic uses, and every journey passes.
  - Given a journey breaks where two stories meet, when it is found, then it is fixed in this pull request or ticketed as a GitHub issue that names the stories involved.
  - Given every screen in the epic, when axe runs at 390, 768 and 1440 px wide, then it reports no serious or critical issues.
  - Given the RLS tests, when they run as one suite (`npx supabase test db`), then every policy on every table the epic touches has an allowed and a denied test, with no gaps.
  - Given `docs/code-tour.md`, when it is read, then it covers the epic: where its screens, hooks, tables, functions and jobs live and how one main journey travels through them.
  - Given the check is finished, when the pull request is opened, then it includes a short epic report listing what works, the known gaps and every stub or mock still on (with the story that removes it, `docs/mocks.md`).
- **Legal and compliance:** minors' journeys are tested with the under-16 (`kid_14_ok`, `kid_14_waiting`) and 16 to 17 (`teen_17`) personas, so the age gate, ratings, blocks and under-18 defaults are proved across stories, not only inside each one. In March only invited adults sign up (`adults_only`, decided 17 Oct 2026, 12:44), so the minor personas are seed data that prove these protections are ready before minors are let in. The test data is the seed personas only, never real user data (CLAUDE.md, Safety while building).

---
