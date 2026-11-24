/**
 * ChapterReading: a chapter on screen for a reader who may read it (story S1-E4-01a; the
 * simplified design, bundle CALM-5, design handover Steps 2 to 4; boards New-Reader and
 * New-PhoneReader).
 *
 * From the top: the chapter bar (ChapterBar), then a row with the chapter on the left and, from
 * 1280 px, the side column "Reading tools" on the right (ReaderSideColumn, 360 px, 48 px apart).
 * The left side holds the paper (ReadingPaper), the chapter navigation (ChapterNavigation:
 * Previous, the dots and Next), the 728 × 90 advert (position 1, never inside the text,
 * S1-E4-01b), then the chapter's comments (S1-E6-01). Below 1280 px About this story and the
 * 300 × 250 advert (position 2) follow the comments, and the panels open in the bottom sheet.
 * Each advert is drawn once, in the one place it belongs at this width.
 * Reading settings and a paragraph's comments are closed by default and never both open
 * (useReaderTools). Time left: in the chapter bar by default; "On the page" in Reading settings
 * puts back the floating pill (ReadingTimeLeft) instead (handover Step 4, points 11 and 12).
 * Who uses it: ChapterReaderPage.
 * What it calls: useReadingProgress, useRecordRead → record_chapter_read(), useReadingMinutes,
 * useSavedPlace, useReadingLook, useReaderTools, useStoryPage → get_story_page() (the chapter
 * titles for the arrows and the facts in About this story), useIsWideReader.
 */
