/**
 * LanguagesList: each language with how many moderators read it and its status (story S1-E11-05,
 * criteria 1, 2 and 6).
 *
 * The status is a row of chips (Open, Ready to open, Closed) that saves when one is picked; the
 * database refuses opening a language no moderator reads and closing an interface language, and
 * the row says why. Who shows it: MarketsSection. What it calls: the change() of useMarketsAdmin.
 */
import { useTranslation } from 'react-i18next';

import { ChoiceChips } from '@/components/ui/ChoiceChips';

import type { LanguageRow, OpeningStatus } from '../api/marketsAdmin';
import type { MarketsAdminState } from '../hooks/useMarketsAdmin';
import { languageNameOf, openingStatuses } from '../lib/marketNames';

import { SettingsFailureNotice } from './SettingsFailureNotice';
import { errorShownByHook } from '@/lib/errorShownByHook';

/**
 * One language with its details and status chips.
 *
 * @returns the list item
 */
function LanguageItem({ language, state }: { language: LanguageRow; state: MarketsAdminState }) {
  const { t, i18n } = useTranslation('settings');
  const name = languageNameOf(language.code, i18n.language);
  const failed =
    state.failedChange?.kind === 'language' && state.failedChange.code === language.code;
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-card border border-border p-4">
      <h4 className="m-0 text-base font-bold text-heading">{name}</h4>
      <p className="m-0 text-sm text-body">
        {language.isInterface ? t('markets.interface') : t('markets.storiesOnly')} ·{' '}
        {language.moderators === 0
          ? t('markets.noModerators')
          : t('markets.moderators', { count: language.moderators })}
      </p>
      <ChoiceChips
        label={t('markets.statusLabel', { name })}
        value={language.status}
        options={openingStatuses.map((status) => ({
          value: status,
          label: t(`markets.statuses.${status}`),
          // The interface languages stay open: every screen is written in them.
          isDisabled: state.isChanging || (language.isInterface && status !== 'open'),
        }))}
        onChange={(status) =>
          void state
            .change({ kind: 'language', code: language.code, status: status as OpeningStatus })
            .catch(errorShownByHook)
        }
      />
      {failed && <SettingsFailureNotice failure={state.changeFailure} />}
    </li>
  );
}

/**
 * Renders the languages.
 *
 * @param props.state - the markets hook's state
 * @returns the list
 */
export function LanguagesList({ state }: { state: MarketsAdminState }) {
  const { t } = useTranslation('settings');
  return (
    <div className="flex flex-col gap-3">
      <h3 className="m-0 font-heading text-lg font-bold text-heading">
        {t('markets.languagesHeading')}
      </h3>
      <p className="m-0 text-sm text-body">{t('markets.languagesNote')}</p>
      <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
        {state.languages.map((language) => (
          <LanguageItem key={language.code} language={language} state={state} />
        ))}
      </ul>
    </div>
  );
}
