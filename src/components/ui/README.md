# UI components

The shared building blocks every screen uses, one component per file. Built by S1-E1-03 from the design boards and the Definition of Done design rules; every one is shown on the `/design` page.

| Component | What it is |
| --- | --- |
| `Button` (+ `buttonStyles.ts`) | Primary (the theme accent's gradient, `button-main`), secondary (grey glass, `button-glass`), text and destructive buttons, 44, 48 or 52 px; `isLoading` keeps the label, adds a spinner and disables it (G3) |
| `SegmentedControl` | A few choices in a recessed track with a white water bubble that slides to the picked one: a radio group, arrow keys move (G3) |
| `Select` | The one drop-down style (only as wide as its longest option, 44 px, 14 px chevron) |
| `TextInput`, `Textarea`, `SearchInput` | Labelled fields with hints and errors linked for screen readers; 48 px tall with a 14 px radius (`field-box`, G3) |
| `InfoTooltip` | The one tooltip pattern: a 32 px "i" button that opens on hover, focus or tap, closes with Escape and describes its field (S1-E2-02) |
| `InfoPill` | Six information pill tones (pills tell) |
| `Chip` | A switchable filter (chips do): grey glass, tick plus aria-pressed when selected |
| `ChoiceChips` | Pick one of a few choices: a radiogroup of chips with arrow-key moves, a tick on the chosen one, dashed when disabled (S1-E3-01) |
| `LabelRows` is used by the story page's "Labels from the writer" (S1-E3-05) |
| `doodleSources.ts` | The doodle files by name. Only the staff pickers that still choose a doodle (forum places, seasonal occasions) read it; screens show no doodles since bundle G4, and G12 retires the pickers |
| `Card`, `LabelRows`, `Eyebrow`, `EmptyState`, `Notice` | Glass panels (every `rounded-card bg-surface border-border` gets the glass rim, G3), label and value rows with fine lines, eyebrow labels, empty states, coloured messages |
| `GlassTag` | The plain glass text pill for a writing rank and a reading level: a 14 px icon, the name and a hidden prefix for screen readers (G7a) |
| `Tabs` | A tablist whose chosen tab is bold in the link colour, no underline bar; long rows wrap (G3) |
| `StoryCard` | A story with a drawn cover (`src/components/covers/DrawnCover`); the title is always shown in full |
| `Shelf` (+ `useShelfScroll`, `shelfPaging`, `ShelfArrows`, `ViewMoreCard`) | One sideways line of at most 20 stories, arrows only when it overflows, a fade at each edge with cards hidden past it (both in the middle of a row; 6 Nov 2026), arrows that move by whole cards so a faded card is always shown fully next (FIXES-1a), then "View more" |
| `AdSlot` | Banner, portrait, side box and in-list card ad slots, labelled "Ad" or "Sponsored" |
| `PageContainer` | The centred 1280 px column with responsive side padding |

Colours come from `src/styles/tokens.css` (light and night). The liquid glass looks shared by many components (`button-main`, `button-glass`, `field-box`, the card rim, the segmented track and bubble, avatar beads and the sheen on "on" states) are in `src/styles/index.css` (bundle G3 COMPONENTS). Member avatars are glass beads coloured from the username (`src/features/avatars/lib/beadColours.ts`). Icons in `src/components/icons/` are plain line SVGs in the current text colour (`NavIcon` for the header and tab bar, bundle G4); the liquid glass design has no doodles (Robert, 7 Nov 2026).