import { lazy, Suspense, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { PageAdSlot } from '@/features/ads/components/PageAdSlot';
import { useReadingMinutes } from '@/features/reading-habit/hooks/useReadingMinutes';
import { QuoteShareWatcher } from '@/features/sharing/components/QuoteShareWatcher';
import { SharedChapterContext } from '@/features/sharing/lib/sharedChapterContext';
import type { SpotRange } from '@/lib/chapter-blocks';

import type { ReaderChapter } from '../api/chapter';
import type { StoryPageData } from '../api/storyPage';
import { useAfterFirstPaint } from '../hooks/useAfterFirstPaint';
import { useIsWideReader } from '../hooks/useIsWideReader';
import { useReaderTools } from '../hooks/useReaderTools';
import { useReadingLook } from '../hooks/useReadingLook';
import { useReadingProgress } from '../hooks/useReadingProgress';
import { useRecordRead } from '../hooks/useRecordRead';
import { useSavedPlace } from '../hooks/useSavedPlace';
import { useStoryPage } from '../hooks/useStoryPage';
import { ParagraphCommentsContext } from '../lib/paragraphCommentsContext';
import { minutesLeft } from '../lib/readingTimeLeft';
import { toSharedChapter } from '../lib/toSharedChapter';

import { ChapterBar } from './ChapterBar';
import { readingSettingsPanelId } from './ReadingSettingsControl';
import { ChapterComments } from './ChapterComments';
import { ChapterNavigation } from './ChapterNavigation';
import { CopyNotice } from './CopyNotice';
import { AboutThisStory } from './AboutThisStory';
import { ReaderSideColumn } from './ReaderSideColumn';
import { AboveText, ChapterTextBlock, ReadingPaper } from './ReadingPaper';

/** Reading settings' place, fetched when Aa is first pressed (the 1,300 KB budget, S1-E4-01b). */
const ReaderToolPlace = lazy(async () => {
  const module = await import('./ReaderToolPlace');
  return { default: module.ReaderToolPlace };
});

/** The floating pill, fetched only for a reader who puts time left on the page (the bar is the
 * default, handover Step 4, point 11), which keeps it out of the 1,300 KB first load. */
const ReadingTimeLeft = lazy(async () => {
  const module = await import('./ReadingTimeLeft');
  return { default: module.ReadingTimeLeft };
});

/**
 * A chapter's title in the story, by its code, for the navigation arrows' names.
 *
 * @param story - the story page, or null while it loads
 * @param code - the chapter's code, or null at either end
 * @returns the title, or null when not known
 */
function chapterTitle(story: StoryPageData | null, code: string | null): string | null {
  if (story === null || code === null) return null;
  return story.chapters.find((chapter) => chapter.code === code)?.title ?? null;
}

/**
 * The 300 × 250 advert: at the foot of the side column from 1280 px, after About this story
 * below that (handover Step 3, point 7).
 *
 * @returns the advert
 */
function SideAdvert({ chapter }: { chapter: ReaderChapter }) {
  return (
    <PageAdSlot
      pageKey="chapter"
      position={2}
      context={{ storySlug: chapter.story.slug, language: chapter.story.languageCode }}
      isSpaceReserved={false}
    />
  );
}

/**
 * About this story and the advert, under the comments below 1280 px. From 1280 px the side
 * column places them itself, with the comment box between them (CALM-9, board B03).
 *
 * @returns the facts and the advert
 */
function StoryFacts({ chapter, story }: { chapter: ReaderChapter; story: StoryPageData | null }) {
  return (
    <>
      <AboutThisStory
        story={story}
        chapterTotal={chapter.total}
        nextChapter={chapter.nextChapter}
      />
      <SideAdvert chapter={chapter} />
    </>
  );
}

/**
 * What follows the paper: the chapter navigation, the copy notice, the "Share quote" watcher, the
 * 728 × 90 advert (S1-E12-01) and the comments (S1-E6-01).
 *
 * The copy notice and the "Share quote" watcher listen for a copy or a selection from the first
 * paint, so a reader who selects at once is never missed. The navigation, the advert and the
 * comments wait for `hasPainted` (useAfterFirstPaint), so the text paints first on a slow phone.
 *
 * @returns the parts in reading order
 */
function UnderThePaper(props: {
  chapter: ReaderChapter;
  story: StoryPageData | null;
  hasPainted: boolean;
}) {
  const { chapter, story, hasPainted } = props;
  const sharedChapter = useMemo(() => toSharedChapter(chapter), [chapter]);
  return (
    <>
      {hasPainted && (
        <ChapterNavigation
          chapter={chapter}
          previousTitle={chapterTitle(story, chapter.previousCode)}
          nextTitle={chapterTitle(story, chapter.nextCode)}
        />
      )}
      <CopyNotice penName={chapter.story.writer.displayName} />
      <QuoteShareWatcher chapter={sharedChapter} />
      {hasPainted && <TheRestUnderThePaper chapter={chapter} />}
    </>
  );
}

/**
 * The 728 × 90 advert and the comments, drawn once the text has painted.
 *
 * @returns the advert and the comments
 */
function TheRestUnderThePaper({ chapter }: { chapter: ReaderChapter }) {
  return (
    <>
      <PageAdSlot
        pageKey="chapter"
        position={1}
        context={{ storySlug: chapter.story.slug, language: chapter.story.languageCode }}
        className="mx-auto mt-8 flex w-full max-w-[760px] justify-center"
      />
      <div className="mx-auto w-full max-w-[760px]">
        <ChapterComments address={{ storySlug: chapter.story.slug, chapterCode: chapter.code }} />
      </div>
    </>
  );
}

/**
 * The row of the chapter and, from 1280 px, the side column. The left side is the same element
 * at every width, so crossing 1280 px never redraws the text (the reader's selection and place
 * stay).
 *
 * @returns the row
 */
function ReaderRow(props: { side: ReactNode; children: ReactNode }) {
  return (
    <div className="tmc-reader-row mt-6">
      <div className="flex min-w-0 flex-col">{props.children}</div>
      {props.side}
    </div>
  );
}

/**
 * Reads the chapter's progress and keeps the reader's place, minutes and read count.
 *
 * @returns the text's element, the progress and the saved places
 */
function useReadingTrack(chapter: ReaderChapter, hasText: boolean) {
  const textRef = useRef<HTMLDivElement>(null);
  const progress = useReadingProgress(textRef, hasText);
  useRecordRead(chapter.story.slug, chapter.code, hasText);
  // IDEAS-1b: a minute for each minute of active reading, only for a reader who keeps a streak.
  useReadingMinutes();
  // S1-E4-03: keep the reader's place and offer the one saved last time.
  const places = useSavedPlace(chapter.story.slug, chapter.code, progress, hasText);
  return { textRef, progress, ...places };
}

/** The look useReadingLook works out. */
type ReadingLook = ReturnType<typeof useReadingLook>;

/** The progress and places useReadingTrack keeps. */
type ReadingTrack = ReturnType<typeof useReadingTrack>;

/**
 * The paper with the chapter's text on it, and what sits above the text.
 *
 * @returns the paper
 */
function PaperWithText(props: {
  chapter: ReaderChapter;
  spot: SpotRange | null;
  look: ReadingLook;
  track: ReadingTrack;
}) {
  const { chapter, spot, look, track } = props;
  const sharedChapter = useMemo(() => toSharedChapter(chapter), [chapter]);
  return (
    <ReadingPaper look={look} chapter={chapter}>
      {chapter.body !== null && (
        <SharedChapterContext.Provider value={sharedChapter}>
          <ChapterTextBlock
            chapter={chapter}
            body={chapter.body}
            textRef={track.textRef}
            look={look}
            spot={spot}
          >
            <AboveText
              chapter={chapter}
              spot={spot}
              savedPercent={track.savedPercent}
              placePercent={track.placePercent}
              textRef={track.textRef}
            />
          </ChapterTextBlock>
        </SharedChapterContext.Provider>
      )}
    </ReadingPaper>
  );
}

/**
 * Everything the chapter screen works out: the reading track, the look, the width, the panels'
 * state, the story's facts, the minutes for the bar and whether the parts under the paper show yet.
 *
 * @returns the screen's state
 */
function useChapterScreen(chapter: ReaderChapter) {
  // Since S1-E4-04 every answer has text (visitors get TeaserPage); the check stays for safety.
  const hasText = chapter.body !== null;
  const track = useReadingTrack(chapter, hasText);
  // S1-E4-02: the reader's own font, size, spacing, width, theme and where time left shows.
  const look = useReadingLook(chapter.code);
  const isWide = useIsWideReader();
  const [threadSlot, setThreadSlot] = useState<HTMLElement | null>(null);
  const tools = useReaderTools(chapter, hasText, isWide ? threadSlot : null);
  const { story } = useStoryPage(chapter.story.slug);
  // Handover Step 4, point 11: the minutes left sit in the bar unless the reader chose the page.
  const isTimeInBar = hasText && look.timeLeft === 'bar';
  const barMinutes = isTimeInBar ? minutesLeft(chapter.minutesToRead, track.progress) : null;
  // Most parts under the paper wait one frame, so the first paragraph paints sooner on a slow
  // phone (useAfterFirstPaint; the S1-E4-01b budget).
  const hasPainted = useAfterFirstPaint();
  // Below 1280 px, About this story and its advert follow the comments, once the text has painted.
  const hasFactsBelow = hasText && hasPainted && !isWide;
  return {
    hasText,
    track,
    look,
    isWide,
    setThreadSlot,
    tools,
    story,
    barMinutes,
    hasPainted,
    hasFactsBelow,
  };
}

/**
 * Renders the chapter; `spot` is the shared passage, if any (S1-E4-11).
 *
 * @returns the bar, the row with the paper and its side column, and the floating parts
 */
export function ChapterReading(props: { chapter: ReaderChapter; spot: SpotRange | null }) {
  const { chapter } = props;
  const { t } = useTranslation('reading');
  const screen = useChapterScreen(chapter);
  const { hasText, look, isWide, tools, story, hasPainted } = screen;
  // While the place's file loads, an empty stand-in carries the panel's id, so Aa's aria-controls
  // never points at nothing (axe: aria-valid-attr-value).
  const settingsPanel = tools.isSettingsOpen ? (
    <Suspense fallback={<div id={readingSettingsPanelId} hidden />}>
      <ReaderToolPlace
        isInSideColumn={isWide}
        deviceSize={look.deviceSize}
        chapterCode={chapter.code}
        onClose={tools.closeSettings}
      />
    </Suspense>
  ) : null;
  const side = isWide ? (
    <ReaderSideColumn
      onThreadSlot={screen.setThreadSlot}
      settings={settingsPanel}
      about={
        <AboutThisStory
          story={story}
          chapterTotal={chapter.total}
          nextChapter={chapter.nextChapter}
        />
      }
    >
      <SideAdvert chapter={chapter} />
    </ReaderSideColumn>
  ) : null;
  // Aa for everyone: a reader's settings go to the account, a visitor's stay in this browser
  // (BOOKS B04, user story 2.4).
  const aa = { isOpen: tools.isSettingsOpen, onToggle: tools.toggleSettings };
  return (
    <>
      <title>
        {t('reader.documentTitle', { chapter: chapter.title, story: chapter.story.title })}
      </title>
      <ChapterBar chapter={chapter} minutesLeft={screen.barMinutes} settings={aa} />
      <ParagraphCommentsContext.Provider value={tools.paragraphComments}>
        <ReaderRow side={side}>
          <PaperWithText chapter={chapter} spot={props.spot} look={look} track={screen.track} />
          {hasText && <UnderThePaper chapter={chapter} story={story} hasPainted={hasPainted} />}
          {screen.hasFactsBelow && (
            <div className="mx-auto mt-8 flex w-full max-w-[760px] flex-col gap-6">
              <StoryFacts chapter={chapter} story={story} />
            </div>
          )}
        </ReaderRow>
      </ParagraphCommentsContext.Provider>
      {!isWide && settingsPanel}
      {hasText && look.timeLeft === 'page' && (
        <Suspense fallback={null}>
          <ReadingTimeLeft minutesToRead={chapter.minutesToRead} progress={screen.track.progress} />
        </Suspense>
      )}
    </>
  );
}
