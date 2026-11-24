/**
 * CommentParagraphLink: "On paragraph 3" in a comment's meta line (story S1-E6-06; the meta line
 * and the jump, BOOKS B05, user story 2.5, board B05-ReaderEnd).
 *
 * In the chapter reader it is a text button: pressing it brings that paragraph's comment marker
 * to the middle of the screen, gives it the focus and opens its thread, so the reader sees the
 * words the comment is about. Anywhere else (no paragraph threads around it) it is plain words.
 * "On an earlier version" works the same way with the thread of comments on earlier versions.
 * Who uses it: CommentItem. What it calls: ParagraphCommentsContext (the reader's open thread).
 */
import { useContext } from 'react';

import { ParagraphCommentsContext } from '@/features/reading/lib/paragraphCommentsContext';

import type { ChapterComment } from '../api/comments';
import { useCommentsTranslation } from '../registerCommentsTranslations';

/** Where a comment sits: a paragraph's number, or 'earlier' for one since changed. */
type CommentPlace = NonNullable<ChapterComment['paragraph']>;

/**
 * Finds the marker that opens a paragraph's thread (its aria-controls names the thread).
 *
 * @param place - the paragraph's number, or 'earlier'
 * @returns the marker, or null when it isn't drawn
 */
function markerOf(place: CommentPlace): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[aria-controls="paragraph-thread-${String(place)}"]`);
}

/**
 * Renders the words, as a button in the reader.
 *
 * @param props.place - the paragraph the comment is on
 * @returns the button or the words
 */
export function CommentParagraphLink({ place }: { place: CommentPlace }) {
  const { t } = useCommentsTranslation();
  const paragraphs = useContext(ParagraphCommentsContext);
  const words =
    place === 'earlier'
      ? t('comment.onEarlierVersion')
      : t('comment.onParagraph', { number: place });
  // Outside the reader there is no paragraph to go to.
  if (paragraphs === null) return <span className="font-semibold text-link">{words}</span>;

  /** Takes the reader to the paragraph and opens its thread. */
  function goToParagraph() {
    // Step 1: bring the paragraph's marker into view and give it the focus, as a link does.
    const marker = markerOf(place);
    marker?.scrollIntoView({ block: 'center' });
    marker?.focus({ preventScroll: true });
    // Step 2: open that paragraph's comments beside it.
    paragraphs?.setOpenPlace(place);
  }

  return (
    <button
      type="button"
      onClick={goToParagraph}
      className="hit-target cursor-pointer border-0 bg-transparent p-0 font-semibold text-link underline underline-offset-2"
    >
      {words}
    </button>
  );
}
