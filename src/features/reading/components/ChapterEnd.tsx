/**
 * ChapterEnd: what follows a chapter's text (story S1-E4-01a; board 3.5).
 *
 * Board values: an eyebrow-style line "End of chapter 14" between two fine rules, then "Read chapter 15 ›"
 * as the solid 48 px button. After the latest chapter: "That's the latest chapter so far." and
 * a way back to the story. The row starts with Like (S1-E6-03) and ends with "Report chapter":
 * the shared `<ReportButton>` (S1-E10-01; reportable type "chapter", with the chapter's row ID),
 * pushed to the right as on the board. Share comes after Like (S1-E4-05): the system share sheet
 * on a phone, or the copied link and "Share this chapter" on a computer; it is fetched when
 * the row nears the screen (ShareButtonWhenNear). After the latest chapter, "More by" and "Stories
 * like this" follow, fetched when the end comes near (StorySuggestionsWhenNear, S1-E15-06).
 * Who uses it: ChapterReaderPage. What it calls: LikeButton, ShareButtonWhenNear, ReportButton and
 * StorySuggestionsWhenNear.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { ReportButton } from '@/features/reporting/components/ReportButton';
import { StorySuggestionsWhenNear } from '@/features/suggestions/components/StorySuggestionsWhenNear';
import { ShareButtonWhenNear } from '@/features/sharing/components/ShareButtonWhenNear';

import type { ReaderChapter } from '../api/chapter';
import { toSharedChapter } from '../lib/toSharedChapter';

import { LikeButton } from './LikeButton';
import { ForwardIcon } from './ReaderIcons';

/**
 * Renders the end of the chapter.
 *
 * @returns the divider and the way on
 */
export function ChapterEnd({ chapter }: { chapter: ReaderChapter }) {
  const { t } = useTranslation('reading');
  const storyAddress = `/s/${chapter.story.slug}`;
  return (
    <>
      <div className="mt-10 flex items-center gap-4 eyebrow-type text-meta lg:mr-20">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        <p className="m-0">{t('reader.endOfChapter', { number: chapter.number })}</p>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2.5 lg:mr-20">
        <LikeButton address={{ storySlug: chapter.story.slug, chapterCode: chapter.code }} />
        <ShareButtonWhenNear chapter={toSharedChapter(chapter)} />
        {chapter.nextCode !== null ? (
          <Link
            to={`${storyAddress}/${chapter.nextCode}`}
            className="inline-flex h-12 items-center gap-1.5 rounded-full button-main pr-3.5 pl-[22px] text-[15px] font-semibold no-underline"
          >
            {t('reader.readNext', { number: chapter.number + 1 })}
            <ForwardIcon />
          </Link>
        ) : (
          <>
            <p className="m-0 text-[15px] text-body">{t('reader.latestChapter')}</p>
            <Link
              to={storyAddress}
              className="inline-flex h-12 items-center rounded-full button-glass px-5 text-[15px] font-semibold no-underline"
            >
              {t('reader.backToStory')}
            </Link>
          </>
        )}
        <span className="ml-auto">
          <ReportButton
            itemType="chapter"
            itemReference={chapter.id}
            itemLabel={t('reader.reportLabel', {
              number: chapter.number,
              story: chapter.story.title,
            })}
          />
        </span>
      </div>
      {/* After the latest chapter, where to go next (S1-E15-06). */}
      {chapter.nextCode === null && (
        <div className="mt-12 lg:mr-20">
          <StorySuggestionsWhenNear storySlug={chapter.story.slug} />
        </div>
      )}
    </>
  );
}
