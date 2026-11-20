# TopBar

The floating glass bar at the top of every page on screens 1024px and wider. The pages and places are today's; only the names Read and Together and the look are new (Robert, 20 Nov 2026).

**When to use:** every page on wide screens, the reader included. In the reader the chapter bar (FocusBar) sits under it and floats over the text as the page scrolls.

**What it holds, in order**
- The cat and the lower-case wordmark in the `logo` colour. It links to **Home** and is named "ghemotoc, Home".
- The recessed track (`surface-tint`) with the four pages: **Home**, **Read** (was Discover), **Library** and **Together** (was Forums). The current page sits on a white bubble (`surface-solid`, `shadow-rest`) and carries `aria-current="page"`; that bubble moving between pages is the one motion here.
- **Write**: a quiet button with the pen, first in the right-hand group.
- **Search** (`search` icon), named "Search stories, writers and Together". Pressed, a search field opens over the bar.
- **Messages** and **Notifications**: two icon buttons, two places, as today. New items show one `thread` dot and the count in the name ("Messages, 2 new"), never a number badge.
- The account: the member's avatar (Avatar), named "Account and settings".

**Do:** keep the bar at `topbar-max` wide; let it wrap onto two rows before anything is cut off.
**Don't:** make Write plum (the one plum thing belongs to the page), merge Messages and Notifications into one inbox, or put day and night or language here (they live in the footer and Settings).

**States:** at rest the bar is glass (`surface-glass`, blur 24px, `surface-glass-rim`, `shadow-raised`) over the pale mesh (`gh-mesh`); after 12px of scroll it is nearly solid (`surface-solid`).
