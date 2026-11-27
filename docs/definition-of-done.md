# Definition of Ready and Done

> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

## 2. Definition of Ready and Definition of Done

### 2.1 Definition of Ready (before a story goes to Claude Code)

- [ ] The story has an ID, a role, a goal and a benefit.
- [ ] Acceptance criteria are written in Given/When/Then and each one can be tested.
- [ ] Priority and size are set; any story sized L is split into M or S stories first.
- [ ] Dependencies are done and merged, or the story says how it stubs them.
- [ ] No **OPEN** decision blocks it, or the open point sits behind a feature flag with a safe default.
- [ ] Data touched is listed: new tables or columns, who can read and write each, and whether it is personal data.
- [ ] The back-end pieces it needs are named from section 1.7: the real ones are merged, and each mocked one names its mock (seed, fixture, MSW handler or stub) and the story that makes it real.
- [ ] Legal and compliance notes are read; if the story adds a new kind of personal data, a new processor or a new user-content type, the privacy and moderation impact is noted.
- [ ] Romanian and English copy is drafted, or the story says the copy will be drafted in English and translated before release.
- [ ] Analytics events, if any, are named in `docs/analytics-events.md`.
- [ ] Designs or a short description of the screen exist for anything visual.
- [ ] Target platforms are stated (web, desktop, iOS, Android, admin).

### 2.2 Definition of Done (before a story is merged)

**Code quality**

- [ ] TypeScript strict passes with no `any` added; ESLint and Prettier pass.
- [ ] Code follows the conventions in `CLAUDE.md`; no dead code or commented-out blocks.
- [ ] A junior developer can read and change the code without help: it follows the "Readable code" section of `CLAUDE.md` (plain names, small functions, a header comment on every file saying what it is, who calls it and what it calls, doc comments on everything exported, a plain-English comment for each step, rule sources named, no clever shortcuts), passes the ESLint complexity limits, and `docs/code-tour.md` is updated for anything new (decided 17 Oct 2026, 12:26 and 12:27).
- [ ] Errors are handled and shown to users in plain words, in both languages.
- [ ] Generated database types are up to date (`npm run types:check`); no hand-written copies of table, enum or function types.

**Tests**

- [ ] Each acceptance criterion has at least one automated test (unit, database or end to end).
- [ ] Every new or changed RLS policy has an allowed and a denied pgTAP test.
- [ ] All CI checks are green.
- [ ] No mock is left on for this story's back-end pieces on staging (`docs/mocks.md`), or the unfinished part sits behind a feature flag that is off.

**Accessibility (WCAG 2.2 AA)**

- [ ] axe reports no serious or critical issues on changed screens.
- [ ] Everything works by keyboard alone, with a visible focus indicator.
- [ ] Every control has an accessible name; images have alt text; contrast meets 4.5:1 for text and 3:1 for interface parts.
- [ ] Touch targets are at least 24 by 24 pixels; dragging has a button alternative.
- [ ] Changed screens checked with one screen reader (VoiceOver, TalkBack or NVDA) and at 200% zoom.

**Design rules (decided 16 Oct 2026)**

