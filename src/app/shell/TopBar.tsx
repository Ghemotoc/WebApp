/**
 * TopBar: the floating glass pill at the top of every public page on a wide screen, from 1024 px
 * (story S1-E1-03; restyled in bundle G4 SHELL from the liquid glass handoff, "Navigation":
 * "Website top bar: recessed track, water bubble on the current page, search, Write, bell, avatar";
 * canvas Discover.web board).
 *
 * From left to right (the simplified design, bundle CALM-2): the logo and wordmark (BrandMark), one
 * link named "<brand name>, Home"; Home (Hub at /hub when signed in, Robert, 25 Nov 2026), Read,
 * Library and Together in a recessed track with the
 * white bubble under the page on screen (NavTrack); then the end
 * slot: the quiet Write button, the round search link (HeaderSearch, user story 1.7), Messages and Notifications as icon buttons and the account avatar,
 * or the one "Get in" button for a visitor (GETIN-1). The pill wraps onto a second row when a window is only just wide
 * enough, so nothing is cut off. Day and night, and the language, live in the footer and in
 * Settings, never here (handoff; Robert, 9 Nov 2026, 12:20 UTC, bundle FIX-3). Below 1024 px AppLayout draws PhoneHeader or FocusHeader instead.
 * Decisions: links appear only when their page exists (src/app/navigation.ts). Messages is an icon
 * button in the end slot since CALM-2 (it was a link in the track, S1-E9-01).
 * Two sizes, as on the main website (GLASS-3; Robert, 11 Nov 2026): at the top of a page the pill
 * sits a little lower, a little taller and more see-through (the website's .lg-light glass); once
 * the page scrolls more than 12 px it moves up, tightens and turns nearly solid, so its links stay
 * easy to read over any row (usePageScrolled, data-solid; index.css).
 * Who uses it: AppLayout, and the /design page with the full board links.
 * What it calls: NavTrack, BrandMark, usePageScrolled, and useHomeAddress for where
 * the logo goes ("/", Home, since user story 1.1).
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { linksFor, primaryNavigation, type NavigationItem } from '@/app/navigation';
import { brand } from '@/config/brand';
import { BrandMark } from '@/features/branding/components/BrandMark';
import { useSession } from '@/features/auth/hooks/useSession';
import { useHomeAddress } from '@/features/hub/hooks/useHomeAddress';

import { NavTrack } from './NavTrack';
import { usePageScrolled } from './usePageScrolled';

/** What the top bar needs. All optional: AppLayout uses the defaults. */
export interface TopBarProps {
  navigationItems?: NavigationItem[];
  /** Controls at the right-hand end: Write, the bell and the account. */
  endSlot?: ReactNode;
  /** The navigation's accessible name; a specimen on /design passes its own so it isn't a second "Main". */
  navigationLabel?: string;
  /** Links after the list that decide themselves whether to show (the /design specimen's extras). */
  navigationEnd?: ReactNode;
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
  // The logo opens Home at "/": the member's Home signed in, the public home page signed out (1.1).
  const homeAddress = useHomeAddress();
  // A visitor sees no members' links (Library, Together) (TRIAL-WALL).
  const { userId } = useSession();
  const isSignedIn = userId !== null;
  const visibleItems = linksFor(navigationItems, isSignedIn);
  // Tight and nearly solid once the page has scrolled under the bar; roomier and clearer at the top.
  const isScrolled = usePageScrolled();

  return (
    // NAV-1 (Robert, 10 Nov 2026): the bar floats over the page however far it scrolls. The
    // header's own box lets clicks through to the page around the pill; the pill takes them.
    // The website's numbers: 16 px from the top with 12 px inside at rest, 10 px and 8 px scrolled.
    // CALM-9 (Robert's canvas comments of 23 Nov 2026): the bar is up to 1376 px wide, wider than
    // the 1280 px page column, with 32 px of side space at 1440 px.
    <header
      data-scrolled={isScrolled}
      className="top-bar pointer-events-none sticky top-0 z-30 px-4 lg:px-8"
    >
      <div
        data-solid={isScrolled}
        className="top-bar-pill glass-float pointer-events-auto mx-auto flex max-w-[1376px] flex-wrap items-center gap-x-4 gap-y-3 rounded-full pr-2 pl-4"
      >
        <Link
          to={homeAddress}
          aria-label={t('shell.home', { productName: brand.productName })}
          className="inline-flex min-h-11 items-center font-heading type-heading font-bold tracking-[-0.01em] text-ink-heading no-underline"
        >
          <BrandMark />
        </Link>
        {visibleItems.length > 0 && (
          <nav aria-label={navigationLabel ?? t('shell.mainNavigation')}>
            <NavTrack items={visibleItems} end={navigationEnd} />
          </nav>
        )}
        {/* Wraps when the window is only just wide enough, so the end slot never
            pushes the page sideways (S1-E2-05; CLAUDE.md rule 21). */}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{endSlot}</div>
      </div>
    </header>
  );
}
