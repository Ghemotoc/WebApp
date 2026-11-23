/**
 * AtlasSectionNav: the Story Atlas sections (stories S1-E17-06 and S1-E17-08, S1-E17-15,
 * S1-E17-17, S1-E17-22, S1-E17-27, S1-E17-29 and S1-E17-32): At a glance, Characters,
 * Relationships, Story world, Storyline, Ideas, Marketing and Readers (what readers can see).
 *
 * Redrawn in bundle CALM-9a (board D01 and the Atlas boards E20 to E34, approved by Robert on
 * 22 Nov 2026 after "it's harder to find the relationship page"): each section has its line icon
 * beside its name, and the open one sits on a soft tint with bold text (no side bar; NO-BARS,
 * Robert, 23 Nov 2026), so it shows by shape and weight, not colour alone (WCAG 1.4.1). "Connections" is called
 * "Relationships" everywhere, the word the page itself already used.
 * Two layouts, one list: on a desktop (from 1024 px) AtlasFrame shows it as a side menu, one
 * section a line; on tablets and phones it is one line that scrolls sideways, keeping its scrollbar
 * because it has no arrows (DoD scroll rule).
 * Real links with aria-current on the one open now, so a screen reader says where the writer is.
 * Who uses it: AtlasFrame. What it calls: ActionIcon.
 */
import { Link } from 'react-router';

import { ActionIcon, type ActionIconName } from '@/components/icons/ActionIcon';
import { cn } from '@/lib/utils';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/** The sections there are so far. */
export type AtlasSection =
  | 'glance'
  | 'characters'
  | 'connections'
  | 'bible'
  | 'storyline'
  | 'ideas'
  | 'marketing'
  | 'readers';

/** Each section's address after /plan/s/<slug>. */
const atlasSectionPaths: Record<AtlasSection, string> = {
  glance: '',
  characters: '/characters',
  connections: '/connections',
  // The story's world (once the bible; renamed 2 Nov 2026, ADMIN-2a2).
  bible: '/world',
  storyline: '/storyline',
  ideas: '/ideas',
  marketing: '/marketing',
  readers: '/readers',
};

/** Each section's icon, as the board draws the side menu (CALM-9a). */
const sectionIcons: Record<AtlasSection, ActionIconName> = {
  glance: 'home',
  characters: 'people',
  connections: 'link',
  bible: 'globe',
  storyline: 'list',
  ideas: 'spark',
  marketing: 'star',
  readers: 'eye',
};

/** The sections in menu order. */
const sections: AtlasSection[] = [
  'glance',
  'characters',
  'connections',
  'bible',
  'storyline',
  'ideas',
  'marketing',
  'readers',
];

/** How the list is laid out: a side menu (desktop) or a sideways line (tablet and phone). */
export type AtlasNavLayout = 'side' | 'line';

/**
 * Renders the sections.
 *
 * @param props.slug - the story open now
 * @param props.current - the section open now, or null when none is (the search page)
 * @param props.layout - "side" for the desktop menu, "line" for the scrolling line
 * @returns the navigation
 */
export function AtlasSectionNav({
  slug,
  current,
  layout,
}: {
  slug: string;
  current: AtlasSection | null;
  layout: AtlasNavLayout;
}) {
  const { t } = useAtlasTranslation();
  // The side menu stacks the links; the line keeps them on one row that scrolls.
  const listLayout =
    layout === 'side' ? 'flex-col gap-0.5' : 'flex-nowrap gap-1 overflow-x-auto pb-1';
  return (
    <nav aria-label={t('nav.label')}>
      <ul className={cn('m-0 flex list-none p-0', listLayout)}>
        {sections.map((section) => (
          <li key={section} className="shrink-0">
            <SectionLink
              address={`/plan/s/${slug}${atlasSectionPaths[section]}`}
              section={section}
              isCurrent={section === current}
              label={t(`nav.${section}`)}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** One section's link: its icon and name; the open one gets the soft tint and bold text. */
function SectionLink({
  address,
  section,
  isCurrent,
  label,
}: {
  address: string;
  section: AtlasSection;
  isCurrent: boolean;
  label: string;
}) {
  return (
    <Link
      to={address}
      aria-current={isCurrent ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm whitespace-nowrap no-underline',
        isCurrent ? 'bg-tint font-semibold text-heading' : 'font-medium text-ink hover:bg-tint',
      )}
    >
      <ActionIcon name={sectionIcons[section]} />
      {label}
    </Link>
  );
}
