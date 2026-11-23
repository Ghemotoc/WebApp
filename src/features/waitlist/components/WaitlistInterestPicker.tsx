/**
 * WaitlistInterestPicker: "What do you want to do here?" on the holding page, where someone
 * waiting can change the answer they gave at sign-up (bundle WAITLIST-1). It sits in the first
 * step of the profile wizard (CALM-9 H08), whose title asks the question, so its own label is
 * for screen readers only.
 *
 * The choice saves as soon as it changes, and says so ("Saved") or that it couldn't save, in a
 * polite live region. Who shows it: WaitlistProfileSteps. What it calls: useSaveMyWaitlistInterest.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';

import type { WaitlistInterest } from '../api/waitlist';
import { useSaveMyWaitlistInterest } from '../hooks/useMyWaitlist';

/** The choices, in the order the question reads. */
const interests: WaitlistInterest[] = ['write', 'read', 'both'];

/**
 * Renders the question with the saved answer chosen.
 *
 * @param props.interest - the answer saved now
 * @returns the chips and the save state
 */
export function WaitlistInterestPicker({ interest }: { interest: WaitlistInterest }) {
  const { t } = useTranslation('account');
  const save = useSaveMyWaitlistInterest();
  // The chosen chip follows the click at once; the saved answer catches up after the save.
  const [chosen, setChosen] = useState<WaitlistInterest>(interest);

  /** Picks and saves an answer. */
  function choose(value: string) {
    const wanted = value as WaitlistInterest;
    setChosen(wanted);
    save.mutate(wanted);
  }

  return (
    <div className="flex flex-col gap-2">
      <ChoiceChips
        label={t('waitlist.holding.interestLabel')}
        isLabelVisible={false}
        options={interests.map((value) => ({ value, label: t(`waitlist.interest.${value}`) }))}
        value={chosen}
        onChange={choose}
      />
      <p aria-live="polite" className="m-0 min-h-5 type-body">
        {save.isSuccess && <span className="text-ink-muted">{t('waitlist.holding.saved')}</span>}
        {save.isError && (
          <span className="text-destructive">{t('waitlist.holding.saveFailed')}</span>
        )}
      </p>
    </div>
  );
}
