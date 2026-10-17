/**
 * StaffBar: the top bar of the admin site (story S1-E1-03; mounted by S1-E11-01).
 *
 * Board values (AdminUsers, AdminSponsors): the same floating island as the public top bar, with
 * the wordmark and a "Staff" pill, the staff areas in a wrapping row, then the person's name and
 * role, and Sign out. Staff screens use plain components and no doodles (CLAUDE.md, Designs).
 * Showing an area in this menu is a convenience, never the protection: the database checks the
 * role on every staff action (architecture 1.8.1).
 * Who uses it: the /design page now; the admin frame from S1-E11-01.
 */
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import type { NavigationItem } from '@/app/navigation';
import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import { brand } from '@/config/brand';

/** What the staff bar needs. */
export interface StaffBarProps {
  navigationItems: NavigationItem[];
  staffName: string;
  roleLabel: string;
  onSignOut: () => void;
}

/** A staff link's classes: plum, bold and gold-underlined when it is the current area. */
function staffLinkClasses({ isActive }: { isActive: boolean }): string {
  const shared = 'inline-flex min-h-11 items-center border-b-2 no-underline';
  return isActive
    ? `${shared} border-gold font-bold text-heading`
    : `${shared} border-transparent text-body`;
}

/**
 * Renders the staff bar.
 *
 * @returns the header with the staff navigation
 */
export function StaffBar({ navigationItems, staffName, roleLabel, onSignOut }: StaffBarProps) {
  const { t } = useTranslation();

  return (
    <header className="relative px-[clamp(16px,4vw,64px)] pt-6">
      <nav
        aria-label={t('staff.navigation')}
        className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-4 rounded-nav border border-border bg-(--nav-glass) py-2.5 pr-2.5 pl-6 shadow-nav backdrop-blur-md"
      >
        <span className="inline-flex min-h-11 items-center gap-2.5">
          <span className="font-heading text-[22px] font-extrabold tracking-[-0.01em] text-heading">
            {brand.productName}
          </span>
          <InfoPill tone="plum">{t('staff.pill')}</InfoPill>
        </span>
        <ul className="m-0 flex flex-[1_1_420px] list-none flex-wrap justify-center gap-x-[26px] gap-y-1 p-0 text-[15px]">
          {navigationItems.map((item) => (
            <li key={item.labelKey}>
              <NavLink to={item.href} end className={staffLinkClasses}>
                {t(item.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2.5">
          <span className="flex flex-col items-end leading-tight">
            <span className="text-sm font-semibold text-ink">{staffName}</span>
            <span className="text-xs font-semibold text-(--success-text)">{roleLabel}</span>
          </span>
          <Button variant="secondary" onClick={onSignOut}>
            {t('staff.signOut')}
          </Button>
        </div>
      </nav>
    </header>
  );
}
