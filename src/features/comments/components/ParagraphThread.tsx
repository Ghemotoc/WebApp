/**
 * ParagraphThread: the comments on one paragraph, opened from its marker (story S1-E6-06; board
 * 3.5).
 *
 * Board values: a white card (20 px corners, #DED3E4 border, 18 px by 20 px inside) across the
 * whole row under the paragraph, labelled "Comments on paragraph N"; the Cutive title
 * "{n} comments on this paragraph" (or "No comments on this paragraph yet") with Close beside
 * it, the comments with fine lines between them, then the box "Comment on this paragraph" with
 * its Post button. The thread for an earlier version lists the comments left on paragraphs the
 * writer has since changed, and has no box: there is no paragraph left to comment on. Escape
 * and Close shut it and hand focus back to what opened it. No doodles (DoD: none on the reader).
 * It sits inside the chapter text, so data-paragraph-thread tells the copy protection and the
 * "Share quote" bar that these are readers' words, not the writer's.
 * Who uses it: ParagraphCommentMarker and EarlierVersionComments (src/features/reading/), which
 * fetch this file only when a reader opens a thread.
 * What it calls: useParagraphComments → paragraph_comments(); CommentItem (each comment, with its
 * replies, reactions and Report button); CommentComposer (posting on the paragraph).
 */
import { useEffect, useRef } from 'react';

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
}

/** A translation key and its values. */
type TextKey = [string, Record<string, unknown>];

/** The region's label and the title over the comments. */
interface ThreadTexts {
  label: TextKey;
  title: TextKey;
}

/**
 * The thread's label and title, in words.
 *
 * @param place - the paragraph, or 'earlier'
 * @param total - how many comments the reader may read on it
 * @returns the translation keys and values for the region label and the title
 */
function threadTexts(place: ParagraphPlace, total: number): ThreadTexts {
  if (place === 'earlier') {
    return {
      label: ['paragraph.earlierLabel', {}],
      title: ['paragraph.earlierTitle', { count: total }],
    };
  }
  if (total === 0) {
    return { label: ['paragraph.label', { number: place }], title: ['paragraph.emptyTitle', {}] };
  }
  return {
    label: ['paragraph.label', { number: place }],
    title: ['paragraph.title', { count: total }],
  };
}

/**
 * Renders the thread.
 *
 * @returns the thread card, a plain message when it can't be read, or nothing while it loads
 */
export function ParagraphThread({ id, address, place, onClose }: ParagraphThreadProps) {
  const { t } = useCommentsTranslation();
  const { thread, loadFailed } = useParagraphComments(address, place);
  const texts = threadTexts(place, thread?.total ?? 0);
  const sectionRef = useRef<HTMLElement>(null);

  // Escape anywhere inside the thread shuts it, as Close does (the opener takes focus back). A
  // native listener, as the section itself isn't a control.
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
  }, [onClose]);

  return (
    <section
      id={id}
      aria-label={t(...texts.label)}
      ref={sectionRef}
      data-paragraph-thread=""
      className="tmc-paragraph-thread col-span-full mt-3 rounded-[20px] border border-border bg-surface px-5 py-[18px]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 font-eyebrow text-sm leading-[1.3] font-normal text-eyebrow">
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
            <CommentItem key={comment.id} address={address} comment={comment} />
          ))}
        </div>
      )}
      {place === 'earlier' ? (
        <p className="m-0 mt-3 text-sm text-meta">{t('paragraph.earlierNote')}</p>
      ) : (
        <div className="mt-3 border-t border-hairline pt-4">
          <CommentComposer address={address} paragraph={place} />
        </div>
      )}
    </section>
  );
}
