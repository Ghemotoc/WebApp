/**
 * LikeButton: "Like this chapter" / "Liked" with the public count, after the chapter (story
 * S1-E6-03; board 3.5, the first button in the row under "End of chapter").
 *
 * Look (the simplified design, CALM-5; board New-Reader): a quiet 44 px button with a heart; liked,
 * the tint with the heart filled in. It is a toggle: aria-pressed says
 * whether the reader likes it, so the state never rests on colour alone, and the count is part of
 * the name. Board B02 (user story 2.2) shows it short, "Like · 64"; the name stays "Like this chapter
 * 64 likes", which starts with the visible word, so speech input matches (WCAG 2.5.3): "this
 * chapter" and "likes" are said but not shown, and the middot and the bare number are shown but
 * not said. Signed out, it is a "Get in to like" link with the count. A read-only account is told why it can't like. Nothing shows while the state loads.
 * Who uses it: ChapterEnd. What it calls: useChapterLike → like_chapter().
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

import type { ChapterAddress } from '../api/likes';
import { useChapterLike } from '../hooks/useChapterLike';

import { HeartIcon } from './ReaderIcons';

/** The quiet button's shape (the simplified design, CALM-5: 44 px high, the quiet glass). */
const pillShape =
  'inline-flex h-11 items-center gap-2 rounded-full px-4 type-body font-semibold no-underline';

/**
 * "Like · 64" on screen, "Like this chapter 64 likes" to a screen reader (board B02); once liked,
 * "Liked · 65" and "Liked 65 likes".
 *
 * @param count - the public like total
 * @param isLiked - true once the reader likes the chapter
 * @returns the words inside the button
 */
function LikeWords({ count, isLiked }: { count: number; isLiked: boolean }) {
  const { t, i18n } = useTranslation('reading');
  const shownCount = new Intl.NumberFormat(i18n.language).format(count);
  // One span, so the button's gap (between the heart and the words) doesn't open up "Like  · 64"
  // (board B05: "Like · 64").
  return (
    <span>
      {isLiked ? t('likes.liked') : t('likes.likeWord')}
      {!isLiked && <span className="sr-only"> {t('likes.likeRest')}</span>}
      <span aria-hidden="true" className="font-normal">
        {' · '}
        {shownCount}
      </span>
      <span className="sr-only"> {t('likes.count', { count })}</span>
    </span>
  );
}

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
      <Link to="/sign-in" className={cn(pillShape, 'button-glass text-ink-heading')}>
        <HeartIcon isFilled={false} />
        {t('likes.logIn')}
        <span className="font-normal">{t('likes.count', { count })}</span>
      </Link>
    );
  }
  const isLiked = like.state.liked;
  return (
    <span className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        aria-pressed={isLiked}
        disabled={like.isSaving}
        onClick={like.toggle}
        className={cn(
          pillShape,
          'cursor-pointer disabled:cursor-wait',
          // Liked: the tint with the heart filled in, so the state never rests on colour alone.
          isLiked ? 'bg-tint text-ink-heading' : 'button-glass text-ink-heading',
        )}
      >
        <HeartIcon isFilled={isLiked} />
        <LikeWords count={count} isLiked={isLiked} />
      </button>
      {like.failure !== null && (
        <span role="alert" className="type-body text-destructive">
          {t(like.failure === 'read_only' ? 'likes.readOnly' : 'likes.failed')}
        </span>
      )}
    </span>
  );
}
