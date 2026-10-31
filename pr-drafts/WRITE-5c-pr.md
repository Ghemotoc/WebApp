<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #30

## What changed

Writers can draw a simple sketch inside the editor: Insert › Drawing opens a sketch pad with Pen, Eraser, the board's three colours (ink, red, blue), Undo and Clear. "Insert drawing" saves the sheet as a PNG and sends it through the chapter picture upload from S1-E3-09. That means the location and camera data are removed, the picture is resized and checked, and it needs alt text and "I have the right to use this picture". The drawing goes in the chapter as an ordinary picture.

- **No database change.** A drawing is a chapter picture, so it shares the `picture_uploads` flag, the bucket, the limits and the picture check.
- **Keyboard drawing.** When the sheet has focus, the arrow keys draw a line one step at a time, and Shift with an arrow moves without drawing. This is the alternative to dragging. A screen reader hears how many lines have been drawn.
- **New files:**
  - `lib/sketchPad.ts` holds the drawing rules, with no React in them;
  - `hooks/useSketchPad.ts`;
  - `components/SketchTools.tsx`, `SketchPadCanvas.tsx` and `DrawingInsertDialog.tsx`;
  - the board's doodle pen as `src/assets/icons/drawing.svg`.
- **Tidying.** The three Insert dialogs now share `hooks/useNativeDialog.ts` and `lib/pictureFailure.ts` instead of two copies each.

## How it was tested

- Unit: `sketchPad.test.ts` checks that a pointer on a shrunken canvas maps to the full sheet, that the keyboard pen stops at the edges, and that an eraser-only sheet counts as empty.
- e2e `chapter-drawings.spec.ts` (6 tests):
  - the tools are all there;
  - an empty sheet, missing alt text and an unticked rights box are refused;
  - a mouse drag draws, Clear empties the sheet, the arrow keys draw and Shift+arrow moves without drawing, and Undo removes a line;
  - the inserted drawing shows as Checked, is stored as `![alt](picture:<ID>)` and has a `passed` picture check;
  - a reader sees it with its alt text;
  - axe and widths at 390 px (Romanian), 768 px and 1440 px with a drawing on the sheet.
- The existing specs for the screens it touches pass when run one at a time: `chapter-pictures`, `chapter-editor`, `chapter-editor-offline`, `music-and-video`, `picture-check` and `story-settings`. With the new spec that is 84 tests.
- Screenshots of the pad at 390 px and 1440 px, checked by eye.

## Local check run

| Check | Result |
| --- | --- |
| lint, typecheck, types:check, i18n:check, migrations:check | pass |
| unit tests | 135 files, 813 passed |
| db reset + test db | 96 files, 2,053 tests, PASS |
| functions build | compiled |
| e2e | the new spec and the 6 related specs: 84 passed. The whole suite runs once at the end of the bundle (before 5f merges) |

## By hand

- Nothing on staging: no SQL top-up and no new secrets.
- GO-LIVE: drawings switch on with chapter pictures (the `picture_uploads` flag, after the picture-check step).
- Optional: read the new Romanian lines (`insert.drawing`, `insert.drawingNote` and `drawingDialog` in `editor.json`).

## Board mismatches

These are noted in `docs/board-fixes.md`:
- the sketch pad is a dialog, not a panel inside the page;
- it asks for alt text and the rights box, as every picture must;
- the tools are a labelled group, not a toolbar, because the sheet uses the arrow keys for drawing.

## Follow-ups

- The sketch pad only draws freehand lines. Shapes, text and line width would be ideas for later.
- A drawing can't be edited once it is inserted. The writer removes it and draws again, the same as replacing a picture.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
