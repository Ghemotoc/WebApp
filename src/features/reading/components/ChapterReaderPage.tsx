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
 *     (S1-E4-04, board 3.8); on a 16+ story, which visitors can't open, NoPreviewNotice
 *     explains why (useStoryPreview → get_link_preview(), only when the chapter answered nothing);
 *   - AdultQuestionNotice for a visitor on an 18+ story who hasn't yet said they are 18 or over
 *     (CALM-9m);
 *   - MissingTranslationNotice for a chapter this language edition doesn't have yet
 *     (TRANSLATE-1b), and AppOnlyNotice when the writer chose "In the app only" (S1-E4-09);
 *   - UnavailableHereNotice (board B11) when the story is hidden in the reader's country
 *     (COUNTRY-1, useUnavailableHere → story_unavailable_here());
 *   - otherwise "This chapter isn't available", with the way home.
 * What it calls: useChapter, ChapterReading, ChapterMissing (loaded only when needed) and the
 * notices above.
 */
import { lazy, Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { parseSpot, type SpotRange } from '@/lib/chapter-blocks';

import type { ReaderChapter } from '../api/chapter';
import { useChapter } from '../hooks/useChapter';
import { useStoryStatement } from '../hooks/useStoryStatement';

import { ChapterReading } from './ChapterReading';

/**
 * Why a chapter can't be shown (no preview, not in your country, or not available): loaded only
 * when the chapter answered nothing, so it stays out of a reader's cold load (the 1,300 KB script
 * budget, S1-E4-01b; COUNTRY-1).
 */
const ChapterMissing = lazy(async () => {
  const module = await import('./ChapterMissing');
  return { default: module.ChapterMissing };
});

/** The short preview and log-in prompt for a signed-out visitor (S1-E4-04): a signed-in reader
 * never sees it, so it stays out of their cold load (the 1,300 KB script budget, S1-E4-01b). */
const TeaserPage = lazy(async () => {
  const module = await import('./TeaserPage');
  return { default: module.TeaserPage };
});

/** "In the app only" (S1-E4-09): rare on the web, so fetched only when needed. */
const AppOnlyNotice = lazy(async () => {
  const module = await import('./AppOnlyNotice');
  return { default: module.AppOnlyNotice };
});

/** "For mature readers": a visitor on an 18+ story, before their answer (CALM-9m); rare. */
const AdultQuestionNotice = lazy(async () => {
  const module = await import('./AdultQuestionNotice');
  return { default: module.AdultQuestionNotice };
});

/** The screen for a chapter not translated yet: rare, so fetched only when needed (TRANSLATE-1b). */
const MissingTranslationNotice = lazy(async () => {
  const module = await import('./MissingTranslationNotice');
  return { default: module.MissingTranslationNotice };
});

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
    return (
      <Suspense fallback={null}>
        <ChapterMissing storySlug={props.storySlug} chapterCode={props.chapterCode} />
      </Suspense>
    );
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
  if (props.chapter.appOnly) {
    return (
      <Suspense fallback={null}>
        <AppOnlyNotice chapter={props.chapter} />
      </Suspense>
    );
  }
  // CALM-9m: an 18+ story's chapter waits for a visitor's "I'm 18 or over".
  if (props.chapter.needsAdultAnswer) {
    return (
      <Suspense fallback={null}>
        <AdultQuestionNotice chapter={props.chapter} />
      </Suspense>
    );
  }
  if (props.chapter.isTeaser) {
    return (
      <Suspense fallback={null}>
        <TeaserPage chapter={props.chapter} />
      </Suspense>
    );
  }
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
  // CALM-9s: the footer under the reader says what the story is, as on the story page, but only
  // when this reader may see the chapter (a rating or a missing chapter keeps it out).
  useStoryStatement(storySlug, isLoaded && chapter !== null);

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
