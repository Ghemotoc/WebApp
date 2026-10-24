/**
 * LikeButton: "Like this chapter" / "Liked" with the public count, after the chapter (story
 * S1-E6-03; board 3.5, the first button in the row under "End of chapter").
 *
 * Board values: a 48 px pill with a heart; not liked, a white pill with a #672786 border and text;
 * liked, filled #481C5F with white text and a filled heart. It is a toggle: aria-pressed says
 * whether the reader likes it, so the state never rests on colour alone, and the count is part of
 * the name ("Like this chapter 12 likes": the visible words, so speech input matches, WCAG 2.5.3). Signed out, it is a "Log in to like" link with the
 * count. A read-only account is told why it can't like. Nothing shows while the state loads.
 * Who uses it: ChapterEnd. What it calls: useChapterLike → like_chapter().
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

import type { ChapterAddress } from '../api/likes';
import { useChapterLike } from '../hooks/useChapterLike';

import { HeartIcon } from './ReaderIcons';

/** The pill's shared shape (board: 48 px high, 20 px each side). */
const pillShape =
  'inline-flex h-12 items-center gap-2 rounded-full px-5 text-[15px] font-semibold no-underline';

/**
 * Renders the button, the log-in link or nothing.
 *
 * @returns the control and, after a failed toggle, why it failed
 */
export function LikeButton({ address }: { address: ChapterAddress }) {
  const { t } = useTranslation('reading');
  const like = useChapterLike(address);
  if (!like.isSessionKnown || like.state === null) return null;
  const count = like.state.likeCount;
  if (!like.isSignedIn) {
    return (
      <Link
        to="/sign-in"
        className={cn(pillShape, 'border border-link bg-surface text-link hover:bg-tint')}
      >
        <HeartIcon isFilled={false} />
        {t('likes.logIn')}
        <span className="font-medium">{t('likes.count', { count })}</span>
      </Link>
    );
  }
  const isLiked = like.state.liked;
  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <button
        type="button"
        aria-pressed={isLiked}
        disabled={like.isSaving}
        onClick={like.toggle}
        className={cn(
          pillShape,
          'cursor-pointer border disabled:cursor-wait',
          isLiked
            ? 'border-chip-on bg-chip-on text-chip-on-text'
            : 'border-link bg-surface text-link hover:bg-tint',
        )}
      >
        <HeartIcon isFilled={isLiked} />
        {t(isLiked ? 'likes.liked' : 'likes.like')}
        <span className="font-medium">{t('likes.count', { count })}</span>
      </button>
      {like.failure !== null && (
        <span role="alert" className="text-sm text-destructive">
          {t(like.failure === 'read_only' ? 'likes.readOnly' : 'likes.failed')}
        </span>
      )}
    </span>
  );
}
