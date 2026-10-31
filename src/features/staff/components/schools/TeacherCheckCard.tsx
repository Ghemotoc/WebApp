/**
 * TeacherCheckCard: one Teacher badge request waiting for staff (story S1-E2-11, criteria 5 and
 * 6; board AdminSchools 8.9, a "Verify teachers" card).
 *
 * Who shows it: TeacherChecksPage. What it shows: the name and username, when it was asked and
 * how the school confirmed: the school address's domain, or the proof. "Open the proof" logs a
 * sensitive read and opens the file for a minute in a new tab; only then can staff decide. The
 * decision deletes the proof first (TeacherChecksPage → useTeacherChecks). Plain staff
 * component, no doodles.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { Button } from '@/components/ui/Button';
import { LabelRows } from '@/components/ui/LabelRows';
import { formatRomaniaDateTime } from '@/lib/romania-time';

import type { TeacherCheckRequest, TeacherDecision } from '../../api/teacherChecks';

import { TeacherDecisionPanel } from './TeacherDecisionPanel';

/** What the card needs. */
export interface TeacherCheckCardProps {
  request: TeacherCheckRequest;
  isBusy: boolean;
  onOpenProof: (checkId: string) => Promise<{ path: string; url: string }>;
  onDecide: (
    decision: TeacherDecision,
    reason: string,
    proofPath: string | null,
  ) => Promise<unknown>;
}

/**
 * The "How the school confirmed" line.
 *
 * @returns the text
 */
function howConfirmed(request: TeacherCheckRequest, t: TFunction<'staff'>) {
  if (request.way === 'school_email') {
    return t('teacherChecks.byEmail', { domain: request.schoolDomain ?? '' });
  }
  return t('teacherChecks.byProof');
}

/**
 * Renders the card.
 *
 * @returns the request with its proof button and decision panel
 */
export function TeacherCheckCard({
  request,
  isBusy,
  onOpenProof,
  onDecide,
}: TeacherCheckCardProps) {
  const { t, i18n } = useTranslation('staff');
  const [proofPath, setProofPath] = useState<string | null>(null);
  const [isOpenFailed, setIsOpenFailed] = useState(false);
  const rows = [
    {
      label: t('teacherChecks.asked'),
      value: formatRomaniaDateTime(new Date(request.requestedAt), i18n.language),
    },
    { label: t('teacherChecks.how'), value: howConfirmed(request, t) },
  ];

  /** Logs the opening, then shows the file in a new tab. */
  async function openProof() {
    setIsOpenFailed(false);
    try {
      const opened = await onOpenProof(request.checkId);
      setProofPath(opened.path);
      window.open(opened.url, '_blank', 'noopener,noreferrer');
    } catch {
      setIsOpenFailed(true);
    }
  }

  return (
    <li className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="m-0 font-heading text-[20px] font-bold text-heading">
          {request.displayName}
        </h2>
        <p className="m-0 text-sm text-meta">@{request.handle ?? ''}</p>
      </div>
      <LabelRows rows={rows} />
      {request.hasProof && (
        <div className="flex flex-col gap-2">
          <Button variant="secondary" className="self-start" onClick={() => void openProof()}>
            {t('teacherChecks.openProof')}
          </Button>
          <p className="m-0 text-sm text-meta" aria-live="polite">
            {isOpenFailed ? t('teacherChecks.failures.unreachable') : t('teacherChecks.proofNote')}
          </p>
        </div>
      )}
      <TeacherDecisionPanel
        checkId={request.checkId}
        isBusy={isBusy}
        canDecide={!request.hasProof || proofPath !== null}
        onDecide={(decision, reason) => onDecide(decision, reason, proofPath)}
      />
    </li>
  );
}
