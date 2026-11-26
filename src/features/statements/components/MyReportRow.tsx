/**
 * MyReportRow: one report the person sent, with what came of it (story S1-E10-04 criterion 2;
 * board 6.5, MyReports: "Reports you sent"; user stories bundle 10, board J04).
 *
 * Board J04: what was reported in bold, then one meta line (the state first and bold, the reason,
 * "Sent …" and "Decided …"), then one plain sentence. Rows sit straight on the page with a fine
 * line between them, not in a box. The outcome never names a sanction on someone else (the
 * database gives only removed, acted or no_action).
 * Who shows it: MyReportsPage. What it calls: MetaLine, readableDate.
 */
import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';

import type { MyReport } from '../api/statements';
import { readableDate } from '../lib/statementText';
import { useStatementsTranslation } from '../registerStatementsTranslations';

/**
 * The facts in the row's meta line: the state, the reason, when it was sent and, once decided,
 * when it was decided.
 *
 * @returns the facts, in reading order
 */
function useReportFacts(report: MyReport): MetaFact[] {
  const { t, i18n } = useStatementsTranslation();
  // Step 1: the state; a report with no outcome yet is still waiting.
  const state = report.isDecided && report.outcome !== null ? report.outcome : 'waiting';
  const facts: MetaFact[] = [
    { text: t(`reports.status.${state}`), kind: 'state' },
    { text: t(`reports.reasons.${report.reason}`) },
    { text: t('reports.sent', { date: readableDate(report.sentAt, i18n.language) }) },
  ];
  // Step 2: the decision's date, only once there is one.
  if (report.decidedAt !== null) {
    facts.push({
      text: t('reports.decided', { date: readableDate(report.decidedAt, i18n.language) }),
    });
  }
  return facts;
}

/**
 * Renders one report.
 *
 * @param props.report - the report
 * @returns the list item
 */
export function MyReportRow({ report }: { report: MyReport }) {
  const { t } = useStatementsTranslation();
  const state = report.isDecided && report.outcome !== null ? report.outcome : 'waiting';
  const facts = useReportFacts(report);
  return (
    <li className="flex flex-col gap-1 border-b border-hairline py-4 last:border-b-0">
      <p className="m-0 font-semibold text-ink-heading [overflow-wrap:anywhere]">
        {report.itemSummary ?? t('reports.unknownItem')}
      </p>
      <MetaLine facts={facts} />
      <p className="m-0 text-ink">{t(`reports.explain.${state}`)}</p>
    </li>
  );
}
