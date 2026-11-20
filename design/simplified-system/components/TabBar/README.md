# TabBar

Phones: a floating glass tab bar with **Read**, **Library**, **Write** and **Together**, and today's round **Search** button beside it. Home is the logo in the app header, as today (Robert, 20 Nov 2026: today's features stay).

**When to use:** every phone screen. While reading, the app header and the tab bar slide away and come back on the first scroll up; the chapter bar stays (a proposal on the comparison canvas, not yet decided).

- The current tab's label turns `ink-heading` and gets a 2px `thread` underline; the others are `ink-muted` (7:1 or more).
- Each tab is at least `target-min` tall and wide, its icon above a 12px label.
- **Search** is a 64px round glass button beside the bar (`gh-searchbtn`). On the search page it turns solid with the thread underline.
- **The app header** (`gh-apphead`) holds the logo, which links to Home, then **Messages** and **Notifications** (two places, as today, in the same order as the top bar) and the account avatar.
- **Icons (proposal on the canvas):** Read is an open book instead of the compass, Library is books side by side, and Together is two speech bubbles so it does not look like Messages. Write keeps the pen.

**Don't:** add a fifth tab, make Write plum, or move Search into a tab.
