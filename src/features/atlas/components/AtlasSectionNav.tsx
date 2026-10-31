/**
 * AtlasSectionNav: the row of Story Atlas sections under the top bar (stories S1-E17-06 and
 * S1-E17-08, S1-E17-15, S1-E17-17, S1-E17-22, S1-E17-27, S1-E17-29 and S1-E17-32): At a glance,
 * Characters, Connections, Bible, Storyline, Ideas, Marketing and Readers (what readers can see).
 *
 * Real links with aria-current on the one open now, so a screen reader says where the writer is;
 * the open one is also filled, not told by colour alone. On a phone the row wraps.
 * Who uses it: AtlasTopBar.
 */
import { Link } from 'react-router';

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
const sectionPaths: Record<AtlasSection, string> = {
  glance: '',
  characters: '/characters',
  connections: '/connections',
  bible: '/bible',
  storyline: '/storyline',
  ideas: '/ideas',
  marketing: '/marketing',
  readers: '/readers',
};

/**
 * Renders the sections.
 *
 * @param props.slug - the story open now
 * @param props.current - the section open now, or null when none is (the search page)
 * @returns the navigation row
 */
export function AtlasSectionNav({ slug, current }: { slug: string; current: AtlasSection | null }) {
  const { t } = useAtlasTranslation();
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
  return (
    <nav aria-label={t('nav.label')}>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {sections.map((section) => (
          <li key={section}>
            <Link
              to={`/plan/s/${slug}${sectionPaths[section]}`}
              aria-current={section === current ? 'page' : undefined}
              className={cn(
                'inline-flex h-11 items-center rounded-full border px-5 text-sm font-semibold no-underline',
                section === current
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-control-border bg-surface text-heading hover:bg-tint',
              )}
            >
              {t(`nav.${section}`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
