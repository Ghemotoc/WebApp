/**
 * TabBar: the floating tab bar at the bottom of a narrow screen (bundle G4 SHELL; handoff "App
 * header and tab bar": "floating 64px tab bar at the bottom"; canvas Discover board).
 *
 * A 64 px glass pill with Read, Library, Write and Together (the pages at /discover and /forums;
 * the simplified design, bundle CALM-2), each an icon over a short label, and a round 64 px Search
 * button beside it. The page on screen no longer sits on a bubble: its label turns the heading
 * colour, bold, with a 2 px thread line under it, and the others are the body colour; with
 * aria-current too, it never relies on colour alone (TabBar/README.md). On /search the Search
 * button turns solid with the same line. It is the main navigation
 * on a narrow screen, so it carries the same "Main" name as the website top bar (only one of the
 * two is ever drawn). On a tablet it stays 620 px wide in the middle, as on the DiscoverTablet
 * board, rather than stretching across. It is fixed to the bottom and keeps clear of a phone's home bar
 * (env(safe-area-inset-bottom)); AppLayout pads the page so nothing hides under it.
 * Who uses it: AppLayout, below 1024 px, on header B pages only (never while typing or reading).
 * What it calls: React Router's NavLink, NavIcon, useFocusClearOfTabBar (keeps the focused
 * control out from under the bar).
 */
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { NavIcon, type NavIconName } from '@/components/icons/NavIcon';

import { useFocusClearOfTabBar } from './useFocusClearOfTabBar';

/** One tab: where it goes, its icon and the locale key of its label. */
interface Tab {
  href: string;
  icon: NavIconName;
  labelKey: string;
}

/** The four tabs, in the board's order. Every page exists (Write opens a log-in card for a visitor). */
const tabs: readonly Tab[] = [
  { href: '/discover', icon: 'discover', labelKey: 'nav.read' },
  { href: '/library', icon: 'library', labelKey: 'nav.library' },
  { href: '/write', icon: 'write', labelKey: 'nav.write' },
  { href: '/forums', icon: 'forums', labelKey: 'nav.together' },
];

/**
 * The classes for one tab: the current page's label is bold in the heading colour.
 *
 * @param state.isActive - true when the tab's page is on screen (React Router)
 * @returns the class list
 */
function tabClasses({ isActive }: { isActive: boolean }): string {
  const base =
    'flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[12px] leading-tight no-underline hover:bg-ink/5';
  if (isActive) return `${base} font-bold text-heading`;
  return `${base} font-medium text-body`;
}

/**
 * The classes for the round Search button: solid (--surface) on the Search page.
 *
 * @param state.isActive - true on /search (React Router)
 * @returns the class list
 */
function searchButtonClasses({ isActive }: { isActive: boolean }): string {
  const base =
    'inline-flex size-16 shrink-0 flex-col items-center justify-center gap-1 rounded-full text-heading';
  if (isActive) return `${base} bg-surface shadow-card`;
  return `${base} glass-float`;
}

/**
 * The 2 px thread line under the current tab's label (or the Search icon on /search). It is a
 * picture of the state only: aria-current already tells a screen reader which page is on screen.
 *
 * @param props.isActive - true when the tab's page is on screen
 * @returns the line, or nothing for the other tabs
 */
function CurrentLine({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;
  return <span aria-hidden="true" data-current-line className="h-0.5 w-5 rounded-full bg-thread" />;
}

/**
 * Renders the tab bar.
 *
 * @returns the fixed navigation at the bottom of the screen
 */
export function TabBar() {
  const { t } = useTranslation();
  // A control the keyboard lands on is never left hidden under the bar (WCAG 2.2, 2.4.11).
  const barRef = useRef<HTMLElement>(null);
  useFocusClearOfTabBar(barRef);
  return (
    <nav
      ref={barRef}
      aria-label={t('shell.mainNavigation')}
      className="fixed inset-x-3.5 bottom-[calc(14px+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-[620px] items-center gap-2.5"
    >
      <ul className="glass-float m-0 flex h-16 min-w-0 flex-1 list-none items-center rounded-full p-1">
        {tabs.map((tab) => (
          <li key={tab.href} className="flex min-w-0 flex-1">
            <NavLink to={tab.href} className={tabClasses}>
              {({ isActive }) => (
                <>
                  <NavIcon name={tab.icon} size={22} />
                  <span>{t(tab.labelKey)}</span>
                  <CurrentLine isActive={isActive} />
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <NavLink to="/search" aria-label={t('shell.search')} className={searchButtonClasses}>
        {({ isActive }) => (
          <>
            <NavIcon name="search" size={24} />
            <CurrentLine isActive={isActive} />
          </>
        )}
      </NavLink>
    </nav>
  );
}
