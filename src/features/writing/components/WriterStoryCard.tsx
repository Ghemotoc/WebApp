/**
 * WriterStoryCard: one of the writer's own stories on "Your writing" (story S1-E3-01; board
 * WriterDashboard 4.1, "Story by story").
 *
 * Board values: a card with the 96 × 130 drawn cover on the left, the title in Bricolage, the
 * blurb, the chips (category, Ongoing or Completed from S1-E3-05, the language, the label pills
 * from S1-E3-06), the tags, the
 * lock line "Only you can see this story until you publish its first chapter" while nothing is
 * published, and the buttons: "Write chapter one" or "Continue chapter n" (S1-E3-02a), "Story
 * settings" and "See story page" (S1-E3-05); "Manage chapters" (S1-E3-04). Under it, once a chapter
 * exists, the numbers per chapter (ChapterStatsTable, S1-E3-07).
 * Who uses it: YourWritingPage.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';
import { InfoPill } from '@/components/ui/InfoPill';
import { StoryLabelPills } from '@/features/reading/components/StoryLabelPills';
import { TagNames } from '@/features/tags/components/TagNames';

import type { DashboardChapter } from '../api/dashboard';
import type { MyStory } from '../api/stories';

import { ChapterStatsTable } from './ChapterStatsTable';
import { NewChapterButton } from './NewChapterButton';

/** What the card needs: the story and the cover to draw (YourWritingPage works it out per row). */
export interface WriterStoryCardProps {
  story: MyStory;
  /** The writer's drawn choice, or the automatic design from the ID (S1-E3-13). */
  cover: DrawnCoverChoice;
  /** The story's chapters with their numbers (S1-E3-07); empty while they load. */
  chapterNumbers: DashboardChapter[];
}

/** "Write chapter one" or "Continue chapter n" (S1-E3-02a), "Manage chapters" once there is a chapter (S1-E3-04), "Story settings" and "See story page" (S1-E3-05). */
function StoryCardLinks({ story }: { story: MyStory }) {
  const { t } = useTranslation('writing');
  const { slug } = story;
  const latestChapter = story.chapters.at(-1);
  return (
    <div className="mt-1 flex flex-wrap items-center gap-3">
      <WriteChapterLink slug={slug} latestChapter={latestChapter} />
      {latestChapter !== undefined && (
        <Link
          to={`/write/s/${slug}/chapters`}
          className="inline-flex h-11 items-center rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint"
        >
          {t('storyCard.manageChapters')}
        </Link>
      )}
      <Link
        to={`/write/s/${slug}/settings`}
        className="inline-flex h-11 items-center rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint"
      >
        {t('storyCard.settings')}
      </Link>
      {/* "Plan" beside "Write": the story's side in Story Atlas (S1-E17 notes). */}
      <Link
        to={`/plan/s/${slug}`}
        className="inline-flex h-11 items-center rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint"
      >
        {t('storyCard.plan')}
      </Link>
      <Link to={`/s/${slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold">
        {t('storyCard.seePage')}
      </Link>
    </div>
  );
}

/** The primary button: a new story's "Write chapter one" makes the chapter on the way (NewChapterButton). */
function WriteChapterLink({
  slug,
  latestChapter,
}: {
  slug: string;
  latestChapter: MyStory['chapters'][number] | undefined;
}) {
  const { t } = useTranslation('writing');
  if (latestChapter === undefined) return <NewChapterButton slug={slug} />;
  return (
    <Link
      to={`/write/s/${slug}/c/${latestChapter.code}`}
      className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
    >
      {t('storyCard.continueChapter', { number: latestChapter.position })}
    </Link>
  );
}

/** The card's top row: cover, title, blurb, pills, tags and buttons. */
function StoryCardSummary({ story, cover }: { story: MyStory; cover: DrawnCoverChoice }) {
  const { t } = useTranslation('writing');
  return (
    <div className="flex gap-5">
      <StoryCoverArt
        story={story}
        className="w-24 shrink-0 self-start"
        drawn={
          <DrawnCover
            title={story.title}
            choice={cover}
            size="tile"
            isDecorative
            className="w-24 shrink-0 self-start"
          />
        }
      />
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
          <InfoPill tone={story.completionStatus === 'completed' ? 'gold' : 'sage'}>
            {t(`status.${story.completionStatus}`)}
          </InfoPill>
          <InfoPill tone="neutral">
            <span lang={story.languageCode}>
              {t(`languages.${story.languageCode}`, { defaultValue: story.languageCode })}
            </span>
          </InfoPill>
          <StoryLabelPills
            labels={{ ...story, aiUndisclosedLabelled: story.aiUndisclosedLabelledAt !== null }}
          />
        </div>
        {story.tags.length > 0 && (
          <p className="m-0 text-[13px] text-meta">
            <TagNames tags={story.tags} />
          </p>
        )}
        {story.firstPublishedAt === null && (
          <p className="m-0 text-[13px] text-meta">{t('yourWriting.onlyYou')}</p>
        )}
        <StoryCardLinks story={story} />
      </div>
    </div>
  );
}

/**
 * Renders the card.
 *
 * @returns the story card
 */
export function WriterStoryCard({ story, cover, chapterNumbers }: WriterStoryCardProps) {
  return (
    <article
      aria-labelledby={`story-${story.id}-title`}
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <StoryCardSummary story={story} cover={cover} />
      {chapterNumbers.length > 0 && (
        <ChapterStatsTable storyTitle={story.title} chapters={chapterNumbers} />
      )}
    </article>
  );
}
