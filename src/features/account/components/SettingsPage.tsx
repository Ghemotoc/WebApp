/**
 * SettingsPage: Settings, screen 6.3 (story S1-E2-04 starts it; design/boards/Settings.dc.html).
 *
 * Who shows it: the router, at /settings; the top bar links here while signed in.
 * What it shows today: "Signed in as …", the Account panel (username and pen name), "About you"
 * (the bio), the profile picture, "Forum signature" (S1-E8-08), "What you like" (the county, likes and adult messages from setup, S1-E2-06), the Email address panel (S1-E2-05, added 25 Oct 2026: only the owner sees it),
 * Ways to log in (Google, Apple, Microsoft and passkeys, S1-E2-09, while their flags are on),
 * Privacy (who sees the profile and the library, online status, S1-E13-01), Notifications (the
 * notification emails, S1-E7-02), Messages (S1-E9-04), "Blocked accounts" (S1-E5-05), Canva
 * (S1-E3-12, while it applies), Signed-in devices (S1-E2-05), Download my data (S1-E13-02), Data
 * requests (S1-E11-09, once the person has one), Your support requests (S1-E11-13),
 * Delete account (S1-E13-03) and the Legal panel. The board's
 * other tabs (Language, My certificates) arrive with their stories, so only what works is shown
 * (docs/board-fixes.md).
 * Signed out, it says to log in; without a username, it links to setup.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { CanvaSettingsSection } from '@/features/canva/components/CanvaSettingsSection';
import { DeleteAccountSection } from '@/features/account-deletion/components/DeleteAccountSection';
import { DownloadMyDataSection } from '@/features/data-export/components/DownloadMyDataSection';
import { MyDataRequestsSection } from '@/features/data-requests/components/MyDataRequestsSection';
import { SignatureSettingsSection } from '@/features/forums/components/SignatureSettingsSection';
import { MessageSettingsSection } from '@/features/messages/components/MessageSettingsSection';
import { LikesSettingsSection } from '@/features/onboarding/components/LikesSettingsSection';
import { NotificationEmailsSection } from '@/features/notifications/components/NotificationEmailsSection';
import { AvatarBuilderSection } from '@/features/avatars/components/AvatarBuilderSection';
import { PrivacySettingsSection } from '@/features/privacy/components/PrivacySettingsSection';
import { ReportQuestionsSection } from '@/features/reporting/components/ReportQuestionsSection';
import { SupportRequestsSection } from '@/features/support/components/SupportRequestsSection';
import { TeacherBadgeSection } from '@/features/teacher-badge/components/TeacherBadgeSection';

import { useMyNames } from '../hooks/useMyNames';
import { displayName } from '../lib/nameRules';

import { AccountNamesSection } from './AccountNamesSection';
import { BioSettingsSection } from './BioSettingsSection';
import { BirthdaySettingsSection } from './BirthdaySettingsSection';
import { BlockedAccountsSection } from './BlockedAccountsSection';
import { EmailSettingsSection } from './EmailSettingsSection';
import { LegalLinksSection } from './LegalLinksSection';
import { LoginMethodsSection } from './LoginMethodsSection';
import { SignedInDevicesSection } from './SignedInDevicesSection';

/**
 * The parts that need a username: names, bio, picture, forum signature and likes.
 *
 * @param props.account - useMyNames's result
 * @param props.names - the person's names
 * @param props.handle - their username
 * @returns the sections
 */
function ProfileSections({
  account,
  names,
  handle,
}: {
  account: ReturnType<typeof useMyNames>;
  names: NonNullable<ReturnType<typeof useMyNames>['names']>;
  handle: string;
}) {
  return (
    <>
      <AccountNamesSection account={account} names={names} />
      <BioSettingsSection handle={handle} />
      <AvatarBuilderSection handle={handle} />
      {/* The line under one's forum posts (S1-E8-08). */}
      <SignatureSettingsSection />
      {/* The county, likes and (16 and 17) adult messages chosen in setup (S1-E2-06). */}
      <LikesSettingsSection />
    </>
  );
}

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
      {names.handle !== null && (
        <ProfileSections account={account} names={names} handle={names.handle} />
      )}
      {/* The Teacher badge for adults (S1-E2-11): ask later, see where it stands. */}
      <TeacherBadgeSection />
      {/* Every signed-in account sees and can change its own address, minors included. */}
      <EmailSettingsSection />
      {/* Google, Apple, Microsoft and passkeys (S1-E2-09); hidden while their flags are off. */}
      <LoginMethodsSection />
      <BirthdaySettingsSection />
      {/* Who sees the profile and the library, and online status (S1-E13-01). */}
      <PrivacySettingsSection />
      {/* What we email, per kind (S1-E7-02); every email's footer links to it. */}
      <NotificationEmailsSection />
      <MessageSettingsSection />
      {/* A moderator's question about one of the person's reports (S1-E10-08). */}
      <ReportQuestionsSection />
      <BlockedAccountsSection />
      {/* Canva, while it can be used or is still connected (S1-E3-12). */}
      <CanvaSettingsSection />
      <SignedInDevicesSection />
      {/* A copy of everything about the account, as one ZIP (S1-E13-02). */}
      <DownloadMyDataSection />
      {/* Asking the support team for help, and their answers (S1-E11-13; ADMIN-2h1). */}
      <SupportRequestsSection />
      {/* Requests about the person's data, and "Was it you?" (S1-E11-09; ADMIN-2c1). */}
      <MyDataRequestsSection />
      {/* Close the account now, deleted for good 14 days later (S1-E13-03). */}
      <DeleteAccountSection />
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
