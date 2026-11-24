/**
 * CommentBody: what sits in a comment's place under its name (story S1-E6-01; board 3.5).
 *
 * - live: the words; a spoiler first shows a box, "Spoiler. This comment is marked as a spoiler.",
 *   with an underlined "Show spoiler" text button (criterion 2; board B05-ReaderEnd, BOOKS B05),
 *   which reveals the words in place (aria-expanded says which).
 * - hidden: the author's own comment that staff hid: the words and a note that only they see it.
 * - removed: "[Removed by the moderation team]" (architecture 1.8.5's marker).
 * - deleted: "Comment deleted." Both markers show only while replies keep the place.
 * Who uses it: CommentItem. What it calls: CommentText.
 */
import { useId, useState } from 'react';

import type { ChapterComment } from '../api/comments';
import { useCommentsTranslation } from '../registerCommentsTranslations';

import { CommentText } from './CommentText';

/**
 * The spoiler's cover and its button, then the words once shown.
 *
 * @returns the cover or the words
 */
function SpoilerBody({ text }: { text: string }) {
  const { t } = useCommentsTranslation();
  const [isShown, setIsShown] = useState(false);
  const wordsId = useId();
  if (isShown) {
    return (
      <div id={wordsId}>
        <CommentText text={text} />
      </div>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-field bg-tint px-4 py-3">
      <p className="m-0 type-body text-ink">
        <span className="font-semibold">{t('comment.spoilerLabel')}</span>{' '}
        {t('comment.spoilerNote')}
      </p>
      <button
        type="button"
        aria-expanded={false}
        aria-controls={wordsId}
        onClick={() => setIsShown(true)}
        className="hit-target min-h-11 cursor-pointer border-0 bg-transparent p-0 type-body font-semibold text-link underline underline-offset-2"
      >
        {t('comment.showSpoiler')}
      </button>
    </div>
  );
}

/**
 * Renders the place.
 *
 * @returns the words, the spoiler cover or a marker
 */
export function CommentBody({ comment }: { comment: ChapterComment }) {
  const { t } = useCommentsTranslation();
  if (comment.state === 'removed' || comment.state === 'deleted' || comment.body === null) {
    return (
      <p className="m-0 mt-2 type-body text-ink-muted italic">
        {t(comment.state === 'removed' ? 'comment.removed' : 'comment.deleted')}
      </p>
    );
  }
  return (
    <>
      {comment.isSpoiler ? (
        <SpoilerBody text={comment.body} />
      ) : (
        <CommentText text={comment.body} />
      )}
      {comment.state === 'hidden' && (
        <p className="m-0 mt-2 type-meta text-ink-muted">{t('comment.hiddenNote')}</p>
      )}
    </>
  );
}
