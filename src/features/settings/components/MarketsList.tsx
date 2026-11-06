/**
 * MarketsList: each market with its languages, its minimum age, its legal check and its status
 * (story S1-E11-05, criteria 1, 3 and 4).
 *
 * The legal check is a drop-down and the status a row of chips; each saves when changed. Only the
 * owner may pick Open for a closed market (architecture 1.8.3), so for anyone else that chip is
 * disabled; the database checks it again. Who shows it: MarketsSection. What it calls: the
 * change() of useMarketsAdmin.
 */
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Select } from '@/components/ui/Select';
import { countryName } from '@/features/safety/lib/countries';

import type { LegalCheckStatus, MarketRow, OpeningStatus } from '../api/marketsAdmin';
import type { MarketsAdminState } from '../hooks/useMarketsAdmin';
import { languageNameOf, openingStatuses } from '../lib/marketNames';

import { SettingsFailureNotice } from './SettingsFailureNotice';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** The legal check's steps, in order. */
const legalChecks: LegalCheckStatus[] = ['not_started', 'in_progress', 'done'];

/** What one market row needs. */
interface MarketItemProps {
  market: MarketRow;
  state: MarketsAdminState;
  canOpenMarket: boolean;
}

/**
 * One market with its details, legal check and status.
 *
 * @returns the list item
 */
function MarketItem({ market, state, canOpenMarket }: MarketItemProps) {
  const { t, i18n } = useTranslation('settings');
  const name = countryName(market.countryCode, i18n.language);
  const languages = market.languages.map((code) => languageNameOf(code, i18n.language)).join(', ');
  const failed =
    state.failedChange?.kind === 'market' &&
    state.failedChange.market.countryCode === market.countryCode;
  const save = (status: OpeningStatus, legalCheck: LegalCheckStatus) =>
    void state
      .change({ kind: 'market', market: { countryCode: market.countryCode, status, legalCheck } })
      .catch(errorShownByHook);
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-card border border-border p-4">
      <h4 className="m-0 text-base font-bold text-heading">{name}</h4>
      <p className="m-0 text-sm text-body">
        {t('markets.marketLanguages', { list: languages })} ·{' '}
        {t('markets.minimumAge', { age: market.minimumAge })}
      </p>
      <Select
        id={`market-legal-${market.countryCode}`}
        label={t('markets.legalLabel', { name })}
        isLabelVisible
        value={market.legalCheck}
        onChange={(value) => save(market.status, value as LegalCheckStatus)}
        options={legalChecks.map((check) => ({
          value: check,
          label: t(`markets.legalChecks.${check}`),
        }))}
      />
      <ChoiceChips
        label={t('markets.statusLabel', { name })}
        isLabelVisible
        value={market.status}
        onChange={(status) => save(status as OpeningStatus, market.legalCheck)}
        options={openingStatuses.map((status) => ({
          value: status,
          label: t(`markets.statuses.${status}`),
          isDisabled:
            state.isChanging || (status === 'open' && market.status !== 'open' && !canOpenMarket),
        }))}
      />
      {failed && <SettingsFailureNotice failure={state.changeFailure} />}
    </li>
  );
}

/**
 * Renders the markets.
 *
 * @returns the list
 */
export function MarketsList(props: { state: MarketsAdminState; canOpenMarket: boolean }) {
  const { t } = useTranslation('settings');
  return (
    <div className="flex flex-col gap-3">
      <h3 className="m-0 font-heading text-lg font-bold text-heading">
        {t('markets.marketsHeading')}
      </h3>
      <p className="m-0 text-sm text-body">{t('markets.marketsNote')}</p>
      <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
        {props.state.markets.map((market) => (
          <MarketItem
            key={market.countryCode}
            market={market}
            state={props.state}
            canOpenMarket={props.canOpenMarket}
          />
        ))}
      </ul>
    </div>
  );
}
