/**
 * CommentBody: what sits in a comment's place under its name (story S1-E6-01; board 3.5).
 *
 * - live: the words; a spoiler first shows "This comment is marked as a spoiler." and a "Show
 *   spoiler" button (criterion 2), which reveals the words in place (aria-expanded says which).
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
    <div className="mt-2 flex flex-wrap items-center gap-3 rounded-2xl bg-tint px-4 py-3">
      <span className="text-[15px] text-body">{t('comment.spoilerNote')}</span>
      <button
        type="button"
        aria-expanded={false}
        aria-controls={wordsId}
        onClick={() => setIsShown(true)}
        className="h-11 cursor-pointer rounded-full border border-link bg-surface px-[18px] text-sm font-semibold text-link hover:bg-tint"
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
      <p className="m-0 mt-1.5 text-[15px] text-meta italic">
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
        <p className="m-0 mt-1.5 text-[13px] text-meta">{t('comment.hiddenNote')}</p>
      )}
    </>
  );
}
