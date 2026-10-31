# WRITE-5c plan: S1-E3-11 Drawings in chapters (#30)

- No database change: a drawing is a chapter picture (S1-E3-09), so it uses `register_chapter_picture()`, the `chapter-images` bucket, the picture check and the `picture_uploads` flag.
- Front end: Insert › Drawing → `DrawingInsertDialog` (tools: pen, eraser, ink/red/blue from the board, Undo, Clear; the sheet; alt text and the rights box) → PNG → `uploadChapterPicture()` → `chapterPicture` block.
- Keyboard drawing (arrows draw, Shift+arrow moves) as the alternative to dragging.
- Shared: `useNativeDialog` and `pictureFailureMessage` moved out of the two existing dialogs.
- Criteria → tests: 1 (pad with pen, eraser, colours, undo, clear) e2e; 2 (saved as a picture with alt text and the check) e2e + stored Markdown + picture_checks row.
