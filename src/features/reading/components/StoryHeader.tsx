/**
 * StoryHeader: the cover, pills, title, writer, blurb and tags at the top of the story page
 * (story S1-E3-05; board Story 3.4, the story header).
 *
 * Board values: a 220 × 308 cover, the pill row (Fiction, Ongoing; the rating and "Web and app"
 * join with S1-E3-06 and S1-E3-08), the H1 in Bricolage 800 at clamp(36px, 4.4vw, 64px), "by
 * <name>" at 16 px, the blurb at 17 px / 1.6 up to 640 px wide, and the tag chips. The stats
 * row and the action buttons arrive with chapters, follows and likes (S1-E3-03, S1-E6).
 * Who uses it: StoryPage.
 */
import { useTranslation } from 'react-i18next';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { InfoPill } from '@/components/ui/InfoPill';

import type { StoryPageData } from '../api/storyPage';

/**
 * Renders the header.
 *
 * @returns the header block
 */
export function StoryHeader({ story }: { story: StoryPageData }) {
  const { t } = useTranslation('reading');
  const cover = resolveCoverChoice(story);
  return (
    <header className="flex flex-col gap-5">
      <DrawnCover
        title={story.title}
        penName={story.writer.displayName}
        choice={cover}
        size="card"
        isDecorative
        className="w-[220px]"
      />
      <div className="flex flex-wrap gap-1.5">
        <InfoPill tone="plum">
          {t(`categories.${story.categorySlug}`, {
            ns: 'writing',
            defaultValue: story.categorySlug,
          })}
        </InfoPill>
        <InfoPill tone={story.completionStatus === 'completed' ? 'gold' : 'sage'}>
          {t(`status.${story.completionStatus}`, { ns: 'writing' })}
        </InfoPill>
      </div>
      <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words">
        {story.title}
      </h1>
      <p className="m-0 text-base text-body">
        {t('storyPage.by')}{' '}
        <strong className="font-bold text-heading">{story.writer.displayName}</strong>
      </p>
      {story.blurb !== '' && (
        <p className="m-0 max-w-[640px] text-[17px] leading-[1.6] text-body">{story.blurb}</p>
      )}
      {story.tags.length > 0 && (
        <ul aria-label={t('storyPage.tags')} className="m-0 flex list-none flex-wrap gap-2 p-0">
          {story.tags.map((tag) => (
            <li key={tag}>
              <InfoPill tone="neutral">{tag}</InfoPill>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
