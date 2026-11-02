<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Robert's request of 2 Nov 2026, 15:35: rename the Story Atlas "story bible" to something less religious. He picked **Story world** (Romanian: Lumea poveștii). Bundle 12 ADMIN-2, part a2. No issue: it follows his message in the project thread.

## What changed
- **The name.** Writers see "Story world" everywhere the bible was named: the Story Atlas menu, the page heading and tab title, the entry counts in search, the [[link]] chips, the privacy and sharing hints, and the plan line in Download my stories and Download my data (the Word plan's heading follows). Readers already saw the public part as the story's world, so writers and readers now share one name.
- **The address.** The page moved from `/plan/s/<story>/bible` to `/plan/s/<story>/world` (and `…/world/<entry>`). The old address still works: it redirects, keeping `?edit` and any `#part`, so saved and shared links don't break.
- **What stays.** Code, tables (`story_bible_sections`, `story_bible_entries`), functions and translation keys keep the name "bible", so nothing in the database moves. The code tour and the Atlas README say so. The database's own error messages mention the bible, but the screens never show them; they use their own texts.
- **Docs.** `docs/decisions.md` records the rename and Robert's other 15:35 decision (every download that includes the Story Atlas plan offers it as PDF too, built in part 12d). The S1-E17-17 story has a note.

## How it was tested
- `e2e/atlas-bible.spec.ts`: a new test opens an old `/bible?edit` address and lands on `/world?edit` with the "Story world" heading; the rest of the spec runs on the new address and names.
- `e2e/atlas-search-links.spec.ts`: opening an entry by its old address lands on its `/world` address; the search shows "Story world entries (1)".
- Unit test `itemAddress.test.ts`: search results and [[links]] point at `/world`.
- The public plan, at a glance and both download specs were run again, because they show the same text.

## Local check run
LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand
Nothing: no SQL top-up and no new secrets. Optional: read the changed Romanian lines (`atlas.json`: "Lumea poveștii" and the lines around it; `dataExport.json`: `planHint`).

## Board mismatches
None new. The Story Atlas boards say "Bible"; Robert's rename wins.

## Questions for Robert
None.

## Follow-ups
- If you'd also like the code and tables renamed, that's a larger change (one migration renaming two tables and their functions), with no difference anyone would see. I'd leave it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
