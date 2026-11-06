/**
 * LogTable: the rows of one Staff › Logs view (bundle LOGS-1, part d).
 *
 * Same layout as the Audit log (AuditLogTable): a real table on wide screens, with a header row
 * for screen readers; on phones and tablets a card per row, its labels and values with a fine line
 * between them (Definition of Done, lists of labels and values). Plain components, no doodles.
 * Who shows it: CallsView, FailuresView and CrashesView.
 */
import type { ReactNode } from 'react';

import { LabelRows } from '@/components/ui/LabelRows';

/** One row: a key for React and its cells, in the same order as the headings. */
export interface LogTableRow {
  key: string;
  cells: ReactNode[];
}

/** What the table needs. */
export interface LogTableProps {
  /** Names the table for screen readers, for example "Calls". */
  caption: string;
  headings: string[];
  rows: LogTableRow[];
  /** Shown instead of the table when there are no rows. */
  emptyNote: string;
}

/**
 * Renders the rows.
 *
 * @returns a table on wide screens, cards on narrow ones, or the empty note
 */
export function LogTable({ caption, headings, rows, emptyNote }: LogTableProps) {
  if (rows.length === 0) return <p className="m-0 text-body">{emptyNote}</p>;
  return (
    <>
      <table className="hidden w-full border-collapse text-sm lg:table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-left text-meta">
            {headings.map((heading) => (
              <th key={heading} scope="col" className="py-2 pr-4 font-semibold">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border align-top">
              {row.cells.map((cell, index) => (
                <td key={headings[index]} className="py-2.5 pr-4 [overflow-wrap:anywhere]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul aria-label={caption} className="m-0 flex list-none flex-col gap-4 p-0 lg:hidden">
        {rows.map((row) => (
          <li key={row.key} className="rounded-card border border-border bg-surface p-4">
            <LabelRows
              rows={row.cells.map((cell, index) => ({
                label: headings[index] ?? '',
                // Call names and routes have no spaces to wrap at, so they may break anywhere.
                value: <span className="[overflow-wrap:anywhere]">{cell}</span>,
              }))}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
