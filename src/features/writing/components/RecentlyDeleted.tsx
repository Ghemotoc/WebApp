/**
 * RecentlyDeleted: the writer's deleted stories, with undo until the purge date (story S1-E3-05;
 * the same pattern as the board's "Recently deleted" chapters list, Chapters 4.4).
 *
 * Simplified look (bundle CALM-7c, board simplified/New-Write): a plain heading, the line about
 * the 30 days, and one row per story split by the hairline: the title, a meta line "Gone for good
 * on <date>" and a quiet "Undo". No panel and no eyebrow. The section shows only when there is
 * something to undo.
 * Who uses it: YourWritingPage. What it calls: useStoryActions → restore_my_story().
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import type { MyStory } from '../api/stories';
import { useStoryActions } from '../hooks/useStoryActions';
import { purgeDateFor } from '../lib/purgeDate';

/**
 * Renders the panel, or nothing when no story is deleted.
 *
 * @returns the panel
 */
export function RecentlyDeleted({ stories }: { stories: MyStory[] }) {
  const { t, i18n } = useTranslation('writing');
  const { restoreStory } = useStoryActions();
  if (stories.length === 0) return null;
  return (
    <section aria-labelledby="recently-deleted-heading" className="flex flex-col gap-2">
      <h2 id="recently-deleted-heading" className="m-0 type-heading text-ink-heading">
        {t('recentlyDeleted.heading')}
      </h2>
      <p className="m-0 type-body text-ink-muted">{t('recentlyDeleted.intro')}</p>
      <ul className="m-0 list-none p-0">
        {stories.map((story) => (
          <li
            key={story.id}
            className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline py-4 first:border-t-0"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="type-body leading-5 font-semibold break-words text-ink-heading">
                {story.title}
              </span>
              <span className="type-meta">
                {t('recentlyDeleted.goneOn', {
                  date: purgeDateFor(story.deletedAt ?? '', i18n.language),
                })}
              </span>
            </span>
            <Button
              variant="secondary"
              disabled={restoreStory.isPending}
              onClick={() => restoreStory.mutate(story.slug)}
            >
              {t('deleteStory.undo')}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
