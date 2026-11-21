/**
 * ChapterReaderPage: one chapter to read, screen 3.5 (story S1-E4-01a; the simplified design,
 * bundle CALM-5; boards New-Reader and New-PhoneReader).
 *
 * Who shows it: the router, at /s/:storySlug/:chapterCode; the story page's chapter list, the
 * chapter navigation and shared links lead here. A shared passage's address adds a spot
 * (/s/:storySlug/:chapterCode/:spot, p3 or p3-5; S1-E4-11).
 * What it shows, once useChapter → get_chapter() (ADR 0004) has answered:
 *   - ChapterReading for a reader who may read the chapter: the chapter bar, the paper, the
 *     chapter navigation, the adverts, the comments and the side column (see that file);
 *   - TeaserPage for a signed-out visitor: the first part of the chapter and a prompt to log in
 *     (S1-E4-04, board 3.8); on a 16+ or 18+ story, which visitors can't open, NoPreviewNotice
 *     explains why (useStoryPreview → get_link_preview(), only when the chapter answered nothing);
 *   - MissingTranslationNotice for a chapter this language edition doesn't have yet
 *     (TRANSLATE-1b), and AppOnlyNotice when the writer chose "In the app only" (S1-E4-09);
 *   - otherwise "This chapter isn't available", with the way home.
 * What it calls: useChapter, useStoryPreview, ChapterReading and the notices above.
 */
import { lazy, Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { parseSpot, type SpotRange } from '@/lib/chapter-blocks';

import type { ReaderChapter } from '../api/chapter';
import { useChapter } from '../hooks/useChapter';
import { useStoryPreview } from '../hooks/useStoryPreview';

import { AppOnlyNotice } from './AppOnlyNotice';
import { ChapterReading } from './ChapterReading';
import { TeaserPage } from './TeaserPage';

/**
 * "No preview for this story", loaded only for a signed-out visitor on a 16+ or 18+ chapter, so it
 * stays out of every other reader's cold load (the 1,300 KB script budget, S1-E4-01b).
 */
const NoPreviewNotice = lazy(async () => {
  const module = await import('./NoPreviewNotice');
  return { default: module.NoPreviewNotice };
});

/** The screen for a chapter not translated yet: rare, so fetched only when needed (TRANSLATE-1b). */
const MissingTranslationNotice = lazy(async () => {
  const module = await import('./MissingTranslationNotice');
  return { default: module.MissingTranslationNotice };
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
        className="inline-flex h-11 items-center rounded-full button-main px-5 text-sm font-semibold no-underline"
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
  if (hidden !== null) {
    return (
      <Suspense fallback={null}>
        <NoPreviewNotice preview={hidden} />
      </Suspense>
    );
  }
  return (
    <>
      <title>{t('reader.unavailableTitle')}</title>
      <ChapterUnavailable />
    </>
  );
}

/**
 * What the page shows once the read has answered: the chapter, the teaser, the app only notice
 * or why not.
 */
function ChapterShown(props: {
  storySlug: string;
  chapterCode: string;
  chapter: ReaderChapter | null;
  spot: SpotRange | null;
}) {
  if (props.chapter === null) {
    return <ChapterMissing storySlug={props.storySlug} chapterCode={props.chapterCode} />;
  }
  // TRANSLATE-1b: this language edition doesn't have the chapter yet.
  if (props.chapter.missingTranslation !== null) {
    return (
      <Suspense fallback={null}>
        <MissingTranslationNotice
          chapter={props.chapter}
          missing={props.chapter.missingTranslation}
        />
      </Suspense>
    );
  }
  // GAPS-15: the writer chose "In the app only" and it applies, so no text came (S1-E4-09).
  if (props.chapter.appOnly) return <AppOnlyNotice chapter={props.chapter} />;
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
    <PageContainer className="tmc-rise flex flex-col pt-3 pb-12 lg:pt-7">
      <ChapterShown
        storySlug={storySlug}
        chapterCode={chapterCode}
        chapter={chapter}
        spot={sharedSpot}
      />
    </PageContainer>
  );
}
