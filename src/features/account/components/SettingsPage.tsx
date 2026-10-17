/**
 * SettingsPage: Settings, screen 6.3 (story S1-E2-04 starts it; design/boards/Settings.dc.html).
 *
 * Who shows it: the router, at /settings; the top bar links here while signed in.
 * What it shows today: "Signed in as …", the Account panel (username and pen name) and the Legal
 * panel. The board's other tabs (Privacy, Ways to log in, Notifications, Messages, Language,
 * Signed-in devices, My certificates) arrive with their stories (S1-E2-05, S1-E13-01, S1-E7-02 and
 * others), so only what works is shown (docs/board-fixes.md).
 * Signed out, it says to log in; without a username, it links to setup.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useMyNames } from '../hooks/useMyNames';
import { displayName } from '../lib/nameRules';

import { AccountNamesSection } from './AccountNamesSection';
import { LegalLinksSection } from './LegalLinksSection';

/**
 * What goes under the heading: a wait, a message, or the panels.
 *
 * @param props.account - useMyNames's result
 * @returns the page's body
 */
function SettingsBody({ account }: { account: ReturnType<typeof useMyNames> }) {
  const { t } = useTranslation('account');
  if (!account.isKnown) return null;
  if (!account.isSignedIn) return <p className="m-0 text-body">{t('settings.signedOut')}</p>;
  if (account.loadFailed || account.names === null) {
    return <Notice tone="error">{t('errors.loadFailed')}</Notice>;
  }
  const { names } = account;
  return (
    <>
      {names.handle === null ? (
        <p className="m-0 text-body">
          {t('settings.noHandle')}{' '}
          <Link to="/setup" className="text-link underline">
            {t('notice.action')}
          </Link>
        </p>
      ) : (
        <p className="m-0 text-body">
          {t('settings.signedInAs', {
            name: displayName(names.handle, names.penName),
            handle: names.handle,
          })}
        </p>
      )}
      {names.handle !== null && <AccountNamesSection account={account} names={names} />}
      <LegalLinksSection />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the Settings screen
 */
export function SettingsPage() {
  const { t } = useTranslation('account');
  const account = useMyNames();
  return (
    <PageContainer className="tmc-rise flex flex-col gap-6 pt-12 pb-7">
      <title>{t('settings.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('settings.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('settings.heading')}
        </h1>
      </div>
      <div className="flex max-w-[720px] flex-col gap-6">
        <SettingsBody account={account} />
      </div>
    </PageContainer>
  );
}
