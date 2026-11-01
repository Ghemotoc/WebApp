<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of bundle 8b IDEAS-1 (ideas IDEA-20261031-4, 6, 7 and 8, your picks of 31 Oct 2026). These ideas have no story issue, and the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 8b IDEAS-1, part a: reading place and comfort.

## What changed
- **"You are here" (idea 4).** The story page's chapter list marks the chapter the reader stopped in with "You are here, 42%" in words (a chip, 44 px target). It links to the chapter with `#resume`; the reader then scrolls straight back to the saved place and drops the hash from the address, so a reload starts where the reader is.
- **Atkinson Hyperlegible (idea 6).** A fourth reading font, self-hosted from `@fontsource/atkinson-hyperlegible` (regular, bold and italics, Latin and Latin Extended, so ș and ț are covered). No outside font site is called.
- **Night by the clock (idea 7).** A checkbox and two time fields the reader fills in themselves; there is no preset hour, and the line under the fields says nothing changes until both are set. A span past midnight works. The device's clock is read once when a chapter opens, so a chapter never switches while it's read. A theme picked by hand while the clock decides wins until the next chapter and doesn't change the usual theme.
- **The reading ruler (idea 8).** A soft tinted band behind the line under the pointer; the Up and Down keys move it a line at a time and keep it in view. It is `aria-hidden` and takes no clicks or focus, so screen readers read the chapter as before. Loaded only for readers who turn it on, so the reader stays inside its 40 KB script budget.
- **Database.** `reading_font` gains `atkinson_hyperlegible`; `reading_settings` gains `night_by_clock`, `night_from`, `night_until` and `reading_ruler`; `save_reading_settings()` takes four more arguments, each with a default, so older calls still work. No new table and no change to who can read the row (its owner only).
- **The panel** now scrolls inside itself on short screens, and the two time fields stack on phones.
- **Docs:** `docs/code-tour.md` ("Reading place and comfort") and `src/features/reading/README.md`.

## How it was tested
- `supabase/tests/database/215-reading-comfort.test.sql` (8 tests): the new font and settings are kept, both times past midnight, a five-argument save still works and leaves the new settings off, and `reading_settings_select_own` allowed and denied.
- Unit: `lib/nightByClock.test.ts` (inside, outside and past-midnight hours, a pick by hand) and `lib/rulerLines.test.ts` (boxes into lines, the line under a point, arrow steps).
- `e2e/reading-comfort.spec.ts`: "You are here" opens the place; the font comes from our own site; Night by the clock starts with empty fields and saves both times; a chapter opened at 23:30 shows in Night and at 12:00 in Sepia; a pick by hand wins until the next chapter; the ruler follows the pointer and the arrow keys and is hidden from screen readers; axe at 390, 768 and 1440 px, light and night, ro and en, on the open panel and on the story page (24 views).
- Screenshots checked by eye at 390 and 1440 px: the story page chip, the panel with the time fields, and the ruler in Night.

## Local check run
LOCALRUN

## By hand
None.

## Board mismatches
None: board 3.4 and 3.5 have no place for these; they follow the existing chip and panel styles.

## Questions for Robert (OPEN or not in the story, built as proposals)
- **The clock is the device's own**, read when a chapter opens. A reader with two devices in different time zones gets each device's local night. Say if you'd rather use one time zone saved on the account.
- **The ruler's band reaches past the text** to the paragraph's comment marker on wide screens, so the whole line row reads as one. Say if it should stop at the text's edge.

## Follow-ups
- The ruler was tested with a mouse and the keyboard. On a touch screen it follows the finger through the same pointer events, but it hasn't been tried on a real phone yet; worth a look on staging.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
