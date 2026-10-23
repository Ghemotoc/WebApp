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
 * Error, offline and maintenance states (S1-E1-05): OfflineBanner sits under the top bar;
 * MaintenanceGate swaps the notices and the page for the maintenance page while maintenance mode is
 * on (staff and the log-in pages excepted); useTrackRoutePattern remembers which page is on screen
 * for error reports, as a pattern such as "/join/:code", never the address itself.
 */
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { SetupProfileNotice } from '@/features/account/components/SetupProfileNotice';
import { AccountLinks } from '@/features/auth/components/AccountLinks';
import { LanguageSelect } from '@/features/language/components/LanguageSelect';
import { useTrackRoutePattern } from '@/features/errors/hooks/useTrackRoutePattern';
import { useAccountLanguage } from '@/features/language/hooks/useAccountLanguage';
import { LegalUpdateNotice } from '@/features/legal/components/LegalUpdateNotice';
import { MaintenanceGate } from '@/features/maintenance/components/MaintenanceGate';
import { OfflineBanner } from '@/features/offline/components/OfflineBanner';

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

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <a
        href="#main"
        className="sr-only z-20 rounded-full bg-surface px-4 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {t('shell.skipToContent')}
      </a>
      <TopBar
        endSlot={
          <>
            <LanguageSelect id="language-select-top" />
            {/* "Join for free" while signed out (S1-E2-01). */}
            <AccountLinks />
          </>
        }
      />
      {/* "You're offline" and "You're back online" (S1-E1-05). */}
      <OfflineBanner />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* While maintenance mode is on, the maintenance page replaces all of this (S1-E1-05). */}
        <MaintenanceGate>
          {/* "We've updated our Terms", for a signed-in person who must accept before posting (S1-E14-01). */}
          <LegalUpdateNotice />
          {/* "Choose a username", for a signed-in person who hasn't chosen one yet (S1-E2-04). */}
          <SetupProfileNotice />
          <Outlet />
        </MaintenanceGate>
      </main>
      <Footer endSlot={<LanguageSelect id="language-select-footer" isLabelVisible />} />
    </div>
  );
}
