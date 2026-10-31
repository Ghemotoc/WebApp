/**
 * ComplianceLogTable: the rows of the compliance log on the staff Metrics page (story S1-E11-04,
 * criterion 2; board AdminMetrics).
 *
 * Columns from the board: reference, authority, received, content, action taken and done, plus
 * the kind. A removal order from the public form (TCO-…) shows its moderation decision as the
 * action; an open logged entry has a "Record the action" button. Times are Romania time. On wide
 * screens a real table; on phones label and value rows with a fine line between them (DoD).
 * Who shows it: ComplianceLogSection.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { LabelRows } from '@/components/ui/LabelRows';
import { formatRomaniaDateTime } from '@/lib/romania-time';

import type { ComplianceEntry } from '../../api/complianceLog';

/** What the table needs. */
interface ComplianceLogTableProps {
  entries: ComplianceEntry[];
  /** Opens the "Record the action" form for an open entry. */
  onComplete: (reference: string) => void;
}

/** The column keys, in order. */
const columns = ['reference', 'kind', 'authority', 'received', 'content', 'action', 'done'];

/**
 * The function that makes one row's cells, with the translations and the date format it needs.
 *
 * @returns cellsOf(entry, onComplete): the row's cells in column order, where onComplete opens the
 *   form for an open entry
 */
function useCells() {
  const { t, i18n } = useTranslation(['staff', 'moderation']);
  const time = (iso: string | null) =>
    iso === null ? null : formatRomaniaDateTime(new Date(iso), i18n.language);
  return (entry: ComplianceEntry, onComplete: (reference: string) => void): ReactNode[] => {
    const action =
      entry.actionTaken ??
      (entry.decision === null ? null : t(`moderation:actions.${entry.decision}`));
    let done: ReactNode = time(entry.completedAt) ?? t('metrics.compliance.open');
    if (entry.completedAt === null && entry.source === 'log') {
      done = (
        <Button
          variant="secondary"
          className="h-auto min-h-11 py-2 text-left whitespace-normal"
          onClick={() => onComplete(entry.reference)}
        >
          {t('metrics.compliance.complete.button', { reference: entry.reference })}
        </Button>
      );
    }
    return [
      <span key="reference" className="whitespace-nowrap">
        {entry.reference}
      </span>,
      t(`metrics.compliance.kinds.${entry.kind}`),
      entry.authority,
      time(entry.receivedAt),
      <span key="content" className="[overflow-wrap:anywhere]">
        {entry.content}
      </span>,
      action ?? '',
      done,
    ];
  };
}

/**
 * Renders the rows, or a line saying nothing is logged yet.
 *
 * @returns the table and the phone list
 */
export function ComplianceLogTable({ entries, onComplete }: ComplianceLogTableProps) {
  const { t } = useTranslation('staff');
  const cellsOf = useCells();
  if (entries.length === 0) return <p className="m-0 text-meta">{t('metrics.compliance.empty')}</p>;
  const headings = columns.map((key) => t(`metrics.compliance.columns.${key}`));
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
            <tr key={entry.reference} className="border-b border-border align-top text-ink">
              {cellsOf(entry, onComplete).map((cell, index) => (
                <td key={headings[index]} className="py-2.5 pr-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="m-0 flex list-none flex-col gap-4 p-0 lg:hidden">
        {entries.map((entry) => (
          <li key={entry.reference} className="rounded-card border border-border p-4">
            <LabelRows
              rows={cellsOf(entry, onComplete).map((cell, index) => ({
                label: headings[index] ?? '',
                value: cell,
              }))}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
