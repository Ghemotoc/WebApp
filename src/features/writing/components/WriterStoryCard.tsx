/**
 * WriterStoryCard: one of the writer's own stories on "Your writing" (story S1-E3-01; board
 * WriterDashboard 4.1, "Story by story").
 *
 * Board values: a card with the 96 × 130 drawn cover on the left, the title in Bricolage, the
 * blurb, the chips (category; status joins with S1-E3-05), a meta line and the buttons. In this
 * story a new story has no chapters yet, so the card shows the lock line "Only you can see this
 * story until you publish its first chapter"; "Write chapter one" (S1-E3-02a), "Manage chapters"
 * (S1-E3-03) and "Story settings" (S1-E3-05) join with their stories.
 * Who uses it: YourWritingPage.
 */
import { useTranslation } from 'react-i18next';

import { DrawnCover } from '@/components/covers/DrawnCover';
import { InfoPill } from '@/components/ui/InfoPill';

import type { MyStory } from '../api/stories';

/**
 * Renders the card.
 *
 * @returns the story card
 */
export function WriterStoryCard({ story }: { story: MyStory }) {
  const { t } = useTranslation('writing');
  return (
    <article
      aria-labelledby={`story-${story.id}-title`}
      className="flex gap-5 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      {story.drawnCover !== null ? (
        <DrawnCover
          title={story.title}
          choice={story.drawnCover}
          size="tile"
          isDecorative
          className="w-24 shrink-0 self-start"
        />
      ) : (
        // S1-E3-13 draws the automatic cover from the story's ID.
        <span
          aria-hidden="true"
          className="flex aspect-[5/8] w-24 shrink-0 items-center justify-center self-start rounded-cover border border-dashed border-dashed-border bg-panel p-2 text-center text-[11px] text-meta"
        >
          {t('preview.automaticCover')}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3
          id={`story-${story.id}-title`}
          className="m-0 font-heading text-[22px] leading-[1.1] font-bold text-heading break-words"
        >
          {story.title}
        </h3>
        {story.blurb !== '' && (
          <p className="m-0 text-sm leading-normal text-body">{story.blurb}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          <InfoPill tone="plum">
            {t(`categories.${story.categorySlug}`, { defaultValue: story.categorySlug })}
          </InfoPill>
          <InfoPill tone="neutral">
            <span lang={story.languageCode}>
              {t(`languages.${story.languageCode}`, { defaultValue: story.languageCode })}
            </span>
          </InfoPill>
        </div>
        {story.tags.length > 0 && (
          <p className="m-0 text-[13px] text-meta">{story.tags.join(' · ')}</p>
        )}
        {story.firstPublishedAt === null && (
          <p className="m-0 text-[13px] text-meta">{t('yourWriting.onlyYou')}</p>
        )}
      </div>
    </article>
  );
}
