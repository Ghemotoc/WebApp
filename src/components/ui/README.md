# UI components

The shared building blocks every screen uses, one component per file. Built by S1-E1-03 from the design boards and the Definition of Done design rules; every one is shown on the `/design` page.

| Component | What it is |
| --- | --- |
| `Button` | Primary, secondary, text and destructive buttons, 44, 48 or 52 px |
| `Select` | The one drop-down style (only as wide as its longest option, 44 px, 14 px chevron) |
| `TextInput`, `Textarea`, `SearchInput` | Labelled fields with hints and errors linked for screen readers |
| `InfoTooltip` | The one tooltip pattern: a 32 px "i" button that opens on hover, focus or tap, closes with Escape and describes its field (S1-E2-02) |
| `InfoPill` | Six information pill tones (pills tell) |
| `Chip` | A switchable filter (chips do): tick plus aria-pressed when selected |
| `ChoiceChips` | Pick one of a few choices: a radiogroup of chips with arrow-key moves, a tick on the chosen one, dashed when disabled (S1-E3-01) |
| `Doodle` (+ `doodleSources.ts`) | A decorative doodle: `data-doodle` background or widget, hidden under 1000 or 600 px, never over text (checked by `e2e/support/doodles.ts`) (S1-E3-01) |
| `Card`, `LabelRows`, `Eyebrow`, `EmptyState`, `Notice` | Panels, label and value rows with fine lines, eyebrow labels, empty states, coloured messages |
| `StoryCard` | A story with a drawn cover (`src/components/covers/DrawnCover`); the title is always shown in full |
| `Shelf` (+ `useShelfScroll`, `ShelfArrows`, `ViewMoreCard`) | One sideways line of at most 20 stories, arrows only when it overflows, a one-side fade, then "View more" |
| `AdSlot` | Banner, portrait, side box and in-list card ad slots, labelled "Ad" or "Sponsored" |
| `PageContainer` | The centred 1280 px column with responsive side padding |

Colours come from `src/styles/tokens.css` (light and night). Icons in `src/components/icons/` are plain SVGs, allowed only for arrows, ticks and form fields; everything else uses the doodle set.
