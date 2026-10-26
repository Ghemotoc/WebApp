/**
 * CaseStatements: "Statement of reasons", what the person was told about this case's decision,
 * exactly as they read it (story S1-E10-04; DSA art. 17; board 8.3's statement preview).
 *
 * Shown once the case is decided and a statement was sent. "No action" sends none, and a removal
 * order the authority asked us to keep quiet about sends none either (Regulation (EU) 2021/784
 * art. 11(3)); the section then says so.
 * Who shows it: CasePage. What it calls: useCaseStatements; StatementCard from the statements
 * feature draws each one, without the person's challenge link.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';
import { StatementCard } from '@/features/statements/components/StatementCard';

import { useCaseStatements } from '../hooks/useCaseStatements';

/**
 * Renders the section.
 *
 * @param props.caseId - the case
 * @param props.isDecided - false while the case is open: nothing to show yet
 * @returns the section, or nothing while the case is open
 */
export function CaseStatements({ caseId, isDecided }: { caseId: string; isDecided: boolean }) {
  const { t } = useTranslation('moderation');
  const { statements, loadFailure } = useCaseStatements(caseId);
  if (!isDecided) return null;
  return (
    <section aria-labelledby="case-statements-heading" className="flex flex-col gap-4">
      <h2
        id="case-statements-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('case.statementsHeading')}
      </h2>
      {loadFailure !== null && <Notice tone="error">{t(`failures.${loadFailure}`)}</Notice>}
      {loadFailure === null && statements.length === 0 && (
        <p className="m-0 text-body">{t('case.noStatement')}</p>
      )}
      {statements.map((statement) => (
        <StatementCard key={statement.reference} statement={statement} isStaffView />
      ))}
    </section>
  );
}
