/**
 * AccountNamesSection: the Account panel of Settings, with the username and the pen name
 * (story S1-E2-04; design/boards/Settings.dc.html, Account).
 *
 * The board's "Name … only you and our team see this" row is left out on purpose: the platform
 * never collects legal names (S1-E2-04, "Legal and compliance"; CLAUDE.md rule 5). Email, year of
 * birth and the county or region come with later stories; the country setting is MARKETS-1's.
 * Who shows it: SettingsPage. The two forms save separately, so a refusal in one never loses the
 * other.
 */
import { useTranslation } from 'react-i18next';

import type { MyNames } from '../api/accountNames';
import type { useMyNames } from '../hooks/useMyNames';

import { CountrySetting } from './CountrySetting';
import { HandleSettingsForm } from './HandleSettingsForm';
import { PenNameSettingsForm } from './PenNameSettingsForm';

/** What the section needs. */
interface AccountNamesSectionProps {
  account: ReturnType<typeof useMyNames>;
  names: MyNames;
}

/**
 * Renders the panel.
 *
 * @returns the Account section
 */
export function AccountNamesSection({ account, names }: AccountNamesSectionProps) {
  const { t } = useTranslation('account');
  return (
    <section
      aria-labelledby="settings-account-heading"
      className="flex flex-col gap-6 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
    >
      <h2
        id="settings-account-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('settings.accountHeading')}
      </h2>
      <HandleSettingsForm account={account} names={names} />
      <div className="border-t border-border pt-6">
        <PenNameSettingsForm account={account} names={names} />
      </div>
      {/* The country the person lives in, which sets the ages that apply (MARKETS-1). */}
      <div className="border-t border-border pt-6">
        <CountrySetting names={names} />
      </div>
    </section>
  );
}
