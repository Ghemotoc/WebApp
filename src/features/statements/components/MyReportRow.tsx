/**
 * MyReportRow: one report the person sent, with what came of it (story S1-E10-04 criterion 2;
 * board 6.5, MyReports: "Reports you sent").
 *
 * Board: the status pill (Waiting for a moderator, Decided: removed, Decided: no action), what was
 * reported, "Reason · Sent … · Decided …" and one plain sentence. The outcome never names a
 * sanction on someone else (the database gives only removed, acted or no_action).
 * Who shows it: MyReportsPage.
 */
import { InfoPill, type PillTone } from '@/components/ui/InfoPill';

import type { MyReport } from '../api/statements';
import { readableDate } from '../lib/statementText';
import { useStatementsTranslation } from '../registerStatementsTranslations';

/** Each state's key and pill tone. */
const states = {
  waiting: 'gold',
  removed: 'sage',
  acted: 'sage',
  no_action: 'neutral',
} as const satisfies Record<string, PillTone>;

/**
 * Renders one report.
 *
 * @param props.report - the report
 * @returns the list item
 */
export function MyReportRow({ report }: { report: MyReport }) {
  const { t, i18n } = useStatementsTranslation();
  const state = report.isDecided && report.outcome !== null ? report.outcome : 'waiting';
  const reason = t(`reports.reasons.${report.reason}`);
  const sent = readableDate(report.sentAt, i18n.language);
  const meta =
    report.decidedAt === null
      ? t('reports.meta', { reason, sent })
      : t('reports.metaDecided', {
          reason,
          sent,
          decided: readableDate(report.decidedAt, i18n.language),
        });
  return (
    <li className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0">
      <div>
        <InfoPill tone={states[state]}>{t(`reports.status.${state}`)}</InfoPill>
      </div>
      <p className="m-0 font-semibold text-heading">
        {report.itemSummary ?? t('reports.unknownItem')}
      </p>
      <p className="m-0 text-sm text-meta">{meta}</p>
      <p className="m-0 text-body">{t(`reports.explain.${state}`)}</p>
    </li>
  );
}
