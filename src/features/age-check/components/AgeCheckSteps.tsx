/**
 * AgeCheckSteps: the "How it works" card beside the age check (story S1-E2-08, part 08a; board
 * AgeCheck.dc.html, "Three short steps").
 *
 * Who shows it: AgeCheckPage. What it calls: nothing. The read-only line and the 14-day line say
 * what the database does: account_state() and erase_unchecked_accounts() (part 08b).
 */
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';

/** The three steps' text keys, in order. */
const stepKeys = ['ageCheck.step1', 'ageCheck.step2', 'ageCheck.step3'] as const;

/**
 * Renders the card.
 *
 * @returns the numbered steps and the read-only line
 */
export function AgeCheckSteps() {
  const { t } = useTranslation('account');
  return (
    <section
      aria-labelledby="age-check-steps-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-[clamp(20px,5vw,28px)]"
    >
      <div className="flex flex-col gap-1">
        <Eyebrow>{t('ageCheck.howEyebrow')}</Eyebrow>
        <h2
          id="age-check-steps-heading"
          className="m-0 font-heading text-[22px] font-bold text-heading"
        >
          {t('ageCheck.howHeading')}
        </h2>
      </div>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {stepKeys.map((key, index) => (
          <li key={key} className="flex items-start gap-3 text-body">
            {/* The number is part of the list already, so screen readers skip the drawn one. */}
            <span
              aria-hidden="true"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-tint font-semibold text-heading"
            >
              {index + 1}
            </span>
            <span className="pt-0.5">{t(key)}</span>
          </li>
        ))}
      </ol>
      <p className="m-0 text-sm text-meta">
        {t('ageCheck.readOnly')} {t('ageCheck.fourteenDays')}
      </p>
    </section>
  );
}
