/**
 * WaitlistWaveForm: "Let in a wave": the next confirmed people, oldest first, who fit the
 * filters above (bundle WAITLIST-1; Robert: "one by one or in waves, writers first, by country").
 *
 * Letting people in sends each of them the "You're in" email and can't be taken back, so the
 * button asks once more ("Let 20 people in now?") before it acts.
 * Who shows it: StaffWaitlistPage. What it calls: the page's admitWave (useStaffWaitlist).
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

/** What the form needs. */
interface WaitlistWaveFormProps {
  /** How many fit the filters now, so the size can't be larger. */
  matching: number;
  isAdmitting: boolean;
  onAdmit: (howMany: number) => void;
}

/** The largest wave the database takes. */
const largestWave = 1000;

/**
 * Renders the size, the button and the confirmation.
 *
 * @returns the form
 */
export function WaitlistWaveForm({ matching, isAdmitting, onAdmit }: WaitlistWaveFormProps) {
  const { t } = useTranslation('staff');
  const [sizeText, setSizeText] = useState('20');
  const [isConfirming, setIsConfirming] = useState(false);
  const size = Number(sizeText);
  const isSizeValid = Number.isInteger(size) && size >= 1 && size <= largestWave;

  /** First press: ask to confirm; nothing is sent yet. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSizeValid) setIsConfirming(true);
  }

  /** The confirmation: let the wave in, then close the question. */
  function confirm() {
    onAdmit(size);
    setIsConfirming(false);
  }

  return (
    <form
      aria-labelledby="waitlist-wave-heading"
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      <h2 id="waitlist-wave-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('waitlist.wave.heading')}
      </h2>
      <p className="m-0 text-sm text-body">{t('waitlist.wave.intro', { count: matching })}</p>
      <div className="flex flex-wrap items-end gap-3">
        <TextInput
          id="waitlist-wave-size"
          type="number"
          inputMode="numeric"
          label={t('waitlist.wave.sizeLabel')}
          errorMessage={isSizeValid ? undefined : t('waitlist.wave.sizeInvalid')}
          value={sizeText}
          onChange={(event) => {
            setSizeText(event.target.value);
            setIsConfirming(false);
          }}
        />
        <Button type="submit" disabled={isAdmitting || matching === 0}>
          {t('waitlist.wave.submit')}
        </Button>
      </div>
      {isConfirming && (
        <div role="alert" className="flex flex-wrap items-center gap-3">
          <p className="m-0 text-body">
            {t('waitlist.wave.confirm', { count: Math.min(size, matching) })}
          </p>
          <Button onClick={confirm} disabled={isAdmitting}>
            {t('waitlist.wave.confirmYes')}
          </Button>
          <Button variant="secondary" onClick={() => setIsConfirming(false)}>
            {t('waitlist.cancel')}
          </Button>
        </div>
      )}
    </form>
  );
}
