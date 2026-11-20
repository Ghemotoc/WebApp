ghemotoc is a free home for young writers who want readers, not followers: every chapter is read on a calm page and answered paragraph by paragraph. The feeling to deliver, as early as possible, is **"Someone read it."** The design keeps the Lilac mist palette, the plum actions and the four type families, and makes each screen quieter: **paper for words, glass for what floats.**

**The redesign changes the look, not the features** (Robert, 20 Nov 2026). Every page keeps what it does today; moves and cuts are proposals on the comparison canvas until Robert says yes.

## Five rules that decide most questions

1. **One plum thing per screen.** `action-main` marks the single next step. Everything else is ink, a quiet tint or text.
2. **Paper for words, glass for what floats.** Story text, covers and lists sit flat on `paper-story` or the page. Glass (`surface-glass`) is for everything that floats (the top bar, the phone header and tab bar, the chapter bar, chapter navigation, menus, sheets, panels and dialogs) plus **one glass hero per page** (Robert, 20 Nov 2026). By day a pale mesh lies under it, so the glass reads as glass.
3. **Covers carry the colour.** The interface stays calm so writers' covers are the colour on screen.
4. **One thread.** A 2px `thread` line does the jobs boxes, eyebrows and badges used to do: progress, the current place, the start of a section.
5. **Phone first.** Design the 375px screen, then let the wide layout add space, never extra blocks.

## Voice and copy

Write the way a friend who reads a lot would talk: warm, plain and short. British English in the English interface; Romanian is checked by Robert before release.

- **Say it once** (COPY-1): no "All", no "your" or "my", no filler such as "please" or "just". A heading carries the meaning; a subline appears only when it adds a fact.
- **Buttons start with a verb and name the result:** "Continue chapter 9", "Add to a bookshelf", "Read the answers". Never "OK", "Submit" or "Click here".
- **Facts go in a meta line with middots,** not in pills: "Mystery · 15 chapters · 13+ · No AI". A state that changes opens the line in bold: "Draft · 2,140 words".
- **Numbers are digits,** and counts say what they count: "7 of 10 books", "3 of 3 bookshelves".
- **Errors say how to fix it:** "A bookshelf name has 1 to 60 characters."
- **Limits are stated once, plainly, where they apply:** "Free members keep 3 bookshelves of 10 books." No countdowns, pop-ups or pressure, and nothing aimed at children.
- **Sentence case everywhere.** Capitals in the one page kicker come from CSS, never from the text.

### Words we use

| Thing | English | Romanian (proposal) | Never |
|---|---|---|---|
| A collection a member makes, up to 10 books | bookshelf, bookshelves | raft, rafturi | reading list |
| A row of stories on Read ("Trending") | its heading only | its heading only | shelf |
| The four pages in the top bar | Home, Read, Library, Together; Write is a button beside them | Acasă, Citește, Bibliotecă, Împreună; Scrie (Robert to check) | Today, Discover, Forums, rooms |
| Where activity arrives | Notifications | Notificări | Inbox |
| Where members write to each other | Messages | Mesaje | Inbox |
| A reader's comment on a paragraph | comment; in Notifications "commented on a paragraph" | comentariu; "a comentat un paragraf" (Robert to check) | a comment on a line |
| The writer's mark on the final chapter | This is the last chapter | Acesta este ultimul capitol (Robert to check) | a planned chapter count |
| Joining | Get in | Intră | Log in, Sign up as two buttons |
| The automatic row of stories a member liked | Liked | Apreciate (Robert to check) | Favourites |

Free members keep **3 bookshelves of up to 10 books**. Following writers and liking chapters have no limit, and the automatic Library rows (Reading, Saved for later, Finished, Liked) are not bookshelves, so they never count toward the 3 (Robert, 20 Nov 2026).

## Colour

Two themes: **Lilac mist** by day and **Night**, which is monochrome black, white and grey with cobalt actions. Every pair below holds at least 4.5:1 for text and 3:1 for marks in both themes.

