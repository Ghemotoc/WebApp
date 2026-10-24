/**
 * TeaserStoryCard: the story at the top of a shared chapter link, for a visitor who isn't
 * logged in (story S1-E4-04; board 3.8, Teaser.dc.html, the header card).
 *
 * Board values: a white card with 24 px corners and a soft shadow; the cover at 112 px wide on
 * the left (on top on phones), with its title only; the eyebrow "Shared with you · chapter 1 of 15"; the story's title
 * as the page's H1 in Bricolage 800; "by <pen name>"; the blurb at 15 px / 1.6; the category and
 * status pills. The board's "15 chapters" and "1.2k reads" pills wait for public numbers
 * (S1-E3-07, after March). The open-book doodle sits on the card's top edge, as on the board,
 * from 1000 px up, clear of the text (DoD design rules; decided 18 Oct 2026, 10:46).
 * Who uses it: TeaserPage. What it reads: the story page's data (get_story_page()) and the
 * chapter's number and total.
 */
import { useTranslation } from 'react-i18next';

import { resolveCoverChoice } from '@/components/covers/automaticCover';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { Doodle } from '@/components/ui/Doodle';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';

import type { StoryPageData } from '../api/storyPage';

/** What the card needs. */
interface TeaserStoryCardProps {
  story: StoryPageData;
  chapterNumber: number;
  chapterTotal: number;
}

/**
 * Renders the card.
 *
 * @returns the story's card, with the page's H1
 */
export function TeaserStoryCard({ story, chapterNumber, chapterTotal }: TeaserStoryCardProps) {
  const { t } = useTranslation('reading');
  return (
    <section
      aria-labelledby="teaser-story-title"
      className="relative flex flex-col gap-6 rounded-[24px] border border-border bg-surface p-6 shadow-[0_8px_24px_rgba(72,28,95,0.08)] sm:flex-row sm:p-7"
    >
      {/* The small "tile" size keeps the full title on a 112 px cover (DoD: never clipped); the
          pen name is beside it, so the cover shows the title only, as on the board. */}
      <DrawnCover
        title={story.title}
        choice={resolveCoverChoice(story)}
        size="tile"
        isDecorative
        className="w-[112px] shrink-0"
      />
      <div className="flex min-w-0 flex-col gap-2.5 lg:pr-16">
        <Eyebrow>{t('teaser.shared', { number: chapterNumber, total: chapterTotal })}</Eyebrow>
        <h1
          id="teaser-story-title"
          lang={story.languageCode}
          className="m-0 text-[clamp(32px,3.6vw,48px)] leading-[1.02] font-extrabold tracking-[-0.025em] break-words"
        >
          {story.title}
        </h1>
        <p className="m-0 text-sm text-body">
          {t('storyPage.by')}{' '}
          <strong className="font-bold text-heading">{story.writer.displayName}</strong>
        </p>
        {story.blurb !== '' && (
          <p lang={story.languageCode} className="m-0 text-[15px] leading-[1.6] text-body">
            {story.blurb}
          </p>
        )}
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
      </div>
      <Doodle
        name="open-book"
        kind="widget"
        on="TeaserStoryCard"
        hideBelow="wide"
        className="absolute -top-8 right-6 w-14 rotate-6"
      />
    </section>
  );
}
