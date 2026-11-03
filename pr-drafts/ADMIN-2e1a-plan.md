# ADMIN-2e1a plan: picture rules (bundle 12, part e1, first half)

Source: /mnt/project-files/builder/bundle-12-pictures-bans-avatars-brief.md (Robert, 2 Nov 2026, 08:39).

Split: e1a (the rules, this PR) and e1b (Moderation › Pictures to check with Approve, Approve and raise, Reject; the "waiting" picture status needs its own enum migration).

## Changes
- Migration 20261220100001: public setting `picture_allowed_kinds`; the rights tick box is gone (constraint dropped, `register_chapter_picture(target_path)` with one argument); `age_band_of()`; trigger `stories_rating_fits_writer` refuses 16+ and 18+ from writers under 16 (hint `rating_too_high_for_age`), staff raises included.
- Picture check adapter: Sightengine only when `PICTURE_CHECK_SIGHTENGINE=on`; Arachnid Shield always.
- Front end: PictureRulesNote on every upload field and in the chapter Picture and Drawing dialogs; rights tick box removed; useRatingsIMayGive limits the rating chips for under-16s with a line saying why.
- Docs: decisions, mocks, code tour, pictures README; by-hand list drops the Sightengine keys.

## Tests
- DB 247-picture-rules (9), 185-chapter-pictures updated (27).
- Unit: picture-check adapter (provider by default and when on).
- E2E: picture-rules (kid vs teen rating chips), chapter-pictures and chapter-drawings (rules line, no checkbox).
