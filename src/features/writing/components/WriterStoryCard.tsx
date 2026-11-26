/**
 * WriterStoryCard: one of the writer's own stories on "Writing" (story S1-E3-01; board
 * WriterDashboard 4.1, "Story by story").
 *
 * Simplified look (bundle CALM-7c, board simplified/New-Write): no card. A hairline above each
 * story, the 120 px cover on the left (64 px on phones) and beside it the title, the meta line
 * ("Ongoing · Fiction · No AI · 6 chapters published · last updated 10 October 2026",
 * writerStoryFacts), the blurb and the actions (bundle CALM-9a, board D01, user story 5.1).
 * Once a chapter is published: "Continue chapter n" (S1-E3-02a) and "Story Atlas" as quiet buttons
 * (quiet, because "Continue draft" at the top is the page's one main button), then "Manage
 * chapters" (S1-E3-04), "Story settings" (S1-E3-05) and "See story page" as text links, and the
 * line "In the Atlas: Characters · Relationships · Story world · Storyline" (StoryCardAtlasLine).
 * While nothing is published: "Write chapter one" and "Story settings" only, then "Only you can
 * see this story until you publish its first chapter. No numbers yet." Under them, once a chapter
 * exists, the numbers per chapter (ChapterStatsTable, S1-E3-07). The tags are left out, as on the
 * board; story settings show them.
 * Who uses it: YourWritingPage. What it calls: writerStoryFacts, storyLastUpdatedAt,
 * StoryCardAtlasLine, ChapterStatsTable.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { ActionIcon } from '@/components/icons/ActionIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { MetaLine } from '@/components/ui/MetaLine';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';
import { formatLocalDate } from '@/lib/local-time';

import type { DashboardChapter } from '../api/dashboard';
import type { MyStory } from '../api/stories';
import { storyLastUpdatedAt } from '../lib/dashboardChapters';
import { writerStoryFacts } from '../lib/writerStoryFacts';

import { ChapterStatsTable } from './ChapterStatsTable';
import { NewChapterButton } from './NewChapterButton';
import { StoryCardAtlasLine } from './StoryCardAtlasLine';
import { atlasEntryAddress } from '@/features/atlas/lib/atlasSections';

/** What the card needs: the story and the cover to draw (YourWritingPage works it out per row). */
export interface WriterStoryCardProps {
  story: MyStory;
  /** The writer's drawn choice, or the automatic design from the ID (S1-E3-13). */
  cover: DrawnCoverChoice;
  /** The story's chapters with their numbers (S1-E3-07); empty while they load. */
  chapterNumbers: DashboardChapter[];
}

/** The quiet button's classes, for "Continue chapter n" and "Story Atlas". */
const quietLink = buttonClassName({ variant: 'secondary' });

/** The text link's classes, for the card's other links. */
const textLink = buttonClassName({ variant: 'text' });

/** "Write chapter one" (it makes the chapter on the way) or "Continue chapter n", both quiet. */
function WriteChapterLink({
  slug,
  latestChapter,
}: {
  slug: string;
  latestChapter: MyStory['chapters'][number] | undefined;
}) {
  const { t } = useTranslation('writing');
  if (latestChapter === undefined) return <NewChapterButton slug={slug} variant="secondary" />;
  return (
    <Link to={`/write/s/${slug}/c/${latestChapter.code}`} className={quietLink}>
      <ActionIcon name="pen" />
      {t('storyCard.continueChapter', { number: latestChapter.position })}
    </Link>
  );
}

/**
 * The actions of a story with nothing published yet (board D01): "Write chapter one" and "Story
 * settings", then the line saying only the writer sees it and there are no numbers yet.
 */
function UnpublishedStoryLinks({ story }: { story: MyStory }) {
  const { t } = useTranslation('writing');
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <WriteChapterLink slug={story.slug} latestChapter={story.chapters.at(-1)} />
        <Link to={`/write/s/${story.slug}/settings`} className={textLink}>
          {t('storyCard.settings')}
        </Link>
      </div>
      <p className="m-0 type-meta">
        {t('yourWriting.onlyYou')} {t('dashboard.noNumbersYet')}
      </p>
    </div>
  );
}

