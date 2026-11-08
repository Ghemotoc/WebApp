/**
 * ForumCategorySection: one category card on the forum index: its colour bar, name, "4 forums"
 * and its forums (bundle FORUMS-1, part a; S1-E8-01; board 5.1). Categories are text only, with no
 * picture (bundle G4; DESIGN thread, 8 Nov 2026).
 *
 * Who uses it: ForumsPage. What it calls: ForumRow for each forum.
 * Part d adds "Mark as read" for the category and every forum inside it (S1-E8-04): MarkReadButton.
 */
import type { ForumAccent } from '../api/forumIndex';
import type { ForumCategory } from '../lib/forumTree';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumRow } from './ForumRow';
import { MarkReadButton } from './MarkReadButton';

/** The colour bar beside the name, in each accent's dark pill colour (contrast 3:1 or more). */
const accentBars: Record<ForumAccent, string> = {
  plum: 'bg-(--pill-plum-text)',
  sky: 'bg-(--pill-sky-text)',
  blush: 'bg-(--pill-blush-text)',
  sage: 'bg-(--pill-sage-text)',
  gold: 'bg-(--pill-gold-text)',
};

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
        <span className="ml-auto">
          <MarkReadButton forumSlug={category.slug} forumName={category.name} />
        </span>
      </header>
      <ul className="m-0 list-none p-0">
        {forums.map(({ forum, subforums }) => (
          <ForumRow key={forum.id} forum={forum} subforums={subforums} />
        ))}
      </ul>
    </section>
  );
}
