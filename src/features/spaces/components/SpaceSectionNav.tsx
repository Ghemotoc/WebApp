/**
 * SpaceSectionNav: the row of a space's own pages, "Threads", "Settings", "Members" and
 * "Moderation log", with the page on screen on a raised pill (bundle BOOKS-7, boards F10 to F12).
 *
 * Each link shows only to whoever may use that page, as SpaceToolLinks does; hiding a link is a
 * convenience, and each page and the database check again (architecture 1.8.1). The page on
 * screen carries aria-current="page" and shows by shape and weight, not colour alone (WCAG 1.4.1).
 * Who shows it: SpaceSettingsPage, SpaceMembersPage and SpaceLogPage. Bundle 8's class pages can
 * use it too. What it calls: nothing; the space says what the reader may do.
 */
import { NavLink } from 'react-router';

import type { Space } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** One link: where it goes and its words' key. */
interface SectionLink {
  to: string;
  labelKey: string;
}

/**
 * The pages the reader may open, in the board's order.
 *
 * @param space - the space
 * @returns the links
 */
function sectionLinksFor(space: Space): SectionLink[] {
  const { viewer, slug } = space;
  const links: SectionLink[] = [{ to: `/spaces/${slug}`, labelKey: 'sections.threads' }];
  if (viewer.canManage || viewer.canAppoint)
    links.push({ to: `/spaces/${slug}/settings`, labelKey: 'sections.settings' });
  if (viewer.powers.includes('members'))
    links.push({ to: `/spaces/${slug}/members`, labelKey: 'sections.members' });
  if (viewer.canReadLog) links.push({ to: `/spaces/${slug}/log`, labelKey: 'sections.log' });
  return links;
}

/**
 * The classes of one link: the page on screen sits on the raised pill in bold.
 *
 * @param props.isActive - true for the page on screen
 * @returns the classes
 */
function sectionLinkClasses({ isActive }: { isActive: boolean }): string {
  const shared =
    'inline-flex min-h-10 items-center rounded-full px-4 type-label whitespace-nowrap text-ink-heading no-underline';
  return isActive
    ? `${shared} segmented-bubble font-semibold`
    : `${shared} font-semibold hover:underline`;
}

/**
 * Renders the row.
 *
 * @param props.space - the space
 * @returns a labelled navigation landmark
 */
export function SpaceSectionNav({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  return (
    <nav aria-label={t('sections.label', { name: space.name })} className="max-w-full">
      <ul className="segmented-track m-0 inline-flex max-w-full list-none flex-wrap gap-1 rounded-card p-1">
        {sectionLinksFor(space).map((link) => (
          <li key={link.to} className="flex">
            <NavLink to={link.to} end className={sectionLinkClasses}>
              {t(link.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
