/**
 * The posts a reader has picked to quote in their reply (bundle FORUMS-1, part c; story
 * S1-E8-03; board 5.2 Forum thread).
 *
 * "Quote" on a post replaces the picks with that one post and takes the reader to the reply box
 * (criterion 1); "Add to quotes" adds or takes away one post, so several can be quoted at once
 * (criterion 2); "Remove quotes" clears them. The picks are only IDs: the reply box draws them
 * in thread order from the posts on the page, and the database puts them in thread order again
 * when it saves the reply.
 * Who calls it: ThreadPage, which hands the picks to each post's buttons and to ReplyForm.
 */
import { useCallback, useState } from 'react';

/** The reply box's ID, so "Quote" can take the reader there. */
export const replyBoxId = 'forum-reply-box';

/** The picks and the ways to change them. */
export interface QuotePicks {
  /** The picked posts' IDs. */
  pickedIds: string[];
  /** "Quote": this post alone, then the reply box. */
  quoteOnly: (postId: string) => void;
  /** "Add to quotes": adds the post, or takes it away when it is already picked. */
  toggle: (postId: string) => void;
  /** "Remove quotes", and after posting. */
  clear: () => void;
}

/**
 * Moves the reader to the reply box: scrolled into view and focused, ready to type.
 */
function goToReplyBox() {
  const box = document.getElementById(replyBoxId);
  box?.scrollIntoView({ block: 'center' });
  box?.focus({ preventScroll: true });
}

/**
 * Keeps the picks for one thread page.
 *
 * @returns the picks and the ways to change them
 */
export function useQuotePicks(): QuotePicks {
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const quoteOnly = useCallback((postId: string) => {
    setPickedIds([postId]);
    // Wait a frame so the reply box shows the new quote before it takes focus.
    requestAnimationFrame(goToReplyBox);
  }, []);
  const toggle = useCallback((postId: string) => {
    setPickedIds((current) =>
      current.includes(postId) ? current.filter((id) => id !== postId) : [...current, postId],
    );
  }, []);
  const clear = useCallback(() => setPickedIds([]), []);
  return { pickedIds, quoteOnly, toggle, clear };
}
