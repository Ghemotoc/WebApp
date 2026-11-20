# FocusBar

The chapter bar: a slim glass bar that floats over the text while reading or writing, at every width.

**Reader:** Back (named "Back to The Salt Mine Choir"), the story's title with "Chapter 14 of 15 · 3 min left" as its meta line, and **Aa** for Reading settings. On wide screens a quiet **Next chapter** button ends the bar.

- **Time left** (Robert, 20 Nov 2026, 12:28): the minutes sit in this bar by default and count down as the reader goes; they are the progress, so there is no progress line. A reader who wants them on the page instead switches Time left to "On the page" in Aa (ReaderPage).
- **"of 15"** shows only once the writer has marked a chapter as the last (Sheet: This is the last chapter). Until then the meta line reads "Chapter 14 · 3 min left".
- **Wide screens:** the site's top bar stays above, as today; the chapter bar floats over the text as the page scrolls.
- **Phones:** the chapter bar is the only bar while reading, 12px from the top, with the paper filling the screen. A long title ends in an ellipsis.
- **Aa** opens Reading settings (Sheet) at the top of the side column on wide screens and as a sheet on phones. It starts closed and closes with ×; `aria-expanded` says which.

**Editor:** Chapters (opens the chapter list as a side panel), the chapter's name with its saved state, Plan and Preview as text buttons, and **Publish** as the one main button. Publish opens the publish sheet (Sheet).

**Do:** keep it to five controls or fewer.
**Don't:** add a progress line, a comments button (comments open from a paragraph's count, and the chapter's comments sit under the paper) or a second main button.
