/**
 * ReplyForm: "Your reply" at the bottom of a thread (bundle FORUMS-1, part b; S1-E8-02; board
 * 5.2's reply card). Part c adds quoting and the quick-reply details (S1-E8-03).
 *
 * Signed out, it links to log in; an account that can't write yet is told so. After posting the
 * box empties and the address moves to the new post's permalink, so the page shows and scrolls
 * to it.
 * Who uses it: ThreadPage. What it calls: useReplyToThread → reply_to_forum_thread().
 */
import { useId, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { useSession } from '@/features/auth/hooks/useSession';

import { useReplyToThread } from '../hooks/useForumWrites';
import { failureMessages } from '../lib/forumFailures';
import { useForumsTranslation } from '../registerForumsTranslations';

import { PostEditor } from './PostEditor';

/**
 * The form itself, for a reader who may reply.
 *
 * @param props.threadNumber - the thread
 * @returns the editor, any refusal and "Post reply"
 */
function ReplyFields({ threadNumber }: { threadNumber: number }) {
  const { t } = useForumsTranslation();
  const bodyId = useId();
  const [body, setBody] = useState('');
  const [, setSearchParams] = useSearchParams();
  const replying = useReplyToThread(threadNumber);
  const messages = failureMessages(replying.failure, t);

  /** Posts the reply, then shows it at its permalink. */
  async function send(event: FormEvent) {
    event.preventDefault();
    try {
      const postNumber = await replying.run(body);
      setBody('');
      setSearchParams({ post: String(postNumber) }, { replace: true });
    } catch {
      // The refusal shows from replying.failure.
    }
  }

  return (
    <form onSubmit={(event) => void send(event)} className="flex flex-col gap-4">
      <PostEditor
        id={bodyId}
        label={t('editor.reply')}
        value={body}
        onChange={setBody}
        problem={messages.body}
      />
      {messages.general !== null && <Notice tone="error">{messages.general}</Notice>}
      <div className="flex justify-end">
        <Button type="submit" disabled={replying.isRunning || body.trim() === ''}>
          {t('reply.post')}
        </Button>
      </div>
    </form>
  );
}

/**
 * Renders the card.
 *
 * @param props.threadNumber - the thread
 * @param props.canReply - whether the account gate lets the reader write
 * @returns the reply card
 */
export function ReplyForm({ threadNumber, canReply }: { threadNumber: number; canReply: boolean }) {
  const { t } = useForumsTranslation();
  const { userId, isKnown } = useSession();
  return (
    <section
      aria-labelledby="reply-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card md:p-6"
    >
      <div className="flex flex-col gap-1">
        <Eyebrow>{t('reply.eyebrow')}</Eyebrow>
        <h2 id="reply-heading" className="m-0 font-heading text-2xl font-bold text-heading">
          {t('reply.heading')}
        </h2>
      </div>
      {isKnown && userId === null && (
        <Link
          to="/sign-in"
          className="inline-flex h-11 items-center self-start rounded-full border border-control-border bg-surface px-5 text-sm font-semibold text-heading no-underline hover:bg-tint"
        >
          {t('reply.logIn')}
        </Link>
      )}
      {userId !== null && !canReply && (
        <p className="m-0 text-base text-body">{t('reply.notActive')}</p>
      )}
      {userId !== null && canReply && <ReplyFields threadNumber={threadNumber} />}
    </section>
  );
}
