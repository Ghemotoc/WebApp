/**
 * MarketsSection: Markets and languages on Staff › Settings (story S1-E11-05).
 *
 * Who shows it: SettingsPage. What it calls: useMarketsAdmin, then LanguagesList and MarketsList.
 */
import { useTranslation } from 'react-i18next';

import { useMarketsAdmin } from '../hooks/useMarketsAdmin';

import { LanguagesList } from './LanguagesList';
import { MarketsList } from './MarketsList';
import { SettingsFailureNotice } from './SettingsFailureNotice';
import { SettingsSection } from './SettingsSection';

/**
 * Renders the section.
 *
 * @param props.canOpenMarket - whether the signed-in person may open a market (the owner)
 * @returns the languages and the markets
 */
export function MarketsSection({ canOpenMarket }: { canOpenMarket: boolean }) {
  const { t } = useTranslation('settings');
  const state = useMarketsAdmin();
  return (
    <SettingsSection id="markets" heading={t('sections.markets')} intro={t('markets.intro')}>
      <SettingsFailureNotice failure={state.loadFailure} />
      {!state.isLoading && (
        <>
          <LanguagesList state={state} />
          <MarketsList state={state} canOpenMarket={canOpenMarket} />
        </>
      )}
    </SettingsSection>
  );
}
