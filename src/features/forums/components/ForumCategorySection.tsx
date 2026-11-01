/**
 * ForumCategorySection: one category card on the forum index: its colour bar, name, "4 forums",
 * its doodle and its forums (bundle FORUMS-1, part a; S1-E8-01; board 5.1).
 *
 * Who uses it: ForumsPage. What it calls: ForumRow for each forum, and Doodle for the category's
 * doodle when it names one the app has (staff choose it on /staff/forums).
 * Not yet: "Mark as read" (part d, S1-E8-04).
 */
import { Doodle } from '@/components/ui/Doodle';
import { doodleSources, type DoodleName } from '@/components/ui/doodleSources';

import type { ForumAccent } from '../api/forumIndex';
import type { ForumCategory } from '../lib/forumTree';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumRow } from './ForumRow';

/** The colour bar beside the name, in each accent's dark pill colour (contrast 3:1 or more). */
const accentBars: Record<ForumAccent, string> = {
  plum: 'bg-(--pill-plum-text)',
  sky: 'bg-(--pill-sky-text)',
  blush: 'bg-(--pill-blush-text)',
  sage: 'bg-(--pill-sage-text)',
  gold: 'bg-(--pill-gold-text)',
};

/**
 * Whether a doodle name staff chose is one the app has.
 *
 * @param name - the name from the database
 * @returns true when Doodle can draw it
 */
function isDoodleName(name: string | null): name is DoodleName {
  return name !== null && Object.hasOwn(doodleSources, name);
}

/**
 * Renders the card.
 *
 * @param group - the category and its forums
 * @returns a section, named by the category's heading
 */
export function ForumCategorySection({ group }: { group: ForumCategory }) {
  const { t } = useForumsTranslation();
  const { category, forums } = group;
  const headingId = `forum-category-${category.slug}`;
  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-card border border-border bg-surface"
    >
      <header className="relative flex items-center gap-3 border-b border-border px-5 py-4 md:px-7">
        <span
          aria-hidden="true"
          className={`h-7 w-1.5 shrink-0 rounded-full ${accentBars[category.accent]}`}
        />
        <h2 id={headingId} className="m-0 font-heading text-[24px] font-bold text-heading">
          {category.name}
        </h2>
        <span className="text-[13px] text-body">{t('forumCount', { count: forums.length })}</span>
        {isDoodleName(category.doodle) && (
          <Doodle
            name={category.doodle}
            kind="widget"
            on="forum-category"
            hideBelow="phone"
            className="ml-auto w-10"
          />
        )}
      </header>
      <ul className="m-0 list-none p-0">
        {forums.map(({ forum, subforums }) => (
          <ForumRow key={forum.id} forum={forum} subforums={subforums} />
        ))}
      </ul>
    </section>
  );
}
