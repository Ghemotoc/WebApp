# Sheet

A glass panel that carries tools over the page: reading settings, comments, publishing, Add to a bookshelf, share. It floats, so it is glass.

- `surface-glass` with blur 24px, `surface-glass-rim` and `shadow-raised`, corners `radius-card`.
- A `subheading` title and a Close button; rows split by `line-hairline`.
- Choices use the segmented control: the chosen one on a white bubble (`surface-solid`, `shadow-rest`). A yes-or-no setting is a switch (`gh-switch`, `role="switch"`): on is `action-selected` with the knob to the right, and the words beside it say what it does.
- On phones a sheet rises from the bottom; on wide screens it opens beside the page, never covering the reading column.

**Reading settings** (Aa): text size, typeface, page and **Time left**. In the reader it starts closed: Aa opens it at the top of the side column and × closes it (Robert, 20 Nov 2026). "In the bar" is the default for Time left: the minutes sit in the chapter bar's meta line. "On the page" shows a small glass pill with the minutes at the foot instead, while there is text left (ReaderPage). Readers choose; nothing changes unless they set it up (Robert, 20 Nov 2026, 12:28).

**Publishing a chapter** (Publish in the editor): Now or Later with a date and time, then the switch **This is the last chapter**, off by default (Robert, 20 Nov 2026). Turning it on, while publishing or scheduling, is the only way a story gets an end: readers then see "Chapter 14 of 15" and "Last chapter next Thursday", and the story turns Completed when that chapter is out. The main button names the step: "Publish chapter 15" or "Schedule chapter 15". The writer can turn the switch off again until the chapter is out.

**Don't:** open a sheet on page load, nest sheets, or put a second main button in one.
