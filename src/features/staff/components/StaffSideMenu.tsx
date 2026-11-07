/**
 * StaffSideMenu: the admin site's side menu, with the areas in five groups (bundle DASH-1;
 * Robert picked "Safety, People, Content, Website, System" on 6 Nov 2026, 18:34 UTC).
 *
 * Who uses it: StaffLayout, with only the pages the database allows the person (my_staff_areas()
 * through pagesForAreas()). Showing an area here is a convenience, never the protection: the
 * server checks the role on every staff action (architecture 1.8.1).
 * How it looks: a column beside the page on wide screens (1024 px and up); on phones and tablets
 * a "Menu" button above the page opens the same list, so 23 links never crowd a small screen
 * (CLAUDE.md rule 21). Plain components, no doodles (CLAUDE.md, Designs: staff screens).
 * What it calls: staffAreas.ts (groupStaffPages) for the groups.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router';

import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';

import { groupStaffPages, type StaffAreaPage } from '../staffAreas';

/** A menu link's classes: plum, bold and with a gold bar when it is the page being shown. */
function menuLinkClasses({ isActive }: { isActive: boolean }): string {
  const shared =
    'flex min-h-11 items-center rounded-lg border-l-4 px-3 text-[15px] no-underline hover:bg-tint';
  return isActive
    ? `${shared} border-gold bg-tint font-bold text-heading`
    : `${shared} border-transparent text-body`;
}

/**
 * Renders the side menu.
 *
 * @param props.pages - the pages the person may open, in menu order (pagesForAreas())
 * @returns the navigation, named "Staff" for screen readers
 */
export function StaffSideMenu({ pages }: { pages: StaffAreaPage[] }) {
  const { t } = useTranslation();
  const { t: tStaff } = useTranslation('staff');
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();
  // Step 1: close the phone menu whenever a link opens another page, so the page shows at once.
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setIsOpen(false);
  }
  const groups = groupStaffPages(pages);

  return (
    <nav aria-label={t('staff.navigation')} className="flex flex-col gap-3">
      {/* Step 2: the button only phones and tablets see; wide screens always show the list. */}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="staff-side-menu-groups"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-(--control-border) bg-surface px-4 font-semibold text-heading lg:hidden"
      >
        {tStaff('menu.toggle')}
        {/* The chevron turns over while the menu is open (a plain icon, DoD design rules). */}
        <ChevronDownIcon className={isOpen ? 'rotate-180' : undefined} />
      </button>
      {/* Step 3: the groups, each with its heading and links. */}
      <div id="staff-side-menu-groups" className={isOpen ? 'block' : 'hidden lg:block'}>
        {groups.length === 0 ? (
          <p className="m-0 text-sm text-meta">{tStaff('menu.empty')}</p>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map((entry) => (
              <section key={entry.group} aria-labelledby={`staff-menu-group-${entry.group}`}>
                <h2 id={`staff-menu-group-${entry.group}`} className="eyebrow m-0 mb-1.5 px-3">
                  {tStaff(`menuGroups.${entry.group}`)}
                </h2>
                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                  {entry.pages.map((page) => (
                    <li key={page.href}>
                      <NavLink to={page.href} className={menuLinkClasses}>
                        {tStaff(page.labelKey)}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
