/**
 * ManualAgeCheckCard: one open manual age check (story S1-E2-08, part 08b; board AdminUsers 8.5,
 * the manual age checks panel; criterion 8).
 *
 * Who shows it: ManualAgeChecksPage. What it shows: the username, the year (and month) of birth
 * with the age group (the named exception in architecture 1.8.3), the current result, when it was
 * asked and the date to answer by (5 working days), and each finished check. Never a picture or a
 * document; we never had one. "Decide" opens ManualDecisionForm. Plain staff component, no doodles.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { LabelRows } from '@/components/ui/LabelRows';
import { formatRomaniaDate, formatRomaniaDateTime } from '@/lib/romania-time';

import type {
  AgeCheckAttempt,
  ManualAgeCheckRequest,
  ManualDecision,
} from '../../api/manualAgeChecks';

import { ManualDecisionForm } from './ManualDecisionForm';

/** What the card needs. */
export interface ManualAgeCheckCardProps {
  request: ManualAgeCheckRequest;
  isDeciding: boolean;
  onDecide: (decision: ManualDecision, reason: string) => Promise<unknown>;
}

/**
 * The attempt history, newest first.
 *
 * @returns the list, or a line saying there is none
 */
function AttemptList({ attempts }: { attempts: AgeCheckAttempt[] }) {
  const { t, i18n } = useTranslation('staff');
  if (attempts.length === 0) return <span>{t('manualChecks.noAttempts')}</span>;
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {attempts.map((attempt) => (
        <li key={attempt.at}>
          {t('manualChecks.attempt', {
            when: formatRomaniaDateTime(new Date(attempt.at), i18n.language),
            line: attempt.threshold,
            outcome: t(`manualChecks.outcomes.${attempt.outcome}`),
            method: t(`manualChecks.methods.${attempt.method}`),
          })}
        </li>
      ))}
    </ul>
  );
}

/**
 * The year of birth, with the month when there is one.
 *
 * @returns the text
 */
function birthText(request: ManualAgeCheckRequest, ageBand: string): string {
  const year = request.birthYear === null ? '' : String(request.birthYear);
  const month = request.birthMonth === null ? '' : ` (${String(request.birthMonth)})`;
  return `${year}${month} · ${ageBand}`;
}

/**
 * Renders the card.
 *
 * @returns the request with its decision button or form
 */
export function ManualAgeCheckCard({ request, isDeciding, onDecide }: ManualAgeCheckCardProps) {
  const { t, i18n } = useTranslation('staff');
  const [isDeciderOpen, setIsDeciderOpen] = useState(false);
  const rows = [
    {
      label: t('manualChecks.birth'),
      value: birthText(request, t(`users.ageBands.${request.ageBand}`)),
    },
    { label: t('manualChecks.result'), value: t(`users.ageChecks.${request.ageCheckResult}`) },
    {
      label: t('manualChecks.asked'),
      value: formatRomaniaDateTime(new Date(request.requestedAt), i18n.language),
    },
    {
      label: t('manualChecks.answerBy'),
      value: formatRomaniaDate(new Date(`${request.answerBy}T12:00:00Z`), i18n.language),
    },
    { label: t('manualChecks.attempts'), value: <AttemptList attempts={request.attempts} /> },
  ];

  return (
    <li className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <h2 className="m-0 font-heading text-[20px] font-bold text-heading">
        @{request.handle ?? ''}
      </h2>
      <LabelRows rows={rows} />
      {isDeciderOpen ? (
        <ManualDecisionForm
          requestId={request.requestId}
          isBusy={isDeciding}
          onDecide={onDecide}
          onCancel={() => setIsDeciderOpen(false)}
        />
      ) : (
        <Button variant="secondary" className="self-start" onClick={() => setIsDeciderOpen(true)}>
          {t('manualChecks.decide')}
        </Button>
      )}
    </li>
  );
}
