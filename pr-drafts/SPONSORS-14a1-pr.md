<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #117

Bundle 14 SPONSORS, part a1: the ad slots of public pages, filled by the server from the page's context only, with "Why this ad?" (S1-E12-01). Part a2 places the slots on the remaining public pages; sponsors (part b) and the non-personalised network (part d) fill slots ahead of our own ads later.

## What changed

- **Database.** `ad_format` (wide, portrait, side box, card in a list) and `ad_label` (Sponsored, Ad, our own). `ad_slots` holds every slot of every public page, at most two per page (a unique page and position, position 1 or 2), readable by anyone and written only by migrations for now (staff switch slots off in part e). `page_ads(page_key, context)` fills a page's slots: never the same ad twice on a page, and from the page's category, tag and language only. Nothing about the reader is read, so a signed-out visitor and a signed-in reader get the same answer. A class space or a class-only story gets no slot at all (Q70).
- **Our own ads until sponsors arrive.** A live landing page of ours comes first, then "Start writing", "Read the classics" or "Open the forums" (never the one for the page it is on), in an order that changes daily and per page. They carry the label "From us" / "De la noi", so a slot is never blank and never pretends to be a sponsor.
- **Screens.** `<PageAdSlot>` holds a wide slot's height while it loads, so the page doesn't jump, and stays empty if the read fails. "Why this ad?" opens by keyboard and names only what the page matched, then promises that ads are never personalised. Placed on the chapter's end (replacing the empty banner stub from S1-E4-01b, which comes off `docs/mocks.md`), the story page under the chapter list, Discover after the first shelf and Library after the shelves.
- **Records:** a builder proposal row in decisions, the code tour, the ads README and the board-fixes rows for Story and Library.

## How it was tested

- Database test 270 (13 tests): anyone reads the catalogue and nobody writes it; a third slot or a second one in the same place is refused; Discover gets two different ads with our live landing page first; the classics page never advertises the classics; a signed-in teenager gets exactly what a signed-out visitor gets; "Why this ad?" echoes only category, tag and language even when more is sent; a class space, a class-only story and a non-public page get no slot.
- e2e `e2e/ads.spec.ts`: a visitor sees "From us" on the story page and opens "Why this ad?" by keyboard; Discover has one wide slot; a class-only story shows none, even to its writer; the story page with its ad passes axe and doesn't scroll sideways at 390, 768 and 1440 px, light and night, Romanian and English.
- Vitest: the "Why this ad?" sentences, what the page sends (empty values left out), and the chapter reader drawing the slot.

## Local check run

LOCALRUN

## By hand

- Nothing.

## Board mismatches

- The AdFormats board shows sponsor creatives in every slot. Until part b there are no sponsors, so slots show our own ads with the label "From us", which the board doesn't draw.

## Questions for Robert

None blocking. The decision row is a proposal (our own ads fill empty slots, labelled "From us"). Please read the new Romanian text in `src/locales/ro/ads.json` and `common.json` (`ads.labelHouse`).

## Follow-ups

- None yet; part a2 places the remaining slots.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
