/**
 * StaffBar: the top bar of the admin site (story S1-E1-03; mounted by S1-E11-01).
 *
 * Board values (AdminUsers, AdminSponsors): the same floating island as the public top bar, with
 * the emblem and wordmark (BrandMark, LOGO-1) and a "Staff" pill, the staff areas in a wrapping row, then the person's name and
 * role, and Sign out. Staff screens use plain components and no doodles (CLAUDE.md, Designs).
 * Showing an area in this menu is a convenience, never the protection: the database checks the
 * role on every staff action (architecture 1.8.1).
 * Who uses it: the /design page, which passes the board's area links, and StaffLayout (the admin
 * frame, S1-E11-01), which passes no links and, since bundle FIX-3, no language drop-down (the
 * staff footer has it): since
 * DASH-1 the areas sit in the grouped side menu (StaffSideMenu), so the bar is a plain header
 * there, and the side menu is the one navigation named "Staff".
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import type { NavigationItem } from '@/app/navigation';
import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import { BrandMark } from '@/features/branding/components/BrandMark';

/** What the staff bar needs. */
export interface StaffBarProps {
  /** The area links; leave out (as the admin frame does since DASH-1) for a bar without them. */
  navigationItems?: NavigationItem[];
  staffName: string;
  roleLabel: string;
  onSignOut: () => void;
  /** Extra controls before the name (S1-E11-01); the admin frame passes none. */
  endSlot?: ReactNode;
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
export function StaffBar({
  navigationItems = [],
  staffName,
  roleLabel,
  onSignOut,
  endSlot,
}: StaffBarProps) {
  const { t } = useTranslation();
  // A bar with links is a navigation landmark; without them it is just the header's island, so a
  // screen reader never hears two navigations named "Staff" (DASH-1).
  const hasLinks = navigationItems.length > 0;
  const Island = hasLinks ? 'nav' : 'div';

  return (
    <header className="relative px-[clamp(16px,4vw,64px)] pt-6">
      <Island
        aria-label={hasLinks ? t('staff.navigation') : undefined}
        className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-4 rounded-nav border border-border bg-(--nav-glass) py-2.5 pr-2.5 pl-6 shadow-nav backdrop-blur-md"
      >
        <span className="inline-flex min-h-11 items-center gap-2.5">
          {/* The emblem and the name, as in the public top bar (LOGO-1: the logo on every platform). */}
          <span className="inline-flex font-heading text-[22px] font-extrabold tracking-[-0.01em] text-heading">
            <BrandMark />
          </span>
          <InfoPill tone="plum">{t('staff.pill')}</InfoPill>
        </span>
        {hasLinks && (
          <ul className="m-0 flex flex-[1_1_420px] list-none flex-wrap justify-center gap-x-[26px] gap-y-1 p-0 text-[15px]">
            {navigationItems.map((item) => (
              <li key={item.labelKey}>
                <NavLink to={item.href} end className={staffLinkClasses}>
                  {t(item.labelKey)}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
        {/* Wraps on narrow phones, so nothing pushes the page sideways (CLAUDE.md rule 21). */}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
          {endSlot}
          <span className="flex flex-col items-end leading-tight">
            <span className="text-sm font-semibold text-ink">{staffName}</span>
            <span className="text-xs font-semibold text-(--success-text)">{roleLabel}</span>
          </span>
          <Button variant="secondary" onClick={onSignOut}>
            {t('staff.signOut')}
          </Button>
        </div>
      </Island>
    </header>
  );
}
