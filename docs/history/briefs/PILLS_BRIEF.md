# Pill system brief (17 Oct 2026, accessibility review)

Robert asked for an accessibility review of the platform, "particularly where we have pills", and that pills "look nice against the pastel-ish design". The automated scan (every board rendered, 1,305 pills) found:
- Text contrast on pills already passes almost everywhere (one false positive on a social mock-up label).
- Touch size is fine (only "1 open report" on AdminStory is under 32 px).
- **The real gaps:** (1) about 390 interactive chips and secondary pill buttons have a very faint border (#DED3E4-like, about 1.4:1 against the page), so their shape is hard to see for low-vision users (WCAG 1.4.11 best practice); (2) many information pills use solid, saturated fills (gold #E6C24C, dark plum #4D1B5E / #481C5F, green #2F6B4F, brown #5C3F0E, grey #5C4965) that sit heavily on the pastel screens; (3) selected chips are shown by colour only.

## The pill system (apply everywhere on your boards)

**1. Information pills** (status, genre, category, tags, ratings, "In the app only", "Completed", "Draft", "Open", "Teacher", "Pinned", "New", counts that are labels, roles): pastel tint background, dark text of the same hue, 1 px border of the same hue. Pick the hue by meaning; keep the same meaning in the same hue everywhere:

| Token | Background | Text | Border | Use for |
|---|---|---|---|---|
| plum | #F1EAF4 | #481C5F | #C9B3D6 | default, genres Fiction, ratings, roles, "In the app only" |
| gold | #FBF3DA | #5C3F0E | #D9B54A | draft, new, pinned, highlight, "Completed" |
| sage | #E8F1EC | #245A41 | #A9C9B6 | open, active, done, Essays, success |
| blush | #F6E9EB | #8C2B3A | #DDB0B8 | warning, mature-type ratings 16+ and 18+, closed with issue |
| sky | #E6EEF6 | #2E4A8C | #AFC3DE | Poetry, info, scheduled |
| neutral | #F4F0EC | #4F3D57 | #D6CCDC | closed, archived, muted |

Text 12 to 13 px, weight 600 or 700, padding 4px 10px, radius 999px, line-height 1.2. All text pairs above are 7:1 or better.

**2. Interactive chips** (filter chips, genre chips that filter, sort chips, "Fantasy / Romance…" rows, tabs drawn as pills):
- Unselected: background #FFFFFF, text #481C5F, border 1 px **#8E7B99** (at least 3.4:1 against white, #FAF8F5 and #F4F0EC).
- Selected: background #481C5F, text #FFFFFF, border #481C5F, **plus a small check icon** (inline stroke SVG, aria-hidden) so the state isn't colour alone, and `aria-pressed="true"` (or `aria-selected` in a tablist).
- Hover: background #F1EAF4. Focus: `outline: 2px solid #672786; outline-offset: 2px` (add a helmet rule like `.tmc-chip:focus-visible{outline:2px solid #672786;outline-offset:2px}` and give chips the class).
- Size: at least 32 px tall visually and a 44 px touch target (padding or a min-height of 44 px on the clickable element).

**3. Pill-shaped buttons** (secondary buttons such as "Continue with Google", "Send the link again", "Choose a picture"): white background, border 1 px #8E7B99, text #481C5F; primary buttons stay solid plum with white text.

**4. Keep strong fills only where they carry urgency or are counters:**
- Staff safety urgency (Removal order, 1-hour clock, urgent counts, destructive "Remove post", "Block", "Delete my account" buttons) stay solid #8C2B3A with white text.
- Small numeric counter badges in navigation (for example the gold "2") may stay gold #E6C24C with #26142E text.
- Cover pills (genre and Completed pills drawn on top of cover art) are set by the cover helper (`coverLook`); leave them.
- Social mock-up labels ("Illustrative mock-up") are outside the product; leave them.

**5. Don't change** layout, copy, logic, ids or doodles beyond what the pills need. Keep each file's skeleton. Check scripts compile and markup balances. Publish only your boards, no canvas.json.

## Added 08:13 (Robert): equal centred padding in every pill
Every pill and chip must look evenly balanced inside: `display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; line-height: 1;` with the SAME padding left and right (information pills `padding: 0 10px; height: 24px`; interactive chips `padding: 0 14px; height: 36px` inside a 44 px tap area; small counter badges are circles or `min-width: 22px; height: 22px; padding: 0 6px`). Icons inside pills are 14 px, centred vertically, with `gap: 6px`; no trailing spaces, no extra margin on the last child, and no `vertical-align` tricks. Pills that sit in a row align to the same height. The rank chip on Profile ("Rank: Storyteller" with its icon) is the example Robert pointed at.

## Added 08:35 (Robert): one drop-down style everywhere
Every `<select>` sits in `<span class="tmc-sel" style="position: relative; display: inline-flex; align-items: center; width: fit-content; max-width: 100%; vertical-align: middle">` with `appearance: none; width: auto; max-width: 100%; padding-right: 36px; border: 1px solid #8E7B99` and a 14 px chevron svg at `right: 14px; top: 50%; transform: translateY(-50%); pointer-events: none`. The select is only as wide as its longest option. Script: /home/claude/work/sel/tools/selects.py (re-runnable on a folder).
Never put `<sc-for>` or `<sc-if>` directly inside `<table>`, `<tbody>` or `<tr>`: the HTML parser drops it and the rows never render. Use a div table with role="table"/"row"/"cell" (/home/claude/work/sel/tools/tables.py).

## Added 09:21 (Robert): eyebrows
Eyebrow labels (the small kicker above or beside a heading, and form section labels such as "Country", "Status", "Tags") use `font-family: 'Cutive', 'Courier New', serif; font-size: 14px; font-weight: 400; line-height: 1.3`, no letter-spacing and no capitals: sentence case, keeping proper nouns and acronyms (Ghemotoc, Romania, În română, Yoti, GDPR, DSA, ID…) and story titles as they are. Keep the eyebrow colour (gold #815E18 stays gold, 4.5:1 or better). 13 px only in a tight table-like row. Script-built eyebrows produce sentence case (no `toUpperCase()`). Pills, counters, table header cells and buttons are not eyebrows. Add `&family=Cutive` to the board's Google Fonts link. Script: /home/claude/work/eyebrow/tools/apply2.py (re-runnable; also swaps Architects Daughter for Shadows Into Light Two). Headings stay Bricolage Grotesque and body text stays Inter: the Playfair Display and Barlow switch was reversed by Robert at 10:43.