| Role | Tokens | Rule |
|---|---|---|
| Page | `surface-page` | The ground of every page. Content sits straight on it, grouped by space. |
| Page mesh | `surface-mesh-lilac`, `surface-mesh-blue`, `surface-mesh-peach` | By day, four soft blobs over `surface-page` (`gh-mesh`); at night they equal the page. |
| Solid | `surface-solid` | The top bar once scrolled, the bubble of the current page or choice, list rows that need a ground, tooltips. |
| Tint | `surface-tint` | Quiet buttons, selected and unread rows. |
| Panel | `surface-panel` | Side panels opened on request in the editor and Atlas. |
| Glass | `surface-glass`, `surface-glass-rim` | Everything that floats, plus one hero per page; always with blur 24px saturate 180%, the rim and `shadow-raised`. |
| Story paper | `paper-story`, `paper-ink` | Reader and editor. Plain paper: no grain under the words. |
| Text | `ink-heading`, `ink`, `ink-muted` | Headings in Revolver, interface text, then meta. |
| Accent | `ink-accent` | Line 2 of a two-line headline and a paragraph's comment count. Never body copy. |
| Links | `ink-link` | Underlined links in running text. Text buttons are `ink`, underlined. |
| The one action | `action-main`, `action-main-hover`, `on-action-main` | Flat plum #48125D by day with violet on hover, cobalt at night. One per screen (Robert, 20 Nov 2026). |
| On, selected | `action-selected`, `on-action-selected` | Chips, tabs and segments that are on. A chip that is on also shows a check. |
| Lines | `line`, `line-hairline`, `line-control`, `line-dashed` | Rarely. Space separates first; `line-control` only where a control needs an edge. |
| Focus | `focus-ring`, `focus-halo` | Every control, every theme. |
| Thread | `thread` | Violet by day, white at night. |
| Covers | `cover-plum` to `cover-paper` | Drawn covers and the paper label. The same in both themes: covers are objects. |
| States | `state-info-*`, `state-success-*`, `state-warning-*`, `state-danger-*` | Notices. A state in a meta line is a bold word in `ink`; only a deadline takes `state-warning-ink`. Danger only for urgent safety items and destructive actions. |

- **Page background by day** (Robert, 20 Nov 2026: paler, so nothing reads as lines): `surface-page` with four large soft blobs that fade in six even steps (100, 90, 65, 35, 10 and 0% at 0, 20, 40, 60, 80 and 100% of the radius), sized in px, never %, so no bands show. Wide screens (`gh-mesh`): lilac 1100 × 800 at 8% 0%, blue 1000 × 800 at 96% 14%, peach 1100 × 900 at 4% 48%, lilac 1000 × 900 at 94% 80%. Phones (`gh-mesh--phone`): lilac 420 × 340 at 0% 0%, blue 380 × 340 at 100% 32%, peach 420 × 360 at 0% 70%, lilac 380 × 320 at 100% 100%. Meta text keeps 6.2:1 on the deepest part. At night the page is the night sky, as today.
- Two-line headlines set line 1 in `ink-heading` and line 2 in `ink-accent`.
- The logo uses `logo`: Revolver by day, soft white at night; the other looks swap only the accent and the paper tint.
- At night the cobalt button is 2.2:1 against the page, as in the code; its white label (8.4:1) carries it. By day a quiet button is 1.1:1 against the page and its label (13.7:1) carries it. WCAG 1.4.11 asks no 3:1 edge of a button named by its text.

## Type

| Style | Family | Size / line | Weight | Job |
|---|---|---|---|---|
| `display` | Funnel Display | 48 / 52 | 700 | One page title on wide screens (phones use `title`) |
| `title` | Funnel Display | 32 / 38 | 700 | A story's title, page titles on phones |
| `title` on paper | Literata | 32 / 38 (28 / 34 on phones) | 600 | A chapter's title in the reader, in the story's own font (Robert, 20 Nov 2026) |
| `heading` | Funnel Display | 24 / 30 | 600 | Section headings |
| `subheading` | Funnel Display | 20 / 26 | 600 | Card, bookshelf, sheet and dialog titles |
| `body` | Inter | 15 / 24 | 400 | Interface text, blurbs, comments |
| `label` | Inter | 15 / 20 | 600 | Buttons, tabs, names |
| `meta` | Inter | 13 / 18 | 400 | Meta lines, captions, times |
| `kicker` | Inter | 11 / 16, 0.18em | 700 | At most one per page, in `ink-kicker`, only when it adds a fact |
| `reading` | Literata | 20 / 34 (17 / 28 on phones) | 400 | Story text; readers change the size in Aa |
| `reading-dyslexia` | OpenDyslexic | 20 / 34, 0.04em | 400 | Story text when a reader picks OpenDyslexic in Aa |
| `reading-hyperlegible` | Atkinson Hyperlegible | 20 / 34 | 400 | Story text when a reader picks Atkinson Hyperlegible in Aa |
| `hand` | Playwrite Cuba | 20 / 30 | 400 | One handwritten accent at most per screen |

Seven interface sizes (48, 32, 24, 20, 15, 13, 11), plus 12px for tab labels and chart axes and the phone reading sizes (28 and 17), and **no more than five on one screen.** Two weights per family. "Choose a few sizes and apply them systematically" (Thinking with Type, p. 165); the 56 sizes in the code today are the main source of noise (Refactoring UI, p. 102–107).

