/**
 * shelfRowStyles: the grid of a row of covers, shared by the real row and its grey placeholder so
 * both hold exactly the same places (CALM-4; design books item 15).
 *
 * A row shows 5 whole covers from 1024 px, 4 from 600 px and 2.3 under 600 px, 24 px apart (16 px
 * on phones); in a half-width column it shows 3 or 4 from 600 px (DoD, rows of covers).
 * Who uses it: Shelf and PlaceholderShelf (src/components/ui/).
 */

/**
 * The row's grid: one column per cover, sized so 5, 4 or 2.3 covers fill the row. The variables
 * are the design system's (.gh-shelf__row in bundle.css); Tailwind's arbitrary properties set them.
 */
export const rowGridClasses =
  'grid auto-cols-[calc((100%-(var(--per-page)-1)*var(--gap))/var(--per-page))] grid-flow-col gap-(--gap) m-0 list-none p-0';

/** The covers in view at each width: a full-width row, or one in a half-width column. */
export const perPageClasses = {
  full: '[--per-page:2.3] [--gap:16px] min-[600px]:[--per-page:4] min-[600px]:[--gap:24px] min-[1024px]:[--per-page:5]',
  3: '[--per-page:2.3] [--gap:16px] min-[600px]:[--per-page:3] min-[600px]:[--gap:24px]',
  4: '[--per-page:2.3] [--gap:16px] min-[600px]:[--per-page:4] min-[600px]:[--gap:24px]',
} as const;
