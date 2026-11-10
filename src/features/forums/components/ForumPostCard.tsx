/**
 * ForumPostCard: one post in a thread (bundle FORUMS-1, part b; S1-E8-02; board 5.2).
 *
 * Board values: a white card with 24 px corners; a 40 px round avatar (PersonAvatar, LOOK-7), the
 * name (15 px bold) as a link to the profile, "Thread starter" and "Staff" pills, the time ("14
 * Oct, 19:02 · Edited 14 Oct, 19:20", 12 px), the post's number at the right as its permalink
 * ("#1", criterion 3), the words in 15 px, then the actions. A deleted or removed post keeps its
 * number with a marker, so the numbers never shift. Each card is a real <article> named "Post 3 by
 * poppyverse", with an id (post-3) a permalink scrolls to. Part c draws a reply's quotes above its
 * words, each linking back to the quoted post (S1-E8-03). Under the words sits the author's forum
 * signature, only from 768 px up: phones hide it (S1-E8-08 criterion 2; Q25). Beside the name sits
 * the author's rank (RankChip, S1-E8-09). IDEAS-3f adds an "Answer" pill on the reply the thread's
 * starter marked "This answered it" (IDEA-20261102-8). GAPS-10: a reply its space's moderators
 * hid says so to the people who still see it, a reply moved from another thread is marked
 * "Moved here", a quote links to wherever the quoted post is now, and the space's owner and
 * moderators get the "Moderate" tools under a reply (PostSpaceModeration).
 * Who uses it: ThreadPage. What it calls: ForumQuoteBlock, ForumPostText, PostActions,
 * PostEditForm, PostHistory, PostSpaceModeration, RankChip, SignatureBody.
 */
import { useId, useState } from 'react';
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';
import { PersonAvatar } from '@/features/avatars/components/PersonAvatar';

import type { ForumPost } from '../api/forumThreads';
import type { QuotePicks } from '../hooks/useQuotePicks';
import { postAddress } from '../lib/forumAddresses';
import { postTime } from '../lib/forumDates';
import { nameOf } from '../lib/forumPeople';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumPostText } from './ForumPostText';
import { ForumQuoteBlock } from './ForumQuoteBlock';
import { PostActions } from './PostActions';
import { PostEditForm } from './PostEditForm';
import { PostHistory } from './PostHistory';
import { PostSpaceModeration } from './PostSpaceModeration';
import { RankChip } from './RankChip';
import { SignatureBody } from './SignatureBody';

/** What one post needs. */
export interface ForumPostCardProps {
  post: ForumPost;
  forumSlug: string;
  threadNumber: number;
  /** The thread's title, given only for post #1 (its title can be edited with it). */
  threadTitle: string | null;
  /** The thread page's quote picks, or null when the reader can't reply (S1-E8-03). */
  quotePicks: QuotePicks | null;
}

/**
 * The author's username for their avatar, or null for a deleted account.
 *
 * @returns the username or null
 */
function handleOf(post: ForumPost): string | null {
  return post.author === null ? null : post.author.handle;
}

/**
 * The avatar, the name with its pills, the time and the permalink.
 *
 * @returns the post's header
 */
function PostHeader({ post, forumSlug, threadNumber }: ForumPostCardProps) {
  const { t, i18n } = useForumsTranslation();
  const name = nameOf(post.author, t('person.deleted'));
  const created = postTime(post.createdAt, i18n.language);
  return (
    <header className="flex items-start gap-3">
      <PersonAvatar name={name} handle={handleOf(post)} />
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
          {/* The author's writer rank beside the name (S1-E8-09 criterion 5). */}
          {post.authorRank !== null && <RankChip rank={post.authorRank} />}
          {post.author?.isStaff === true && <InfoPill tone="sky">{t('staff')}</InfoPill>}
          {post.isStarter && <InfoPill tone="plum">{t('person.starter')}</InfoPill>}
          {/* IDEAS-3f: the reply that answered the thread, while everyone can read it. */}
          {post.isAnswer && post.state === 'live' && (
            <InfoPill tone="sage">{t('answer.pill')}</InfoPill>
          )}
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
          {/* GAPS-10: a space's moderator moved this reply here from another thread. */}
          {post.wasMoved && <> · {t('post.moved')}</>}
        </p>
      </div>
      <Link
        to={postAddress(forumSlug, threadNumber, post.number)}
        className="inline-flex min-h-6 items-center text-sm font-semibold text-link no-underline hover:underline"
      >
        <span className="sr-only">{t('post.permalinkPrefix')} </span>
        {t('post.permalink', { number: post.number })}
      </Link>
    </header>
  );
}

/**
 * The words, or the marker in their place; a reply's quotes come first (S1-E8-03).
 *
 * @returns the post's body
 */
function PostBody({ post, forumSlug, threadNumber }: ForumPostCardProps) {
  const { t } = useForumsTranslation();
  if (post.state === 'deleted')
    return <p className="m-0 text-[15px] text-meta italic">{t('post.deleted')}</p>;
  if (post.state === 'removed')
    return <p className="m-0 text-[15px] text-meta italic">{t('post.removed')}</p>;
  return (
    <div className="flex flex-col gap-3">
      {post.state === 'hidden' && (
        <p className="m-0 text-sm font-semibold text-body">
          {t(post.hiddenBy === 'space' ? 'post.hiddenBySpaceNote' : 'post.hiddenNote')}
        </p>
      )}
      {post.quotes.map((quote) => (
        <ForumQuoteBlock
          key={quote.number}
          quote={quote}
          // GAPS-10: the quoted post may have been moved to another thread since.
          postAddress={postAddress(
            quote.forumSlug ?? forumSlug,
            quote.threadNumber ?? threadNumber,
            quote.number,
          )}
        />
      ))}
      <ForumPostText text={post.body ?? ''} />
      {/* Q25: signatures are hidden at phone width, so threads stay short there. */}
      {post.signature !== null && (
        <div className="hidden md:block" data-testid="post-signature">
          <SignatureBody
            signature={post.signature}
            name={nameOf(post.author, t('person.deleted'))}
            size="post"
          />
        </div>
      )}
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
        <PostBody {...props} />
      )}
      {isHistoryOpen && <PostHistory postId={post.id} id={historyRegionId} />}
      {mode !== 'editing' && (
        <PostActions
          post={post}
          authorName={name}
          forumSlug={props.forumSlug}
          threadNumber={props.threadNumber}
          isConfirmingDelete={mode === 'deleting'}
          onEdit={() => setMode('editing')}
          onAskDelete={(asking) => setMode(asking ? 'deleting' : 'reading')}
          historyRegionId={historyRegionId}
          isHistoryOpen={isHistoryOpen}
          onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
          quotePicks={props.quotePicks}
        />
      )}
      {mode === 'reading' && <PostSpaceModeration post={post} forumSlug={props.forumSlug} />}
    </article>
  );
}
