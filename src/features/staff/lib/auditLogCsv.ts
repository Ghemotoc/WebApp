/**
 * Turns audit log rows into a CSV file (story S1-E11-01; architecture 1.8.3: owner and admin
 * can export the audit log).
 *
 * Who calls it: hooks/useAuditLog.ts, after admin_export_audit_log() has returned the rows (and
 * logged the export). What it makes: RFC 4180 text, one row per audit entry, with a byte order
 * mark so Excel shows ș and ț correctly, and the before and after values as JSON text.
 * Pure: no browser objects, so it is unit-tested on its own.
 */
import type { AuditLogEntry } from '../api/auditLog';

/** The columns, in the order the file has them. */
export const auditLogCsvColumns = [
  'time',
  'staff',
  'actor',
  'actor_user_id_short',
  'action',
  'target_type',
  'target_id',
  'target_account',
  'target_user_id_short',
  'reason',
  'before',
  'after',
] as const;

/**
 * Quotes one value for CSV: wrapped in double quotes when it holds a comma, a quote or a line
 * break, with every double quote doubled (RFC 4180).
 *
 * @param value - the text, or null for an empty cell
 * @returns the cell text
 */
export function csvCell(value: string | null): string {
  if (value === null || value === '') return '';
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

/**
 * One entry as the twelve cells of its row.
 *
 * @param entry - the audit entry
 * @returns the cells, in column order
 */
function cellsOf(entry: AuditLogEntry): string[] {
  return [
    entry.createdAt,
    entry.staffHandle,
    entry.actor,
    entry.actorUserIdShort,
    entry.action,
    entry.targetType,
    entry.targetId,
    entry.targetHandle,
    entry.targetUserIdShort,
    entry.reason,
    entry.beforeValues === null ? null : JSON.stringify(entry.beforeValues),
    entry.afterValues === null ? null : JSON.stringify(entry.afterValues),
  ].map(csvCell);
}

/**
 * Builds the whole file.
 *
 * @param entries - the rows, newest first as the database returned them
 * @returns the CSV text, starting with a byte order mark and the header line
 */
export function auditLogToCsv(entries: AuditLogEntry[]): string {
  const lines = [auditLogCsvColumns.join(','), ...entries.map((entry) => cellsOf(entry).join(','))];
  // The byte order mark (U+FEFF) tells Excel the file is UTF-8, so ș and ț show correctly.
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
