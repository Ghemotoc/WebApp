/**
 * ShelfToolbar: a shelf's controls (the Home page's genre chips, the Library's tabs) drawn above
 * or under its row (Robert's review of 25 Nov 2026: board A01 puts Trending's chips under it).
 *
 * The shelf places it twice, once above and once under the row; only the one whose spot matches
 * the caller's choice draws anything, so each shelf keeps a single simple render.
 * Who shows it: Shelf and PlaceholderShelf. What it calls: nothing.
 */
import type { ReactNode } from 'react';

/** Where a shelf's controls sit. */
export type ShelfToolbarPlacement = 'above' | 'below';

/**
 * Renders the controls when this is the spot the caller chose.
 *
 * @param props.toolbar - the controls, or undefined when the shelf has none
 * @param props.placement - where the caller wants them
 * @param props.spot - which spot this copy stands in
 * @returns the wrapped controls or null
 */
export function ShelfToolbar({
  toolbar,
  placement,
  spot,
}: {
  toolbar: ReactNode | undefined;
  placement: ShelfToolbarPlacement;
  spot: ShelfToolbarPlacement;
}) {
  if (toolbar === undefined || placement !== spot) return null;
  // Above the row it keeps the gap under it; under the row, the gap above it.
  return <div className={spot === 'above' ? 'mb-4' : 'mt-4'}>{toolbar}</div>;
}
