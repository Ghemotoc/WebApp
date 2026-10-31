/**
 * TeaserPage: a shared chapter link opened by a visitor who isn't logged in, screen 3.8
 * (story S1-E4-04; design/boards/Teaser.dc.html).
 *
 * What it shows, top to bottom, as on the board:
 * - TeaserStoryCard: the cover, "Shared with you · chapter n of N", the story's title (the H1),
 *   the pen name, the blurb and the pills;
 * - the chapter: "Chapter n", its title, "n minutes to read · You're reading the first part" and
 *   the teaser, the first whole paragraphs up to 600 words (decided 23 Oct 2026), cut by
 *   get_chapter() on the server so the rest never reaches the browser. When the chapter goes on,
 *   the text fades out at the bottom with a CSS mask (the words stay real text, readable by
 *   screen readers);
 * - SignUpPrompt: log in to read on, with the March invited-only wording;
 * - the copy notice: the teaser is chapter text too, so right-click and copying are off on it
 *   with the same honest note (S1-E4-06a).
 * Not here: the reader's bar and progress line (the teaser is one short page), reads counting
 * (record_chapter_read() refuses visitors: a teaser isn't a read), and the banner slot. 16+ and
 * 18+ stories never reach this page: get_chapter() answers nothing and NoPreviewNotice shows.
 * Who shows it: ChapterReaderPage, when get_chapter() answers with is_teaser.
 * What it calls: useStoryPage → get_story_page() for the card (cached with the story page).
 */
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';

import type { ReaderChapter } from '../api/chapter';
import { useStoryPage } from '../hooks/useStoryPage';

import { CopyNotice } from './CopyNotice';
import { ProtectedChapterText } from './ProtectedChapterText';
import { SignUpPrompt } from './SignUpPrompt';
import { TeaserStoryCard } from './TeaserStoryCard';

/** The fade at the end of a teaser that goes on: the last 200 px of text become transparent. */
const fadeClass = '[mask-image:linear-gradient(to_bottom,black_calc(100%-200px),transparent)]';

/** The chapter's heading and the teaser text. */
function TeaserChapter({ chapter }: { chapter: ReaderChapter }) {
  const { t } = useTranslation('reading');
  const metaParts = [t('reader.minutes', { count: chapter.minutesToRead })];
  if (chapter.textContinues) metaParts.push(t('teaser.firstPart'));
  return (
    <article aria-labelledby="teaser-chapter-title" className="flex flex-col gap-2 lg:pr-20">
      <Eyebrow>{t('teaser.chapterEyebrow', { number: chapter.number })}</Eyebrow>
      <h2
        id="teaser-chapter-title"
        lang={chapter.story.languageCode}
        className="m-0 font-heading text-[28px] leading-tight font-bold text-heading"
      >
        {chapter.title === '' ? t('reader.untitled') : chapter.title}
      </h2>
      <p className="m-0 pb-4 text-sm text-meta">{metaParts.join(' · ')}</p>
      <div className={chapter.textContinues ? fadeClass : undefined}>
        <ProtectedChapterText
          markdown={chapter.body ?? ''}
          language={chapter.story.languageCode}
          className="tmc-chapter-text--reader"
          pictures={chapter.pictures}
          embeds={chapter.embeds}
          writerName={chapter.story.writer.displayName}
          canReportMedia
        />
      </div>
    </article>
  );
}

/**
 * Renders the page.
 *
 * @returns the story card, the teaser, the prompt and the copy notice
 */
export function TeaserPage({ chapter }: { chapter: ReaderChapter }) {
  const { t } = useTranslation('reading');
  const { story } = useStoryPage(chapter.story.slug);
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-10">
      <title>
        {t('reader.documentTitle', { chapter: chapter.title, story: chapter.story.title })}
      </title>
      {story !== null && (
        <TeaserStoryCard
          story={story}
          chapterNumber={chapter.number}
          chapterTotal={chapter.total}
        />
      )}
      <TeaserChapter chapter={chapter} />
      <SignUpPrompt storySlug={chapter.story.slug} chaptersAfter={chapter.total - chapter.number} />
      <CopyNotice penName={chapter.story.writer.displayName} />
    </div>
  );
}
