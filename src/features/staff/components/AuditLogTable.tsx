/**
 * AuditLogTable: the rows of the Audit log screen (story S1-E11-01).
 *
 * Board values (AdminSettings, "Recent changes"): date and time, who, the action, then what
 * changed as "before → after". On wide screens a real table (one row per entry, a header row for
 * screen readers); on phones a list of label and value rows with a fine line between them
 * (Definition of Done, lists of labels and values). Plain components, no doodles.
 * The target account appears by username and the first 8 characters of its user ID, never the
 * full ID (architecture 1.6). "Who" is a username, a short user ID for an account without a
 * username yet (a new account using an invite) or "System" when the platform acted (S1-E11-17).
 * Who shows it: AuditLogPage.
 */
import { useTranslation } from 'react-i18next';

import { LabelRows } from '@/components/ui/LabelRows';
import type { Json } from '@/lib/database.types';

import type { AuditLogEntry } from '../api/auditLog';

/**
 * Values as one line of text, for a cell.
 *
 * @param values - the before or after values
 * @returns "key: value" pairs joined with commas, or "" for none
 */
function valuesAsText(values: Json | null): string {
  if (values === null || typeof values !== 'object' || Array.isArray(values)) {
    return values === null ? '' : JSON.stringify(values);
  }
  return Object.entries(values)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(', ');
}

/**
 * The target as "@username (1a2b3c4d)" or whatever part is known.
 *
 * @param entry - the audit entry
 * @returns the text, or "" when the action had no target account
 */
function targetAsText(entry: AuditLogEntry): string {
  const parts = [];
  if (entry.targetHandle !== null) parts.push(`@${entry.targetHandle}`);
  if (entry.targetUserIdShort !== null) parts.push(`(${entry.targetUserIdShort})`);
  return parts.join(' ');
}

/**
 * Who acted, as "@username", "(1a2b3c4d)" or the word for the system.
 *
 * @param entry - the audit entry
 * @param systemLabel - "System" in the page's language
 * @returns the text for the Who cell
 */
function actorAsText(entry: AuditLogEntry, systemLabel: string): string {
  if (entry.actor === 'system') return systemLabel;
  if (entry.staffHandle !== null) return `@${entry.staffHandle}`;
  return entry.actorUserIdShort === null ? '' : `(${entry.actorUserIdShort})`;
}

/**
 * A date and time in the page's language.
 *
 * @param isoTime - the time as the database gave it
 * @param language - the page's language code
 * @returns for example "23 Oct 2026, 14:02"
 */
function timeAsText(isoTime: string, language: string): string {
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(isoTime),
  );
}

/**
 * Renders the rows.
 *
 * @param props.entries - the page's entries, newest first
 * @returns a table on wide screens, cards on phones; a plain note when there are none
 */
export function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  const { t, i18n } = useTranslation('staff');
  if (entries.length === 0) return <p className="m-0 text-body">{t('auditLog.noRows')}</p>;

  const headings = [
    t('auditLog.columns.time'),
    t('auditLog.columns.staff'),
    t('auditLog.columns.action'),
    t('auditLog.columns.target'),
    t('auditLog.columns.reason'),
    t('auditLog.columns.before'),
    t('auditLog.columns.after'),
  ];
  const cellsOf = (entry: AuditLogEntry) => [
    timeAsText(entry.createdAt, i18n.language),
    actorAsText(entry, t('auditLog.system')),
    entry.action,
    `${entry.targetType} ${targetAsText(entry)}`.trim(),
    entry.reason ?? '',
    valuesAsText(entry.beforeValues),
    valuesAsText(entry.afterValues),
  ];

  return (
    <>
      <table className="hidden w-full border-collapse text-sm lg:table">
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
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-border align-top">
              {cellsOf(entry).map((cell, index) => (
                <td key={headings[index]} className="py-2.5 pr-4 [overflow-wrap:anywhere]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="m-0 flex list-none flex-col gap-4 p-0 lg:hidden">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-card border border-border bg-surface p-4">
            <LabelRows
              rows={cellsOf(entry).map((cell, index) => ({
                label: headings[index] ?? '',
                // Action names and JSON have no spaces to wrap at, so they may break anywhere.
                value: <span className="[overflow-wrap:anywhere]">{cell}</span>,
              }))}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
