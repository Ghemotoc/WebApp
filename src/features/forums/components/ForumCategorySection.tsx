/**
 * ForumCategorySection: one category on the forum index: its name, "4 forums", "Mark as read" and
 * its forums (bundle FORUMS-1, part a; S1-E8-01; board 5.1). Categories are text only, with no
 * picture (bundle G4; DESIGN thread, 8 Nov 2026).
 * Since CALM-7c (board simplified/New-Together) a category is not a card: a heading row like a
 * shelf's (the name, then the count and "Mark as read" at the right) and hairline rows under it.
 * The colour bar beside the name is gone with the card.
 *
 * Who uses it: ForumsPage. What it calls: ForumRow for each forum.
 * Part d adds "Mark as read" for the category and every forum inside it (S1-E8-04): MarkReadButton.
 */
import type { ForumCategory } from '../lib/forumTree';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumRow } from './ForumRow';
import { MarkReadButton } from './MarkReadButton';

/**
 * Renders the category.
 *
 * @param group - the category and its forums
 * @returns a section, named by the category's heading
 */
export function ForumCategorySection({ group }: { group: ForumCategory }) {
  const { t } = useForumsTranslation();
  const { category, forums } = group;
  const headingId = `forum-category-${category.slug}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      {/* The heading row wraps on a phone, so "Mark as read" moves under the name instead of being cut off. */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className="m-0 type-heading">
          {category.name}
        </h2>
        <span className="flex flex-wrap items-center gap-x-4">
          <span className="type-meta">{t('forumCount', { count: forums.length })}</span>
          <MarkReadButton forumSlug={category.slug} forumName={category.name} look="text" />
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
