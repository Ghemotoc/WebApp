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

/** The class names of one look: the row, the label and the value. */
const LOOKS = {
  // A 140 px label column, the value beside it (settings, staff panels).
  columns: {
    row: 'grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-4 py-3',
    label: 'type-body text-ink-muted',
    value: 'm-0 type-body text-ink',
  },
  // The label in the label type at the left, the value at the right edge, a line above every
  // row (board B09-StoryLanguages, "About this edition").
  spread: {
    row: 'flex items-start justify-between gap-4 border-t border-border py-3',
    label: 'type-label font-semibold text-ink-heading',
    value: 'm-0 min-w-0 type-body text-right break-words text-ink',
  },
} as const;

/**
 * Renders the rows. In the columns look the first row has no line above it.
 *
 * @param props.rows - the label and value pairs, in order
 * @param props.look - 'columns' (default) or 'spread'
 * @returns the description list
 */
export function LabelRows({
  rows,
  look = 'columns',
}: {
  rows: LabelRow[];
  look?: keyof typeof LOOKS;
}) {
  const classes = LOOKS[look];
  return (
    <dl className="m-0">
      {rows.map((row, index) => {
        // Step 1: the columns look leaves out the line (and top padding) above the first row.
        const firstRowClass = index === 0 ? 'pt-0' : 'border-t border-border';
        const rowClass = look === 'columns' ? `${classes.row} ${firstRowClass}` : classes.row;
        return (
          <div key={row.label} className={rowClass}>
            <dt className={classes.label}>{row.label}</dt>
            <dd className={classes.value}>{row.value}</dd>
          </div>
        );
      })}
    </dl>
  );
}
