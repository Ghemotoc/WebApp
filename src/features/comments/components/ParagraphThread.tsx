/**
 * ParagraphThread: the comments on one paragraph, opened from its count in the margin (story
 * S1-E6-06; the simplified design, bundle CALM-5, design handover Step 4, "Comments on a
 * paragraph"; boards New-Reader and New-PhoneReader; design system ParagraphComments).
 *
 * No title, no count and no paragraph number (Robert, 20 Nov 2026): the head is a small comment
 * mark, the paragraph's opening words in Literata italic ending in an ellipsis, and Close (×).
 * Then the comments, each with its avatar, fine lines between them, and the box to comment on the
 * paragraph. The thread for an earlier version lists the comments left on paragraphs the writer
 * has since changed: its head says so in words, and it has no box, as there is no paragraph left
 * to comment on. Escape and Close shut it and hand focus back to what opened it.
 * Where it sits: from 1280 px in the reader's side column, as a glass card that takes focus when
 * the reader opened it (it sits away from its button); below that in the reader's bottom sheet,
 * which is the glass itself. LazyParagraphThread decides which.
 * data-paragraph-thread tells the copy protection and the "Share quote" bar that these are
 * readers' words, not the writer's.
 * While the writer has paused new comments, the box at the foot gives way to the same line as
 * under the chapter ("New comments are paused until …") and Reply is hidden (bundle CALM-8; the
 * design handover's Step 4, points 6 and 7); the comments already there can still be read.
 * Who uses it: ParagraphCommentMarker and EarlierVersionComments (src/features/reading/), through
 * LazyParagraphThread, which fetches this file only when a reader opens a thread.
 * What it calls: useParagraphComments → paragraph_comments(); CommentItem (each comment, with its
 * replies, reactions and Report button); CommentComposer (posting on the paragraph);
 * CommentsPausedLine (during a pause).
 */
import { useEffect, useRef, useState, type RefObject } from 'react';

import { Notice } from '@/components/ui/Notice';
import { PlaceholderComments } from '@/components/ui/PlaceholderComments';
import type { ChapterAddress } from '@/features/reading/api/likes';
import type { ParagraphPlace } from '@/features/reading/api/paragraphComments';
import { CommentIcon } from '@/features/reading/components/ReaderIcons';
import { runningPauseEnd } from '@/lib/comment-pause';

import type { ParagraphThread as ParagraphThreadData } from '../api/paragraphComments';

import { useParagraphComments } from '../hooks/useParagraphComments';
import { useCommentsTranslation } from '../registerCommentsTranslations';

import { CommentComposer } from './CommentComposer';
import { CommentItem } from './CommentItem';
import { CommentsPausedLine } from './CommentsPausedLine';

/** What the thread needs. */
export interface ParagraphThreadProps {
  /** The element's ID, which the marker's aria-controls names. */
  id: string;
  address: ChapterAddress;
  place: ParagraphPlace;
  /** Shuts the thread; the opener puts focus back on itself. */
  onClose: () => void;
  /** True in the side column beside the paper (from 1280 px); false under the paragraph. */
  isInSidePanel?: boolean;
  /** True when the thread should take focus as it opens (the side column, opened by the reader). */
  takesFocus?: boolean;
  /** The paragraph's opening words, ending in an ellipsis, for the head (not for 'earlier'). */
  openingWords?: string;
}

/** The card in the side column (board New-Reader): glass, round corners, no focus outline. */
const sidePanelCard = 'glass-pill rounded-card px-4 py-4 outline-none';

/** In the bottom sheet the sheet is the glass, so the thread adds only the focus rule. */
const sheetCard = 'outline-none';

/** The head's Close: a round 44 px icon button (handover Step 4, point 4). */
const closeButton =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-tint -mr-2 -mt-1';

/** The × in Close, 18 px. */
function CloseMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" width="18" height="18" fill="none">
      <path
        d="M4.5 4.5l9 9M13.5 4.5l-9 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** What the head needs. */
