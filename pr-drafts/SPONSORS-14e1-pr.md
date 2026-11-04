<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #121

Bundle 14 SPONSORS, part e1: the database side of booking a sponsor into an ad slot, our own house ads and the fill order (S1-E12-05). Part e2 adds the Placements screen and the house ad editor on top, and closes the issue. This branch sits on top of #322 (and so on #321 to #318). It targets #322's branch until those merge, and then main.

## What changed

- **Bookings** (criterion 2): an admin books an approved banner campaign into one slot for some days, on the pages it should match (category, tags, language; empty means any page).
  - The days must sit inside the campaign's own dates.
  - One sponsor per slot per day (the story's proposal): a booking that overlaps another one on the same slot is refused, and the refusal names the clashing campaign and its days. The slot is locked while it's checked, so two admins can't both book it at once.
  - A "Sponsored by" credit can't be booked into a slot.
  - Bookings can be moved, re-targeted or cancelled with a reason. Each of these is in the audit log (criterion 7).
- **Our own house ads** (criterion 6): a title in Română and English, an optional line in each, a link that can only be a page on our own site, the dates, and one slot or any slot. They can be changed or archived, and both are logged.
- **The fill order** (criterion 3). Each slot now fills in this order:
  1. the sponsor booked for that slot and day, when the page matches its booking;
  2. a house ad that staff wrote, then our landing pages;
  3. the ad network, when it's on;
  4. our built-in house ads, so the space is never blank.

  A booked slot belongs to that sponsor alone for the day. On a page the booking doesn't match, the slot shows our house ad, never another sponsor. Unbooked slots still take a live campaign by its placement, as they have since part b1 (a proposal).
- **Placements data** (criterion 1): `admin_ad_placements()` returns every slot on every public page against the next six weeks. Each week is Booked (with the sponsor and campaign), House ad, Ad network or Free, and the bookings are listed under the grid. Class spaces have no slots (Q70).
- **Reader pages:** a house ad written by staff shows its own words in the reader's language and links to our page.
- Nothing about the reader is read anywhere (criterion 4).
- **Records:** a decision log row (a proposal) and the code tour.

## How it was tested

- Database test `275-ad-bookings` (20 tests) covers:
  - an allowed and a denied test for both new policies;
  - booking, the named clash, credits and out-of-date days refused, and a writer refused;
  - house ads that link to another site or have no English title are refused;
  - the fill order on matching and non-matching pages;
  - Placements states, including the network once it's on;
  - change, cancel and rebook, and the three audit rows.
- Test 021 gains both tables. Tests 271 to 274 pass unchanged.
- A unit test for the staff house ad in both languages, and one that refuses a link to another site.
- The `ads`, `sponsored-ads` and `ad-network` e2e tests ran unchanged.

## Local check run

LOCALRUN

## By hand

Nothing.

## Questions for Robert

None blocking. "One sponsor per slot per day" and "a booked slot never goes to another sponsor" are proposals you can change.

## Follow-ups

- Part e2: the Placements screen, booking from a campaign, and the house ad editor.
- Watching for AdSense slots it declines to fill and showing a house ad instead.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
