/**
 * HubRows: a titled list of plain rows, the Writers' hub's one way to list things (user story
 * 1.3, board A03-WritersHub: Writing guides, Live sessions, More contests, Calls for submissions
 * and Tools are all drawn the same way).
 *
 * The heading (24/30) with an optional text link at its right and an optional line under it; then
 * rows divided by a hairline, each a title link in Inter 600 with a meta line under it and an
 * optional action (Remind me) at its right.
 * Who uses it: the hub's sections. What it calls: MetaLine.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';

/** One row. */
export interface HubRow {
  key: string;
  title: string;
  /** An address inside the site, or an outside address (opened in a new tab); none for plain words. */
  href?: string;
  /** Says what an outside link opens, for screen readers; left out for links inside the site. */
  outsideLabel?: string;
  facts: MetaFact[];
  /** A button at the row's right (Remind me). */
  action?: ReactNode;
  /** Text read with the row, such as "Reminder set". */
  note?: ReactNode;
  /** The language of the row's words when it differs from the page's. */
  lang?: string;
}

/** What the list needs. */
export interface HubRowsProps {
  headingId: string;
  heading: string;
  /** A line under the heading ("Magazines and anthologies looking for writers."). */
  intro?: string;
  /** A text link at the heading's right ("Guides", "Every number"). */
  headerAction?: ReactNode;
  rows: HubRow[];
  /** Words under the rows (a time note). */
  footer?: ReactNode;
}

/**
 * The row's title: a link inside the site, or a link to another site in a new tab.
 *
 * @returns the link
 */
function RowTitle({ row }: { row: HubRow }) {
  const classes = 'type-label font-semibold break-words text-ink-heading no-underline';
  const linkClasses = `${classes} hover:underline`;
  if (row.href === undefined) {
    return <span className={classes}>{row.title}</span>;
  }
  if (row.outsideLabel !== undefined) {
    return (
      <a
        href={row.href}
        target="_blank"
        rel="nofollow noopener noreferrer"
        aria-label={row.outsideLabel}
        className={linkClasses}
      >
        {row.title}
      </a>
    );
  }
  return (
    <Link to={row.href} className={linkClasses}>
      {row.title}
    </Link>
  );
}

/**
 * Renders the list.
 *
 * @returns the section
 */
export function HubRows({ headingId, heading, intro, headerAction, rows, footer }: HubRowsProps) {
  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id={headingId} className="m-0 type-heading">
            {heading}
          </h2>
          {intro !== undefined && <p className="m-0 type-meta text-ink-muted">{intro}</p>}
        </div>
        {headerAction}
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map((row) => (
          <li
            key={row.key}
            lang={row.lang}
            className="flex items-center gap-4 border-t border-hairline py-3"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <RowTitle row={row} />
              <MetaLine facts={row.facts} />
              {row.note}
            </div>
            {row.action}
          </li>
        ))}
      </ul>
      {footer}
    </section>
  );
}