interface ThreadHeadProps {
  place: ParagraphPlace;
  /** The paragraph's opening words, or undefined for the earlier version. */
  openingWords: string | undefined;
  /** The earlier version's comment count, once loaded. */
  total: number | null;
  onClose: () => void;
}

/**
 * The head: the comment mark, what the comments are on, and Close.
 *
 * @returns the head row
 */
function ThreadHead({ place, openingWords, total, onClose }: ThreadHeadProps) {
  const { t } = useCommentsTranslation();
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-tint text-ink-heading"
      >
        <CommentIcon />
      </span>
      {place === 'earlier' ? (
        <p className="m-0 min-w-0 flex-1 pt-2 type-body leading-[22px] font-semibold text-ink-heading">
          {total === null
            ? t('paragraph.earlierLabel')
            : t('paragraph.earlierTitle', { count: total })}
        </p>
      ) : (
        <blockquote className="tmc-thread-quote m-0 min-w-0 flex-1 rounded-field bg-tint px-3 py-2 font-story type-body leading-[22px] text-ink-muted italic">
          {openingWords}
        </blockquote>
      )}
      <button
        type="button"
        aria-label={t('paragraph.close')}
        onClick={onClose}
        className={closeButton}
      >
        <CloseMark />
      </button>
    </div>
  );
}

/**
 * Closes the thread on Escape anywhere inside it, as Close does (the opener takes focus back), and
 * gives it focus as it opens when asked to.
 *
 * @param sectionRef - the thread's section
 * @param onClose - shuts the thread
 * @param takesFocus - true to move focus into the thread once, as it opens
 */
function useThreadKeyboard(
  sectionRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  takesFocus: boolean,
) {
  // Step 1: Escape closes. A native listener, as the section itself isn't a control.
  useEffect(() => {
    const section = sectionRef.current;
    if (section === null) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    }
    section.addEventListener('keydown', closeOnEscape);
    return () => section.removeEventListener('keydown', closeOnEscape);
  }, [sectionRef, onClose]);
  // Step 2: in the side column the thread sits away from its button, so a reader who opened it
  // is taken into it (WCAG 2.4.3, focus order); preventScroll keeps the text where it is. The
  // flag is read once, as the thread opens: a later change must not pull focus back in.
  const takesFocusAtOpen = useRef(takesFocus);
  useEffect(() => {
    if (takesFocusAtOpen.current) sectionRef.current?.focus({ preventScroll: true });
  }, [sectionRef]);
}

/**
 * When the writer's pause of new comments ends, while it runs (CALM-8). The thread was read a
 * little while ago, so a pause that has ended since counts as none.
 *
 * @param thread - the thread, or null while it loads
 * @returns the end, or null when no pause runs (or the thread hasn't loaded)
 */
function pauseEndOf(thread: ParagraphThreadData | null): Date | null {
  if (thread === null) return null;
  return runningPauseEnd(thread.pause.pausedUntil, new Date());
}

/** What the foot of the thread needs. */
interface ThreadFootProps extends Pick<ParagraphThreadProps, 'address' | 'place'> {
  thread: ParagraphThreadData | null;
  /** When the writer's pause of new comments ends, while it runs (CALM-8); otherwise null. */
  pauseEnd: Date | null;
}

/**
 * What closes the thread: the box to comment on the paragraph, or a note saying why there is
 * none (an earlier version: the paragraph has changed since; a pause of new comments, CALM-8; or
 * a followers-only story, MUST-1a).
 *
 * @returns the composer, the paused line or the note
 */
