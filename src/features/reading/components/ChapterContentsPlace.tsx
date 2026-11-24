/**
 * ChapterContentsPlace: the chapter list that opens from Contents in the chapter bar (user story
 * 2.2, board B02: "Contents in the bar (the chapter list in a panel, the current chapter
 * marked)").
 *
 * It opens where Reading settings open (ReaderToolPlace): from 1280 px at the top of the reader's
 * side column, as its own box; below that in the reader's bottom sheet. Closed by default, it
 * opens from Contents, closes with ×, Escape or Contents again, and closing gives focus back to
 * Contents (WCAG 2.4.3). Opening moves focus to its heading, so the next Tab is inside it.
 * The list: every chapter a reader can open, "14. The register", each a link; the chapter being
 * read is marked with aria-current and "You are here", in words, so the mark never rests on
 * colour alone. A long list scrolls inside the panel, opening with the current chapter in the
 * middle of it (useCurrentInView), so "chapter 14 of 15" is in sight without scrolling.
 * Who uses it: ChapterReading (lazy, fetched on the first press). What it calls: ReaderSheet;
 * the chapters come from the story page's answer (useStoryPage → get_story_page()), which the
 * reader already reads for the chapter arrows.
 */
import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

import type { StoryPageChapter } from '../api/storyPage';

import { chapterContentsButtonId, chapterContentsPanelId } from './ChapterContentsControl';
import { ReaderSheet } from './ReaderSheet';
import { CloseIcon } from './ReaderIcons';

/** What the place needs. */
export interface ChapterContentsPlaceProps {
  /** True in the side column (from 1280 px); false in the bottom sheet. */
  isInSideColumn: boolean;
  /** The story's address part, for the links. */
  storySlug: string;
  /** The chapter being read, which the list marks. */
  currentCode: string;
  /** The story's chapters, or null while the story page's answer is on its way. */
  chapters: StoryPageChapter[] | null;
  /** Closes the panel; focus goes back to Contents here. */
  onClose: () => void;
}

/**
 * Closes the panel and gives focus back to Contents, which stays in the bar.
 *
 * @param onClose - what closes the panel
 * @returns the function to call
 */
function useCloseAndReturn(onClose: () => void) {
  return useCallback(() => {
    onClose();
    document.getElementById(chapterContentsButtonId)?.focus();
  }, [onClose]);
}

/**
 * Escape closes the panel in the side column (the sheet does it itself, as a dialog).
 *
 * @param isActive - true in the side column
 * @param close - closes and gives focus back
 */
function useEscapeCloses(isActive: boolean, close: () => void) {
  useEffect(() => {
    if (!isActive) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isActive, close]);
}

/**
 * The chapters a reader can open: published ones only (the writer's own drafts and scheduled
 * chapters are on the story page's list for them, not in the reader's Contents).
 *
 * @param chapters - the story page's chapters
 * @returns the published chapters, in order
 */
function readableChapters(chapters: StoryPageChapter[]): StoryPageChapter[] {
  return chapters.filter((chapter) => chapter.status === 'published');
}

/**
 * Scrolls the list so the current chapter sits in its middle once the chapters are in. Only the
 * list scrolls, never the page (scrollIntoView would move the chapter text too).
 *
 * @param list - the list's element
 * @param isReady - true once the chapters are drawn
 */
function useCurrentInView(list: RefObject<HTMLOListElement | null>, isReady: boolean) {
  useEffect(() => {
    const element = list.current;
    if (!isReady || element === null) return;
    // One frame later: in the bottom sheet the dialog opens in its own effect, and a list in a
    // closed dialog has no height to scroll yet.
    const frame = requestAnimationFrame(() => {
      const current = element.querySelector<HTMLElement>('[aria-current="page"]');
      if (current === null) return;
      const middle = current.offsetTop - element.offsetTop - element.clientHeight / 2;
      element.scrollTo({ top: Math.max(0, middle + current.offsetHeight / 2) });
    });
    return () => cancelAnimationFrame(frame);
  }, [list, isReady]);
}

/**
 * One chapter's row: a link, or the marked current chapter.
 *
 * @returns the list item
 */
function ContentsRow(props: { chapter: StoryPageChapter; storySlug: string; isCurrent: boolean }) {
  const { chapter, storySlug, isCurrent } = props;
  const { t } = useTranslation('reading');
  return (
    <li className="border-t border-hairline first:border-t-0">
      <Link
        to={`/s/${storySlug}/${chapter.code}`}
        aria-current={isCurrent ? 'page' : undefined}
        className={cn(
          'flex min-h-11 flex-col justify-center gap-1 rounded-field px-2 py-2 type-body text-ink no-underline hover:bg-tint',
          isCurrent && 'bg-tint font-semibold text-ink-heading',
        )}
      >
        <span className="break-words">
          {t('contents.row', { number: chapter.number, title: chapter.title })}
        </span>
        {isCurrent && (
          <span className="type-meta font-normal text-ink-muted">{t('contents.youAreHere')}</span>
        )}
      </Link>
    </li>
  );
}

/**
 * The panel itself: the heading with ×, then the list.
 *
 * @returns the section
 */
function ContentsPanel(props: ChapterContentsPlaceProps & { close: () => void }) {
  const { t } = useTranslation('reading');
  const titleId = `${chapterContentsPanelId}-title`;
  // Opening moves focus to the heading, so the next Tab is inside the panel.
  useEffect(() => {
    document.getElementById(titleId)?.focus();
  }, [titleId]);
  const chapters = props.chapters === null ? null : readableChapters(props.chapters);
  const listRef = useRef<HTMLOListElement>(null);
  useCurrentInView(listRef, chapters !== null);
  return (
    <section
      id={chapterContentsPanelId}
      aria-labelledby={titleId}
      // In the side column it is its own box; in the sheet the sheet is the box, with its padding.
      className={cn('flex flex-col gap-4', props.isInSideColumn && 'box-surface rounded-card p-6')}
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id={titleId}
          tabIndex={-1}
          className="m-0 type-subheading text-ink-heading outline-none"
        >
          {t('contents.title')}
        </h2>
        <button
          type="button"
          aria-label={t('contents.close')}
          onClick={props.close}
          className="-mr-3 inline-flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-tint"
        >
          <CloseIcon />
        </button>
      </div>
      {chapters === null ? (
        <p className="m-0 type-body text-ink-muted">{t('contents.loading')}</p>
      ) : (
        <ol ref={listRef} className="m-0 flex max-h-[60dvh] list-none flex-col overflow-y-auto p-0">
          {chapters.map((chapter) => (
            <ContentsRow
              key={chapter.code}
              chapter={chapter}
              storySlug={props.storySlug}
              isCurrent={chapter.code === props.currentCode}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

/**
 * Renders the open list in its place.
 *
 * @returns the panel, in the side column or the sheet
 */
export function ChapterContentsPlace(props: ChapterContentsPlaceProps) {
  const { t } = useTranslation('reading');
  const close = useCloseAndReturn(props.onClose);
  useEscapeCloses(props.isInSideColumn, close);
  const panel = <ContentsPanel {...props} close={close} />;
  if (props.isInSideColumn) return panel;
  return (
    <ReaderSheet label={t('contents.title')} onClose={close}>
      {panel}
    </ReaderSheet>
  );
}
