/**
 * ChapterEnd: what follows a chapter's text (story S1-E4-01a; board 3.5).
 *
 * Board values: a Cutive line "End of chapter 14" between two fine rules, then "Read chapter 15 ›"
 * as the solid 48 px button. After the latest chapter: "That's the latest chapter so far." and
 * a way back to the story. Like (S1-E6-03), Share (S1-E4-05), the copy notice (S1-E4-06a) and
 * the comments (S1-E6-01) join here in their own stories.
 * Report chapter: Lane C's shared `<ReportButton>` (S1-E10-01) goes at the end of the row below,
 * as on the board ("Report chapter", reportable type "chapter").
 * Who uses it: ChapterReaderPage.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { ReaderChapter } from '../api/chapter';

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
      <div className="mt-10 flex items-center gap-4 font-eyebrow text-sm leading-[1.3] text-meta lg:mr-20">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        <p className="m-0">{t('reader.endOfChapter', { number: chapter.number })}</p>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2.5 lg:mr-20">
        {chapter.nextCode !== null ? (
          <Link
            to={`${storyAddress}/${chapter.nextCode}`}
            className="inline-flex h-12 items-center gap-1.5 rounded-full bg-primary pr-3.5 pl-[22px] text-[15px] font-semibold text-on-primary no-underline hover:opacity-90"
          >
            {t('reader.readNext', { number: chapter.number + 1 })}
            <ForwardIcon />
          </Link>
        ) : (
          <>
            <p className="m-0 text-[15px] text-body">{t('reader.latestChapter')}</p>
            <Link
              to={storyAddress}
              className="inline-flex h-12 items-center rounded-full border border-control-border bg-surface px-5 text-[15px] font-semibold text-heading no-underline hover:bg-tint"
            >
              {t('reader.backToStory')}
            </Link>
          </>
        )}
        {/* Report chapter: Lane C's <ReportButton type="chapter"> (S1-E10-01) goes here, last in the row. */}
      </div>
    </>
  );
}
