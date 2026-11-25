/**
 * ReadWritersBox: "Writers" beside the featured story on the Read page (user story 1.4, board
 * A04: a box with the writers to follow, each with a quiet Follow).
 *
 * The box holds the New and rising writers list (RisingWritersList, rising_writers()), on the one
 * box surface. It is hidden while nobody may be suggested, so the featured story takes the whole
 * width. The board splits the box into "To follow this week" and "New and rising"; the app has
 * one list of suggested writers (S1-E5-11), so it shows that one (docs/board-fixes.md).
 * Who shows it: DiscoverPage, only for someone signed in (a visitor meets the same writers as a
 * row of cards). What it calls: useRisingWriters and RisingWritersList.
 */
import { useRisingWriters } from '../hooks/useRisingWriters';

import { RisingWritersList } from './RisingWritersList';

/**
 * Renders the box, or nothing while no writer is suggested.
 *
 * @returns the box or null
 */
export function ReadWritersBox() {
  const { writers } = useRisingWriters();
  if (writers.length === 0) return null;
  return (
    <div className="box-surface min-w-0 rounded-card p-6">
      <RisingWritersList />
    </div>
  );
}
