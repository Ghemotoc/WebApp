/**
 * ChapterReaderPage: one chapter to read, screen 3.5 (story S1-E4-01a; design/boards/Reader.dc.html).
 *
 * Who shows it: the router, at /s/:storySlug/:chapterCode; the story page's chapter list, the
 * Previous and Next links and shared links lead here.
 * What it shows: ChapterBar (back to the story, Contents, Previous, Next chapter, the progress
 * line), then the chapter as one calm column: ChapterReaderHeader, the text as real HTML
 * (ChapterText with the reader's 19 px size, about 680 px wide, in the story's language), and
 * ChapterEnd. No doodles (DoD design rules). A signed-out visitor gets the header and "Log in to
 * read" instead of the text until the teaser (S1-E4-04).
 * What it calls: useChapter → get_chapter() (ADR 0004); useRecordRead → record_chapter_read()
 * once the text is on screen; useReadingProgress for the progress line.
 */
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { ReaderChapter } from '../api/chapter';
import { useChapter } from '../hooks/useChapter';
import { useReadingProgress } from '../hooks/useReadingProgress';
import { useRecordRead } from '../hooks/useRecordRead';

import { ChapterBar } from './ChapterBar';
import { ChapterEnd } from './ChapterEnd';
import { ChapterReaderHeader } from './ChapterReaderHeader';
import { ChapterText } from './ChapterText';

/** "This chapter isn't available", with the way home. */
function ChapterUnavailable() {
  const { t } = useTranslation('reading');
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface px-8 py-10">
      <h1 className="m-0 font-heading text-[26px] font-bold text-heading">
        {t('reader.unavailableTitle')}
      </h1>
      <p className="m-0 text-base text-body">{t('reader.unavailableBody')}</p>
      <Link
        to="/"
        className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
      >
        {t('storyPage.goHome')}
      </Link>
    </div>
  );
}

/** For a signed-out visitor: log in to read (the teaser replaces this in S1-E4-04). */
function SignInToRead({ storySlug }: { storySlug: string }) {
  const { t } = useTranslation('reading');
  return (
    <section
      aria-labelledby="sign-in-to-read"
      className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6 lg:mr-20"
    >
      <h2 id="sign-in-to-read" className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('reader.signInTitle')}
      </h2>
      <p className="m-0 text-base text-body">{t('reader.signInBody')}</p>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/sign-in"
          className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
        >
          {t('reader.signIn')}
        </Link>
        <Link
          to={`/s/${storySlug}`}
          className="inline-flex h-11 items-center rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint"
        >
          {t('reader.backToStory')}
        </Link>
      </div>
    </section>
  );
}

/** The bar and the chapter, once it is known. */
function ChapterReading({ chapter }: { chapter: ReaderChapter }) {
  const { t } = useTranslation('reading');
  const textRef = useRef<HTMLDivElement>(null);
  const hasText = chapter.body !== null;
  const progress = useReadingProgress(textRef, hasText);
  useRecordRead(chapter.story.slug, chapter.code, hasText);
  return (
    <>
      <title>
        {t('reader.documentTitle', { chapter: chapter.title, story: chapter.story.title })}
      </title>
      <ChapterBar chapter={chapter} progress={hasText ? progress : 0} />
      <article aria-labelledby="chapter-title" className="mx-auto w-full max-w-[760px]">
        <ChapterReaderHeader chapter={chapter} />
        {chapter.body === null ? (
          <SignInToRead storySlug={chapter.story.slug} />
        ) : (
          <div ref={textRef} className="lg:pr-20">
            <ChapterText
              markdown={chapter.body}
              language={chapter.story.languageCode}
              className="tmc-chapter-text--reader"
            />
          </div>
        )}
        {hasText && <ChapterEnd chapter={chapter} />}
      </article>
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the reader, a wait, a plain message, or "not available"
 */
export function ChapterReaderPage() {
  const { t } = useTranslation('reading');
  const { storySlug = '', chapterCode = '' } = useParams();
  const { chapter, isLoaded, loadFailed } = useChapter(storySlug, chapterCode);

  if (loadFailed) {
    return (
      <PageContainer className="pt-12 pb-7">
        <Notice tone="error">{t('reader.loadFailed')}</Notice>
      </PageContainer>
    );
  }
  if (!isLoaded) return null;
  return (
    <PageContainer className="tmc-rise flex flex-col pt-7 pb-12">
      {chapter === null ? (
        <>
          <title>{t('reader.unavailableTitle')}</title>
          <ChapterUnavailable />
        </>
      ) : (
        <ChapterReading chapter={chapter} />
      )}
    </PageContainer>
  );
}
