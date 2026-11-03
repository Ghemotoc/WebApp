/**
 * AbuseImageEvidencePanel: on a safeguarding case about a suspected child sexual abuse image,
 * what is kept now that the image is deleted, and what a safeguarding moderator can do with it
 * (bundle ADMIN-2, part e2b; Robert's brief of 2 Nov 2026, section 4).
 *
 * It shows the facts as label rows (the source, the times, the file's SHA-256 fingerprint,
 * whether a scrambled IP is kept and the description for the police), never the scrambled IP
 * itself: that goes to the police in the evidence pack. The actions are in EvidenceActions.
 * Shows nothing for a case without evidence. Plain staff components, no doodles.
 * Who shows it: CasePage, inside the safeguarding section. What it calls: useAbuseImageEvidence.
 */
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { LabelRows } from '@/components/ui/LabelRows';
import { Notice } from '@/components/ui/Notice';

import type { AbuseImageEvidence } from '../api/abuseImageEvidence';
import { useAbuseImageEvidence } from '../hooks/useAbuseImageEvidence';

import { EvidenceActions } from './EvidenceActions';

/**
 * The label rows for the evidence.
 *
 * @param evidence - the evidence
 * @param t - the moderation translations
 * @param format - the date and time format, in Romania time
 * @returns the rows
 */
function factRows(
  evidence: AbuseImageEvidence,
  t: TFunction<'moderation'>,
  format: Intl.DateTimeFormat,
) {
  const ipValue = evidence.hasScrambledIp
    ? t('abuseEvidence.ipKept', { period: evidence.ipPeriod ?? '' })
    : t('abuseEvidence.notRecorded');
  const holdValue = evidence.legalHold
    ? t('abuseEvidence.holdOn', { reason: evidence.legalHoldReason ?? '' })
    : t('abuseEvidence.holdOff');
  return [
    { label: t('abuseEvidence.source'), value: t(`abuseEvidence.sources.${evidence.source}`) },
    { label: t('abuseEvidence.uploadedAt'), value: format.format(new Date(evidence.uploadedAt)) },
    { label: t('abuseEvidence.reportedAt'), value: format.format(new Date(evidence.reportedAt)) },
    {
      label: t('abuseEvidence.hash'),
      value: (
        <code className="[overflow-wrap:anywhere]">
          {evidence.fileSha256 ?? t('abuseEvidence.notRecorded')}
        </code>
      ),
    },
    { label: t('abuseEvidence.ip'), value: ipValue },
    { label: t('abuseEvidence.description'), value: evidence.description },
    { label: t('abuseEvidence.keepUntil'), value: format.format(new Date(evidence.keepUntil)) },
    { label: t('abuseEvidence.legalHold'), value: holdValue },
  ];
}

/**
 * Renders the panel, or nothing when the case has no evidence.
 *
 * @param props.caseId - the case
 * @returns the panel, or null
 */
export function AbuseImageEvidencePanel({ caseId }: { caseId: string }) {
  const { t, i18n } = useTranslation('moderation');
  const state = useAbuseImageEvidence(caseId);
  if (state.failure !== null) {
    return <Notice tone="error">{t(`failures.${state.failure}`)}</Notice>;
  }
  if (state.evidence === null) return null;
  const format = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Bucharest',
  });
  return (
    <section aria-labelledby="abuse-evidence-heading" className="flex flex-col gap-3">
      <h3 id="abuse-evidence-heading" className="m-0 text-base font-semibold text-heading">
        {t('abuseEvidence.heading')}
      </h3>
      <p className="m-0 text-sm text-body">{t('abuseEvidence.intro')}</p>
      <LabelRows rows={factRows(state.evidence, t, format)} />
      <EvidenceActions caseId={caseId} evidence={state.evidence} state={state} />
    </section>
  );
}
