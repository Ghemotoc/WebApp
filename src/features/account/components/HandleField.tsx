/**
 * HandleField: the username field with the live "is it free?" line (story S1-E2-04; board 2.5).
 *
 * Board values: the 44 px pill field with an "@" in front of the name; under it the status line
 * ("@lia.writes is free." in green, a refusal in red) and the hint. The "@" is drawn, not typed,
 * and hidden from screen readers; the label says "Username".
 * The status line is a polite live region, so a screen reader hears the answer once the check
 * finishes, without moving focus. The hint and the status are linked with aria-describedby.
 * Who uses it: SetupForm (onboarding step 1) and AccountNamesSection. What it calls: hooks/useHandleCheck.ts.
 */
import { useTranslation } from 'react-i18next';

import { normaliseTypedText } from '@/lib/romanian-text';
import { cn } from '@/lib/utils';

import { useHandleCheck } from '../hooks/useHandleCheck';
import type { HandleOutcome } from '../lib/nameRules';
import { canAskForReview, refusalMessage } from '../lib/outcomeMessages';

import { AskForReviewLink } from './AskForReviewLink';

/** What the field needs. */
export interface HandleFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** The person's username now (null before setup): it needs no check. */
  currentHandle: string | null;
  /** What saving answered, when it refused; it wins over the live check. */
  savedOutcome: HandleOutcome | null;
  waitingDays: number;
  hint: string;
}

/**
 * The status line's text and whether it is good news.
 *
 * @returns the text (empty when there is nothing to say) and its tone
 */
function useStatus({ value, currentHandle, savedOutcome, waitingDays }: HandleFieldProps) {
  const { t } = useTranslation('account');
  const check = useHandleCheck(value, currentHandle);
  const outcome = savedOutcome ?? check.outcome;
  if (outcome !== null && outcome !== 'ok') {
    return { text: refusalMessage(t, 'handle', outcome, waitingDays), isGood: false, outcome };
  }
  if (outcome === 'ok') return { text: t('handle.free', { handle: value }), isGood: true, outcome };
  if (check.checkFailed) return { text: t('handle.checkFailed'), isGood: false, outcome };
  if (check.isChecking) return { text: t('handle.checking'), isGood: true, outcome };
  return { text: '', isGood: true, outcome };
}

/**
 * Renders the label, the field, the status line and the hint.
 *
 * @returns the field group
 */
export function HandleField(props: HandleFieldProps) {
  const { t } = useTranslation('account');
  const { id, value, onChange, hint } = props;
  const status = useStatus(props);
  const isRefused = status.outcome !== null && status.outcome !== 'ok';

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {t('handle.label')}
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[15px] text-meta"
        >
          @
        </span>
        <input
          id={id}
          value={value}
          onChange={(event) => {
            // Typed ş and ţ become ș and ț, as in every text field (CLAUDE.md rule 4).
            normaliseTypedText(event.target);
            onChange(event.target.value);
          }}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={`${id}-status ${id}-hint`}
          aria-invalid={isRefused ? true : undefined}
          className={cn(
            'h-11 w-full rounded-full border border-control-border bg-surface pr-4 pl-8 font-body text-[15px] text-ink',
            isRefused && 'border-destructive',
          )}
        />
      </div>
      <p
        id={`${id}-status`}
        aria-live="polite"
        className={cn(
          'm-0 min-h-5 text-sm font-semibold',
          status.isGood ? 'text-(--success-text)' : 'text-destructive',
        )}
      >
        {status.text}
      </p>
      {canAskForReview(status.outcome) && <AskForReviewLink name={value} />}
      <p id={`${id}-hint`} className="m-0 text-[13px] text-meta">
        {hint}
      </p>
    </div>
  );
}
