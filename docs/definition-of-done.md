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
- [ ] Member screens use the main website's liquid glass (GLASS-2; Robert, 11 Nov 2026): cards with `rounded-card` (or 20 to 39 px corners), `bg-surface` and `border-border` get the 3D glass on their own; a big coloured band uses `glass-band-deep` or `glass-band-tint`; main actions use `button-main` (deep plum in the main look, lighter on hover and press). Staff screens stay flat.
- [ ] Pills follow the pill system (17 Oct 2026 accessibility review): information pills use a pastel tint with dark text of the same hue and a soft border (plum, gold, sage, blush, sky, neutral; text at least 7:1); interactive chips are white with a #8E7B99 border (at least 3:1), plum text, a visible 2 px focus ring, at least 32 px tall with a 44 px touch target, and the selected state shows a check icon plus aria-pressed, not colour alone; solid red is kept only for urgent safety items and destructive actions. Every pill centres its content with equal padding left and right (inline-flex, centred, line-height 1, fixed height: 24 px for information pills, 36 px for chips), icons 14 px with a 6 px gap, so all pills look uniform (Robert, canvas comment, 17 Oct 2026).
- [ ] Drop-downs share one style (Robert, canvas comment, 17 Oct 2026): every select is only as wide as its longest option (never stretched to fill a row), uses the same 14 px chevron 14 px from the right edge and vertically centred, 36 px right padding so the chevron sits about 8 px after the text, a #8E7B99 border (at least 3:1), a 44 px height and a visible focus ring.
- [ ] A sideways list that has scroll arrows hides its scrollbar (Robert, canvas comment, 17 Oct 2026). It stays scrollable by swipe, trackpad and keyboard (focusable region with a label), and its arrows follow the next rule. A list without arrows keeps its scrollbar.
- [ ] Scroll arrows show only when the list is wider than the screen; at either end the arrow pointing that way is disabled (Robert, canvas comment, 17 Oct 2026).
- [ ] Lists of labels and values (story labels, settings summaries, staff detail panels, thread stats) have a fine 1 px line between rows, so each label is easy to pair with its value (Robert, canvas comment, 17 Oct 2026).
- [ ] Eyebrow labels (the small kicker above or beside a heading, and form section labels) use Inter Bold at 11 px, in capitals, with 0.18em letter-spacing, in the eyebrow colour (black #141114 by day, white at night, never gold), through the `eyebrow` class (or `eyebrow-type` for the same type in another colour); the text itself stays in sentence case in the locale files (Robert, 7 Nov 2026, the liquid glass design; replaces the dark gold at 12 px of 6 Nov 2026). Pills, table headers and buttons are not eyebrows.
- [ ] Headings, page titles, the wordmark and drawn cover titles use Funnel Display; body and interface text uses Inter; handwritten accents use Playwrite Cuba; story text in the reader and editor uses Literata (Robert, 17 Oct 2026, 10:43; Funnel Display and Playwrite Cuba replace Bricolage Grotesque and Shadows Into Light Two, Robert, 10 Nov 2026, bundle FONTS).
- [ ] Third-party buttons and embeds (Google, Apple, Microsoft sign-in, Canva, Spotify, YouTube, Vimeo, Loom and others) use each provider's official, full-colour logo and button from its brand kit, unchanged and within its brand guidelines; we never redraw or recolour a brand logo (Robert, canvas comment, 17 Oct 2026).
- [ ] Every cover where we draw the title (drawn and automatic covers, at every size: story page, cards, shelves, thumbnails, link previews, picker tiles and previews) shows the full title: no ellipsis, line clamp or clipping. Titles wrap on spaces and the size steps down with length (up to 18 characters the base size, 19 to 28 × 0.85, 29 to 40 × 0.72, longer × 0.62, never below 11 px). A thumbnail too small to read may show no title only if the full title sits right beside it as text. On every patterned design (stripes, dots, grid, waves, starry, sparkles, two-tone, arches, rings, forest waves) the title and pen name sit on a solid box, so no pattern line crosses them and they read at 4.5:1 or more on every background and accent pair (Robert, 5 Nov 2026; FIXES-1b, tested in `coverDesigns.test.ts`).
- [ ] Side-scrolling rows (shelves, Trending, Completed) fade out to fully transparent at each edge where cards are hidden past it, using a CSS mask on the row itself so cards, outlines and shadows fade together (no overlay strip, which leaves a hard edge): at the start only the right edge, at the end only the left edge and in between both edges (Robert, 6 Nov 2026, 06:25 UTC; replaces "one side at a time, never both" from 16 Oct). The first card is never faded at rest, and the row can also be moved with buttons and the keyboard (16 Oct 2026, late evening). An arrow press moves one section at a time, by whole cards: the card a fade was covering becomes fully visible, clear of both fades, and the card before it (or after it, going back) is part-shown at the edge, so every card can be seen fully before it fades (Robert, 5 Nov 2026, 15:02 UTC; `src/components/ui/shelfPaging.ts`). On narrow screens each fade is at most a fifth of the row instead of 140 px, and narrow enough that the widest card fits between the two fades (builder proposal, FIXES-1a; both fades, 6 Nov 2026).
- [ ] Icons are always SVG files (inline or as files), never PNG, JPEG, icon fonts or emoji; they take their colours from the design tokens so they work in light and night mode (16 Oct 2026, late evening).
- [ ] Every shelf or list of stories (for example Romanian classics, world classics, Trending, Completed, genre rows, Library lists and search results by kind) is ONE horizontally scrollable line, never a grid of several rows. A shelf shows at most 20 stories; when there are more, it ends with a "View more" card that opens the See all page for that shelf, listing all of them with the same filters (S1-E5-09). This applies to the website and to every app screen (Discover, Classics, Search, Library, the website home page and so on). The "View more" card is a real link with an accessible name ("View all 54 in Trending") and the edge fade rule above still applies (16 Oct 2026, late evening).
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
