/**
 * ClassSectionTabs: "Class" and "Stories 6", the two sections of a class space (bundle BOOKS-8;
 * boards G03-Class and G04-ClassStories, user stories 8.3 and 8.4).
 *
 * Who shows it: ClassSpaceContent (/spaces/:slug) and ClassStoriesPage (/spaces/:slug/stories).
 * What it shows: a small track of two links; the page on screen sits on the solid bubble in bold
 * and carries aria-current="page", so it shows by shape and weight, not colour alone (WCAG 1.4.1).
 * What it calls: useClassSpaceStories → class_space_stories(), for the number of stories.
 */
import { NavLink } from 'react-router';

import { useClassSpaceStories } from '../hooks/useClassStories';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * The classes for one link: 40 px tall inside the track, the current page solid and bold.
 *
 * @param state.isActive - true for the page on screen
 * @returns the link's classes
 */
function tabClasses({ isActive }: { isActive: boolean }): string {
  const shared =
    'inline-flex min-h-10 min-w-11 items-center justify-center rounded-full px-4 type-body whitespace-nowrap no-underline';
  if (isActive) return `${shared} bg-surface-solid font-semibold text-ink-heading shadow-card`;
  return `${shared} font-normal text-ink hover:text-ink-heading`;
}

/**
 * Renders the two links.
 *
 * @param props.slug - the class's address
 * @returns the navigation
 */
export function ClassSectionTabs({ slug }: { slug: string }) {
  const { t } = useSpacesTranslation();
  const stories = useClassSpaceStories(slug);
  const count = stories.data?.length ?? 0;
  return (
    <nav aria-label={t('classPage.sections')} className="max-w-full">
      <ul className="m-0 inline-flex list-none gap-1 rounded-full bg-tint p-1">
        <li className="flex">
          <NavLink to={`/spaces/${slug}`} end className={tabClasses}>
            {t('classPage.classTab')}
          </NavLink>
        </li>
        <li className="flex">
          <NavLink to={`/spaces/${slug}/stories`} end className={tabClasses}>
            {t('classPage.storiesTab', { count })}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}
