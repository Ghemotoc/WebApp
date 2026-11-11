/**
 * AppLayout: the frame around every public page: skip link, top bar, the page, footer
 * (story S1-E1-03).
 *
 * Who uses it: the router (src/app/router.tsx) wraps every public route in it; the page itself
 * appears where <Outlet /> is. The admin site gets its own frame with the staff bar (S1-E11-01).
 * Language (S1-E1-04): the English / Română drop-down sits only in the footer, and Settings has
 * a Language group (Robert, 9 Nov 2026, 12:20 UTC, bundle FIX-3; replaces Q11's "both the top
 * bar and the footer"). useAccountLanguage shows a signed-in person's account language on every device;
 * useFirstVisitLanguage shows a first-time visitor the language for their country (MARKETS-2a);
 * useAccountAppearance does the same for their mode and look (bundle G2).
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
 * Notifications (S1-E7-01): the bell with the unread count sits after "Write" while signed in
 * (bundle G4 SHELL: search, Write, bell, avatar).
 * Pictures (S1-E10-05): usePendingPictureRetry asks once per signed-in visit for the check of any
 * picture whose services were down when it was uploaded.
 * The account notices (Terms, the country question, username, age check, consent and sanctions)
 * live in AccountNotices, at the top of <main> (MARKETS-1 split them out).
 * Deleting an account (S1-E13-03): AccountClosingGate swaps the notices and the page for the
 * closing-account page ("Keep account" or "Log out") while the account waits to be deleted.
 * The waiting list (WAITLIST-1): WaitlistGate, inside it, swaps them for the holding page while
 * the signed-in person still waits for their place.
 * Narrow screens (bundle G4 SHELL; handoff "App header and tab bar"): from 1024 px every page has
 * the website TopBar. Below that, a page where a person types, edits or reads gets header A
 * (FocusHeader: Back and a title, no tab bar) and every other page gets header B (PhoneHeader)
 * with the floating TabBar; shellScreens.ts lists which is which. Only one header is drawn at a
 * time (useIsNarrowScreen), so the page never holds two "Main" navigations.
 * Every header floats over the page however far it scrolls (NAV-1, Robert, 10 Nov 2026): it is
 * sticky, and `scroll-padding-top` in src/styles/index.css keeps anchors and focus below it.
 */
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation } from 'react-router';

import { shellScreenFor } from '@/app/shellScreens';

import { AccountClosingGate } from '@/features/account-deletion/components/AccountClosingGate';
import { AccountLinks } from '@/features/auth/components/AccountLinks';
import { BrandTabIcon } from '@/features/branding/components/BrandTabIcon';
import { LanguageSelect } from '@/features/language/components/LanguageSelect';
import { useTrackRoutePattern } from '@/features/errors/hooks/useTrackRoutePattern';
import { useAccountLanguage } from '@/features/language/hooks/useAccountLanguage';
import { useFirstVisitLanguage } from '@/features/language/hooks/useFirstVisitLanguage';
import { useAccountAppearance } from '@/features/theme/hooks/useAccountAppearance';
import { MaintenanceGate } from '@/features/maintenance/components/MaintenanceGate';
import { MessagesNavLink } from '@/features/messages/components/MessagesNavLink';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { OfflineBanner } from '@/features/offline/components/OfflineBanner';
import { PresenceHeartbeat } from '@/features/privacy/components/PresenceHeartbeat';
import { useSession } from '@/features/auth/hooks/useSession';
import { usePendingPictureRetry } from '@/features/pictures/hooks/usePictures';
import { NoticeStrip } from '@/features/website/components/NoticeStrip';
import { WaitlistGate } from '@/features/waitlist/components/WaitlistGate';
import { WriteLink } from '@/features/writing/components/WriteLink';

import { AccountNotices } from './AccountNotices';
import { FocusHeader } from './FocusHeader';
import { Footer } from './Footer';
import { PhoneHeader } from './PhoneHeader';
import { TabBar } from './TabBar';
import { TopBar } from './TopBar';
import { useIsNarrowScreen } from './useIsNarrowScreen';

/**
 * The website top bar, for windows from 1024 px: the main links with Messages, search, then
 * Write, the bell and the account (handoff "Navigation"). The Search page has its
 * own, bigger field with the filters, so the top bar leaves its search pill out there and the page
 * keeps one search region.
 *
 * @param props.hasSearch - false on the Search page
 * @returns the top bar
 */
