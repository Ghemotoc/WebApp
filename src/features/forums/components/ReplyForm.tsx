/**
 * ReplyForm: "Your reply" at the bottom of a thread (bundle FORUMS-1, part b; S1-E8-02; board
 * 5.2's reply card). Part c adds quoting (S1-E8-03).
 *
 * This card is the quick reply box at the bottom of every thread (criterion 3): the reader types
 * and posts without leaving the page. Signed out, it links to log in; an account that can't
 * write yet is told so. The posts picked with "Quote" or "Add to quotes" show above the box in
 * thread order, each linking back to its post, with "2 posts quoted" and "Remove quotes" (board
 * 5.2; criteria 1 and 2). After posting the box and the quotes empty and the address moves to the
 * new post's permalink, so the page shows and scrolls to it. Part e adds "Don't bump" (the reply
 * leaves the thread's place in the forum's list) and, on a locked thread, LockedThreadNote in
 * place of the card (S1-E8-05 criteria 2 and 3).
 * GAPS-9 adds "Preview" beside "Post reply": it shows the reply as it will look (ReplyPreview),
 * made on the reader's device, and sends nothing.
 * FORUMS-2a (S1-E8-06): in a space's thread, a reader who can't reply is told how to join the
 * space (SpaceReplyNote) instead of "Your account can't write yet".
 * Who uses it: ThreadPage. What it calls: useReplyToThread → reply_to_forum_thread();
 * ForumQuoteBlock for the picked posts.
 * Before sending, usePersonalDetailsGate asks "Post anyway?" when the words look like contact
 * details (MUST-1b; PersonalDetailsGateNote); it never blocks. Before an under-18's first post,
 * RulesWalkthrough shows four short rules first (MUST-1c), keeping the words in the box.
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useSession } from '@/features/auth/hooks/useSession';
import { PersonalDetailsGateNote } from '@/features/privacy/components/PersonalDetailsNote';
import { usePersonalDetailsGate } from '@/features/privacy/hooks/usePersonalDetailsCheck';
import { RulesWalkthrough } from '@/features/safety/components/RulesWalkthrough';
import { useRulesBeforeSubmit } from '@/features/safety/hooks/useRulesWalkthrough';

import type { ForumPost, ForumQuote, ForumThreadLock, ForumThreadSpace } from '../api/forumThreads';
import { useReplyToThread } from '../hooks/useForumWrites';
import { replyBoxId, type QuotePicks } from '../hooks/useQuotePicks';
import { postAddress } from '../lib/forumAddresses';
import { failureMessages } from '../lib/forumFailures';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumQuoteBlock } from './ForumQuoteBlock';
import { LockedThreadNote } from './LockedThreadNote';
import { PostEditor } from './PostEditor';
import { ReplyPreview, replyPreviewId } from './ReplyPreview';
import { SpaceReplyNote } from './SpaceReplyNote';

/** Where the reply goes and what it may quote. */
export interface ReplyTarget {
  forumSlug: string;
  threadNumber: number;
  /** The posts on the page, in thread order: the picks are drawn from these. */
  posts: ForumPost[];
  quotePicks: QuotePicks;
}

/**
 * The picked posts that can still be quoted, in thread order, as quotes.
 *
 * A picked post that was deleted or hidden since is left out, so the reply never asks to quote
 * words that are gone.
 *
 * @param posts - the posts on the page, in thread order
 * @param pickedIds - the picked posts' IDs
 * @returns each picked live post with its quote
 */
function pickedQuotes(
  posts: ForumPost[],
  pickedIds: string[],
): { id: string; quote: ForumQuote }[] {
  const picked = posts.filter((post) => post.state === 'live' && pickedIds.includes(post.id));
  return picked.map((post) => ({
    id: post.id,
    // The picked post is on this page, so its link stays in this thread (no other place to name).
    quote: {
      number: post.number,
      author: post.author,
      state: 'live',
      body: post.body,
      threadNumber: null,
      forumSlug: null,
    },
  }));
}

/**
 * "2 posts quoted", "Remove quotes" and the quotes themselves.
 *
 * @returns the quotes about to be sent, or nothing when there are none
 */
function PickedQuotes({
  target,
  quotes,
}: {
  target: ReplyTarget;
  quotes: { id: string; quote: ForumQuote }[];
}) {
  const { t } = useForumsTranslation();
  if (quotes.length === 0) return null;
  return (
    <div role="group" aria-label={t('reply.quotesLabel')} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 text-sm text-body">
        <span>{t('reply.quoted', { count: quotes.length })}</span>
        <button
          type="button"
          onClick={target.quotePicks.clear}
          className="inline-flex h-11 items-center px-1.5 text-sm font-semibold text-link underline"
        >
          {t('reply.removeQuotes')}
        </button>
      </div>
      {quotes.map(({ id, quote }) => (
        <ForumQuoteBlock
          key={id}
          quote={quote}
          postAddress={postAddress(target.forumSlug, target.threadNumber, quote.number)}
        />
      ))}
    </div>
  );
}

/**
 * "Don't bump" with its explanation (board 5.2).
 *
 * @param props.checked - whether the reply should leave the thread where it is
 * @param props.onChange - called with the new value
 * @returns the labelled checkbox
 */
