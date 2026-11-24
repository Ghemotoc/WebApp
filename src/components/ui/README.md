# UI components

The shared building blocks every screen uses, one component per file. Built by S1-E1-03 from the design boards and the Definition of Done design rules; every one is shown on the `/design` page.

| Component | What it is |
| --- | --- |
| `Button` (+ `buttonStyles.ts`) | Primary (the theme accent's gradient, `button-main`), secondary (grey glass, `button-glass`), text and destructive buttons, 44, 48 or 52 px; `isLoading` keeps the label, adds a spinner and disables it (G3) |
| `FieldProblem` | One short line under a hand-drawn field saying what is missing or wrong, for the field's `aria-describedby` (design books item 9) |
| `ButtonRow` | The one footer for member forms and dialogs: buttons on the left, the main one first, 12 px apart, wrapping on narrow screens (design books item 8) |
| `DateTimeField` | The one date and time field: a date box and a time box on the viewer's own clock, a quiet note and the skipped-hour note (CALM-1c) |
| `SegmentedControl` | A few choices in a recessed track with a white water bubble that slides to the picked one: a radio group, arrow keys move (G3) |
| `Select` | The one drop-down style (only as wide as its longest option, 44 px, 14 px chevron) |
| `TextInput`, `Textarea`, `SearchInput` | Labelled fields with hints and errors linked for screen readers; 48 px tall with a 14 px radius (`field-box`, G3) |
| `InfoTooltip` | The one tooltip pattern: a 32 px "i" button that opens on hover, focus or tap, closes with Escape and describes its field (S1-E2-02) |
| `InfoPill` | Six information pill tones (pills tell) |
| `Chip` | A switchable filter (chips do): grey glass, tick plus aria-pressed when selected |
| `ChoiceChips` | Pick one of a few choices: a radiogroup of chips with arrow-key moves, a tick on the chosen one, dashed when disabled (S1-E3-01) |
| `LabelRows` is used by the story page's "Labels from the writer" (S1-E3-05) |
| `Card`, `LabelRows`, `Eyebrow`, `EmptyState`, `Notice` | Glass panels (every `rounded-card bg-surface border-border` gets the glass rim, G3), label and value rows with fine lines, eyebrow labels, empty states, coloured messages |
| `Badge` | An earned or identity mark (writing rank, reading level): a flat 28 px pill on the box surface with an optional 14 px icon, the name and a hidden prefix for screen readers (CALM-7a; replaces the G7a glass tag) |
| `Tabs` | A tablist whose chosen tab is bold in the link colour, no underline bar; long rows wrap (G3) |
| `StoryCard` | One story in a row: the cover at its column's width, then the title and meta line, all one link; an optional 2 px progress line for Continue reading (CALM-4) |
| `Hero` and `Meter` | The one glass panel at the top of a page (padding 40 px, 24 px under 900 px) and its 2 px progress line, a `role="meter"` with the value in words (CALM-4) |
| `Sheet` | A glass panel for one short task: a native dialog with a title and Close ×, hairline rows, a bottom sheet on phones and beside the page from 600 px (CALM-4) |
| `Switch` | The one on and off switch: `role="switch"`, a 52 × 32 px track, a 26 px knob, primary when on; `SwitchButton` draws it (CALM-4) |
| `Shelf` (+ `useShelfScroll`, `ShelfArrows`, `ViewMoreCard`) | One sideways line of at most 20 stories: 5 whole covers from 1024 px, 4 from 600 px, 2.3 on phones, no fade, no scrollbar; Previous and Next beside "View 54" only when it overflows, aria-disabled at the ends; phones swipe and snap (CALM-4) |
| `AdSlot` | Banner, portrait, side box and in-list card ad slots, labelled "Ad" or "Sponsored" |
| `PageContainer` | The centred column (at most 1280 px), at least 10 px inside the navigation bar (up to 1376 px) on each side (GLASS-4, CALM-9) |
| `MetaLine` | A line of facts joined by middots, a state first in bold, in place of information pills (CALM-2) |
| `StateWord` | One state on its own as a bold word ("This device", "Connected"), where a pill used to stand (CALM-9d) |
| `choiceRowStyles` | `choiceRowClassName`: one choice of a settings radio group as a glass row, the chosen one with a plum border (G11b) |

Colours come from `src/styles/tokens.css` (light and night). The liquid glass looks shared by many components (`button-main`, `button-glass`, `field-box`, the card rim, the segmented track and bubble, avatar beads and the sheen on "on" states) are in `src/styles/index.css` (bundle G3 COMPONENTS). Member avatars are plain flat circles in one of seven cover palette colours, picked at random on joining and changeable in Settings › Profile › Circle colour (`src/features/avatars/lib/beadColours.ts`, CALM-3). Icons in `src/components/icons/` are plain line SVGs in the current text colour (`NavIcon` for the header and tab bar, bundle G4); the liquid glass design has no doodles (Robert, 7 Nov 2026).