function WideHeader({ hasSearch }: { hasSearch: boolean }) {
  return (
    <TopBar
      hasSearch={hasSearch}
      // Messages with its unread count, while signed in (S1-E9-01).
      navigationEnd={<MessagesNavLink />}
      endSlot={
        <>
          {/* "Write", while signed in (S1-E3-01). */}
          <WriteLink />
          {/* The bell with the unread count, while signed in (S1-E7-01). */}
          <NotificationBell />
          {/* "Log in" and "Join for free" while signed out (S1-E2-01); the account bead after. */}
          <AccountLinks />
        </>
      }
    />
  );
}

/**
 * Picks the header for the window's width and the page on screen.
 *
 * @returns the header, and whether the floating tab bar is on screen
 */
function useShellHeader() {
  const isNarrow = useIsNarrowScreen();
  const { pathname } = useLocation();
  if (!isNarrow) {
    const isSearchPage = pathname === '/search' || pathname.startsWith('/search/');
    return { header: <WideHeader hasSearch={!isSearchPage} />, hasTabBar: false };
  }
  const screen = shellScreenFor(pathname);
  if (screen.kind === 'focus') {
    return {
      header: <FocusHeader titleKey={screen.titleKey} backTo={screen.backTo} />,
      hasTabBar: false,
    };
  }
  return { header: <PhoneHeader />, hasTabBar: true };
}

/**
 * Renders the frame and the current page inside it.
 *
 * @returns the whole page layout
 */
export function AppLayout() {
  const { t } = useTranslation();
  // Show a signed-in person's account language, whichever device they are on.
  useAccountLanguage();
  // MARKETS-2a: a first-time visitor sees the language for their country.
  useFirstVisitLanguage();
  // The member's mode and look, from their account on every device (bundle G2).
  useAccountAppearance();
  // Remember the page on screen for error reports (S1-E1-05).
  useTrackRoutePattern();
  // Check again any picture whose check couldn't run when it was uploaded (S1-E10-05).
  const { userId } = useSession();
  usePendingPictureRetry(userId);
  // Header A, header B with the tab bar, or the website top bar (bundle G4 SHELL).
  const { header, hasTabBar } = useShellHeader();

  // No background of its own: the page colour and the still colour blobs behind every page come
  // from src/styles/index.css (bundle G1), and a background here would hide them.
  return (
    // With the tab bar on screen, the frame leaves room at its foot so the footer's last line is
    // never hidden under it: 64 px bar + 14 px gap + 26 px air, plus a phone's home bar.
    <div
      className={`flex min-h-dvh flex-col text-ink ${hasTabBar ? 'pb-[calc(104px+env(safe-area-inset-bottom))]' : ''}`}
    >
      <a
        href="#main"
        className="sr-only z-40 rounded-full bg-surface-solid px-4 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {t('shell.skipToContent')}
      </a>
      {/* The approved emblem in the browser tab (BRAND-1b). */}
      <BrandTabIcon />
      {header}
      {/* "You're offline" and "You're back online" (S1-E1-05). */}
      <OfflineBanner />
      {/* The notice banner staff publish from Website › Notice banners (S1-E11-10). */}
      <NoticeStrip />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* While maintenance mode is on, the maintenance page replaces all of this (S1-E1-05). */}
        <MaintenanceGate>
          {/* While the account waits to be deleted, the closing page replaces the rest (S1-E13-03). */}
          <AccountClosingGate>
            {/* While the person waits on the list, the holding page replaces the rest (WAITLIST-1). */}
            <WaitlistGate>
              {/* The account notices: Terms, country, username, age check, consent, sanctions. */}
              <AccountNotices />
              <Outlet />
            </WaitlistGate>
          </AccountClosingGate>
        </MaintenanceGate>
      </main>
      {/* "Show when I'm online": a beat a minute, only while switched on (S1-E13-01). */}
      <PresenceHeartbeat />
      <Footer endSlot={<LanguageSelect id="language-select-footer" isLabelVisible />} />
      {/* The floating tab bar, on narrow browse pages only (handoff "App header and tab bar"). */}
      {hasTabBar && <TabBar />}
    </div>
  );
}