- **No section eyebrows.** A section is a heading and its content. The one kicker a page may keep must carry a fact the heading does not, such as "Chapter 14 of 15".
- **Reading column:** `measure`, about 65 characters (Thinking with Type, p. 124), `paper-ink` on `paper-story`.
- **Font files** are Robert's uploads (20 Nov 2026), named as the app names them: `Funnel Display Variable`, `Inter Variable` and `Literata Variable` (each with its italic), `Playwrite CU Variable` and `OpenDyslexic`. Atkinson Hyperlegible loads from Google Fonts here; the app serves every face from its own site.

## Space, layout and templates

Spacing comes from the scale: `space-1` (4) to `space-16` (64). Gutters are `space-4` on phones and grow to `space-16` at 1440px. Sections sit `space-8` apart on phones and `space-12` on wide screens.

Every screen uses one of five templates (see PageTemplates): **Shelf page**, **Desk page**, **Focus page**, **Talk page**, **Form page**.

- At most four blocks on the first screen of a desk page.
- No side columns on discovery pages. **The reader keeps today's side column** on wide screens: About this story, then the advert; Reading settings and comments on a paragraph open at its top on request and close again (Robert, 20 Nov 2026).
- Leave space open: "The grid doesn't fill up the space, it defines it" (Thinking with Type, p. 230).

## Surfaces, shadows, corners

- **Two shadows.** `shadow-rest` for the white bubble of the current page or choice and a phone paragraph's comment count; `shadow-raised` for everything glass (the floating layer and the one hero per page) and tooltips. Nothing else casts a shadow: not buttons, not covers.
- **Four radii.** `radius-book` (4px) for every cover, `radius-field` (12px) for fields and small tiles, `radius-card` (24px) for cards, sheets and dialogs, `radius-full` for buttons, chips and bars.
- **Borders rarely.** Separate with space first, a ground second, a line last, never all three (Refactoring UI, p. 238–241).

## Covers and books

A cover is a book: a flat 2:3 frame with `radius-book` corners and no spine shade (Robert, 20 Nov 2026).

- **Label is every automatic cover:** one of the app's patterns as cloth, with a paper label near the top, centred between the two edges, carrying the full title, a short rule in the accent and the pen name. One label in one place turns a row of very different stories into a series, as one fixed frame does for Penguin's classics (Classic Penguin, p. 41).
- **Title font:** Literata 600 on every cover we draw; writers can pick Funnel Display, Inter or Playwrite Cuba when they set up a cover (Robert, 20 Nov 2026). Pen names stay in Inter.
- **A hairline edge**, 1px inside every cover, keeps pale covers' shape on the pale page and dark covers' at night. No shadow (20 Nov 2026).
- **Writers choose** a drawn cover (Label, Big title or Initial), **a picture under the label**, or **a custom cover** of their own with no label and none of our writing (Robert, 20 Nov 2026).
- **Pictures under the label:** the label stays solid on top, so the title reads on any picture. Classics use art that is out of copyright, such as John Leech's 1843 drawings for A Christmas Carol, and staff record where each picture came from; never a picture taken from another publisher's cover. Writers use pictures they have the rights to, with no words in them and no real people, checked like any other picture.
- **On cards** the title and pen name are written under every cover, so every story is named in text, whatever its cover shows. Never a title pill over the art.
- Titles are never clipped; they step down in size with length, grow with the cover and never go below 11px.

## Rows of covers

Robert, 20 Nov 2026: the fade at the end of a row was visual overload.

- **Wide screens show 5 whole covers**, tablets 4, phones 2 and the edge of a third. Nothing fades and no cover is cut in half on a wide screen.
- On wide screens and tablets, **Previous and Next arrows** sit at the top right of a row, beside View, and move one screenful at a time. On phones people swipe and the row snaps to a cover.
- A row holds up to 20 covers, then a View more card. Rows never turn by themselves.

## Bookshelves

A bookshelf is up to 10 books, face-out, in the same row as every other row of covers. There is no plank and no wood (Robert, 20 Nov 2026: "the ugly bar").

- **The limit is visible:** places a book has not taken yet show as ghosts in `line-dashed`, and the meta line says "7 of 10 books". A full bookshelf says "10 of 10 books · Full" in the same quiet style.
- **Who can see a bookshelf** (Robert, 20 Nov 2026): under 18, only the member. From 18 on the free plan, everyone; premium keeps a bookshelf private. A notice 30 days before the 18th birthday and another on the day say what changes. Liked, Reading, Saved for later and Finished stay private for everyone. The meta line says Private or Public. Public bookshelves on the free plan, paying for privacy and the switch at 18 are on the lawyer list.
- The Library lists a member's bookshelves one under another, then a quiet **New bookshelf** button while there is room, and the limit said once under them.

