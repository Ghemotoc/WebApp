/**
 * SettingsPage: Settings, screen 6.3 (story S1-E2-04 starts it; design/boards/Settings.dc.html;
 * split into groups with a side menu by bundle PROFILE-1, 6 Nov 2026: Robert, 11:21 UTC, "it's
 * very long, you need to scroll a lot, so I will need it to be compartmentalized a bit better").
 *
 * Who shows it: the router, at /settings; the top bar links here while signed in.
 * What it shows: "Signed in as …", a moderator's question about one of the person's reports when
 * there is one (S1-E10-08; above the menu, so it is never missed), then the menu
 * (SettingsNav) and the open group's panels (SettingsGroupPanel, which lists them). The address
 * says which group is open (/settings#privacy) and every older link to a panel
 * (/settings#teacher-badge) opens its group (hooks/useSettingsGroup.ts). The board's other tabs
 * (Language, My certificates) arrive with their stories, so only what works is shown
 * (docs/board-fixes.md).
 * Signed out, it says to log in; without a username, Profile links to setup.
 */
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { ReportQuestionsSection } from '@/features/reporting/components/ReportQuestionsSection';

import { settingsPanelId, useSettingsGroup } from '../hooks/useSettingsGroup';
import { useMyNames } from '../hooks/useMyNames';
import { displayName } from '../lib/nameRules';

import { SettingsGroupPanel } from './SettingsGroupPanel';
import { SettingsNav } from './SettingsNav';

/**
 * The menu and the open group, side by side on a wide screen and stacked on a narrow one.
 *
 * @param props.account - useMyNames's result, loaded
 * @returns the menu and the panel
 */
function SettingsGroups({ account }: { account: ReturnType<typeof useMyNames> }) {
  const { group } = useSettingsGroup();
  const panel = useRef<HTMLDivElement>(null);
  const { names } = account;
  if (names === null) return null;

  /** After a pick, the focus moves to the group, so a keyboard or screen reader user lands there. */
  function focusPanel() {
    window.requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <SettingsNav open={group} onPick={focusPanel} />
      {/* Not a named region: each panel inside is one already, with the same names as the menu. */}
      <div
        ref={panel}
        id={settingsPanelId}
        tabIndex={-1}
        className="flex min-w-0 flex-[999_1_560px] flex-col gap-6 outline-none"
      >
        <SettingsGroupPanel group={group} account={account} names={names} />
      </div>
    </div>
  );
}

/**
 * What goes under the heading: a wait, a message, or the groups.
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
      {names.handle !== null && (
        <p className="m-0 text-body">
          {t('settings.signedInAs', {
            name: displayName(names.handle, names.penName),
            handle: names.handle,
          })}
        </p>
      )}
      {/* A moderator's question about one of the person's reports (S1-E10-08). */}
      <div className="max-w-[720px] empty:hidden">
        <ReportQuestionsSection />
      </div>
      <SettingsGroups account={account} />
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
      <SettingsBody account={account} />
    </PageContainer>
  );
}
