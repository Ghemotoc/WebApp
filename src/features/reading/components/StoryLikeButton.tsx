/**
 * StoryLikeButton: "Like" / "Liked" for the whole story, in the story page's row of buttons
 * between the library and Share (bundle 2, board B01; Robert pressed "As drawn on the canvas",
 * 24 Nov 2026).
 *
 * Look (board B01): a quiet 44 px button with a heart and the word, no count (the count is in the
 * numbers line, "418 likes"); liked, the tint with the heart filled in. It is a toggle:
 * aria-pressed says whether the reader likes it, so the state never rests on colour alone. Only a
 * member who isn't the writer sees it (StoryHeader decides); a visitor reads "Get in to follow,
 * like or save" under the row instead. A read-only account is told why it can't like. Nothing
 * shows while the state loads.
 * Who uses it: StoryHeader. What it calls: useStoryLike → like_story().
 */
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { useStoryLike } from '../hooks/useStoryLike';

import { HeartIcon } from './ReaderIcons';

/**
 * Renders the button, or nothing while it loads.
 *
 * @param props.storySlug - the story's address
 * @returns the button and, after a failed toggle, why it failed
 */
export function StoryLikeButton({ storySlug }: { storySlug: string }) {
  const { t } = useTranslation('reading');
  const like = useStoryLike(storySlug);
  if (like.state === null) return null;
  const isLiked = like.state.liked;
  return (
    <span className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        aria-pressed={isLiked}
        disabled={like.isSaving}
        onClick={like.toggle}
        className={cn(
          'inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 type-body font-semibold disabled:cursor-wait',
          // Liked: the tint with the heart filled in, so the state never rests on colour alone.
          isLiked ? 'bg-tint text-ink-heading' : 'button-glass text-ink-heading',
        )}
      >
        <HeartIcon isFilled={isLiked} />
        {t(isLiked ? 'storyLikes.liked' : 'storyLikes.like')}
      </button>
      {like.failure !== null && (
        <span role="alert" className="type-body text-destructive">
          {t(like.failure === 'read_only' ? 'storyLikes.readOnly' : 'likes.failed')}
        </span>
      )}
    </span>
  );
}
