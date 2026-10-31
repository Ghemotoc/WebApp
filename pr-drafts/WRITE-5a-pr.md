<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #28

## What changed

Writers can put pictures in a chapter: Insert › Picture in the editor, with alt text and "I have the right to use this picture". Every picture goes through the picture check (S1-E10-05) before a reader sees it, and its location and camera data are removed before it leaves the device.

**Database** (`20261103100001_s1_e3_09_chapter_pictures.sql`):
- a private `chapter-images` bucket (5 MB; JPEG, PNG or WebP), with three policies: the writer uploads into their own chapter's folder, everyone sees a picture that passed, and the uploader and moderation staff see the rest;
- `register_chapter_picture()`: the `picture_uploads` flag, the account gate, the rights box and the upload rate limit;
- `save_chapter_draft()` now refuses more than 30 pictures (setting `chapter_max_pictures`), a picture without alt text or with more than 300 characters, and a picture that isn't the writer's own;
- `get_chapter()` returns each picture's state, so the reader shows "Picture being checked" or "[Removed by the moderation team]" in its place;
- a reported picture says "Picture in chapter N of <title>" in the queue, and its notification links to the chapter;
- the word count leaves pictures out.

**Front end**:
- `preparePicture()` redraws every upload (covers and profile pictures too) on a canvas, which leaves EXIF and location data behind, and resizes it (longest side 1600 px for chapter pictures, 2560 for covers, 1024 for profile pictures);
- the editor's Insert menu (a keyboard menu button), the "Add a picture" dialog and the picture block with its state pill, alt text field and "Remove picture";
- the reader, the teaser and the preview draw `ChapterPicture`, with a Report button on each picture.

## How it was tested

- Database test `185-chapter-pictures` (29 tests): an allowed and a denied test for each storage policy; the rights box; the limits; someone else's picture refused; the states in `get_chapter()`; the word count.
- Unit tests: `chapter-pictures.test.ts`, `preparePicture.test.ts`, `chapterMarkdown.test.ts` (round trip with alt text that needs escaping), `ChapterText.test.tsx`, `chapter.test.ts`.
- e2e `chapter-pictures.spec.ts` (7 tests):
  - a JPEG with a planted location segment comes back as a WebP, 1600 px wide, with no EXIF;
  - a picture the check flags stays hidden from readers, and the writer sees "Held";
  - a reader reports a picture;
  - with the flag off there is no Insert button;
  - axe and widths at 390 px (Romanian), 768 and 1440 px for the editor, the menu, the dialog and the reader.
- The existing specs for the screens it touches still pass: `picture-check`, `chapter-editor`, `chapter-editor-offline`, `chapter-reader`, `teaser`, `publish`, `story-settings` (84 tests together).
- Screenshots checked by eye at 390 and 1440 px: the editor with two pictures, the menu, the dialog with its three errors, the reader with a picture and a placeholder.

## Local check run

| Check | Result |
| --- | --- |
| lint, typecheck, types:check, i18n:check, migrations:check | pass |
| unit tests | 130 files, 796 passed |
| db reset + test db | 95 files, 2,027 tests, PASS |
| functions build | compiled |
| e2e | the new spec and the 7 related specs, 84 passed. The whole suite runs once at the end of the bundle (before 5f merges) |

`legal.spec.ts` now says in its header that it must run on its own when the suite is split into parallel runs on one database (it publishes a new terms version that every persona sees). That was the bundle 4 race; the bundle's full run does exactly that from now on.

## By hand

- Nothing on staging: no SQL top-up and no new secrets.
- GO-LIVE: chapter pictures share the `picture_uploads` flag with covers and profile pictures, so they switch on together once Sightengine and Arachnid Shield are set up.
- Optional: read the new Romanian lines (`insert`, `pictureDialog` and `picture` in `editor.json`; `pictures.chapter` in `common.json`).

## Board mismatches

Noted in `docs/board-fixes.md`: no "Replace picture" (remove and insert again, since a new file needs a new check); the Insert menu has only Picture until music, video and drawings arrive; the state is a pill with a note.

## Follow-ups

- The location data is removed in the browser. A tampered browser could skip that, which only exposes the uploader's own data; a server-side check is a later step.
- A picture's signed address lasts an hour, so someone who copies it from a 16+ story could share it for that hour.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
