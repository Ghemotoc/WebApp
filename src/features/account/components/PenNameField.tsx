/**
 * PenNameField: the optional pen name field (story S1-E2-04; board 2.5).
 *
 * The rules the form can answer at once (length, invisible characters) show as the person types;
 * the word checks run when they save, and a refusal from saving shows here too.
 * Who uses it: SetupForm (onboarding step 1) and AccountNamesSection. It wraps the shared TextInput.
 */
import { useTranslation } from 'react-i18next';

import { TextInput } from '@/components/ui/TextInput';

import { quickPenNameProblem, type PenNameOutcome } from '../lib/nameRules';
import { canAskForReview, refusalMessage } from '../lib/outcomeMessages';

import { AskForReviewLink } from './AskForReviewLink';

/** What the field needs. */
export interface PenNameFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** What saving answered, when it refused. */
  savedOutcome: PenNameOutcome | null;
  waitingDays: number;
  hint: string;
}

/**
 * Renders the field with its hint and any refusal.
 *
 * @returns the field group
 */
export function PenNameField({
  id,
  value,
  onChange,
  savedOutcome,
  waitingDays,
  hint,
}: PenNameFieldProps) {
  const { t } = useTranslation('account');
  const outcome = savedOutcome ?? quickPenNameProblem(value);
  const errorMessage =
    outcome === null || outcome === 'ok'
      ? undefined
      : refusalMessage(t, 'penName', outcome, waitingDays);

  return (
    <div className="flex flex-col gap-1.5">
      <TextInput
        id={id}
        label={t('penName.label')}
        hint={hint}
        errorMessage={errorMessage}
        value={value}
        autoComplete="nickname"
        onChange={(event) => onChange(event.target.value)}
      />
      {canAskForReview(outcome) && <AskForReviewLink name={value} />}
    </div>
  );
}
