<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #121

Bundle 14 SPONSORS, part e2: the Placements screen in Staff › Sponsors (S1-E12-05). It's built on part e1's database functions. This branch sits on top of #323 (and so on #322 to #318). It targets #323's branch until those merge, and then main.

## What changed

- **Placements** sits on `/staff/sponsors`, after the review queue, following the board AdminSponsors. It has five parts:
  - **How each slot is filled:** the four-step fill order the server uses, and the class-space note.
  - **Slot inventory, next 6 weeks** (criterion 1): every slot on every public page, with each week shown as Booked (sponsor and campaign), House ad (its title), Ad network or Free.
    - "Preview with the ad network on" shows what the free wide slots would become. It changes nothing on the server, and it starts pressed when the network really is on.
    - The table scrolls inside its own labelled box, so the page never scrolls sideways on a phone.
  - **Book a slot for a campaign** (criterion 2): pick an approved campaign (its own dates are shown under it), the slot, the first and last day, and the pages it should match (category, tags, language). Then "Check and book". A clash is refused with the booking already in the slot named, for example "That slot is already booked on some of those days: Slot first (2026-11-04 to 2026-12-04)".
  - **Bookings:** each booking that stands, with "Cancel booking". Cancelling asks why, and the reason goes into the audit log.
  - **Our own promos** (criterion 6): add, change or take down a house ad. Each one has its title (and an optional line) in Română and English, a page on our site, a slot or any slot, and its dates.
- Words are in both languages, and the Romanian is gender-neutral.
- **Records:** the sponsors README and the code tour.

## Board mismatch

The board picks the booking's days with "From (week of)" and "To (week of)" selects. Here they are date fields, because a booking must sit inside the campaign's own dates, and those needn't start on a Monday. The grid still shows weeks.

## How it was tested

- Unit tests for the Placements helpers:
  - the preview turns only free wide slots into the network, and never covers a booking;
  - only approved banners that haven't ended can be booked;
  - the empty forms;
  - "today" is read in Romanian time.
- The new e2e test `sponsor-placements.spec.ts`:
  - an admin books Discover's wide banner and the grid says Booked;
  - a second campaign on overlapping days is refused, naming the first;
  - a visitor on Discover then sees the booked sponsor, labelled Sponsored;
  - cancelling with a reason removes the booking;
  - a house ad linking to another site is refused, and one linking to `/c/poetry-week` is saved and listed;
  - axe finds nothing serious, and nothing scrolls sideways at 390, 768 and 1440 px.
- `sponsors-admin` (axe on the whole Sponsors page, now including Placements) and `sponsored-ads` ran unchanged.

## Local check run

LOCALRUN

## By hand

Nothing.

## Questions for Robert

None blocking. The contest landing page banner on the board is still OPEN ("should a sponsored contest's page show another sponsor or an ad-network ad?"). Placements says so, and that page has no slot until you decide.

## Follow-ups

- Watching for AdSense slots it declines to fill, and showing a house ad instead.
- Part f: network ads switch off on stories whose writer ticked sexual content, nudity or graphic violence.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
