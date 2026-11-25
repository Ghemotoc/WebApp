/**
 * ReadWritersBox: "Writers" beside the featured story on the Read page (user story 1.4, board
 * A04: a box with two lists of writers to follow, each with a quiet Follow).
 *
 * Board values: the heading "Writers" (subheading), then two small headings, each over its list
 * of three rows split by the hairline, 12 px apart:
 * - "To follow this week": the writers staff pick in Stories › Featured or, with no pick, the
 *   writers who gained the most followers this week (writers_to_follow_now());
 * - "New and rising": rising_writers(), less anyone already in the first list, so nobody shows
 *   twice.
 * Each list hides when it has nobody; with nobody in either, the box is not drawn and the featured
 * story takes the whole width.
 * Who shows it: DiscoverPage, only for someone signed in (a visitor meets the writers as a row of
 * cards). What it calls: useWritersToFollow, useRisingWriters and SuggestedWriterRow.
 */
import { useId } from 'react';

import type { RisingWriter } from '../api/risingWriters';
import { useRisingWriters } from '../hooks/useRisingWriters';
import { useWritersToFollow } from '../hooks/useWritersToFollow';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { SuggestedWriterRow } from './SuggestedWriterRow';

/** How many writers each list shows (board A04 draws three in each). */
const writersPerList = 3;

/**
 * One small heading with its list, or nothing when the list is empty.
 *
 * @param props.title - the small heading
 * @param props.writers - the writers, already cut to the list's length
 * @returns the heading and list, or null
 */
function WriterList({ title, writers }: { title: string; writers: RisingWriter[] }) {
  const headingId = useId();
  if (writers.length === 0) return null;
  return (
    <>
      <h3 id={headingId} className="m-0 type-label text-heading">
        {title}
      </h3>
      {/* The list takes its name from the heading above, so a screen reader announces it. */}
      <ul aria-labelledby={headingId} className="m-0 list-none p-0 [&>li:first-child]:border-t-0">
        {writers.map((writer) => (
          <SuggestedWriterRow key={writer.handle} writer={writer} />
        ))}
      </ul>
    </>
  );
}

/**
 * Renders the box, or nothing while no writer is suggested.
 *
 * @returns the box or null
 */
export function ReadWritersBox() {
  const { t } = useDiscoveryTranslation();
  const headingId = useId();
  const toFollow = useWritersToFollow().writers.slice(0, writersPerList);
  const allRising = useRisingWriters().writers;
  // Step 1: New and rising leaves out anyone already in To follow this week.
  const shownHandles = new Set(toFollow.map((writer) => writer.handle));
  const rising = allRising
    .filter((writer) => !shownHandles.has(writer.handle))
    .slice(0, writersPerList);
  // Step 2: nobody in either list, so no empty box.
  if (toFollow.length === 0 && rising.length === 0) return null;
  return (
    <section
      aria-labelledby={headingId}
      className="box-surface flex min-w-0 flex-col gap-3 rounded-card p-6"
    >
      <h2 id={headingId} className="m-0 type-subheading">
        {t('writersBox.title')}
      </h2>
      <WriterList title={t('writersBox.toFollow')} writers={toFollow} />
      <WriterList title={t('writersBox.rising')} writers={rising} />
    </section>
  );
}
