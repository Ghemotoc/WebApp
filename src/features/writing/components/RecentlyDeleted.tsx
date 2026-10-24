/**
 * RecentlyDeleted: the writer's deleted stories, with undo until the purge date (story S1-E3-05;
 * the same pattern as the board's "Recently deleted" chapters list, Chapters 4.4).
 *
 * Board values: a panel on the sand background, "Deleted … · gone for good on <date>" per row and
 * an outlined "Undo" button; the empty state is left out here (the panel shows only when there is
 * something to undo).
 * Who uses it: YourWritingPage. What it calls: useStoryActions → restore_my_story().
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';

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
    <section
      aria-labelledby="recently-deleted-heading"
      className="flex flex-col gap-3 rounded-card bg-panel p-5"
    >
      <Eyebrow>{t('recentlyDeleted.eyebrow')}</Eyebrow>
      <h2
        id="recently-deleted-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('recentlyDeleted.heading')}
      </h2>
      <p className="m-0 text-sm text-body">{t('recentlyDeleted.intro')}</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {stories.map((story) => (
          <li
            key={story.id}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-2"
          >
            <span className="flex flex-col">
              <span className="font-heading text-base font-bold text-heading">{story.title}</span>
              <span className="text-[13px] text-meta">
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