/**
 * The story's actions (bundle CALM-9a, board D01, approved by Robert on 22 Nov 2026): "Continue
 * chapter n" and "Story Atlas" as quiet buttons with their icons, because they are the two places a
 * writer goes most; "Manage chapters", "Story settings" and "See story page" as text links; and
 * under them the line "In the Atlas: Characters · Relationships · Story world · Storyline".
 */
function StoryCardLinks({ story }: { story: MyStory }) {
  const { t } = useTranslation('writing');
  const { slug } = story;
  const latestChapter = story.chapters.at(-1);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <WriteChapterLink slug={slug} latestChapter={latestChapter} />
        {/* The story's side in Story Atlas, beside "Write" (S1-E17 notes). */}
        <Link to={atlasEntryAddress(slug)} className={quietLink}>
          <ActionIcon name="map" />
          {t('storyCard.atlas')}
        </Link>
        {latestChapter !== undefined && (
          <Link to={`/write/s/${slug}/chapters`} className={textLink}>
            {t('storyCard.manageChapters')}
          </Link>
        )}
        <Link to={`/write/s/${slug}/settings`} className={textLink}>
          {t('storyCard.settings')}
        </Link>
        <Link to={`/s/${slug}`} className={textLink}>
          {t('storyCard.seePage')}
        </Link>
      </div>
      <StoryCardAtlasLine slug={slug} />
    </div>
  );
}

/** The cover, decorative because the title sits beside it as text (DoD covers). */
function StoryCardCover({ story, cover }: { story: MyStory; cover: DrawnCoverChoice }) {
  const coverWidth = 'w-16 shrink-0 self-start md:w-[120px]';
  return (
    <StoryCoverArt
      story={story}
      className={coverWidth}
      drawn={
        <DrawnCover
          title={story.title}
          choice={cover}
          size="tile"
          isDecorative
          className={coverWidth}
        />
      }
    />
  );
}

/** The words beside the cover: title, meta line, blurb and the actions. */
function StoryCardSummary({
  story,
  lastUpdatedAt,
}: {
  story: MyStory;
  lastUpdatedAt: string | null;
}) {
  const { t, i18n } = useTranslation('writing');
  const lastUpdated =
    lastUpdatedAt === null ? null : formatLocalDate(new Date(lastUpdatedAt), i18n.language);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3
          id={`story-${story.id}-title`}
          className="m-0 type-subheading break-words text-ink-heading"
        >
          {story.title}
        </h3>
        <MetaLine facts={writerStoryFacts(story, t, lastUpdated)} />
      </div>
      {story.blurb !== '' && (
        <p className="m-0 max-w-[72ch] type-body text-ink-muted">{story.blurb}</p>
      )}
      {story.firstPublishedAt === null ? (
        <UnpublishedStoryLinks story={story} />
      ) : (
        <StoryCardLinks story={story} />
      )}
    </div>
  );
}

/**
 * Renders the story.
 *
 * @param props - the story, its cover and its chapters' numbers
 * @returns the article, with the chapter table once a chapter exists
 */
export function WriterStoryCard({ story, cover, chapterNumbers }: WriterStoryCardProps) {
  return (
    <article
      aria-labelledby={`story-${story.id}-title`}
      className="flex flex-col gap-4 border-t border-hairline pt-6 pb-8"
    >
      <div className="flex gap-4 md:gap-6">
        <StoryCardCover story={story} cover={cover} />
        <StoryCardSummary story={story} lastUpdatedAt={storyLastUpdatedAt(chapterNumbers)} />
      </div>
      {chapterNumbers.length > 0 && (
        <ChapterStatsTable storyTitle={story.title} chapters={chapterNumbers} />
      )}
    </article>
  );
}
