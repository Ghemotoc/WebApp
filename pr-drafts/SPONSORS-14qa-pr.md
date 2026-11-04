<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #122

Bundle 14 SPONSORS, the epic check (S1-E12-QA): the epic's stories tested together, end to end. It adds no feature. This branch sits on top of #325 (and so on #324 to #318). It targets #325's branch until those merge, and then main.

## What changed

- **Database journeys** (`277-epic-s1-e12`, 14 tests):
  - an approved banner (S1-E12-02) is booked into Discover's wide slot (S1-E12-05);
  - teen_17, kid_14_ok, kid_14_waiting and a signed-out visitor all get the same Sponsored ad, because nothing about the reader picks it;
  - a view and a click count with no cookie or user ID, and the admin's report shows them (S1-E12-03);
  - with the network on (S1-E12-04), the booked slot still goes to its sponsor; an All ages story's page gets the network, and our own ad once it is 18+ with sexual content ticked (part f);
  - a class-only story has no slot at all;
  - a moderator can't read a report; teen_17 can't book or see bookings.
- **Browser journeys** (`epic-s1-e12.spec.ts`):
  - with the network on, the admin books the banner on Placements; kid_14_ok sees it on Discover, labelled Sponsored; the view is counted and the admin finds it in the campaign's Report;
  - teen_17 sees an "Ad" on a story's page; the writer rates the story 16+ for graphic violence; teen_17 then sees our own ad there, and Google is never asked;
  - the story page with our own ad passes axe at 390, 768 and 1440 px, at night, in Romanian.
- **RLS:** every policy on the epic's ten tables has an allowed and a denied test. I checked them all; there are no gaps.
- **Code tour:** one paragraph following the epic from approval to report.

## Breaks found where stories meet

None. Every journey passed on the first run.

## Local check run

LOCALRUN

## By hand

Nothing.

## Follow-ups

- Watching for AdSense slots it declines to fill, and showing a house ad instead.
- Showing readers the rating reasons next to the rating, if you want that.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
