/**
 * PhoneHeader: header B, the narrow-screen header on every page where a person browses
 * (bundle G4 SHELL; handoff "App header and tab bar": "Header B (every other screen): logo pill on
 * the left; on the right a pill with bell, chats and avatar (44px each, dot when something is
 * new)"; canvas Discover board).
 *
 * Below 1024 px AppLayout draws this instead of the website top bar, together with the floating
 * TabBar at the bottom. The logo pill is the link home; the right-hand pill holds the bell, the
 * chats button and the account bead while signed in, or "Log in" and "Join for free" for a
 * visitor. Each control is 44 px, the handoff's touch size (WCAG 2.5.8 asks for 24 px at least).
 * Who uses it: AppLayout. What it calls: BrandMark, NotificationBell, MessagesHeaderLink and
 * AccountLinks.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { brand } from '@/config/brand';
import { AccountLinks } from '@/features/auth/components/AccountLinks';
import { BrandMark } from '@/features/branding/components/BrandMark';
import { MessagesHeaderLink } from '@/features/messages/components/MessagesHeaderLink';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';

/**
 * Renders header B.
 *
 * @returns the header with the logo pill and the account pill
 */
export function PhoneHeader() {
  const { t } = useTranslation();
  return (
    <header className="relative z-10 flex items-center justify-between gap-2 px-3.5 pt-4">
      {/* The logo pill: the way home, named for screen readers as on the board. */}
      <Link
        to="/"
        aria-label={t('shell.home', { productName: brand.productName })}
        className="glass-pill inline-flex h-13 items-center rounded-full pr-4 pl-2.5 font-heading text-[19px] font-bold text-heading no-underline"
      >
        <BrandMark />
      </Link>
      {/* The account pill. A group with a name, so a screen reader hears what the round buttons
          are for before it reaches them. It wraps rather than pushing the page sideways when
          "Log in" and "Join for free" are long (CLAUDE.md rule 21). */}
      <div
        role="group"
        aria-label={t('shell.accountTools')}
        className="glass-pill flex min-h-13 flex-wrap items-center justify-end gap-1 rounded-[26px] p-1"
      >
        <NotificationBell />
        <MessagesHeaderLink />
        <AccountLinks />
      </div>
    </header>
  );
}
