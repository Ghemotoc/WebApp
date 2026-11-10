# Writers' hub and Resources

The signed-in home at `/hub` and the Resources page at `/resources`, built by bundle G9 WRITING, part a (Robert, 9 Nov 2026, 12:09 and 12:11 UTC).

- `components/WritersHubPage.tsx`: the page. Signed out it shows a log-in line; signed in it shows the seven blocks below.
- `components/HubHero.tsx`: the day, the heading and the Start writing and Resources buttons.
- `components/HubContests.tsx`: one card per open contest (the landing page's first picture as its cover, days left, word limit, prize, how many entries count, how to enter, a link to its landing page), or a short line when none is open. The cover and the count come from `writers_hub_contests()` (GAPS-12a).
- `components/HubPrompt.tsx` (GAPS-12c): the prompt of the week with how many writers tried it and how long it runs, "Write from this prompt" (`/write/new?prompt=<ID>`) and "Another prompt", which pages through the earlier ones. Hidden until staff write the first prompt.
- `components/PromptNote.tsx`: on the new-story screen, the prompt the story is being started from.
- `components/staff/`: `/staff/hub`, where staff with the contests area keep the hub's content. `StaffHubPage.tsx` shows `PromptsSection.tsx` (`PromptForm`, `PromptItem`) and `CallsSection.tsx` (`CallForm`, `CallItem`); `ConfirmDeleteButtons.tsx` and `formatStaffDay.ts` are shared.
- `components/HubGuides.tsx`: the how-to guides two at a time, with Previous and Next arrows and a link to Resources.
- `components/HubWeek.tsx` (GAPS-12b): "This week": chapters posted, reads, comments and new followers in the last 7 days, with a link to the statistics on `/write`. A number from fewer than 5 people reads "fewer than 5".
- `components/HubTools.tsx`: Story Atlas, Writing, Download stories and Help centre.
- `components/HubCalls.tsx` (GAPS-12d): "Calls for submissions": calls from outside the platform that are still open, each a link to the organiser's page (new tab, `rel="nofollow noopener noreferrer"`), with "Paid" where it applies. Paid calls reach adults only. Hidden when no call is open.
- `components/ResourcesPage.tsx` and `ResourcesLinkList.tsx`: writers' rights, every how-to guide and More help (help centre, guidelines, contact, privacy and terms).
- `api/hubContests.ts` and `hooks/useHubContests.ts`: `writers_hub_contests()`.
- `api/hubWeek.ts` and `hooks/useHubWeek.ts`: `my_week_numbers()`, which counts only the caller's own activity.
- `api/hubPrompts.ts`, `hooks/useHubPrompts.ts` and `hooks/useStaffPrompts.ts`: `writers_hub_prompts()`, `start_story_from_prompt()`, the `writing_prompts` table for staff, `admin_save_writing_prompt()` and `admin_delete_writing_prompt()`.
- `api/hubCalls.ts`, `hooks/useHubCalls.ts` and `hooks/useStaffCalls.ts`: `writers_hub_calls()`, the `submission_calls` table for staff, `admin_save_submission_call()` and `admin_delete_submission_call()`. `api/hubStaffErrors.ts` turns a refused staff change into the message to show.
- `hooks/useHomeAddress.ts`: where the logo leads (`/hub` signed in, `/` signed out); used by `TopBar` and `PhoneHeader`.
- `lib/hubDates.ts`: the day in the hero and the days left on a contest, in Romanian time.
- `lib/howToGuides.ts`: picks the how-to guides from the help pages and pages through them.
- `registerHubTranslations.ts`: the `hub` text namespace (`src/locales/*/hub.json`).
- The guides and the writers' rights page are CMS help pages, not locale text (CLAUDE.md rule 4): the migration `…_g9a_writers_hub.sql` publishes version 1 and admins edit them in Staff › Website.
