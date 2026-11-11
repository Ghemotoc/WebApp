/**
 * SettingsGroupPanel: the panels of one Settings group (bundle PROFILE-1, 6 Nov 2026; Robert,
 * 11:21 UTC: Settings was "very long, you need to scroll a lot").
 *
 * Which panels sit in which group, in menu order:
 * - Profile: the Account panel (username, pen name and country), About you, Your avatar, Forum
 *   signature, What you like, Birthday and the Teacher badge;
 * - Appearance: the theme, light or night mode and the seasonal looks (bundle G2 THEMES);
 * - Language: the interface language and the reading languages (MARKETS-2c);
 * - Email and sign-in (key "account"): email address, ways to log in (hidden while their flags
 *   are off), signed-in devices and Canva;
 * - Privacy (with what a parent agreed to, and Blocked accounts); Notifications; Messages;
 * - Download my data (with data requests); Help and support (support requests and the Legal
 *   centre); Delete account.
 * The anchors other screens link to are listed per group in lib/settingsGroups.ts; keep the two
 * in step. Only the open group is drawn, so the others don't load their data.
 * Who shows it: SettingsPage. What it calls: each feature's settings panel.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { CanvaSettingsSection } from '@/features/canva/components/CanvaSettingsSection';
import { DeleteAccountSection } from '@/features/account-deletion/components/DeleteAccountSection';
import { DownloadMyDataSection } from '@/features/data-export/components/DownloadMyDataSection';
import { MyDataRequestsSection } from '@/features/data-requests/components/MyDataRequestsSection';
import { SignatureSettingsSection } from '@/features/forums/components/SignatureSettingsSection';
import { MessageSettingsSection } from '@/features/messages/components/MessageSettingsSection';
import { ParentConsentSummary } from '@/features/parent-consent/components/ParentConsentSummary';
import { LikesSettingsSection } from '@/features/onboarding/components/LikesSettingsSection';
import { NotificationEmailsSection } from '@/features/notifications/components/NotificationEmailsSection';
import { AvatarBuilderSection } from '@/features/avatars/components/AvatarBuilderSection';
import { InitialsColourSection } from '@/features/avatars/components/InitialsColourSection';
import { PrivacySettingsSection } from '@/features/privacy/components/PrivacySettingsSection';
import { SupportRequestsSection } from '@/features/support/components/SupportRequestsSection';
import { TeacherBadgeSection } from '@/features/teacher-badge/components/TeacherBadgeSection';
import { AppearanceSettingsSection } from '@/features/theme/components/AppearanceSettingsSection';
import { LanguageSettingsSection } from '@/features/language/components/LanguageSettingsSection';
import { ReadingLanguagesSection } from '@/features/language/components/ReadingLanguagesSection';

import type { useMyNames } from '../hooks/useMyNames';
import type { SettingsGroupKey } from '../lib/settingsGroups';

import { AccountNamesSection } from './AccountNamesSection';
import { BioSettingsSection } from './BioSettingsSection';
import { BirthdaySettingsSection } from './BirthdaySettingsSection';
import { BlockedAccountsSection } from './BlockedAccountsSection';
import { EmailSettingsSection } from './EmailSettingsSection';
import { LegalLinksSection } from './LegalLinksSection';
import { LoginMethodsSection } from './LoginMethodsSection';
import { SignedInDevicesSection } from './SignedInDevicesSection';

/** The signed-in person's account, as useMyNames gives it once it has loaded. */
type LoadedAccount = ReturnType<typeof useMyNames>;
type LoadedNames = NonNullable<LoadedAccount['names']>;

/** What a group needs. */
export interface SettingsGroupPanelProps {
  group: SettingsGroupKey;
  account: LoadedAccount;
  names: LoadedNames;
}

/**
 * The Profile group: the parts that need a username, or a link to choose one first.
 *
 * @returns the panels
 */
function ProfileGroup({ account, names }: { account: LoadedAccount; names: LoadedNames }) {
  const { t } = useTranslation('account');
  const handle = names.handle;
  if (handle === null) {
    return (
      <>
        <p className="m-0 text-body">
          {t('settings.noHandle')}{' '}
          <Link to="/setup" className="text-link underline">
            {t('notice.action')}
          </Link>
        </p>
        <TeacherBadgeSection />
      </>
    );
  }
  return (
    <>
      <AccountNamesSection account={account} names={names} />
      <BioSettingsSection handle={handle} />
      <AvatarBuilderSection handle={handle} />
      {/* The colour of the initials bead, for anyone who keeps their initials (G11a). */}
      <InitialsColourSection handle={handle} name={names.penName ?? handle} />
      {/* The line under one's forum posts (S1-E8-08). */}
      <SignatureSettingsSection />
      {/* The county, likes and (16 and 17) adult messages chosen in setup (S1-E2-06). */}
      <LikesSettingsSection />
      <BirthdaySettingsSection />
      {/* The Teacher badge for adults (S1-E2-11): ask later, see where it stands. */}
      <TeacherBadgeSection />
    </>
  );
}

/** The groups that need nothing but the signed-in person, each with its panels. */
const plainGroups: Record<Exclude<SettingsGroupKey, 'profile'>, () => ReactNode> = {
  // The theme, mode and seasonal looks, saved on the account (bundle G2 THEMES).
  appearance: () => <AppearanceSettingsSection />,
  // The interface language; the footer has the other menu (S1-E1-04; bundle FIX-3).
  language: () => (
    <>
      <LanguageSettingsSection />
      {/* The story languages the member reads, for the story lists (MARKETS-2c). */}
      <ReadingLanguagesSection />
    </>
  ),
  account: () => (
    <>
      {/* Every signed-in account sees and can change its own address, minors included. */}
      <EmailSettingsSection />
      {/* Google, Apple, Microsoft and passkeys (S1-E2-09); hidden while their flags are off. */}
      <LoginMethodsSection />
      <SignedInDevicesSection />
      {/* Canva, while it can be used or is still connected (S1-E3-12). */}
      <CanvaSettingsSection />
    </>
  ),
  privacy: () => (
    <>
      {/* Who sees the profile and the library, and online status (S1-E13-01). */}
      <PrivacySettingsSection />
      {/* What a parent or guardian agreed to, for a member who needed it (IDEAS-2 idea 8). */}
      <ParentConsentSummary />
      <BlockedAccountsSection />
    </>
  ),
  // What we email, per kind (S1-E7-02); every email's footer links to it.
  notifications: () => <NotificationEmailsSection />,
  messages: () => <MessageSettingsSection />,
  'download-my-data': () => (
    <>
      {/* A copy of everything about the account, as one ZIP (S1-E13-02). */}
      <DownloadMyDataSection />
      {/* Requests about the person's data, and "Was it you?" (S1-E11-09; ADMIN-2c1). */}
      <MyDataRequestsSection />
    </>
  ),
  support: () => (
    <>
      {/* Asking the support team for help, and their answers (S1-E11-13; ADMIN-2h1). */}
      <SupportRequestsSection />
      <LegalLinksSection />
    </>
  ),
  // Close the account now, deleted for good 14 days later (S1-E13-03).
  'delete-account': () => <DeleteAccountSection />,
};

/**
 * Renders the open group's panels.
 *
 * @returns the panels
 */
export function SettingsGroupPanel({ group, account, names }: SettingsGroupPanelProps) {
  if (group === 'profile') return <ProfileGroup account={account} names={names} />;
  return <>{plainGroups[group]()}</>;
}
