/**
 * StatementCard: one statement of reasons as the person reads it (story S1-E10-04; DSA art.
 * 17(3); board 6.5, MyReports: "Decisions about your posts").
 *
 * Board: the title, "Decided … · Case …", then label rows: What we did, Why, The rule, How we
 * found it, and "You can appeal until …" with the Appeal button and form (AppealSection,
 * S1-E10-07).
 * Who shows it: MyReportsPage, and the staff case page (isStaffView: no appeal section).
 * What it calls: lib/statementText.ts for the words.
 */
import { LabelRows } from '@/components/ui/LabelRows';

import type { StatementOfReasons } from '../api/statements';
import { howFoundText, readableDate, ruleText, whatWeDidText } from '../lib/statementText';
import { useStatementsTranslation } from '../registerStatementsTranslations';

import { AppealSection } from './AppealSection';

/**
 * Renders one statement.
 *
 * @param props.statement - the statement
 * @param props.isStaffView - true on the staff case page: the appeal section is left out
 * @returns the article
 */
export function StatementCard({
  statement,
  isStaffView = false,
}: {
  statement: StatementOfReasons;
  isStaffView?: boolean;
}) {
  const { t, i18n } = useStatementsTranslation();
  const rows = [
    { label: t('decisions.whatWeDid'), value: whatWeDidText(statement, t, i18n.language) },
    { label: t('decisions.why'), value: statement.facts ?? t('decisions.noFacts') },
    { label: t('decisions.rule'), value: ruleText(statement, t) },
    { label: t('decisions.howFound'), value: howFoundText(statement, t) },
  ];
  if (statement.itemSummary !== null) {
    rows.unshift({ label: t('decisions.about'), value: statement.itemSummary });
  }
  return (
    <article
      id={statement.reference}
      aria-labelledby={`statement-${statement.reference}`}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <div className="flex flex-col gap-1">
        <h3 id={`statement-${statement.reference}`} className="m-0 text-xl font-bold text-heading">
          {t(`decisions.titles.${statement.action}`)}
        </h3>
        <p className="m-0 text-sm text-meta">
          {t('decisions.meta', {
            date: readableDate(statement.issuedAt, i18n.language),
            reference: statement.reference,
          })}
        </p>
      </div>
      <LabelRows rows={rows} />
      {!isStaffView && <AppealSection statement={statement} />}
    </article>
  );
}
