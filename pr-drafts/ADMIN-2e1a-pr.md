<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Part of bundle 12 ADMIN-2, part e1a, from Robert's brief of 2 Nov 2026, 08:39 (`bundle-12-pictures-bans-avatars-brief.md`). No story issue of its own; it changes S1-E10-05 (picture check), S1-E3-09 and S1-E3-11 (chapter pictures and drawings) and S1-E3-06 (ratings). Part e1b (the moderator's "Pictures to check" page) follows.

## What changed
- **Drawings and illustrations only.** Every upload field (cover, profile picture, chapter Picture and Drawing dialogs) now says "Drawings and illustrations only, no photos." with the allowed kinds, read from a new public setting `picture_allowed_kinds` (drawing, illustration, non-photographic AI), so staff can change the list without a release.
- **No rights tick box.** The "I have the right to use this picture" box is gone from the chapter dialogs, and the database no longer asks for it (`register_chapter_picture(target_path)` now takes one argument; the old check constraint is dropped). Earlier rows keep their `rights_confirmed_at`.
- **No Sightengine.** The real picture check now asks only Arachnid Shield. The Sightengine code stays, off, and runs only if `PICTURE_CHECK_SIGHTENGINE=on` is ever set.
- **Ratings by the writer's age.** A writer under 16 can rate a story All ages or 13+, and the form says so; writers aged 16 and 17 can use every rating up to 18+. The database enforces it with a trigger on `stories.rating` (hint `rating_too_high_for_age`), which also stops staff raising an under-16's story above 13+.

## How it was tested
- Database: new `247-picture-rules` (9 tests: the setting; the one-argument function; a 14-year-old's story at 13+ allowed, 16+ and 18+ refused; a 17-year-old at 18+ allowed; an adult at 18+ allowed; a staff raise to 16+ on a 14-year-old's story refused). `185-chapter-pictures` updated for the one-argument call.
- Unit: the picture check adapter reports `arachnid` by default and `sightengine+arachnid` only when switched on.
- End to end: new `picture-rules` (a 14-year-old sees only All ages and 13+ with the reason; a 17-year-old sees 18+); `chapter-pictures` and `chapter-drawings` check the new line and that no checkbox is left.

## Local check run
LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand
- Nothing on staging: the migration arrives with the merge.
- The GO-LIVE picture check list no longer needs a Sightengine account or keys (updated in your by-hand list).
- Optional: read the new Romanian lines (`pictures.rules` in `common.json`, `labels.ratingUnderSixteen` in `writing.json`).

## Board mismatches
- Boards 4.2 and 4.3 still show the rights tick box and all four ratings for every writer; the brief wins.

## Questions for Robert
1. **What "non-photographic AI" means on screen.** The allowed list reads "drawings, illustrations and AI pictures that don't look like photos". Is that the wording you want, or should AI pictures be left out of the list?

## Follow-ups
- The privacy notice and terms still name Sightengine; the new legal version is planned with the ban wording in part 12f.
- Part e1b: pictures in All ages and 13+ stories, and every picture from an under-16, wait for a moderator.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
