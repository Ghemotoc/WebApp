/**
 * ParentAnswerForm: "I'm this child's parent or legal guardian", then "I agree" or "I don't agree"
 * (story S1-E2-03, criteria 2 and 3; board ParentConsent.dc.html, the bottom of the right side).
 *
 * Who shows it: ParentAnswerPage, while the request waits for an answer.
 * What it calls: onAnswer(decision, isGuardian), which useConsentRequest posts to our server.
 * "I agree" needs the box ticked (the shared schema checks it again on the server); "I don't
 * agree" doesn't, because saying no must never be harder than saying yes.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { formatRomaniaDate } from '@/lib/romania-time';

import type { ConsentFailure } from '../../../schemas/parentConsent';

/** What the form needs. */
export interface ParentAnswerFormProps {
  /** When the account is erased if nobody agrees. */
  deadline: string;
  isAnswering: boolean;
  failure: ConsentFailure | null;
  onAnswer: (decision: 'agree' | 'refuse', isGuardian: boolean) => void;
}

/**
 * The guardian box and, when it was needed but not ticked, the line saying so.
 *
 * @returns the checkbox row
 */
function GuardianCheckbox(props: {
  isChecked: boolean;
  isMissing: boolean;
  onChange: (isChecked: boolean) => void;
}) {
  const { t } = useTranslation('account');
  const errorId = props.isMissing ? 'parent-consent-guardian-error' : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-3">
        <input
          id="parent-consent-guardian"
          type="checkbox"
          checked={props.isChecked}
          aria-describedby={errorId}
          aria-invalid={props.isMissing ? true : undefined}
          onChange={(event) => props.onChange(event.target.checked)}
          className="mt-0.5 size-6 shrink-0 cursor-pointer accent-(--link)"
        />
        <label htmlFor="parent-consent-guardian" className="text-[15px] text-body">
          {t('parentConsent.parent.guardian')}
        </label>
      </div>
      {props.isMissing && (
        <p id={errorId} className="m-0 text-sm text-destructive">
          {t('parentConsent.parent.guardianNeeded')}
        </p>
      )}
    </div>
  );
}

/**
 * Renders the form.
 *
 * @returns the box, the two buttons, the deadline and any failure
 */
export function ParentAnswerForm({
  deadline,
  isAnswering,
  failure,
  onAnswer,
}: ParentAnswerFormProps) {
  const { t, i18n } = useTranslation('account');
  const [isGuardian, setIsGuardian] = useState(false);
  const [isGuardianMissing, setIsGuardianMissing] = useState(false);

  /** A yes needs the box; a no never does. */
  function answer(decision: 'agree' | 'refuse') {
    const isMissing = decision === 'agree' && !isGuardian;
    setIsGuardianMissing(isMissing);
    if (!isMissing) onAnswer(decision, isGuardian);
  }

  const date = formatRomaniaDate(new Date(deadline), i18n.language);
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-5">
      <GuardianCheckbox
        isChecked={isGuardian}
        isMissing={isGuardianMissing}
        onChange={(isChecked) => {
          setIsGuardian(isChecked);
          if (isChecked) setIsGuardianMissing(false);
        }}
      />
      {failure !== null && <Notice tone="error">{t(`parentConsent.failures.${failure}`)}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button disabled={isAnswering} onClick={() => answer('agree')}>
          {t('parentConsent.parent.agree')}
        </Button>
        <Button variant="secondary" disabled={isAnswering} onClick={() => answer('refuse')}>
          {t('parentConsent.parent.disagree')}
        </Button>
      </div>
      <p className="m-0 text-sm text-meta">{t('parentConsent.parent.deadline', { date })}</p>
    </div>
  );
}
