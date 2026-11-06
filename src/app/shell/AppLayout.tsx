/**
 * AppLayout: the frame around every public page: skip link, top bar, the page, footer
 * (story S1-E1-03).
 *
 * Who uses it: the router (src/app/router.tsx) wraps every public route in it; the page itself
 * appears where <Outlet /> is. The admin site gets its own frame with the staff bar (S1-E11-01).
 * Language (S1-E1-04): the English / Română drop-down sits in both the top bar and the footer
 * (Q11), and useAccountLanguage shows a signed-in person's account language on every device.
 * Accessibility: the first thing a keyboard user reaches is "Skip to content", which jumps past the
 * top bar to the page (WCAG 2.2, 2.4.1 Bypass blocks). The page sits in the one <main> landmark.
 * Legal updates (S1-E14-01): LegalUpdateNotice sits at the top of <main> on every page and shows
 * "We've updated our Terms" when a signed-in person must accept a new version before posting.
 * Usernames (S1-E2-04): SetupProfileNotice sits under it and links a signed-in person without a
 * username to /setup.
 * Age check (S1-E2-08): AgeCheckNotice sits under that and links an account that waits for an age
 * check to /age-check.
 * Parental consent (S1-E2-03): ParentConsentNotice sits under that and links an under-16 whose
 * account waits for a parent or guardian to /parent-consent.
 * Error, offline and maintenance states (S1-E1-05): OfflineBanner sits under the top bar;
 * MaintenanceGate swaps the notices and the page for the maintenance page while maintenance mode is
 * on (staff and the log-in pages excepted); useTrackRoutePattern remembers which page is on screen
 * for error reports, as a pattern such as "/join/:code", never the address itself.
 * Notifications (S1-E7-01): the bell with the unread count sits before "Write" while signed in.
 * Pictures (S1-E10-05): usePendingPictureRetry asks once per signed-in visit for the check of any
 * picture whose services were down when it was uploaded.
 * The account notices (Terms, the country question, username, age check, consent and sanctions)
 * live in AccountNotices, at the top of <main> (MARKETS-1 split them out).
 * Deleting an account (S1-E13-03): AccountClosingGate swaps the notices and the page for the
 * closing-account page ("Keep my account" or "Log out") while the account waits to be deleted.
 */
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { AccountClosingGate } from '@/features/account-deletion/components/AccountClosingGate';
import { AccountLinks } from '@/features/auth/components/AccountLinks';
import { BrandTabIcon } from '@/features/branding/components/BrandTabIcon';
import { LanguageSelect } from '@/features/language/components/LanguageSelect';
import { useTrackRoutePattern } from '@/features/errors/hooks/useTrackRoutePattern';
import { useAccountLanguage } from '@/features/language/hooks/useAccountLanguage';
import { MaintenanceGate } from '@/features/maintenance/components/MaintenanceGate';
import { MessagesNavLink } from '@/features/messages/components/MessagesNavLink';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { OfflineBanner } from '@/features/offline/components/OfflineBanner';
import { PresenceHeartbeat } from '@/features/privacy/components/PresenceHeartbeat';
import { useSession } from '@/features/auth/hooks/useSession';
import { usePendingPictureRetry } from '@/features/pictures/hooks/usePictures';
import { NoticeStrip } from '@/features/website/components/NoticeStrip';
import { WriteLink } from '@/features/writing/components/WriteLink';

import { AccountNotices } from './AccountNotices';
import { Footer } from './Footer';
import { TopBar } from './TopBar';

/**
 * Renders the frame and the current page inside it.
 *
 * @returns the whole page layout
 */
export function AppLayout() {
  const { t } = useTranslation();
  // Show a signed-in person's account language, whichever device they are on.
  useAccountLanguage();
  // Remember the page on screen for error reports (S1-E1-05).
  useTrackRoutePattern();
  // Check again any picture whose check couldn't run when it was uploaded (S1-E10-05).
  const { userId } = useSession();
  usePendingPictureRetry(userId);

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <a
        href="#main"
        className="sr-only z-20 rounded-full bg-surface px-4 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {t('shell.skipToContent')}
      </a>
      {/* The approved emblem in the browser tab (BRAND-1b). */}
      <BrandTabIcon />
      <TopBar
        // Messages with its unread count, while signed in (S1-E9-01).
        navigationEnd={<MessagesNavLink />}
        endSlot={
          <>
            <LanguageSelect id="language-select-top" />
            {/* The bell with the unread count, while signed in (S1-E7-01). */}
            <NotificationBell />
            {/* "Write", while signed in (S1-E3-01). */}
            <WriteLink />
            {/* "Join for free" while signed out (S1-E2-01). */}
            <AccountLinks />
          </>
        }
      />
      {/* "You're offline" and "You're back online" (S1-E1-05). */}
      <OfflineBanner />
      {/* The notice banner staff publish from Website › Notice banners (S1-E11-10). */}
      <NoticeStrip />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* While maintenance mode is on, the maintenance page replaces all of this (S1-E1-05). */}
        <MaintenanceGate>
          {/* While the account waits to be deleted, the closing page replaces the rest (S1-E13-03). */}
          <AccountClosingGate>
            {/* The account notices: Terms, country, username, age check, consent, sanctions. */}
            <AccountNotices />
            <Outlet />
          </AccountClosingGate>
        </MaintenanceGate>
      </main>
      {/* "Show when I'm online": a beat a minute, only while switched on (S1-E13-01). */}
      <PresenceHeartbeat />
      <Footer endSlot={<LanguageSelect id="language-select-footer" isLabelVisible />} />
    </div>
  );
}
