# ReaderPage

The reader keeps every feature of today's reader; only the look is new (Robert, 20 Nov 2026).

**Wide screens**
- The site's top bar (TopBar) stays at the top, as today. Under it the chapter bar (FocusBar) floats over the text as the page scrolls: Back, the story's title, "Chapter 14 of 15 · 3 min left", **Aa** and a quiet **Next chapter**.
- **Paper:** `paper-story` with `paper-ink` text in the `reading` style (Literata 20/34), one column of `measure` (about 65 characters). Plain paper: no grain under the words. Under the chapter's title (Literata 600, 32/38): "by inkwolf · 7 min read".
- **Comments are on paragraphs.** A paragraph with comments shows its count as a small button in the margin beside its first line (`gh-margin`: the comment mark and the number in `ink-accent`). Pressing it tints that paragraph (`gh-para-open`), sets `aria-expanded="true"` and opens ParagraphComments at the top of the side column. A count never sits inside the text.
- **End of the chapter:** "End of chapter 14" and, once the writer has marked the next chapter as the last, "Last chapter next Thursday", beside the one main button, **Next: chapter 15**. Under them, **Like · 64** and **Comment on the chapter**, both quiet.
- **Chapter navigation** (`gh-chapnav`, glass): Previous, the chapter dots and Next, and nothing else: no progress bar, %, words, minutes, comments or likes (Robert, 20 Nov 2026). The dots are hidden from screen readers and "Chapter 14 of 15" is written for them; each arrow is named for its chapter.
- **The longer advert** (728 × 90, Advert) sits under the chapter navigation, before the chapter's comments (Robert, 20 Nov 2026).
- **The chapter's comments** keep today's features: the count as the heading, order, a field with a spoiler switch and a 2,000 character limit, reactions, replies, downvote, report and Show more comments. Every comment shows the member's avatar (Avatar).
- **Side column** (360px, `gh-readcols`): **About this story** first (chapters, words so far, reads, when the next or last chapter comes), then the 300 × 250 advert. **Reading settings** and **comments on a paragraph** open at the top of this column when asked for and close with × (Robert, 20 Nov 2026); both start closed. Under 1000px the column moves under the comments.

**Phones**
- The paper fills the screen and one glass chapter bar floats over it, 12px from each edge: Back, the title (an ellipsis when long) with "Chapter 14 of 15 · 3 min left", and Aa. Robert liked this calm version (20 Nov 2026). The app header and the tab bar slide away while reading and come back on the first scroll up (a proposal on the canvas).
- Reading text starts at 17/28 on phones; readers change the size in Aa.
- A paragraph's count sits on its top right corner as a small solid pill (`gh-margin--phone`, a 44px target), because a phone has no margin. Comments open in a sheet (ParagraphComments).

**Time left** (Robert, 20 Nov 2026, 12:28): the minutes sit in the chapter bar by default. A reader who wants them on the page picks "On the page" for Time left in Aa: a small glass pill (`gh-timeleft`) then counts down at the foot and goes once the last line is on screen.

**Chapter numbers** (Robert, 20 Nov 2026): "of 15" and "Last chapter …" show only once the writer has turned on **This is the last chapter** while publishing or scheduling that chapter (Sheet). Until then the bar says "Chapter 14 · 3 min left", the kicker "Chapter 14" and the end "Next chapter Thursday". The story turns Completed when the last chapter is out.

**Don't:** put a count or a comment button inside the text, open Reading settings or comments on page load, add a progress line, or put anything but the arrows and dots in the chapter navigation.
