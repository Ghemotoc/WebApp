/**
 * ChapterEnd: what follows a chapter's text on the paper (story S1-E4-01a; the simplified design,
 * bundle CALM-5; design handover Step 3, "Reader on wide screens", point 4; board New-Reader).
 *
 * Top row: "End of chapter 14 of 15" (board B02; "End of chapter 14" until the writer marks a
 * last chapter, the CALM-6 rule in lib/chapterPlace.ts) in the meta style on the left and the one main button,
 * "Next: chapter 15", on the right. Under it the quiet Like (S1-E6-03) and "Comment on the
 * chapter", which takes the reader to the comment field under the chapter (it moves focus there),
 * then Share (S1-E4-05, fetched when the row nears the screen) and "Report chapter" (the shared
 * ReportButton, S1-E10-01, reportable type "chapter" with the chapter's row ID) as text buttons.
 * After the latest chapter: "That's the latest chapter so far." with a way back to the story, and
 * More by and Stories like this, fetched when the end comes near (S1-E15-06). CALM-6: after the
 * chapter the writer marked as the last, "That's the end of the story." instead; while a chapter
 * is scheduled, "Next chapter Thursday" (or "Last chapter Thursday") under it.
 * Who uses it: ChapterReaderPage. What it calls: LikeButton, ShareButtonWhenNear, ReportButton,
 * ChapterClassPointsWhenNear and StorySuggestionsWhenNear.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { ChapterClassPointsWhenNear } from '@/features/class-points/components/ChapterClassPointsWhenNear';
import { ReportButton } from '@/features/reporting/components/ReportButton';
import { StorySuggestionsWhenNear } from '@/features/suggestions/components/StorySuggestionsWhenNear';
import { ShareButtonWhenNear } from '@/features/sharing/components/ShareButtonWhenNear';

import type { ReaderChapter } from '../api/chapter';
import { nextChapterText } from '../lib/chapterPlace';
import { toSharedChapter } from '../lib/toSharedChapter';

import { LikeButton } from './LikeButton';
import { CommentIcon, ForwardArrowIcon } from './ReaderIcons';

/** The quiet 44 px button's classes ("Comment on the chapter", "Back to the story"). */
const quietButton =
  'inline-flex h-11 items-center gap-2 rounded-full button-glass px-4 type-body font-semibold text-ink-heading no-underline';

/**
 * Takes the reader to the chapter's comment field and gives it focus (handover Step 3, point 4),
 * or to the comments' heading while the field isn't on the page (comments off, still loading).
 */
function goToCommentField() {
  const section = document.querySelector('[aria-labelledby="comments-heading"]');
  const field = section?.querySelector('textarea') ?? null;
  if (field !== null) {
    field.focus();
    return;
  }
  document.getElementById('comments-heading')?.scrollIntoView({ block: 'start' });
}

/** The top row: where the reader is and the way on (or why there is none yet). */
function WayOn({ chapter }: { chapter: ReaderChapter }) {
  const { t } = useTranslation('reading');
  const storyAddress = `/s/${chapter.story.slug}`;
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-hairline pt-6">
      <p className="m-0 type-body text-ink-muted">
        {chapter.lastChapterNumber === null
          ? t('reader.endOfChapter', { number: chapter.number })
          : t('reader.endOfChapterOf', {
              number: chapter.number,
              total: chapter.lastChapterNumber,
            })}
      </p>
      {chapter.nextCode !== null ? (
        <Link
          to={`${storyAddress}/${chapter.nextCode}`}
          className="inline-flex h-11 items-center gap-2 rounded-full button-main px-4 type-body font-semibold no-underline"
        >
          {t('reader.readNext', { number: chapter.number + 1 })}
          <ForwardArrowIcon />
        </Link>
      ) : (
        <NoNextYet chapter={chapter} />
      )}
    </div>
  );
}

/**
 * After the latest chapter (CALM-6): "That's the end of the story." after the marked last chapter,
 * else "That's the latest chapter so far.", with "Next chapter Thursday" while one is scheduled.
 */
function NoNextYet({ chapter }: { chapter: ReaderChapter }) {
  const { t, i18n } = useTranslation('reading');
  const isEnd = chapter.lastChapterNumber !== null && chapter.number === chapter.lastChapterNumber;
  const nextLine = isEnd
    ? null
    : nextChapterText(t, chapter.nextChapter, i18n.language, new Date());
  return (
    <div className="flex flex-col gap-1">
      <p className="m-0 type-body text-ink-muted">
        {isEnd ? t('reader.endOfStory') : t('reader.latestChapter')}
      </p>
      {nextLine !== null && <p className="m-0 type-body text-ink-muted">{nextLine}</p>}
    </div>
  );
}

/**
 * Renders the end of the chapter.
 *
 * @returns the way on, the quiet buttons and what follows the latest chapter
 */
export function ChapterEnd({ chapter }: { chapter: ReaderChapter }) {
  const { t } = useTranslation('reading');
  const storyAddress = `/s/${chapter.story.slug}`;
  return (
    <>
      <WayOn chapter={chapter} />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <LikeButton address={{ storySlug: chapter.story.slug, chapterCode: chapter.code }} />
        <button type="button" onClick={goToCommentField} className={quietButton}>
          <CommentIcon />
          {t('reader.commentOnChapter')}
        </button>
        {chapter.nextCode === null && (
          <Link to={storyAddress} className={quietButton}>
            {t('reader.backToStory')}
          </Link>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <ShareButtonWhenNear chapter={toSharedChapter(chapter)} />
        <ReportButton
          itemType="chapter"
          itemReference={chapter.id}
          itemLabel={t('reader.reportLabel', {
            number: chapter.number,
            story: chapter.story.title,
          })}
        />
      </div>
      {/* CLASS-POINTS: class points, only on a chapter shared with a class that has them on. */}
      <div className="mt-8">
        <ChapterClassPointsWhenNear chapterId={chapter.id} />
      </div>
      {/* After the latest chapter, where to go next (S1-E15-06). */}
      {chapter.nextCode === null && (
        <div className="mt-12">
          <StorySuggestionsWhenNear storySlug={chapter.story.slug} />
        </div>
      )}
    </>
  );
}
