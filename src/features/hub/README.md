# Writers' hub and Resources

The signed-in home at `/hub` and the Resources page at `/resources`, built by bundle G9 WRITING, part a (Robert, 9 Nov 2026, 12:09 and 12:11 UTC).

- `components/WritersHubPage.tsx`: the page. Signed out it shows a log-in line; signed in it shows the four blocks below.
- `components/HubHero.tsx`: the day, the heading and the Start writing and Resources buttons.
- `components/HubContests.tsx`: one card per open contest (the landing page's first picture as its cover, days left, word limit, prize, how many entries count, how to enter, a link to its landing page), or a short line when none is open. The cover and the count come from `writers_hub_contests()` (GAPS-12a).
- `components/HubGuides.tsx`: the how-to guides two at a time, with Previous and Next arrows and a link to Resources.
- `components/HubTools.tsx`: Story Atlas, Writing, Download stories and Help centre.
- `components/ResourcesPage.tsx` and `ResourcesLinkList.tsx`: writers' rights, every how-to guide and More help (help centre, guidelines, contact, privacy and terms).
- `api/hubContests.ts` and `hooks/useHubContests.ts`: `writers_hub_contests()`.
- `hooks/useHomeAddress.ts`: where the logo leads (`/hub` signed in, `/` signed out); used by `TopBar` and `PhoneHeader`.
- `lib/hubDates.ts`: the day in the hero and the days left on a contest, in Romanian time.
- `lib/howToGuides.ts`: picks the how-to guides from the help pages and pages through them.
- `registerHubTranslations.ts`: the `hub` text namespace (`src/locales/*/hub.json`).
- The guides and the writers' rights page are CMS help pages, not locale text (CLAUDE.md rule 4): the migration `…_g9a_writers_hub.sql` publishes version 1 and admins edit them in Staff › Website.
