/**
 * GlassList: a labelled glass list, the "Characters · edited recently" and "Chapters · edited
 * recently" lists of the at-a-glance page and the cast list beside a character's sheet (bundle
 * G10 ATLAS, part a; the boards' "glabel" and "glist": a small grey capital label, then one glass
 * card whose rows are split by a fine line).
 *
 * The label is a heading (h2 by default, h3 inside a section), so the list is easy to find with
 * a screen reader's headings list, and the <ul> is named by it.
 * Who uses it: CastAtAGlance, RecentChaptersList and CastList. What it calls: nothing; the rows
 * are GlassListRow.
 */
import type { ReactNode } from 'react';

/**
 * Renders the label and the list.
 *
 * @param props.id - the label's id, unique on the page
 * @param props.label - what the list holds
 * @param props.headingLevel - 2 (default) or 3
 * @param props.children - the rows, each a GlassListRow in an <li>
 * @returns the heading and the glass card
 */
export function GlassList({
  id,
  label,
  headingLevel = 2,
  children,
}: {
  id: string;
  label: string;
  headingLevel?: 2 | 3;
  children: ReactNode;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Heading
        id={id}
        className="m-0 px-[18px] text-[13px] font-semibold tracking-[0.08em] text-meta uppercase"
      >
        {label}
      </Heading>
      <ul
        aria-labelledby={id}
        className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-surface p-0 shadow-card"
      >
        {children}
      </ul>
    </div>
  );
}
