/**
 * TopBar: the floating island at the top of every public screen (story S1-E1-03).
 *
 * Board values (Discover, Story, Reader, Search, Settings): a rounded island (2.1rem), 85% white
 * glass with a 12 px blur, a 1 px border and the nav shadow, 10 px padding (24 px on the left).
 * The wordmark is the product name as text in Bricolage 800, 22 px, from the brand config, with
 * the emblem before it; an uploaded logo replaces the text (BrandMark, bundle BRAND-1b).
 * The current page's link is plum, bold, with a 2 px gold underline and aria-current="page".
 * On phones the island wraps onto several rows, as the boards show; there is no hamburger menu.
 * Decisions: links appear only when their page exists (src/app/navigation.ts); there is no
 * theme switch here (Robert, 17 Oct 2026). The end slot holds the language drop-down from
 * S1-E1-04; notifications, Write and the account button come with their stories. Messages, with
 * its unread count, comes in through navigationEnd while signed in (S1-E9-01).
 * Who uses it: AppLayout, and the /design page with the full board links.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router';

import { primaryNavigation, type NavigationItem } from '@/app/navigation';
import { BrandMark } from '@/features/branding/components/BrandMark';

/** What the top bar needs. All optional: AppLayout uses the defaults. */
export interface TopBarProps {
  navigationItems?: NavigationItem[];
  /** Controls at the right-hand end, such as the language drop-down. */
  endSlot?: ReactNode;
  /** The navigation's accessible name; a specimen on /design passes its own so it isn't a second "Main". */
  navigationLabel?: string;
  /** Links after the list that decide themselves whether to show, such as Messages while signed in (S1-E9-01). */
  navigationEnd?: ReactNode;
}

/** A nav link's classes: plum, bold and gold-underlined when it is the current page. */
function navigationLinkClasses({ isActive }: { isActive: boolean }): string {
  const shared = 'inline-flex min-h-11 items-center border-b-2 no-underline hover:text-link-hover';
  return isActive
    ? `${shared} border-gold font-bold text-heading`
    : `${shared} border-transparent text-body`;
}

/**
 * Renders the top bar.
 *
 * @returns the header with the main navigation
 */
export function TopBar({
  navigationItems = primaryNavigation,
  endSlot,
  navigationLabel,
  navigationEnd,
}: TopBarProps) {
  const { t } = useTranslation();

  return (
    <header className="relative z-10 px-[clamp(16px,4vw,64px)] pt-6">
      <nav
        aria-label={navigationLabel ?? t('shell.mainNavigation')}
        className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-4 rounded-nav border border-border bg-(--nav-glass) py-2.5 pr-2.5 pl-6 shadow-nav backdrop-blur-md"
      >
        <Link
          to="/"
          className="inline-flex min-h-11 items-center font-heading text-[22px] font-extrabold tracking-[-0.01em] text-heading no-underline"
        >
          <BrandMark />
        </Link>
        {navigationItems.length > 0 && (
          <ul className="m-0 flex flex-[1_1_420px] list-none flex-wrap justify-center gap-x-[30px] gap-y-1 p-0 text-[15px] tracking-[0.01em]">
            {navigationItems.map((item) => (
              <li key={item.href}>
                <NavLink to={item.href} end className={navigationLinkClasses}>
                  {t(item.labelKey)}
                </NavLink>
              </li>
            ))}
            {navigationEnd}
          </ul>
        )}
        {/* Wraps on narrow phones, so the language menu, "Log in" and "Join for free" never push the page sideways (S1-E2-05; CLAUDE.md rule 21). */}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">{endSlot}</div>
      </nav>
    </header>
  );
}
