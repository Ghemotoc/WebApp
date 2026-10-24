/**
 * StoryHeader: the cover, pills, title, writer, blurb and tags at the top of the story page
 * (story S1-E3-05; board Story 3.4, the story header).
 *
 * Board values: a 220 × 308 cover, the pill row (Fiction, Ongoing, the rating and label pills
 * from S1-E3-06; "Web and app" joins with S1-E3-08), the H1 in Bricolage 800 at
 * clamp(36px, 4.4vw, 64px), "by <name>" at 16 px, the blurb at 17 px / 1.6 up to 640 px wide,
 * the content note box when the writer left one (S1-E3-06: readers see it before they open the
 * story), the tag chips and "Follow story" (S1-E6-05). The stats row and the other action buttons
 * arrive with likes and the library (S1-E6-03, S1-E4-03).
 * Who uses it: StoryPage.
 */
import { useTranslation } from 'react-i18next';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { InfoPill } from '@/components/ui/InfoPill';
import { FollowButton } from '@/features/people/components/FollowButton';

import type { StoryPageData } from '../api/storyPage';

import { StoryLabelPills } from './StoryLabelPills';

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
        <StoryLabelPills labels={story.labels} />
      </div>
      <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em] break-words">
        {story.title}
      </h1>
      <p className="m-0 text-base text-body">
        {t('storyPage.by')}{' '}
        <strong className="font-bold text-heading">{story.writer.displayName}</strong>
      </p>
      {/* Follow the story, so new chapters reach the reader (S1-E6-05); not on one's own. */}
      {!story.isOwner && story.isPublic && (
        <FollowButton target={{ kind: 'story', slug: story.slug }} targetLabel={story.title} />
      )}
      {story.blurb !== '' && (
        <p className="m-0 max-w-[640px] text-[17px] leading-[1.6] text-body">{story.blurb}</p>
      )}
      {story.labels.contentNote !== '' && (
        <div className="flex max-w-[640px] flex-col gap-1 rounded-card border border-border bg-tint px-4 py-3">
          <p className="m-0 font-eyebrow text-sm text-eyebrow">
            {t('storyPage.contentNoteHeading')}
          </p>
          <p className="m-0 text-[15px] leading-normal text-body">{story.labels.contentNote}</p>
        </div>
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
