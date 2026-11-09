/**
 * PostActions: the row under a post: Edit and Delete on one's own, Earlier versions for
 * moderators, Report on everyone else's (bundle FORUMS-1, part b; S1-E8-02; board 5.2). Part c
 * adds "Quote" and the "Add to quotes" chip for a reader who may reply (S1-E8-03).
 *
 * Delete asks first, in place ("Delete this post? Its number stays…"). Report is the one shared
 * ReportButton (rule 6). Each button's name says which post it acts on.
 * Who uses it: ForumPostCard. What it calls: useDeletePost → delete_forum_post(); ReportButton;
 * the thread page's quote picks (hooks/useQuotePicks.ts). IDEAS-3f adds "This answered it" for
 * the thread's starter on someone else's reply (IDEA-20261102-8): useMarkAnswer →
 * mark_forum_thread_answer().
 */
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { ForumPost } from '../api/forumThreads';
import { useMarkAnswer } from '../hooks/useForumAnswers';
import { useDeletePost } from '../hooks/useForumWrites';
import type { QuotePicks } from '../hooks/useQuotePicks';
import { failureText } from '../lib/forumFailures';
import { useForumsTranslation } from '../registerForumsTranslations';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the row needs. */
export interface PostActionsProps {
  post: ForumPost;
  /** The post's author's name, for the buttons' names. */
  authorName: string;
  /** The forum's address, to go back to when deleting #1 takes the thread with it. */
  forumSlug: string;
  /** The thread's number, for "This answered it" (IDEAS-3f). */
  threadNumber: number;
  isConfirmingDelete: boolean;
  onEdit: () => void;
  onAskDelete: (asking: boolean) => void;
  historyRegionId: string;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
  /** The thread page's quote picks, or null when the reader can't reply (S1-E8-03). */
  quotePicks: QuotePicks | null;
}

/**
 * "Quote" and "Add to quotes" for one live post (criteria 1 and 2; board 5.2: a text button, then
 * a chip that shows a tick and "Added to quotes" when picked).
 *
 * @param props.post - the post
 * @param props.quotePicks - the thread page's picks
 * @returns the two buttons
 */
function QuoteButtons({ post, quotePicks }: { post: ForumPost; quotePicks: QuotePicks }) {
  const { t } = useForumsTranslation();
  const isPicked = quotePicks.pickedIds.includes(post.id);
  const chipKey = isPicked ? 'addedQuote' : 'addQuote';
  return (
    <>
      <Button
        variant="secondary"
        aria-label={t('post.quoteLabel', { number: post.number })}
        onClick={() => quotePicks.quoteOnly(post.id)}
      >
        {t('post.quote')}
      </Button>
      <Chip
        isPressed={isPicked}
        onPressedChange={() => quotePicks.toggle(post.id)}
        accessibleName={t(`post.${chipKey}Label`, { number: post.number })}
      >
        {t(`post.${chipKey}`)}
      </Chip>
    </>
  );
}

/**
 * "This answered it" on a reply, or "Not the answer" on the one already marked (IDEAS-3f). Only
 * the thread's starter gets it, and only on someone else's live reply (criterion 2).
 *
 * @param props.post - the reply
 * @param props.threadNumber - its thread
 * @returns the button, with any refusal in plain words beside it
 */
function AnswerButton({ post, threadNumber }: { post: ForumPost; threadNumber: number }) {
  const { t } = useForumsTranslation();
  const marking = useMarkAnswer();
  // Pressing it on the marked reply takes the mark away; on any other reply, moves it there.
  const postNumber = post.isAnswer ? null : post.number;
  const key = post.isAnswer ? 'unmark' : 'mark';
  return (
    <>
      <Button
        variant="secondary"
        aria-label={t(`answer.${key}Label`, { number: post.number })}
        disabled={marking.isRunning}
        onClick={() => void marking.run({ threadNumber, postNumber }).catch(errorShownByHook)}
      >
        {t(`answer.${key}`)}
      </Button>
      {marking.failure !== null && (
        <span role="alert" className="text-sm font-semibold text-destructive">
          {t(`answer.failures.${marking.failure}`)}
        </span>
      )}
    </>
  );
}

/**
 * "Delete this post?" with the two answers.
 *
 * @returns the question, the buttons and any refusal
 */
function DeleteQuestion({ post, forumSlug, onAskDelete }: PostActionsProps) {
  const { t } = useForumsTranslation();
  const navigate = useNavigate();
  const deleting = useDeletePost();

  /** Deletes the post; a thread that went with it sends the reader back to its forum. */
  async function confirm() {
    try {
      const threadDeleted = await deleting.run(post.id);
      onAskDelete(false);
      if (threadDeleted) void navigate(`/forums/${forumSlug}`);
    } catch {
      // The refusal shows from deleting.failure.
    }
  }

  return (
    <div
      role="group"
      aria-label={t('post.deleteLabel', { number: post.number })}
      className="flex w-full flex-col gap-2"
    >
      <p className="m-0 text-sm text-ink">{t('post.deleteQuestion')}</p>
      {deleting.failure !== null && (
        <p className="m-0 text-sm font-semibold text-destructive">
          {t(...failureText(deleting.failure))}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant="destructive" onClick={() => void confirm()} disabled={deleting.isRunning}>
          {t('post.deleteConfirm')}
        </Button>
        <Button variant="secondary" onClick={() => onAskDelete(false)}>
          {t('post.cancel')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Earlier versions for moderators, Edit and Delete for the author.
 *
 * @returns the buttons that apply, or nothing
 */
function ManageButtons(props: PostActionsProps) {
  const { t } = useForumsTranslation();
  const { post } = props;
  return (
    <>
      {post.hasHistory && (
        <Button
          variant="secondary"
          aria-expanded={props.isHistoryOpen}
          aria-controls={props.historyRegionId}
          onClick={props.onToggleHistory}
        >
          {t(props.isHistoryOpen ? 'post.historyHide' : 'post.history')}
        </Button>
      )}
      {post.canEdit && (
        <Button
          variant="secondary"
          aria-label={t('post.editLabel', { number: post.number })}
          onClick={props.onEdit}
        >
          {t('post.edit')}
        </Button>
      )}
      {post.canDelete && (
        <Button
          variant="secondary"
          aria-label={t('post.deleteLabel', { number: post.number })}
          onClick={() => props.onAskDelete(true)}
        >
          {t('post.delete')}
        </Button>
      )}
    </>
  );
}

/**
 * Renders the row.
 *
 * @returns the buttons that apply to this post and reader
 */
export function PostActions(props: PostActionsProps) {
  const { t } = useForumsTranslation();
  const { post } = props;
  if (props.isConfirmingDelete) return <DeleteQuestion {...props} />;
  const canReport = !post.isMine && (post.state === 'live' || post.state === 'hidden');
  // Only words everyone can read can be quoted: never a hidden, deleted or removed post.
  const quotePicks = post.state === 'live' ? props.quotePicks : null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
      {post.canMarkAnswer && <AnswerButton post={post} threadNumber={props.threadNumber} />}
      {quotePicks !== null && <QuoteButtons post={post} quotePicks={quotePicks} />}
      <ManageButtons {...props} />
      {canReport && (
        <ReportButton
          itemType="forum_post"
          itemReference={post.id}
          itemLabel={t('post.reportLabel', { number: post.number, name: props.authorName })}
        />
      )}
    </div>
  );
}