function ThreadFoot({ address, place, thread, pauseEnd }: ThreadFootProps) {
  const { t } = useCommentsTranslation();
  // CALM-8: true once the writer's "Resume now" has worked; the box that comes back in place of
  // the line then takes the focus, so the writer isn't left on a button that has gone.
  const [hasResumed, setHasResumed] = useState(false);
  if (place === 'earlier') {
    return <p className="m-0 mt-3 type-body text-ink-muted">{t('paragraph.earlierNote')}</p>;
  }
  // CALM-8: the same line as under the chapter, where the box was; nobody can post during a pause.
  if (thread !== null && pauseEnd !== null) {
    return (
      <CommentsPausedLine
        address={address}
        end={pauseEnd}
        canResume={thread.pause.canResume}
        className="mt-3 border-t border-hairline pt-4"
        onResumed={() => setHasResumed(true)}
      />
    );
  }
  // MUST-1a: on a followers-only story, someone who doesn't follow the writer sees why. Until the
  // thread loads, the box shows; the database refuses a comment it mustn't take.
  if (thread !== null && !thread.audienceAllowsMe) {
    return <p className="m-0 mt-3 type-body text-ink-muted">{t('section.followersOnly')}</p>;
  }
  return (
    <div className="mt-3 border-t border-hairline pt-4">
      <CommentComposer address={address} paragraph={place} focusOnMount={hasResumed} />
    </div>
  );
}

/** What the list of comments needs. */
interface ThreadBodyProps extends Pick<ParagraphThreadProps, 'address' | 'place'> {
  thread: ParagraphThreadData | null;
  loadFailed: boolean;
  /** True while the writer's pause of new comments runs (CALM-8): Reply is hidden. */
  isPaused: boolean;
}

/**
 * The comments, or why there are none to show yet: a short wait, a plain error or "none yet".
 *
 * @returns the list or a line saying why it is empty
 */
function ThreadBody({ address, place, thread, loadFailed, isPaused }: ThreadBodyProps) {
  const { t } = useCommentsTranslation();
  if (loadFailed) return <Notice tone="error">{t('section.loadFailed')}</Notice>;
  // Grey comment shapes after 300 ms, never a spinner (design books item 15).
  if (thread === null)
    return <PlaceholderComments label={t('paragraph.loading')} isBoxed={false} />;
  if (thread.comments.length === 0) {
    if (place === 'earlier') return null;
    return <p className="m-0 mt-3 type-body text-ink-muted">{t('paragraph.emptyTitle')}</p>;
  }
  return (
    <div className="mt-2 divide-y divide-hairline">
      {thread.comments.map((comment) => (
        <CommentItem
          key={comment.id}
          address={address}
          comment={comment}
          isInParagraphThread
          isPaused={isPaused}
        />
      ))}
    </div>
  );
}

/**
 * Renders the thread.
 *
 * @returns the thread card, a plain message when it can't be read, or a short wait while it loads
 */
export function ParagraphThread(props: ParagraphThreadProps) {
  const { id, address, place, onClose } = props;
  const isInSidePanel = props.isInSidePanel === true;
  const takesFocus = props.takesFocus === true;
  const { t } = useCommentsTranslation();
  const { thread, loadFailed } = useParagraphComments(address, place);
  const pauseEnd = pauseEndOf(thread);
  const sectionRef = useRef<HTMLElement>(null);
  useThreadKeyboard(sectionRef, onClose, takesFocus);
  const label =
    place === 'earlier' ? t('paragraph.earlierLabel') : t('paragraph.label', { number: place });

  return (
    <section
      id={id}
      aria-label={label}
      ref={sectionRef}
      tabIndex={takesFocus ? -1 : undefined}
      data-paragraph-thread=""
      className={isInSidePanel ? sidePanelCard : sheetCard}
    >
      <ThreadHead
        place={place}
        openingWords={props.openingWords}
        total={thread?.total ?? null}
        onClose={onClose}
      />
      <ThreadBody
        address={address}
        place={place}
        thread={thread}
        loadFailed={loadFailed}
        isPaused={pauseEnd !== null}
      />
      <ThreadFoot address={address} place={place} thread={thread} pauseEnd={pauseEnd} />
    </section>
  );
}
