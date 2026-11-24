/**
 * PhoneHeader: header B, the narrow-screen header on every page where a person browses
 * (bundle G4 SHELL; handoff "App header and tab bar": "Header B (every other screen): logo pill on
 * the left; on the right a pill with bell, chats and avatar (44px each, dot when something is
 * new)"; canvas Discover board). Since design books item 16 the dot is a small count, 1 to 9 then 9+.
 *
 * Below 1024 px AppLayout draws this instead of the website top bar, together with the floating
 * TabBar at the bottom. The logo pill is the link home (the Writers' hub when signed in, G9a); the right-hand pill holds the chats
 * button, the bell and the account avatar while signed in (that order since bundle CALM-2, to
 * match the top bar), or "Log in" and "Join for free" for a
 * visitor. Each control is 44 px, the handoff's touch size (WCAG 2.5.8 asks for 24 px at least).
 * Who uses it: AppLayout. What it calls: BrandMark, MessagesHeaderLink, NotificationBell and
 * AccountLinks.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { brand } from '@/config/brand';
import { AccountLinks } from '@/features/auth/components/AccountLinks';
import { BrandMark } from '@/features/branding/components/BrandMark';
import { useHomeAddress } from '@/features/hub/hooks/useHomeAddress';
import { MessagesHeaderLink } from '@/features/messages/components/MessagesHeaderLink';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';

/**
 * Renders header B.
 *
 * @returns the header with the logo pill and the account pill
 */
export function PhoneHeader() {
  const { t } = useTranslation();
  // Signed in, the logo opens the Writers' hub; signed out, the public home page (G9a).
  const homeAddress = useHomeAddress();
  return (
    // NAV-1 (Robert, 10 Nov 2026): the pills float over the page however far it scrolls; the
    // header's own box lets clicks through to the page between them.
    // The page draws under a phone's status bar (viewport-fit=cover, bundle CALM-1), so the pills
    // sit 16 px below the notch or status bar, not under it (env() is 0 where there is none).
    <header className="pointer-events-none sticky top-0 z-30 flex items-center justify-between gap-2 px-4 pt-[calc(16px+env(safe-area-inset-top))]">
      {/* The logo pill: the way home, named for screen readers as on the board. */}
      <Link
        to={homeAddress}
        aria-label={t('shell.home', { productName: brand.productName })}
        className="glass-float pointer-events-auto inline-flex h-13 items-center rounded-full pr-4 pl-3 font-heading type-subheading font-bold text-ink-heading no-underline"
      >
        <BrandMark />
      </Link>
      {/* The account pill. A group with a name, so a screen reader hears what the round buttons
          are for before it reaches them. It wraps rather than pushing the page sideways when
          its contents are long (CLAUDE.md rule 21). */}
      <div
        role="group"
        aria-label={t('shell.accountTools')}
        className="glass-float pointer-events-auto flex min-h-13 flex-wrap items-center justify-end gap-1 rounded-card p-1"
      >
        {/* Messages, Notifications, then the account, in the top bar's order (CALM-2). */}
        <MessagesHeaderLink />
        <NotificationBell />
        <AccountLinks />
      </div>
    </header>
  );
}
