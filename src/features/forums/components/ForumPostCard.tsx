/**
 * ForumPostCard: one post in a thread (bundle FORUMS-1, part b; S1-E8-02; board 5.2).
 *
 * Board values: a white card with 24 px corners; a 40 px round initial, the name (15 px bold) as
 * a link to the profile, "Thread starter" and "Staff" pills, the time ("14 Oct, 19:02 · Edited 14
 * Oct, 19:20", 12 px), the post's number at the right as its permalink ("#1", criterion 3), the
 * words in 15 px, then the actions. A deleted or removed post keeps its number with a marker, so
 * the numbers never shift. Each card is a real <article> named "Post 3 by poppyverse", with an id
 * (post-3) a permalink scrolls to.
 * Who uses it: ThreadPage. What it calls: ForumPostText, PostActions, PostEditForm, PostHistory.
 */
import { useId, useState } from 'react';
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';
import { initialsOf } from '@/features/people/lib/formatting';

import type { ForumPost } from '../api/forumThreads';
import { postTime } from '../lib/forumDates';
import { nameOf } from '../lib/forumPeople';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumPostText } from './ForumPostText';
import { PostActions } from './PostActions';
import { PostEditForm } from './PostEditForm';
import { PostHistory } from './PostHistory';

/** What one post needs. */
export interface ForumPostCardProps {
  post: ForumPost;
  forumSlug: string;
  threadNumber: number;
  /** The thread's title, given only for post #1 (its title can be edited with it). */
  threadTitle: string | null;
}

/**
 * The initial, the name with its pills, the time and the permalink.
 *
 * @returns the post's header
 */
function PostHeader({ post, forumSlug, threadNumber }: ForumPostCardProps) {
  const { t, i18n } = useForumsTranslation();
  const name = nameOf(post.author, t('person.deleted'));
  const created = postTime(post.createdAt, i18n.language);
  return (
    <header className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint text-sm font-bold text-heading"
      >
        {initialsOf(name)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {post.author === null ? (
            <span className="text-[15px] font-bold text-meta">{name}</span>
          ) : (
            <Link
              to={`/u/${post.author.handle}`}
              className="text-[15px] font-bold text-ink no-underline hover:underline"
            >
              {name}
            </Link>
          )}
          {post.author?.isStaff === true && <InfoPill tone="sky">{t('staff')}</InfoPill>}
          {post.isStarter && <InfoPill tone="plum">{t('person.starter')}</InfoPill>}
        </div>
        <p className="m-0 text-xs text-meta">
          <time dateTime={post.createdAt}>{created}</time>
          {post.editedAt !== null && (
            <>
              {' · '}
              <time dateTime={post.editedAt}>
                {t('post.edited', { time: postTime(post.editedAt, i18n.language) })}
              </time>
            </>
          )}
        </p>
      </div>
      <Link
        to={`/forums/${forumSlug}/${threadNumber}?post=${post.number}`}
        className="inline-flex min-h-6 items-center text-sm font-semibold text-link no-underline hover:underline"
      >
        <span className="sr-only">{t('post.permalinkPrefix')} </span>
        {t('post.permalink', { number: post.number })}
      </Link>
    </header>
  );
}

/**
 * The words, or the marker in their place.
 *
 * @returns the post's body
 */
function PostBody({ post }: { post: ForumPost }) {
  const { t } = useForumsTranslation();
  if (post.state === 'deleted')
    return <p className="m-0 text-[15px] text-meta italic">{t('post.deleted')}</p>;
  if (post.state === 'removed')
    return <p className="m-0 text-[15px] text-meta italic">{t('post.removed')}</p>;
  return (
    <div className="flex flex-col gap-3">
      {post.state === 'hidden' && (
        <p className="m-0 text-sm font-semibold text-body">{t('post.hiddenNote')}</p>
      )}
      <ForumPostText text={post.body ?? ''} />
    </div>
  );
}

/**
 * Renders the card.
 *
 * @returns the post as an <article>
 */
export function ForumPostCard(props: ForumPostCardProps) {
  const { t } = useForumsTranslation();
  const { post } = props;
  const [mode, setMode] = useState<'reading' | 'editing' | 'deleting'>('reading');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const historyRegionId = useId();
  const name = nameOf(post.author, t('person.deleted'));
  return (
    <article
      id={`post-${post.number}`}
      tabIndex={-1}
      aria-label={t('post.label', { number: post.number, name })}
      className="flex scroll-mt-24 flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card md:p-6"
    >
      <PostHeader {...props} />
      {mode === 'editing' ? (
        <PostEditForm
          post={post}
          threadTitle={props.threadTitle}
          onDone={() => setMode('reading')}
        />
      ) : (
        <PostBody post={post} />
      )}
      {isHistoryOpen && <PostHistory postId={post.id} id={historyRegionId} />}
      {mode !== 'editing' && (
        <PostActions
          post={post}
          authorName={name}
          forumSlug={props.forumSlug}
          isConfirmingDelete={mode === 'deleting'}
          onEdit={() => setMode('editing')}
          onAskDelete={(asking) => setMode(asking ? 'deleting' : 'reading')}
          historyRegionId={historyRegionId}
          isHistoryOpen={isHistoryOpen}
          onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
        />
      )}
    </article>
  );
}
