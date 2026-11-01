<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of bundle 8b IDEAS-1 (idea IDEA-20261031-13, with your comments of 31 Oct 2026). The idea has no story issue, and the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 8b IDEAS-1, part b: a private reading streak, no pressure.

## What changed
- **"Your reading days" in the Library.** Off until the reader taps "Turn it on". Then it shows "You read on 5 days this week" (Monday first) and today's minutes, against a daily target if they set one ("12 of 15 minutes today", with a bar). Only the reader sees it; it is never a badge or anything public.
- **The target** is any whole number of minutes from 1 to 600 that the reader types; empty means no target (your comment: "any number of minutes I choose").
- **The reminder** is off until ticked, needs a target and a time, and sends one in-app notification that day, "Your library: a few minutes of reading today?", only while the target isn't met, within two hours of the chosen time. It is never about a missed day or a broken streak (a late time's window stops at midnight, so nothing arrives the next morning), never by email, and never between 22:00 and 07:00 for anyone under 18: the form and the database refuse such a time, and the job skips them then anyway (quiet hours, Q50).
- **Counting minutes.** While the streak is on, the chapter reader adds one minute for each minute the tab is on screen and the reader scrolled, pressed a key or touched in the last two minutes, so a chapter left open overnight doesn't count. Only the day's total is kept, on the reader's own clock: never the chapter or the story. A second minute within 45 seconds is ignored, so two tabs can't count double. Readers who never turn it on send nothing.
- **Turning it off** asks once, then deletes the target, the reminder and the minutes already counted.
- **Database.** `reading_habits` (only while on) and `reading_minutes` (one row per reader per day), both readable by their owner only and written only through the new functions; the `send-reading-reminders` job every five minutes; minutes kept 14 days (`purge_old_reading_minutes()` joins the nightly retention run, setting `reading_minutes_keep_days`); both tables are in Download my data and deleted with the account.
- **Docs:** `docs/retention.md` (two lines), `docs/runbooks/scheduled-jobs.md`, `docs/code-tour.md` ("The private reading streak") and the two feature READMEs.

## How it was tested
- `supabase/tests/database/216-reading-streak.test.sql` (26 tests): off until on; a minute at a time and not twice in 45 seconds; days this week and minutes today; target range; a reminder needs a target; an under-18 can't pick 22:30 but can pick 21:00; one reminder a day while short of the target; none for an under-18 in quiet hours, whatever time is stored; never emailed; the 14-day clean-up; turning off deletes everything; `reading_habits_select_own` and `reading_minutes_select_own`, allowed and denied. Tests `021` (signed-out reads) and `212` (seven clean-ups now) updated.
- Unit: `lib/habitChoices.test.ts` (the form's rules, quiet hours edges) and `lib/activeReading.test.ts`.
- `e2e/reading-streak.spec.ts`: turn it on, read a chapter for a minute (the page's clock moved on) and see "1 day" and "1 minute today"; set 17 minutes and a reminder at 20:15 and see "1 of 17 minutes today"; the reminder's row opens the Library's note; teen_17 is refused 22:30; turning off deletes it all; axe at 390, 768 and 1440 px, light and night, ro and en (12 views).
- Screenshots checked by eye at 390 and 1440 px.

## Local check run
LOCALRUN

## By hand
- The record of processing needs a line for the new personal data (minutes read per day, for the reader only, 14 days), as the idea's privacy note says. It isn't in the repository, so it's yours to add.

## Board mismatches
None: board 3.7 has no place for it. It sits after the shelves as a plain card, without doodles, so it stays quiet.

## Questions for Robert (OPEN or not in the story, built as proposals)
- **Two weeks of minutes** (`reading_minutes_keep_days`, 14) is a proposal: "this week" only needs seven days. Say if you'd like longer, for example to show last week too.
- **"This week" starts on Monday**, as in Romania. Say if it should be "the last seven days" instead.
- **The reminder is in-app only** for now. It would reach a phone once push notifications exist (S1-E16-03), with the same quiet hours.

## Follow-ups
- The reminder's quiet hours are 22:00 to 07:00, the canvas 6.3 times from S1-E7 (Q50 decided quiet hours, not the times).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
