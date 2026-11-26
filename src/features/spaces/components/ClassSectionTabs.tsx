/**
 * ClassSectionTabs: "Class" and "Stories 6", the two sections of a class space (bundle BOOKS-8;
 * boards G03-Class and G04-ClassStories, user stories 8.3 and 8.4). The teacher also gets "Class
 * points", "Certificates" and "Members" (BOOKS-8 part 8b; boards G08 and G09, user story 8.8:
 * "only the teacher sees the last three"). The track scrolls sideways on a narrow phone.
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
 * The sections, in the board's order: everyone's two, then the teacher's three.
 *
 * @param slug - the class's address
 * @param isTeacher - true for the class's teacher
 * @returns each link's address and words' key
 */
function sectionsFor(slug: string, isTeacher: boolean) {
  const base = `/spaces/${slug}`;
  const everyone = [
    { to: base, labelKey: 'classPage.classTab' },
    { to: `${base}/stories`, labelKey: 'classPage.storiesTab' },
  ];
  if (!isTeacher) return everyone;
  return [
    ...everyone,
    { to: `${base}/points`, labelKey: 'classPage.pointsTab' },
    { to: `${base}/certificates`, labelKey: 'classPage.certificatesTab' },
    { to: `${base}/members`, labelKey: 'classPage.membersTab' },
  ];
}

/**
 * Renders the links.
 *
 * @param props.slug - the class's address
 * @param props.isTeacher - true for the class's teacher, who gets three more sections
 * @returns the navigation
 */
export function ClassSectionTabs({
  slug,
  isTeacher = false,
}: {
  slug: string;
  isTeacher?: boolean;
}) {
  const { t } = useSpacesTranslation();
  const stories = useClassSpaceStories(slug);
  const count = stories.data?.length ?? 0;
  return (
    <nav aria-label={t('classPage.sections')} className="max-w-full overflow-x-auto">
      <ul className="m-0 inline-flex list-none gap-1 rounded-full bg-tint p-1">
        {sectionsFor(slug, isTeacher).map((section) => (
          <li key={section.to} className="flex">
            <NavLink to={section.to} end className={tabClasses}>
              {t(section.labelKey, { count })}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
