/**
 * ChapterReaderPage: one chapter to read, screen 3.5 (story S1-E4-01a; design/boards/Reader.dc.html).
 *
 * Who shows it: the router, at /s/:storySlug/:chapterCode; the story page's chapter list, the
 * Previous and Next links and shared links lead here.
 * What it shows: ChapterBar (back to the story, Contents, Previous, Next chapter, the progress
 * line), then the chapter as one calm column: ChapterReaderHeader, the text as real HTML
 * (ChapterText with the reader's 19 px size, about 680 px wide, in the story's language), and
 * ChapterEnd. No doodles (DoD design rules). A signed-out visitor gets TeaserPage instead: the
 * first part of the chapter and a prompt to log in (S1-E4-04, board 3.8); on a 16+ or 18+ story,
 * which visitors can't open, NoPreviewNotice explains why. The banner slot comes after the
 * <article>, never inside the text (S1-E4-01b); it is empty until S1-E12-01. The text has
 * right-click and copy turned off, with the honest notice under the chapter (S1-E4-06a). Under
 * the banner slot: the comments (S1-E6-01), fetched after the text (ChapterComments).
 * What it calls: useChapter → get_chapter() (ADR 0004); useRecordRead → record_chapter_read()
 * once the text is on screen; useReadingProgress for the progress line; useSavedPlace keeps the
 * reader's place and SavedPlaceOffer offers the one saved last time (S1-E4-03); useReadingLook
 * applies the reader's font, size, spacing, width and theme (S1-E4-02); useStoryPreview →
 * get_link_preview() only when a signed-out visitor's chapter answered nothing. QuoteShareWatcher
 * offers "Share quote" for a passage selected in the text (S1-E4-07).
 * Shared passages (S1-E4-11): at /s/:storySlug/:chapterCode/:spot (p3 or p3-5) the passage is
 * highlighted and SharedPassageNotice brings it into view; the saved-place offer waits for
 * another visit. A visible picture gets "Share picture" (PictureShareButton, fetched on its own),
 * which reads the chapter from SharedChapterContext.
 */
