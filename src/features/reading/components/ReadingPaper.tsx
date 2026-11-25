/**
 * ReadingPaper: the sheet of paper a chapter sits on, and the text on it (story S1-E4-01a; bundle
 * G7d; the simplified design, bundle CALM-5, design handover Step 3; boards New-Reader and
 * New-PhoneReader).
 *
 * The paper takes the theme's colours (useReadingLook), the reader's text variables and the text
 * column's width plus its side padding, so the line length stays the reader's choice. On it the
 * chapter's <article>: ChapterReaderHeader, the text (ChapterTextBlock) and, once there is text,
 * ChapterEnd. On phones (under 600 px) the paper fills the width of the screen, with the page
 * colour showing only above and below it (index.css, .tmc-reading-page).
 * ChapterTextBlock draws the text as real HTML (ProtectedChapterText: right-click and copy off,
 * S1-E4-06a), with a paragraph comment marker beside each paragraph (S1-E6-06), the reading
 * ruler for a reader who turned it on (IDEAS-1 part a) and, above the text, the shared passage's
 * notice or the saved place (AboveText).
 * Who uses it: ChapterReading. What it calls: ChapterReaderHeader, ProtectedChapterText,
 * ParagraphCommentMarker, EarlierVersionComments, SavedPlaceOffer, SharedPassageNotice, ChapterEnd.
 */
import { lazy, Suspense, useRef, useState, type ReactNode, type RefObject } from 'react';

import type { SpotRange } from '@/lib/chapter-blocks';
import { cn } from '@/lib/utils';

import type { ReaderChapter } from '../api/chapter';
import type { useReadingLook } from '../hooks/useReadingLook';

import { ChapterEnd } from './ChapterEnd';
import { ChapterReaderHeader } from './ChapterReaderHeader';
import { EarlierVersionComments } from './EarlierVersionComments';
import { ParagraphCommentMarker } from './ParagraphCommentMarker';
import { ProtectedChapterText } from './ProtectedChapterText';
import { SavedPlaceOffer } from './SavedPlaceOffer';

/** "Share picture" under each visible picture, fetched when the first one is drawn (S1-E4-11). */
const PictureShareButton = lazy(async () => {
  const module = await import('@/features/sharing/components/PictureShareButton');
  return { default: module.PictureShareButton };
});

/** The shared passage's notice, fetched only when the address names a passage (S1-E4-11), which
 * keeps it out of a plain chapter's first load (the 1,300 KB budget, S1-E4-01b). */
const SharedPassageNotice = lazy(async () => {
  const module = await import('./SharedPassageNotice');
  return { default: module.SharedPassageNotice };
});

/** The reading ruler, loaded only for a reader who turned it on (IDEAS-1 part a). */
const ReadingRuler = lazy(async () => {
  const module = await import('./ReadingRuler');
  return { default: module.ReadingRuler };
});

/** The look useReadingLook works out. */
type ReadingLook = ReturnType<typeof useReadingLook>;

/** What sits above the text needs. */
interface AboveTextProps {
  chapter: ReaderChapter;
  spot: SpotRange | null;
  savedPercent: number | null;
  placePercent: number | null;
  textRef: RefObject<HTMLDivElement | null>;
}

/**
 * What sits above the text: the shared passage's notice when the address has a spot (S1-E4-11),
 * otherwise the saved place from last time (S1-E4-03), or nothing.
 *
 * @returns the notice, the offer or nothing
 */
export function AboveText(props: AboveTextProps) {
  // The chapter the address said "#resume" for, remembered once: the address loses the hash as
  // soon as the reader jumps back, and a later redraw must not then show the offer as well.
  const [resumedChapter] = useState(() =>
    window.location.hash === '#resume' ? props.chapter.code : null,
  );
  if (props.spot !== null) {
    return (
      <Suspense fallback={null}>
        <SharedPassageNotice chapterPath={`/s/${props.chapter.story.slug}/${props.chapter.code}`} />
      </Suspense>
    );
  }
  // "You are here" on the story page (IDEAS-1 part a): straight back to the place.
  if (resumedChapter === props.chapter.code && props.placePercent !== null) {
    return <SavedPlaceOffer percent={props.placePercent} textRef={props.textRef} goesAtOnce />;
  }
  if (props.savedPercent === null) return null;
  return <SavedPlaceOffer percent={props.savedPercent} textRef={props.textRef} />;
}

/** What the paper needs. */
interface ReadingPaperProps {
  look: ReadingLook;
  chapter: ReaderChapter;
  children: ReactNode;
}

/**
 * Renders the paper with the chapter's header, the text (children) and the chapter's end.
 *
 * @returns the paper
 */
export function ReadingPaper({ look, chapter, children }: ReadingPaperProps) {
  const paperStyle = {
    ...look.textVariables,
    maxWidth: `calc(${look.columnWidth}px + 2 * var(--reading-page-pad))`,
  };
  return (
    <div
      data-testid="chapter-page"
      className={cn('mx-auto w-full', look.page.className)}
      data-theme={look.page.dataTheme}
      style={paperStyle}
    >
      <article
        aria-labelledby="chapter-title"
        className="mx-auto w-full"
        style={{ maxWidth: look.columnWidth }}
      >
        <ChapterReaderHeader chapter={chapter} />
        {children}
        {chapter.body !== null && <ChapterEnd chapter={chapter} />}
      </article>
    </div>
  );
}

/** What the text needs. */
interface ChapterTextBlockProps {
  chapter: ReaderChapter;
  body: string;
  textRef: RefObject<HTMLDivElement | null>;
  look: ReadingLook;
  spot: SpotRange | null;
  /** What sits above the text (AboveText). */
  children: ReactNode;
}

/**
 * How many blocks of the chapter the reader's first draw holds: more than a tall phone or a
 * laptop shows above the fold, so the rest arrives below the edge (the reader speed check,
 * 25 Nov 2026).
 */
const FIRST_DRAW_BLOCKS = 12;

/**
 * The chapter's text in the reader's look. The comment marker is always passed in, so the
 * paragraphs keep the same elements when the counts arrive (a shared passage keeps its focus);
 * it draws nothing until then, or at all with comments off.
 *
 * @returns the text block
 */
export function ChapterTextBlock(props: ChapterTextBlockProps) {
  const { chapter, body, textRef, look, spot, children } = props;
  // The page box, which the reading ruler sits inside (IDEAS-1 part a).
  const pageRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={textRef}>
      {children}
      <div ref={pageRef} className={cn(look.hasRuler && 'tmc-has-ruler')}>
        {look.hasRuler && (
          <Suspense fallback={null}>
            <ReadingRuler boxRef={pageRef} />
          </Suspense>
        )}
        <ProtectedChapterText
          markdown={body}
          language={chapter.story.languageCode}
          isPoem={chapter.isPoem}
          className="tmc-chapter-text--reader"
          pictures={chapter.pictures}
          embeds={chapter.embeds}
          writerName={chapter.story.writer.displayName}
          canReportMedia
          spot={spot}
          pictureShare={PictureShareButton}
          paragraphAddon={ParagraphCommentMarker}
          // The first screenful first, the rest a frame later (the reader speed check, 25 Nov
          // 2026); a shared spot draws whole at once, as the spot may sit further down.
          firstDrawBlocks={spot === null ? FIRST_DRAW_BLOCKS : undefined}
        />
        <EarlierVersionComments />
      </div>
    </div>
  );
}
