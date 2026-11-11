/**
 * TopBar: the floating glass pill at the top of every public page on a wide screen, from 1024 px
 * (story S1-E1-03; restyled in bundle G4 SHELL from the liquid glass handoff, "Navigation":
 * "Website top bar: recessed track, water bubble on the current page, search, Write, bell, avatar";
 * canvas Discover.web board).
 *
 * From left to right: the logo and wordmark (BrandMark, in the theme's accent), the main links in a
 * recessed track with the white water bubble under the page on screen (NavTrack), the search pill
 * (HeaderSearch), then the end slot: Write, the bell and the account bead, or "Log in" and
 * "Join for free" for a visitor. The pill wraps onto a second row when a window is only just wide
 * enough, so nothing is cut off. Day and night, and the language, live in the footer and in
 * Settings, never here (handoff; Robert, 9 Nov 2026, 12:20 UTC, bundle FIX-3). Below 1024 px AppLayout draws PhoneHeader or FocusHeader instead.
 * Decisions: links appear only when their page exists (src/app/navigation.ts). Messages, with its
 * unread count, comes in through navigationEnd while signed in (S1-E9-01).
 * Two sizes, as on the main website (GLASS-3; Robert, 11 Nov 2026): at the top of a page the pill
 * sits a little lower, a little taller and more see-through (the website's .lg-light glass); once
 * the page scrolls more than 12 px it moves up, tightens and turns nearly solid, so its links stay
 * easy to read over any row (usePageScrolled, data-solid; index.css).
 * Who uses it: AppLayout, and the /design page with the full board links.
 * What it calls: NavTrack, HeaderSearch, BrandMark, usePageScrolled, and useHomeAddress for where
 * the logo goes (the Writers' hub when signed in, G9a).
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { primaryNavigation, type NavigationItem } from '@/app/navigation';
import { BrandMark } from '@/features/branding/components/BrandMark';
import { useHomeAddress } from '@/features/hub/hooks/useHomeAddress';

import { HeaderSearch } from './HeaderSearch';
import { NavTrack } from './NavTrack';
import { usePageScrolled } from './usePageScrolled';

/** What the top bar needs. All optional: AppLayout uses the defaults. */
export interface TopBarProps {
  navigationItems?: NavigationItem[];
  /** Controls at the right-hand end: Write, the bell and the account. */
  endSlot?: ReactNode;
  /** The navigation's accessible name; a specimen on /design passes its own so it isn't a second "Main". */
  navigationLabel?: string;
  /** Links after the list that decide themselves whether to show, such as Messages while signed in (S1-E9-01). */
  navigationEnd?: ReactNode;
  /** The search pill; the /design specimen leaves it out so the page has one search region. */
  hasSearch?: boolean;
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
  hasSearch = true,
}: TopBarProps) {
  const { t } = useTranslation();
  // Signed in, the logo opens the Writers' hub; signed out, the public home page (G9a).
  const homeAddress = useHomeAddress();
  // Tight and nearly solid once the page has scrolled under the bar; roomier and clearer at the top.
  const isScrolled = usePageScrolled();

  return (
    // NAV-1 (Robert, 10 Nov 2026): the bar floats over the page however far it scrolls. The
    // header's own box lets clicks through to the page around the pill; the pill takes them.
    // The website's numbers: 16 px from the top with 12 px inside at rest, 10 px and 8 px scrolled.
    <header
      data-scrolled={isScrolled}
      className="top-bar pointer-events-none sticky top-0 z-30 px-[clamp(16px,4vw,64px)]"
    >
      <div
        data-solid={isScrolled}
        className="top-bar-pill glass-float pointer-events-auto mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-4 gap-y-2.5 rounded-[36px] pr-2 pl-5"
      >
        <Link
          to={homeAddress}
          className="inline-flex min-h-11 items-center font-heading text-[22px] font-extrabold tracking-[-0.01em] text-heading no-underline"
        >
          <BrandMark />
        </Link>
        {navigationItems.length > 0 && (
          <nav aria-label={navigationLabel ?? t('shell.mainNavigation')}>
            <NavTrack items={navigationItems} end={navigationEnd} />
          </nav>
        )}
        {hasSearch && <HeaderSearch />}
        {/* Wraps when the window is only just wide enough, so "Log in" and "Join for free" never
            push the page sideways (S1-E2-05; CLAUDE.md rule 21). */}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">{endSlot}</div>
      </div>
    </header>
  );
}