import { lazy, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { QuoteShareWatcher } from '@/features/sharing/components/QuoteShareWatcher';
import { SharedChapterContext } from '@/features/sharing/lib/sharedChapterContext';
import { parseSpot, type SpotRange } from '@/lib/chapter-blocks';

import type { ReaderChapter } from '../api/chapter';
import { useChapter } from '../hooks/useChapter';
import { useChapterBanner } from '../hooks/useChapterBanner';
import { useReadingLook } from '../hooks/useReadingLook';
import { useReadingProgress } from '../hooks/useReadingProgress';
import { useRecordRead } from '../hooks/useRecordRead';
import { useSavedPlace } from '../hooks/useSavedPlace';
import { useStoryPreview } from '../hooks/useStoryPreview';
import { toSharedChapter } from '../lib/toSharedChapter';

import { ChapterBannerSlot } from './ChapterBannerSlot';
import { ChapterBar } from './ChapterBar';
import { ChapterComments } from './ChapterComments';
import { ChapterEnd } from './ChapterEnd';
import { ChapterReaderHeader } from './ChapterReaderHeader';
import { CopyNotice } from './CopyNotice';
import { NoPreviewNotice } from './NoPreviewNotice';
import { ProtectedChapterText } from './ProtectedChapterText';
import { SavedPlaceOffer } from './SavedPlaceOffer';
import { SharedPassageNotice } from './SharedPassageNotice';
import { TeaserPage } from './TeaserPage';

/** "Share picture" under each visible picture, fetched when the first one is drawn (S1-E4-11). */
const PictureShareButton = lazy(async () => {
  const module = await import('@/features/sharing/components/PictureShareButton');
  return { default: module.PictureShareButton };
});

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

/**
 * When the chapter can't be shown: for a signed-out visitor on a 16+ or 18+ story, why (Q6);
 * otherwise "not available".
 */
function ChapterMissing({ storySlug, chapterCode }: { storySlug: string; chapterCode: string }) {
  const { t } = useTranslation('reading');
  const { hidden, isSettled } = useStoryPreview(storySlug, chapterCode, true);
  if (!isSettled) return null;
  if (hidden !== null) return <NoPreviewNotice preview={hidden} />;
  return (
    <>
      <title>{t('reader.unavailableTitle')}</title>
      <ChapterUnavailable />
    </>
  );
}

/**
 * What sits above the text: the shared passage's notice when the address has a spot (S1-E4-11),
 * otherwise the saved place from last time (S1-E4-03), or nothing.
 */
function AboveText(props: {
  chapter: ReaderChapter;
  spot: SpotRange | null;
  savedPercent: number | null;
  textRef: RefObject<HTMLDivElement | null>;
}) {
  if (props.spot !== null) {
    return (
      <SharedPassageNotice chapterPath={`/s/${props.chapter.story.slug}/${props.chapter.code}`} />
    );
  }
  if (props.savedPercent === null) return null;
  return <SavedPlaceOffer percent={props.savedPercent} textRef={props.textRef} />;
}

/** The chapter's text in the reader's look, with anything shown above it (the saved place). */
function ChapterTextBlock(props: {
  chapter: ReaderChapter;
  body: string;
  textRef: RefObject<HTMLDivElement | null>;
  look: ReturnType<typeof useReadingLook>;
  spot: SpotRange | null;
  children: ReactNode;
}) {
  const { chapter, body, textRef, look, spot, children } = props;
  return (
    <div ref={textRef} className="lg:pr-20">
      {children}
      <div
        className={look.page.className}
        data-theme={look.page.dataTheme}
        style={look.textVariables}
      >
        <ProtectedChapterText
          markdown={body}
          language={chapter.story.languageCode}
          className="tmc-chapter-text--reader"
          pictures={chapter.pictures}
          embeds={chapter.embeds}
          writerName={chapter.story.writer.displayName}
          canReportMedia
          spot={spot}
          pictureShare={PictureShareButton}
        />
      </div>
    </div>
  );
}

/** The bar and the chapter, once it is known; `spot` is the shared passage, if any. */
function ChapterReading({ chapter, spot }: { chapter: ReaderChapter; spot: SpotRange | null }) {
  const { t } = useTranslation('reading');
  const sharedChapter = useMemo(() => toSharedChapter(chapter), [chapter]);
  const textRef = useRef<HTMLDivElement>(null);
  // Since S1-E4-04 every answer has text (visitors get TeaserPage); the check stays for safety.
  const hasText = chapter.body !== null;
  const progress = useReadingProgress(textRef, hasText);
  useRecordRead(chapter.story.slug, chapter.code, hasText);
  // S1-E4-03: keep the reader's place and offer the one saved last time.
  const { savedPercent } = useSavedPlace(chapter.story.slug, chapter.code, progress, hasText);
  const { banner } = useChapterBanner(chapter.story.slug);
  // S1-E4-02: the reader's own font, size, spacing, width and theme.
  const look = useReadingLook();
  return (
    <>
      <title>
        {t('reader.documentTitle', { chapter: chapter.title, story: chapter.story.title })}
      </title>
      <ChapterBar
        chapter={chapter}
        progress={hasText ? progress : 0}
        deviceSize={look.isSignedIn ? look.deviceSize : null}
      />
      <article
        aria-labelledby="chapter-title"
        className="mx-auto w-full"
        style={{ maxWidth: look.columnWidth }}
      >
        <ChapterReaderHeader chapter={chapter} />
        {chapter.body !== null && (
          <SharedChapterContext.Provider value={sharedChapter}>
            <ChapterTextBlock
              chapter={chapter}
              body={chapter.body}
              textRef={textRef}
              look={look}
              spot={spot}
            >
              <AboveText
                chapter={chapter}
                spot={spot}
                savedPercent={savedPercent}
                textRef={textRef}
              />
            </ChapterTextBlock>
          </SharedChapterContext.Provider>
        )}
        {hasText && <ChapterEnd chapter={chapter} />}
      </article>
      {hasText && <CopyNotice penName={chapter.story.writer.displayName} />}
      {hasText && <QuoteShareWatcher chapter={sharedChapter} />}
      {hasText && <ChapterBannerSlot banner={banner} />}
      {hasText && (
        <div className="mx-auto w-full max-w-[760px]">
          <ChapterComments address={{ storySlug: chapter.story.slug, chapterCode: chapter.code }} />
        </div>
      )}
    </>
  );
}

/** What the page shows once the read has answered: the chapter, the teaser or why not. */
function ChapterShown(props: {
  storySlug: string;
  chapterCode: string;
  chapter: ReaderChapter | null;
  spot: SpotRange | null;
}) {
  if (props.chapter === null) {
    return <ChapterMissing storySlug={props.storySlug} chapterCode={props.chapterCode} />;
  }
  if (props.chapter.isTeaser) return <TeaserPage chapter={props.chapter} />;
  return <ChapterReading chapter={props.chapter} spot={props.spot} />;
}

/**
 * Renders the page.
 *
 * @returns the reader, the teaser, a wait, a plain message, or "not available"
 */
export function ChapterReaderPage() {
  const { t } = useTranslation('reading');
  const { storySlug = '', chapterCode = '', spot } = useParams();
  // A shared passage's spot (S1-E4-11); anything that isn't one is read as no spot.
  const sharedSpot = useMemo(() => parseSpot(spot), [spot]);
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
      <ChapterShown
        storySlug={storySlug}
        chapterCode={chapterCode}
        chapter={chapter}
        spot={sharedSpot}
      />
    </PageContainer>
  );
}
