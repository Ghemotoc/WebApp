/**
 * HowLongWeKeep: "How long we keep things" at the foot of Settings › Privacy (bundle IDEAS-2, part
 * a; idea IDEA-20261101-5; GDPR art. 13(2)(a)).
 *
 * A native <details> the member opens by click, tap or keyboard. Inside: how long each kind of
 * their data is kept, with the period read from the same settings the clean-up jobs use
 * (retention_periods()), so a change by staff shows the next time it is opened, with no new
 * release. Private messages have no period of their own (they stay until both people delete the
 * chat), so that line is fixed text. A link to the privacy notice says where the full list is.
 * Who shows it: PrivacySettingsSection. What it calls: useRetentionPeriods.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';

import type { RetentionPeriod } from '../api/privacy';
import { useRetentionPeriods } from '../hooks/usePrivacySettings';
import { usePrivacyTranslation } from '../registerPrivacyTranslations';

/** One kind and its period, as "Notifications: 90 days". */
function PeriodLine({ period }: { period: RetentionPeriod }) {
  const { t } = usePrivacyTranslation();
  const length = t(`keep.units.${period.unit}`, { count: period.amount });
  return (
    <li className="border-t border-hairline py-2 first:border-t-0">
      {t(`keep.kinds.${period.kind}`, { length })}
    </li>
  );
}

/** The list once it is read, a plain line if it can't be, or nothing while it loads. */
function PeriodList({ isOpen }: { isOpen: boolean }) {
  const { t } = usePrivacyTranslation();
  const periods = useRetentionPeriods(isOpen);
  if (periods.isError) return <Notice tone="error">{t('keep.loadFailed')}</Notice>;
  if (periods.data === undefined) return null;
  return (
    <ul className="m-0 flex list-none flex-col p-0 text-[15px] text-body">
      {periods.data.map((period) => (
        <PeriodLine key={period.kind} period={period} />
      ))}
      <li className="border-t border-hairline py-2">{t('keep.messages')}</li>
    </ul>
  );
}

/**
 * Renders the disclosure.
 *
 * @returns the "How long we keep things" block
 */
export function HowLongWeKeep() {
  const { t } = usePrivacyTranslation();
  // Nothing is read until the member opens it once.
  const [isOpen, setIsOpen] = useState(false);
  return (
    <details
      className="group border-t border-border pt-4"
      onToggle={(event) => setIsOpen(isOpen || event.currentTarget.open)}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-ink">
        {t('keep.heading')}
        <span aria-hidden="true" className="text-xl leading-none group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="flex flex-col gap-3 pt-2">
        <p className="m-0 text-[15px] text-body">{t('keep.intro')}</p>
        <PeriodList isOpen={isOpen} />
        <Link to="/legal/privacy" className="w-fit text-[15px] font-semibold text-link underline">
          {t('keep.fullList')}
        </Link>
      </div>
    </details>
  );
}