## Reading and comments

The reader keeps every feature of today's reader (ReaderPage, ParagraphComments, Advert).

- **Comments are on paragraphs**, never single lines. A paragraph's count is a button: in the margin beside its first line on wide screens, on its top right corner on phones. Pressing it tints the paragraph and opens its comments.
- **Comments on a paragraph** have no title, no count and no paragraph number (Robert, 20 Nov 2026): a small comment mark and the paragraph's opening words say what they are about. Each comment shows the member's avatar, Like, Reply and More (downvote or report).
- **Side column on wide screens:** About this story, then the 300 × 250 advert. Reading settings and comments on a paragraph start closed, open at the top of the column on request and close with × (Robert, 20 Nov 2026).
- **Chapter navigation** under the paper shows only Previous, the chapter dots and Next (Robert, 20 Nov 2026). Like sits above it, at the end of the chapter; the chapter's comments come after the 728 × 90 advert under it.
- **Time left:** the minutes sit in the floating chapter bar ("Chapter 14 of 15 · 3 min left"). The small pill at the foot shows only if the reader picks "On the page" in Aa (Robert, 20 Nov 2026, 12:28).
- **The last chapter** (Robert, 20 Nov 2026): when publishing or scheduling a chapter, the writer can turn on **This is the last chapter**. Only then do readers see "of 15" and "Last chapter next Thursday"; the story turns Completed when that chapter is out.
- **Adverts** are AdSense limited ads, the same for everyone, never on stories marked for sexual content, nudity or graphic violence, and never in class spaces.

## People

Every comment, notification, message and account button shows the person (Avatar). Members who built an avatar show their DiceBear Micah avatar. Members who keep initials get a plain coloured circle in a cover colour, picked at random when they join, which they can change in Settings (Robert, 20 Nov 2026). Spaces use the same circles.

## Charts

Numbers over time are a line (LineChart): followers on Write, with a time range menu (Last 7, 30, 90 or 365 days), a 2px `thread` line with a 10% wash, the last value written at the end, a tooltip on hover and a table for screen readers (Robert, 20 Nov 2026). The total is always written in the heading too.

## Motion

Motion confirms what the member did: the white bubble slides to the page just opened, sheets rise, a paragraph's comments open beside it, and on phones the app header and the tab bar slide away while reading and return on the first scroll up (a proposal on the canvas). Rows of covers never turn by themselves (Graphic Design: The New Basics, p. 232). The one exception is Read's featured carousel, which is today's: it keeps its Pause button, stops while the pointer or keyboard focus is on it, and stays still with reduced motion. Every motion respects reduced-motion settings.

## Accessibility

- Targets at least `target-min` (44px); chips 36px inside a 44px target.
- Text 4.5:1, marks and control edges 3:1, in both themes.
- Focus: `focus-halo` then a 2px `focus-ring` on every control.
- State is never colour alone: chips that are on show a check, states are words, errors show words, progress has a value.
- Row arrows are buttons named for their row ("Next in Trending"); at an end they dim and carry `aria-disabled`.
- Every book is a link named "Title by pen name"; ghost places are hidden from screen readers.
- A paragraph's count is a button named "8 comments on this paragraph" with `aria-expanded`; the phone comments sheet is a modal dialog that hands focus back to the count when it closes.
- Avatars beside a name are decorative; a chart's numbers are also in a table; the chapter dots say "Chapter 14 of 15" in words.

## Iconography

Use the app's own line icons (`NavIcon`, `ActionIcon` in `src/components/icons/`): 24px grid, 1.75 stroke, round caps and joins, drawn in `currentColor` at 22px (18px inside buttons). Every icon sits beside a written label or carries an accessible name. No emoji as icons (members' reactions on comments are their own, as today), no doodles, no filled or two-tone icons. **Messages** is one speech bubble with two lines of text and **Notifications** the bell. **Phone tabs (a proposal on the canvas):** Read is an open book instead of the compass, Library is books side by side, Write keeps the pen, Together is two speech bubbles.

## Logo

Use the files in **Logos**: the curled cat in Revolver (`#2A0E33`) on light grounds and in soft white (`#EBEBEB`, as sent) at night, plus the horizontal lockups. In the app the `logo` token draws it, `#F5F5F5` at night. Keep the cat on its own: no circle around it, no outline, no glow, no reveal animation. In the top bar the cat sits beside the lower-case wordmark in Funnel Display 800 and the `logo` colour.

**The name is always lower case where it stands as the brand: ghemotoc.** That means the wordmark, covers, page and browser-tab titles, share images, the app's name and the email sender's name (Robert, 20 Nov 2026). Code names such as the GitHub organisation keep their own spelling.
