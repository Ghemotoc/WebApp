/**
 * Turns the compliance log into a CSV file, the "Export DSA log (CSV)" button (story S1-E11-04;
 * board AdminMetrics).
 *
 * Who calls it: hooks/useComplianceLog.ts, after admin_compliance_log(true) has returned the rows
 * (and logged the export). What it makes: RFC 4180 text, one row per entry, with a byte order mark
 * so Excel shows ș and ț, and the times as ISO 8601 text so an authority reads them the same way
 * in any country. The columns are the story's: authority, date, content, action taken and times.
 * Pure: no browser objects, so it is unit-tested on its own.
 */
import type { ComplianceEntry } from '../api/complianceLog';

import { csvCell } from './auditLogCsv';

/** The columns, in the order the file has them. */
export const complianceLogCsvColumns = [
  'reference',
  'kind',
  'authority',
  'received_at',
  'content',
  'action_taken',
  'completed_at',
] as const;

/**
 * What was done, as one cell: the staff's words, or a removal order's moderation action.
 *
 * @param entry - the log row
 * @returns the text, or null when nothing was done yet
 */
function actionOf(entry: ComplianceEntry): string | null {
  if (entry.actionTaken !== null) return entry.actionTaken;
  return entry.decision;
}

/**
 * Builds the whole file.
 *
 * @param entries - the rows, newest first as the database returned them
 * @returns the CSV text, starting with a byte order mark and the header line
 */
export function complianceLogToCsv(entries: ComplianceEntry[]): string {
  const rows = entries.map((entry) =>
    [
      entry.reference,
      entry.kind,
      entry.authority,
      entry.receivedAt,
      entry.content,
      actionOf(entry),
      entry.completedAt,
    ]
      .map(csvCell)
      .join(','),
  );
  // The byte order mark (U+FEFF) tells Excel the file is UTF-8.
  return `\uFEFF${[complianceLogCsvColumns.join(','), ...rows].join('\r\n')}\r\n`;
}
