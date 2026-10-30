/**
 * SettingsPage: /staff/settings, where the owner and admins change how the platform works without
 * a new release: feature flags, values and limits, the Discover mix, rate limits, categories,
 * reserved names, the username word lists, and markets and languages (stories S1-E11-03 and
 * S1-E11-05; board AdminSettings, 8.6).
 *
 * Every change applies within a minute and is logged by the database with the before and after
 * values (criterion 1); the link at the top opens those log lines. Plain components, no doodles
 * (staff screens). Forums and support settings join this page with their own stories (FORUMS-1,
 * S1-E11-13).
 * Who shows it: the router, inside StaffLayout; the menu shows it to roles with the settings area.
 * What it calls: useSettingsAdmin, useNameRules and the sections.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useMyStaffAccess } from '@/features/staff/hooks/useMyStaffAccess';

import { useNameRules } from '../hooks/useNameRules';
import { useSettingsAdmin } from '../hooks/useSettingsAdmin';
import { registerSettingsTranslations } from '../registerSettingsTranslations';

import { CategoriesSection } from './CategoriesSection';
import { DiscoverMixEditor } from './DiscoverMixEditor';
import { FlagsSection } from './FlagsSection';
import { MarketsSection } from './MarketsSection';
import { NameWordsSection } from './NameWordsSection';
import { RateLimitsEditor } from './RateLimitsEditor';
import { ReservedNamesSection } from './ReservedNamesSection';
import { SettingsFailureNotice } from './SettingsFailureNotice';
import { ValueSettingsSection } from './ValueSettingsSection';

/** The sections, in page order, for the "On this page" links. */
const sectionIds = [
  ['flags', 'flags'],
  ['values', 'values'],
  ['discover', 'discover'],
  ['rate-limits', 'rateLimits'],
  ['categories', 'categories'],
  ['names', 'names'],
  ['words', 'words'],
  ['markets', 'markets'],
] as const;

/**
 * The links to each section.
 *
 * @returns the navigation
 */
function OnThisPage() {
  const { t } = useTranslation('settings');
  return (
    <nav aria-label={t('jumpTo')}>
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm">
        {sectionIds.map(([id, labelKey]) => (
          <li key={id}>
            <a href={`#${id}`} className="inline-flex min-h-6 items-center text-link underline">
              {t(`sections.${labelKey}`)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The reserved names and the word lists, which share one hook.
 *
 * @returns the two sections
 */
function NameRuleSections() {
  const [wordLanguage, setWordLanguage] = useState('ro');
  const [wordSearch, setWordSearch] = useState('');
  const state = useNameRules(wordLanguage, wordSearch);
  return (
    <>
      <SettingsFailureNotice failure={state.loadFailure ?? state.changeFailure} />
      <ReservedNamesSection state={state} />
      <NameWordsSection
        state={state}
        language={wordLanguage}
        search={wordSearch}
        onLanguageChange={setWordLanguage}
        onSearchChange={setWordSearch}
      />
    </>
  );
}

/**
 * The page's title block and the link to the settings' log lines.
 *
 * @returns the header
 */
function SettingsHeader() {
  const { t } = useTranslation('settings');
  return (
    <div className="flex max-w-[720px] flex-col gap-2">
      <title>{t('documentTitle')}</title>
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <h1 className="m-0 font-heading text-[34px] font-bold text-heading">{t('heading')}</h1>
      <p className="m-0 text-body">{t('intro')}</p>
      <Link
        to="/staff/audit-log?action=settings."
        className="inline-flex min-h-6 items-center text-sm text-link underline"
      >
        {t('auditLink')}
      </Link>
    </div>
  );
}

/**
 * Every section, for someone allowed to change settings.
 *
 * @returns the sections
 */
function SettingsSections({ canOpenMarket }: { canOpenMarket: boolean }) {
  const { t } = useTranslation('settings');
  const state = useSettingsAdmin();
  return (
    <>
      <OnThisPage />
      <SettingsFailureNotice failure={state.loadFailure} />
      {state.isLoading && state.loadFailure === null && (
        <p className="m-0 text-meta">{t('loading')}</p>
      )}
      {!state.isLoading && state.loadFailure === null && (
        <>
          <FlagsSection state={state} />
          <ValueSettingsSection state={state} />
          <DiscoverMixEditor state={state} />
          <RateLimitsEditor state={state} />
        </>
      )}
      <CategoriesSection />
      <NameRuleSections />
      <MarketsSection canOpenMarket={canOpenMarket} />
    </>
  );
}

/**
 * Renders the page. Staff without the settings area (a moderator who typed the address) see why
 * instead; the database refuses their changes anyway (architecture 1.8.1).
 *
 * @returns the Settings screen
 */
export function SettingsPage() {
  const { i18n } = useTranslation();
  registerSettingsTranslations(i18n);
  const { t } = useTranslation('settings');
  const { access, isKnown } = useMyStaffAccess();
  const hasArea = (area: string) =>
    access.areas.some((allowed) => allowed.area === area && allowed.access === 'act');
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <SettingsHeader />
      {isKnown && !hasArea('settings') && <Notice tone="error">{t('failures.not_allowed')}</Notice>}
      {isKnown && hasArea('settings') && (
        <SettingsSections canOpenMarket={hasArea('open_market')} />
      )}
    </PageContainer>
  );
}
