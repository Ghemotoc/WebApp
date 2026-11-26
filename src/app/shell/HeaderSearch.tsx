/**
 * HeaderSearch: the search button in the website top bar (bundle G4 SHELL; user story 1.7,
 * boards A01 to A07: a round magnifying glass after Write, which opens the Search page).
 *
 * Boards A01 to A07 draw one search field only, the Search page's own, so the top bar carries a
 * 44 px round link instead of a second field. Its accessible name says what Search finds
 * ("Search stories, writers and Together"). On the Search page itself it shows as the current page.
 * On a narrow screen the tab bar's round Search button takes its place.
 * Who uses it: AppLayout's wide top bar, while signed in. Where it goes: /search.
 */
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { NavIcon } from '@/components/icons/NavIcon';

/**
 * Renders the round search link.
 *
 * @returns the link to the Search page
 */
export function HeaderSearch() {
  const { t } = useTranslation();
  return (
    <NavLink
      to="/search"
      aria-label={t('shell.searchLabel')}
      className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-ink/5"
    >
      <NavIcon name="search" size={22} />
    </NavLink>
  );
}
