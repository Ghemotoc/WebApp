/**
 * ParagraphThread: the comments on one paragraph, opened from its marker (story S1-E6-06; board
 * 3.5).
 *
 * Board values: a white card (20 px corners, #DED3E4 border, 18 px by 20 px inside) across the
 * whole row under the paragraph, labelled "Comments on paragraph N"; the eyebrow title
 * "{n} comments on this paragraph" (or "No comments on this paragraph yet") with Close beside
 * it, the comments with fine lines between them, then the box "Comment on this paragraph" with
 * its Post button. The thread for an earlier version lists the comments left on paragraphs the
 * writer has since changed, and has no box: there is no paragraph left to comment on. Escape
 * and Close shut it and hand focus back to what opened it. No doodles (DoD: none on the reader).
 * It sits inside the chapter text, so data-paragraph-thread tells the copy protection and the
 * "Share quote" bar that these are readers' words, not the writer's.
 * From 1280 px it opens in the reader's side column instead (bundle G7d2; board ReaderComments):
 * a glass card titled "31 comments on paragraph 3", which takes focus when the reader opened it,
 * because it sits away from its button. LazyParagraphThread decides where it goes.
 * Who uses it: ParagraphCommentMarker and EarlierVersionComments (src/features/reading/), which
 * fetch this file only when a reader opens a thread.
 * What it calls: useParagraphComments → paragraph_comments(); CommentItem (each comment, with its
 * replies, reactions and Report button); CommentComposer (posting on the paragraph).
 */
import { useEffect, useRef, type RefObject } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import type { ChapterAddress } from '@/features/reading/api/likes';
import type { ParagraphPlace } from '@/features/reading/api/paragraphComments';

import { useParagraphComments } from '../hooks/useParagraphComments';
import { useCommentsTranslation } from '../registerCommentsTranslations';

import { CommentComposer } from './CommentComposer';
import { CommentItem } from './CommentItem';

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
}

/** A translation key and its values. */
type TextKey = [string, Record<string, unknown>];

/** The region's label and the title over the comments. */
interface ThreadTexts {
  label: TextKey;
  title: TextKey;
}

/** The card under the paragraph (board 3.5): white, a fine border, across the whole row. */
const inlineCard =
  'tmc-paragraph-thread col-span-full mt-3 rounded-[20px] border border-border bg-surface px-5 py-[18px]';

/** The card in the side column (board ReaderComments): glass, rounder, no focus outline. */
const sidePanelCard = 'glass-pill rounded-[24px] px-5 py-[18px] outline-none';

/** The side column's title, a small heading-weight line ("31 comments on paragraph 3"). */
const sidePanelTitle = 'm-0 font-heading text-[17px] font-bold text-heading';

/**
 * The thread's label and title, in words.
 *
 * @param place - the paragraph, or 'earlier'
 * @param total - how many comments the reader may read on it
 * @param isInSidePanel - true in the side column, where the title names the paragraph
 * @returns the translation keys and values for the region label and the title
 */
function threadTexts(place: ParagraphPlace, total: number, isInSidePanel: boolean): ThreadTexts {
  if (place === 'earlier') {
    return {
      label: ['paragraph.earlierLabel', {}],
      title: ['paragraph.earlierTitle', { count: total }],
    };
  }
  if (total === 0) {
    const emptyTitle: TextKey = isInSidePanel
      ? ['paragraph.sideEmptyTitle', { number: place }]
      : ['paragraph.emptyTitle', {}];
    return { label: ['paragraph.label', { number: place }], title: emptyTitle };
  }
  // In the side column the title names the paragraph, as it sits away from it (board ReaderComments).
  if (isInSidePanel) {
    return {
      label: ['paragraph.label', { number: place }],
      title: ['paragraph.sideTitle', { count: total, number: place }],
    };
  }
  return {
    label: ['paragraph.label', { number: place }],
    title: ['paragraph.title', { count: total }],
  };
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
 * What closes the thread: the box to comment on the paragraph, or, for an earlier version, a
 * note saying why there is none (the paragraph has changed since).
 *
 * @returns the composer or the note
 */
function ThreadFoot({ address, place }: Pick<ParagraphThreadProps, 'address' | 'place'>) {
  const { t } = useCommentsTranslation();
  if (place === 'earlier') {
    return <p className="m-0 mt-3 text-sm text-meta">{t('paragraph.earlierNote')}</p>;
  }
  return (
    <div className="mt-3 border-t border-hairline pt-4">
      <CommentComposer address={address} paragraph={place} />
    </div>
  );
}

/**
 * Renders the thread.
 *
 * @returns the thread card, a plain message when it can't be read, or nothing while it loads
 */
export function ParagraphThread(props: ParagraphThreadProps) {
  const { id, address, place, onClose } = props;
  const isInSidePanel = props.isInSidePanel === true;
  const takesFocus = props.takesFocus === true;
  const { t } = useCommentsTranslation();
  const { thread, loadFailed } = useParagraphComments(address, place);
  const texts = threadTexts(place, thread?.total ?? 0, isInSidePanel);
  const sectionRef = useRef<HTMLElement>(null);
  useThreadKeyboard(sectionRef, onClose, takesFocus);

  return (
    <section
      id={id}
      aria-label={t(...texts.label)}
      ref={sectionRef}
      tabIndex={takesFocus ? -1 : undefined}
      data-paragraph-thread=""
      className={isInSidePanel ? sidePanelCard : inlineCard}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={isInSidePanel ? sidePanelTitle : 'm-0 eyebrow'}>
          {thread === null ? t('paragraph.loading') : t(...texts.title)}
        </p>
        <Button variant="secondary" onClick={onClose}>
          {t('paragraph.close')}
        </Button>
      </div>
      {loadFailed && <Notice tone="error">{t('section.loadFailed')}</Notice>}
      {thread !== null && thread.comments.length > 0 && (
        <div className="divide-y divide-hairline">
          {thread.comments.map((comment) => (
            <CommentItem key={comment.id} address={address} comment={comment} isInParagraphThread />
          ))}
        </div>
      )}
      <ThreadFoot address={address} place={place} />
    </section>
  );
}