- [ ] No doodles, stickers or hand-drawn icons anywhere, on member and staff screens alike (Robert, 7 Nov 2026 and 9 Nov 2026; bundles G4 and NO-DOODLES, replacing the doodle rules of 16 to 18 Oct 2026). Interface icons are plain line SVGs drawn in the current text colour (`src/components/icons/`: `ActionIcon`, `NavIcon` and the arrows), each with a written label or an accessible name beside it. A writer's rank is a text pill, never a sticker (DESIGN thread, 8 Nov 2026). Three guards fail the build if a doodle comes back: `src/test/noDoodles.test.ts` (source and locale files), `e2e/support/noDoodles.ts` (what the browser draws, called by the screen specs) and `supabase/tests/database/316-no-doodles.test.sql` (no doodle column, table or cover name).
- [ ] Member screens use the flat look of canvas v47 (CALM-7a, 22 Nov 2026; replaces the 3D liquid glass of GLASS-2, 11 Nov 2026): cards with `rounded-card` (16 px since the design books, 23 Nov 2026; member screens use three corners only: `rounded-full` for pills, `rounded-card` 16 px and `rounded-field` 12 px, plus `rounded-cover` 12 px on covers, the brand page's covers, 23 Nov 2026), `bg-surface` and `border-border` get one even fill, a hairline edge and a soft drop shadow on their own, with no bevel, top edge light or shine; nothing is glass except the nav bars (the top bar, phone header, tab bar, focus header and the reader's chapter bar keep the frosted blur by day; dialogs, sheets, menus, the hero and every pill are solid boxes; the flat themes bundle, Robert, 23 Nov 2026, 19:26 UTC); a big coloured band uses `glass-band-deep` or `glass-band-tint`; main actions use `button-main` (a flat fill: deep plum in the main look, violet on hover and press; one a screen), other actions the quiet `button-glass` (the tint, no edge) or the underlined text button, all 44 px tall (bundle CALM-2); a pressed quiet button (aria-pressed, such as Following) reverses to the main fill, and at night to a #F2F2F3 fill with dark text (CALM-1b, NIGHT-2). Text on member screens is at least 12 px, except eyebrows and the words drawn on covers (CALM-1b, canvas v38). Every card, dialog, sheet and big tinted band is the one box surface (in Lilac mist `--surface-box` Isabelline #F4F0EC with the `--line-box` #E4DCD3 edge on the white page by day, and a card inside a box white with the same edge, `--surface-box-inner` (Robert, 26 Nov 2026, 20:55 UTC); the other day looks keep white #FFFFFF boxes with the #E8E4E0 edge; cream #FAF6EE and #EADFCB before 26 Nov 2026, solid #18181B with a #2A2A2F edge at night, NIGHT-2; CALM-1c): a page never paints its own card colour, it uses rounded-card, bg-surface and border-border or the `box-surface` class. Every date and time a member types uses `DateTimeField` (CALM-1c). A writer's rank and a reading level are a `Badge` (`src/components/ui/Badge.tsx`; GlassTag is gone). Colours come only from tokens, never a raw value in a class (`bg-[#…]`). Staff screens stay flat and keep their look from before 20 Nov 2026 and their own token set: 1 px pill edges and a pressed quiet button with a dark 2 px ring; they are drawn at desktop width only (Robert, 22 Nov 2026). The guard `src/test/designRules.test.ts` fails the build when a member screen brings back GlassTag, a raw colour class, a plain date or time input outside `DateTimeField`, a new InfoPill user (the list of files still using it only shrinks) or a bevel or shine.
- [ ] Member screens follow the design books (Robert, 23 Nov 2026, 13:25 UTC): text takes one of ten type styles (`type-display` 48/52, `type-title` 32/38, `type-heading` 24/30, `type-subheading` 20/26, `type-long` 17/28, `type-body` 15/24, `type-label` 15/20, `type-meta` 13/18, `type-kicker` 12/16, `type-reading` 20/34), never a size of its own (`text-[Npx]`, `text-sm` and the like); Inter uses only 400 and 600 and Funnel Display only 700; spacing uses the steps 4, 8, 12, 16, 24, 32, 48, 64 and 80 px (one exception: a drop-down's 36 px right padding, `pr-9`); text colours are `text-ink`, `text-ink-muted`, `text-ink-heading`, the link colour and the state colours, never a hex value in a component (QR codes excepted); buttons and fields take the page's font (`font: inherit`). Text people read for more than a few lines uses `type-long`: forum posts, comments of 280 characters or more, the story page's blurb, every CMS text (`CmsMarkdown`: Help, answers, landing pages) and legal text (`LegalMarkdown`); short interface text stays `type-body`. A paragraph stops at 66 characters (`p { max-width: 66ch }` in the base styles); a notice, banner or hint that should run the full width uses `max-w-none`. The guard `src/test/designRules.test.ts` fails the build when a member screen breaks any of these, sizes and spacing that grow with the screen (`text-[clamp(…)]`, `p-[clamp(…)]`) included: a page title is `type-title`, and `lg:type-display` from 1024 px (the `page-title` class does the same). In the browser, `e2e/support/lookCheck.ts` measures every text size, weight, corner and gap on a page against these values (user stories Section 1, "the look check"); `e2e/look-rules.spec.ts` runs it on the main member pages by day and at night, and each bundle's spec adds its own pages. Staff screens keep their look.
- [ ] Pills follow the pill system (17 Oct 2026 accessibility review): information pills use a pastel tint with dark text of the same hue and a soft border (plum, gold, sage, blush, sky, neutral; text at least 7:1); interactive chips are white with a control-border edge (#725F88 by day since CALM-1b, at least 3:1), plum text, a visible 2 px focus ring, at least 32 px tall with a 44 px touch target, and the selected state shows a check icon plus aria-pressed, not colour alone; solid red is kept only for urgent safety items and destructive actions. Every pill centres its content with equal padding left and right (inline-flex, centred, line-height 1, fixed height: 24 px for information pills, 36 px for chips), icons 14 px with a 6 px gap, so all pills look uniform (Robert, canvas comment, 17 Oct 2026). On the simplified pages information pills become words in a meta line instead (`src/components/ui/MetaLine.tsx`: facts joined by middots, a state first in bold, only a deadline in colour; Robert, 20 Nov 2026, bundle CALM-2); filter chips and the writer's rank pill stay, and pages not yet redrawn keep their pills until the sweep.
- [ ] Drop-downs share one style (Robert, canvas comment, 17 Oct 2026): every select is only as wide as its longest option (never stretched to fill a row), uses the same 14 px chevron 14 px from the right edge and vertically centred, 36 px right padding so the chevron sits about 8 px after the text, a control-border edge (#725F88 by day since CALM-1b, at least 3:1), a 44 px height and a visible focus ring. On member screens drop-downs and search fields are rounded squares with the 12 px field corner (`rounded-field`), like text fields, never pills (Robert, look-check comment on the Atlas, 26 Nov 2026); staff screens keep their pills.
- [ ] Form and dialog footers put their buttons on the left, the main one first, then the quiet ones, through `ButtonRow` (`src/components/ui/ButtonRow.tsx`); a member row of buttons never sits at the right edge (design books item 8, Practical UI; Robert, 23 Nov 2026, 13:25 UTC). The guard `src/test/designRules.test.ts` fails the build on a `justify-end` footer. Staff screens keep their rows.
- [ ] A member form never greys out its button until something is typed or picked: the button stays pressable and, pressed with a required field empty, says exactly what is missing beside that field (in ro and en, linked with `aria-describedby` and `aria-invalid`) and puts the focus there, through `useMissingField` (`src/lib/forms/useMissingField.ts`; TextInput, Textarea and DateTimeField take the message as `errorMessage`, a hand-drawn field uses `FieldProblem`). A button is disabled only while the form is sending or saving. A save that only waits for a change (a pen name, a bio) may stay off until something changes (design books item 9, Practical UI and Tidwell's Safe Exploration; Robert, 23 Nov 2026, 13:25 UTC). The guard `src/test/designRules.test.ts` fails the build when a member button is disabled while a typed value is empty. Staff screens keep their behaviour.
- [ ] No list or widget shows a scrollbar, with or without scroll arrows, on member and staff screens alike (Robert, 23 Nov 2026; replaces the 17 Oct 2026 rule that a list without arrows keeps its scrollbar). Every scrolling box stays scrollable by swipe, trackpad, wheel and keyboard (a focusable region with a label, or links and buttons inside it), and its arrows, where it has them, follow the next rule. One global rule in `src/styles/index.css` hides the bars; only the page itself and a text box being typed in keep theirs.
- [ ] Scroll arrows show only when the list is wider than the screen; at either end the arrow pointing that way is disabled (Robert, canvas comment, 17 Oct 2026).
- [ ] Lists of labels and values (story labels, settings summaries, staff detail panels, thread stats) have a fine 1 px line between rows, so each label is easy to pair with its value (Robert, canvas comment, 17 Oct 2026).
- [ ] Eyebrow labels (the small kicker above or beside a heading, and form section labels) use Inter Semibold (600) at 12 px with a 16 px line, in capitals, with 0.18em letter-spacing, in the eyebrow colour (the heading colour #2a0e33 by day, white at night, never gold; one colour set for text, Robert, 23 Nov 2026, 14:46 UTC; staff screens keep #141114), through the `eyebrow` class (or `eyebrow-type` for the same type in another colour); the text itself stays in sentence case in the locale files (Robert, 7 Nov 2026, the liquid glass design; size and weight from the design books, Robert, 23 Nov 2026, 13:25 UTC). Pills, table headers and buttons are not eyebrows.
- [ ] Headings, page titles and the wordmark use Funnel Display (drawn cover titles use Literata unless the writer picks another font, CALM-4); body and interface text uses Inter; handwritten accents use Playwrite Cuba; story text in the reader and editor uses Literata (Robert, 17 Oct 2026, 10:43; Funnel Display and Playwrite Cuba replace Bricolage Grotesque and Shadows Into Light Two, Robert, 10 Nov 2026, bundle FONTS).
- [ ] Third-party buttons and embeds (Google, Apple, Microsoft sign-in, Canva, Spotify, YouTube, Vimeo, Loom and others) use each provider's official, full-colour logo and button from its brand kit, unchanged and within its brand guidelines; we never redraw or recolour a brand logo (Robert, canvas comment, 17 Oct 2026).
- [ ] Every cover where we draw the title (drawn and automatic covers, at every size: story page, cards, shelves, thumbnails, link previews, picker tiles and previews) shows the full title: no ellipsis, line clamp or clipping. Titles wrap on spaces and keep their look's one size whatever their length; a title shrinks only when it would run past the room its look gives it (a Label's label may grow down to 12% from the cover's bottom), and then just enough to fit, never below 11 px (Robert, DESIGN card, 26 Nov 2026, 21:07 UTC; it replaces the length steps of 16 Oct 2026: up to 18 characters the base size, then × 0.85, × 0.72 and × 0.62). A thumbnail too small to read may show no title only if the full title sits right beside it as text. Since CALM-4 (Robert, 20 Nov 2026) every cover is 2:3 and has one of five looks: Label (the pattern behind a paper label 12% from the top, 80.8% of the width, with 4 px corners and no outline or rule; the brand page's label, Robert, 23 Nov 2026, 20:26 UTC), Big title, Initial (one big accent letter, cropped), Picture (an upload under the same label) or Custom (the upload alone); every automatic cover is a Label. The title is Literata 600 unless the writer picks Funnel Display, Inter or Playwrite Cuba, its sizes are in cqi so a cover looks the same at every width, under 100 px a cover shows the title only, and under 64 px it draws no words at all (they stay for screen readers) and the title sits beside it as text (design books, item 19, 23 Nov 2026). On every patterned design the words sit on the paper label, so no pattern line crosses them and they read at 4.5:1 or more (FIXES-1b; CALM-4).
- [ ] Rows of covers (shelves, Trending, Completed) never fade and show no scrollbar (the simplified design, Robert, 20 Nov 2026, 10:18 UTC; bundle CALM-4, replacing the edge fades of 6 Nov 2026 and the whole-card paging of 5 Nov 2026). A row shows 5 whole covers from 1024 px, 4 from 600 px and 2.3 under 600 px (the edge of the third says there is more), 24 px apart (16 px on phones). Previous and Next sit at the top right beside "View 54", only when the row is wider than its place; at either end the button is aria-disabled, and each is named for its row ("Next in Trending"); one press moves one screenful. On phones the row swipes and snaps to a cover. Each card is one link in a list item. Continue reading adds a 2 px thread line under the cover with the progress (`src/components/ui/Shelf.tsx`, `useShelfScroll.ts`).
- [ ] Icons are always SVG files (inline or as files), never PNG, JPEG, icon fonts or emoji; they take their colours from the design tokens so they work in light and night mode (16 Oct 2026, late evening).
- [ ] Every shelf or list of stories (for example Romanian classics, world classics, Trending, Completed, genre rows, Library lists and search results by kind) is ONE horizontally scrollable line, never a grid of several rows. A shelf shows at most 20 stories; when there are more, it ends with a "View more" card that opens the See all page for that shelf, listing all of them with the same filters (S1-E5-09). This applies to the website and to every app screen (Discover, Classics, Search, Library, the website home page and so on). One exception: a bookshelf in the Library shows its 10 places as a grid, two lines of 5 under 1024 px, so its empty places are all in sight without scrolling (CALM-4; a builder's reading of the handover, asked of DESIGN in the pull request). The "View more" card is a real link with an accessible name ("View more 54 in Trending"), and the row rule above applies (16 Oct 2026, late evening; CALM-4).
- [ ] Short explanations (for example why sign-up asks for the year of birth) use one tooltip pattern: it opens on hover, on keyboard focus and on tap (a 24 px or larger "i" button on touch screens), is linked to its field with `aria-describedby`, stays open while the pointer is over it, closes with Escape without moving focus and never holds the only copy of something a person needs to finish the task (WCAG 2.2, 1.4.13; 16 Oct 2026, late evening).

**Privacy**

- [ ] No new personal data, or the record of processing, privacy notice and retention schedule are updated in the same pull request.
- [ ] No personal data in logs, error reports or analytics.
- [ ] Under-18 defaults checked for anything social.
- [ ] Every new table for user content or user actions has a not-null `user_id` referencing `profiles.id`, and public views leave the user ID out (section 1.6).
- [ ] Any new processor has a data processing agreement and is added to the processor list.

**Security**

- [ ] No secrets in code; the service role key is used only in edge functions.
- [ ] User input is validated with zod and sanitised before display.
- [ ] New actions are rate-limited where they could be abused.
- [ ] Staff-only actions check the role in the database, not just the interface, and write to the audit log.

**Internationalisation**

- [ ] All interface strings in the `ro` and `en` locale files (admins may override them from the admin site, S1-E11-18); website page text (home page, questions, help, notices) only in the CMS, never in the locale files (decided 17 Oct 2026, 19:14 to 19:19); no hard-coded text.
- [ ] Interface copy says things once: no "All", possessive pronouns or filler words ("please", "just") unless the sentence needs them to be understood, and no eyebrow that repeats its heading (Robert, 9 Nov 2026; COPY-1).
- [ ] Romanian copy checked by a native speaker before release (Robert reads all new Romanian text himself, decided 17 Oct 2026, 19:33); ș and ț correct.
- [ ] Dates, numbers and plurals use locale-aware formatting.

**Analytics**

- [ ] Events fire as listed in the catalogue and carry no personal data.

**Moderation hooks**

- [ ] Any new user-content type is registered as reportable, has a report button and can be removed, restored and audited by moderators.
- [ ] Removed content triggers a statement of reasons.
- [ ] Blocks are respected everywhere the new feature shows people or content.

**App store compliance**

- [ ] Works on every target platform for the story (or the gap is ticketed).
- [ ] No external purchase link or button in iOS storefronts where it is restricted.
- [ ] Nothing breaks reporting, blocking, account deletion or the published contact details.
- [ ] Privacy labels and the data safety form still match what the app collects.

**Documentation**

- [ ] `docs/` updated where behaviour changed (architecture, runbooks, help page).
- [ ] No docs drift: search `docs/`, `CLAUDE.md` and the README files for the names, numbers and file paths this change touched (a function, a limit, a route, a story ID), and fix every line that no longer matches. A doc that says something the code no longer does is a bug (CLAUDE.md, Readable code; QA-5, finding A4).
- [ ] A new ADR if the story made an architectural decision.
- [ ] The pull request description lists the story ID, what changed, how it was tested and any follow-up.

**Review**

- [ ] The founder (or another person) has tested it on staging against the acceptance criteria.

---