function NoBumpBox({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  const { t } = useForumsTranslation();
  return (
    <div className="flex min-h-11 flex-[1_1_320px] items-start gap-3">
      <input
        id="no-bump"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby="no-bump-note"
        className="size-6 flex-none cursor-pointer accent-primary"
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor="no-bump" className="cursor-pointer text-[15px] font-semibold text-ink">
          {t('reply.noBump')}
        </label>
        <p id="no-bump-note" className="m-0 text-[13px] text-meta">
          {t('reply.noBumpNote')}
        </p>
      </div>
    </div>
  );
}

/**
 * The form itself, for a reader who may reply.
 *
 * @param props.target - the thread, its posts and the quote picks
 * @returns the quotes, the editor, the preview when asked for, any refusal and "Post reply"
 */
function ReplyFields({ target }: { target: ReplyTarget }) {
  const { t } = useForumsTranslation();
  const [body, setBody] = useState('');
  // "Don't bump" (S1-E8-05 criterion 3): off by default, so a reply moves the thread up.
  const [noBump, setNoBump] = useState(false);
  // "Preview" (GAPS-9): closed until asked for, and closed again once the reply is posted.
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [, setSearchParams] = useSearchParams();
  const replying = useReplyToThread(target.threadNumber);
  const messages = failureMessages(replying.failure, t);
  const quotes = pickedQuotes(target.posts, target.quotePicks.pickedIds);

  /** Posts the reply with its quotes, then shows it at its permalink. */
  async function sendNow() {
    try {
      const quotedPostIds = quotes.map((picked) => picked.id);
      const postNumber = await replying.run({ body, quotedPostIds, bump: !noBump });
      setBody('');
      setNoBump(false);
      setIsPreviewing(false);
      target.quotePicks.clear();
      setSearchParams({ post: String(postNumber) }, { replace: true });
    } catch {
      // The refusal shows from replying.failure.
    }
  }

  // MUST-1b: asks "Post anyway?" before words that look like contact details go out.
  const gate = usePersonalDetailsGate({ text: body, sendNow });
  // MUST-1c: the rules walkthrough before an under-18's first post, then the gate.
  const first = useRulesBeforeSubmit(gate.submit);

  return (
    <form onSubmit={first.submit} className="flex flex-col gap-4">
      <PickedQuotes target={target} quotes={quotes} />
      <PostEditor
        id={replyBoxId}
        label={t('editor.reply')}
        value={body}
        onChange={gate.whileEditing(setBody)}
        problem={messages.body}
      />
      <RulesWalkthrough
        walkthrough={first.rules}
        onClosed={() => document.getElementById(replyBoxId)?.focus()}
      />
      <PersonalDetailsGateNote gate={gate} isSending={replying.isRunning} />
      {isPreviewing && <ReplyPreview text={body} />}
      {messages.general !== null && <Notice tone="error">{messages.general}</Notice>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <NoBumpBox checked={noBump} onChange={setNoBump} />
        <Button
          variant="secondary"
          aria-expanded={isPreviewing}
          aria-controls={isPreviewing ? replyPreviewId : undefined}
          onClick={() => setIsPreviewing(!isPreviewing)}
        >
          {isPreviewing ? t('reply.previewHide') : t('reply.preview')}
        </Button>
        <Button type="submit" disabled={replying.isRunning || body.trim() === ''}>
          {t('reply.post')}
        </Button>
      </div>
    </form>
  );
}

/**
 * Why a signed-in reader can't reply: how to join the space, or that the account can't write yet.
 *
 * @param props.space - the thread's space, or null in the main forums
 * @returns one line
 */
function CannotReplyNote({ space }: { space: ForumThreadSpace | null }) {
  const { t } = useForumsTranslation();
  if (space !== null) return <SpaceReplyNote space={space} />;
  return <p className="m-0 text-base text-body">{t('reply.notActive')}</p>;
}

/**
 * Renders the card.
 *
 * @param props.target - the thread, its posts and the quote picks
 * @param props.canReply - whether the reader may write here
 * @param props.lock - the thread's lock, or null while it is open
 * @param props.space - the thread's space, or null in the main forums
 * @returns the reply card, or the locked note on a locked thread
 */
export function ReplyForm({
  target,
  canReply,
  lock,
  space,
}: {
  target: ReplyTarget;
  canReply: boolean;
  lock: ForumThreadLock | null;
  space: ForumThreadSpace | null;
}) {
  const { t } = useForumsTranslation();
  const { userId, isKnown } = useSession();
  // A locked thread takes no replies from anyone (S1-E8-05 criterion 2).
  if (lock !== null) return <LockedThreadNote lock={lock} />;
  return (
    <section
      aria-labelledby="reply-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card md:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="reply-heading" className="m-0 font-heading text-2xl font-bold text-heading">
          {t('reply.heading')}
        </h2>
      </div>
      {isKnown && userId === null && (
        <Link
          to="/sign-in"
          className="inline-flex h-11 items-center self-start rounded-full button-glass px-5 text-sm font-semibold no-underline"
        >
          {t('reply.logIn')}
        </Link>
      )}
      {userId !== null && !canReply && <CannotReplyNote space={space} />}
      {userId !== null && canReply && <ReplyFields target={target} />}
    </section>
  );
}
