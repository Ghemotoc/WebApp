/**
 * IssueAnswer: what the teacher reads under "Approve and sign" (bundle CLASSES, part e; story
 * S1-E8-12 criterion 1; moved to its own file in CLASS-POINTS part 3, story S1-E8-17).
 *
 * What it shows: why the database refused, that nothing changed, or how many certificates were
 * signed.
 * Who shows it: ClassResultsForm and CompetitionCertificatesForm. What it calls: nothing.
 */
import { Notice } from '@/components/ui/Notice';

import type { useIssueClassCertificates } from '../hooks/useClassCertificates';
import { useCertificatesTranslation } from '../registerCertificatesTranslations';

/**
 * The answer under the button: a refusal, nothing new, or how many were signed.
 *
 * @param props.issuing - the issue call
 * @returns the notice, or nothing
 */
export function IssueAnswer({
  issuing,
}: {
  issuing: ReturnType<typeof useIssueClassCertificates>;
}) {
  const { t } = useCertificatesTranslation();
  if (issuing.failure !== null) {
    return <Notice tone="error">{t(`class.failures.${issuing.failure.failure}`)}</Notice>;
  }
  if (issuing.issued === null) return null;
  if (issuing.issued === 0) return <Notice tone="info">{t('class.nothingChanged')}</Notice>;
  return <Notice tone="success">{t('class.approved', { count: issuing.issued })}</Notice>;
}
