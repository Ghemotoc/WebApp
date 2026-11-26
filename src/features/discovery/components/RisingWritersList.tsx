/**
 * RisingWritersList: "New and rising writers" as a list of rows (story S1-E5-11; since CALM-7c
 * the simplified board New-Read, and since CALM-9 the home page's bands, canvas comments of
 * 23 Nov 2026).
 *
 * Board values: the heading, then one row per writer split by the hairline (SuggestedWriterRow).
 * It shows the first five writers rising_writers() suggests, with the same rules as the shelf
 * (only writers who agreed to be suggested, never across a block).
 * Two tones (SuggestedWriterRow): plain, and band inside the dark writers' band on a member's
 * home page (board A01, 23 Nov 2026), where the heading is "Draw inspiration from new and rising
 * writers" in the display font at 20/28.
 * Who shows it: HubToolsSection (members), FirstStoryBand (visitors) and SearchPage. The Read
 * page's box draws its own two lists (ReadWritersBox). What it calls: useRisingWriters →
 * rising_writers() and SuggestedWriterRow.
 */
import { cn } from '@/lib/utils';

import { useRisingWriters } from '../hooks/useRisingWriters';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { writerToneClasses, type RisingWritersTone } from '../lib/writerTone';

import { SuggestedWriterRow } from './SuggestedWriterRow';

/** How many writers the list shows (the board shows three; five keeps the shelf's spread). */
const writersShown = 5;

export type { RisingWritersTone } from '../lib/writerTone';

/** What the list needs. */
export interface RisingWritersListProps {
  /** Plain (the default) or inside the dark writers' band. */
  tone?: RisingWritersTone;
  /** The heading's id, unique on the page. */
  headingId?: string;
  /** Another heading, such as Search's "Writers to try" (board A07); the list's own otherwise. */
  title?: string;
}

/**
 * Renders the section, or nothing when no writer is suggested.
 *
 * @param props.tone - plain or band
 * @param props.headingId - the heading's id
 * @param props.title - a heading of the caller's own, if any
 * @returns the section or null
 */
export function RisingWritersList({
  tone = 'plain',
  headingId = 'rising-writers-heading',
  title,
}: RisingWritersListProps) {
  const { t } = useDiscoveryTranslation();
  const { writers } = useRisingWriters();
  // Step 1: nobody to suggest, so no empty heading.
  if (writers.length === 0) return null;
  // Step 2: the band has its own, longer heading (board A01, 23 Nov 2026).
  const titleKey = tone === 'band' ? 'risingWriters.bandTitle' : 'risingWriters.title';
  return (
    <section aria-labelledby={headingId} data-writers-tone={tone} className="flex flex-col">
      <h2 id={headingId} className={cn('m-0 mb-1', writerToneClasses[tone].heading)}>
        {title ?? t(titleKey)}
      </h2>
      <ul className="m-0 list-none p-0">
        {writers.slice(0, writersShown).map((writer) => (
          <SuggestedWriterRow key={writer.handle} writer={writer} tone={tone} />
        ))}
      </ul>
    </section>
  );
}
