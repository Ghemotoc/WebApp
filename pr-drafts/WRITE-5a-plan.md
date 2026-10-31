# WRITE-5a plan: S1-E3-09 Pictures in chapters (#28)

Branch `claude/write-5a-chapter-pictures`. Board 4.3 (Editor: Insert menu, inserted picture). Builds on S1-E10-05 (the picture check) and S1-E3-02 (the editor).

## Database (`…_s1_e3_09_chapter_pictures.sql`)
- `picture_checks` gains `chapter_id` and `rights_confirmed_at`; kind `chapter_picture` (and `drawing`, for S1-E3-11) lives in the new private bucket `chapter-images` (5 MB; JPEG, PNG, WebP).
- `register_chapter_picture(path, rights_confirmed)`: the flag, the account gate, the writer's own chapter, the rights box, the upload rate limit.
- `check_chapter_pictures()` inside `save_chapter_draft()`: at most 30 (setting `chapter_max_pictures`), alt text required (300 characters), only the writer's own pictures.
- `get_chapter()` returns a `pictures` map with each picture's state; Storage serves a picture only once it passed (or to its uploader and moderation staff).
- Reports: `reportable_item_summary()` and `notification_item_json()` know chapter pictures.
- Test 185: allowed and denied for the three storage policies, the limits, the states.

## Front end
- `lib/preparePicture.ts`: every upload (covers and avatars too) redrawn on a canvas, so EXIF and location data go, and resized.
- Editor: Insert menu (Picture only for now), `PictureInsertDialog` (file, alt, rights), the `chapterPicture` block with its state pill, alt field and Remove.
- Reader, teaser and preview: `ChapterPicture` (the picture and Report; "being checked"; the removed marker).

## Tests
- Unit: chapter-pictures, preparePicture, chapterMarkdown, ChapterText, the chapter schema.
- e2e `chapter-pictures.spec.ts` (7): upload strips location data, a flagged picture stays hidden, report, flag off, axe and widths 390, 768, 1440.
