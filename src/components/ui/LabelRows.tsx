/**
 * LabelRows: a list of labels and values with a fine line between rows (story S1-E1-03).
 *
 * The rule (DoD; Robert, canvas comment, 17 Oct 2026): label and value lists (story labels,
 * settings summaries, staff detail panels, thread stats) have a fine 1 px line between rows, so
 * each label is easy to pair with its value. Board class: tmc-rows. A real <dl>, so screen readers
 * read each pair together.
 * Who uses it: the story page (S1-E3-05), settings and staff panels.
 */
import type { ReactNode } from 'react';

/** One label and its value. */
export interface LabelRow {
  label: string;
  value: ReactNode;
}

/**
 * Renders the rows. The first row has no line above it.
 *
 * @param props.rows - the label and value pairs, in order
 * @returns the description list
 */
export function LabelRows({ rows }: { rows: LabelRow[] }) {
  return (
    <dl className="m-0">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={`grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-4 py-2.5 ${index === 0 ? 'pt-0' : 'border-t border-border'}`}
        >
          <dt className="text-sm text-meta">{row.label}</dt>
          <dd className="m-0 text-sm text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
