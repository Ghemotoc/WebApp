/**
 * SafetyChecksPanel: this month's safety contact checks, one per market country, with how many
 * contacts are still to confirm (story S1-E10-13, part b, criterion 7; Robert's canvas comment on
 * 7.3: "create a task for the support team every month").
 *
 * A check closes on its own once every contact of the country is confirmed or changed. Until the
 * support tickets exist (S1-E11-13) this panel is the task list.
 * Who shows it: SafetyContactsAdminPage. Plain components, no doodles (staff screens).
 */
import { useTranslation } from 'react-i18next';

import { InfoPill } from '@/components/ui/InfoPill';

import type { SafetyContactCheck } from '../api/staffSafetyContacts';
import { countryName } from '../lib/countries';

/**
 * One check's line.
 *
 * @returns a list item
 */
function CheckLine({ check }: { check: SafetyContactCheck }) {
  const { t, i18n } = useTranslation('safety');
  const isOpen = check.closedAt === null;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2 first:border-t-0">
      <span className="text-ink">
        {t('admin.checks.line', {
          country: countryName(check.countryCode, i18n.language),
          month: check.checkMonth.slice(0, 7),
        })}
      </span>
      {isOpen ? (
        <InfoPill tone="gold">
          {t('admin.checks.toConfirm', {
            count: check.stillToConfirm,
            total: check.contactCount,
          })}
        </InfoPill>
      ) : (
        <InfoPill tone="sage">
          {t('admin.checks.closed', { who: check.closedByHandle ?? t('admin.checks.someone') })}
        </InfoPill>
      )}
    </li>
  );
}

/**
 * Renders the panel.
 *
 * @param props.checks - the checks, open ones first
 * @returns the panel, or a line saying there are none
 */
export function SafetyChecksPanel({ checks }: { checks: SafetyContactCheck[] }) {
  const { t } = useTranslation('safety');
  return (
    <section
      aria-labelledby="safety-checks-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      <h2 id="safety-checks-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('admin.checks.heading')}
      </h2>
      <p className="m-0 text-sm text-body">{t('admin.checks.intro')}</p>
      {checks.length === 0 ? (
        <p className="m-0 text-body">{t('admin.checks.none')}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {checks.map((check) => (
            <CheckLine key={`${check.countryCode}-${check.checkMonth}`} check={check} />
          ))}
        </ul>
      )}
    </section>
  );
}
