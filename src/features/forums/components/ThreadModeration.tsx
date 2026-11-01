/**
 * ThreadModeration: the moderator tools on a thread page (bundle FORUMS-1, part e; S1-E8-05
 * criteria 1 and 2).
 *
 * Shown only when the server says the reader is moderation staff (can_moderate). The moderator
 * writes a reason, then makes the thread sticky (or removes sticky) and locks (or unlocks) it.
 * Every change needs a reason, which goes in the audit log; a lock's reason is also shown on the
 * thread for everyone. Staff tools use plain components, no doodles (CLAUDE.md, Designs).
 * Who uses it: ThreadPage's side column. What it calls: useModerateThread →
 * admin_set_forum_thread_sticky(), admin_lock_forum_thread(), admin_unlock_forum_thread().
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';

import type { ThreadModeration as ModerationChange } from '../api/forumModeration';
import type { ForumThreadHeader } from '../api/forumThreads';
import { useModerateThread } from '../hooks/useForumModeration';
import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * Renders the tools.
 *
 * @param props.thread - the thread's heading, with is_sticky and lock
 * @returns the card, or nothing for a reader who isn't moderation staff
 */
export function ThreadModeration({ thread }: { thread: ForumThreadHeader }) {
  const { t } = useForumsTranslation();
  const [reason, setReason] = useState('');
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const moderating = useModerateThread();
  if (!thread.canModerate) return null;

  /** Makes one change with the reason typed, then clears the reason and says it is done. */
  async function change(action: ModerationChange['action']) {
    setDoneKey(null);
    try {
      await moderating.run({ action, threadNumber: thread.number, reason });
      setReason('');
      setDoneKey(`moderation.done.${action}`);
    } catch {
      // The refusal shows from moderating.failure.
    }
  }

  const isLocked = thread.lock !== null;
  const isEmpty = reason.trim() === '';
  return (
    <section
      aria-labelledby="moderation-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      <h2 id="moderation-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('moderation.heading')}
      </h2>
      <Textarea
        id="moderation-reason"
        label={t('moderation.reason')}
        hint={t('moderation.reasonHint')}
        value={reason}
        maxLength={500}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={isEmpty || moderating.isRunning}
          onClick={() => void change(thread.isSticky ? 'unsticky' : 'sticky')}
        >
          {thread.isSticky ? t('moderation.unsticky') : t('moderation.sticky')}
        </Button>
        <Button
          variant="secondary"
          disabled={isEmpty || moderating.isRunning}
          onClick={() => void change(isLocked ? 'unlock' : 'lock')}
        >
          {isLocked ? t('moderation.unlock') : t('moderation.lock')}
        </Button>
      </div>
      {moderating.failure !== null && (
        <Notice tone="error">{t(`moderation.failures.${moderating.failure.failure}`)}</Notice>
      )}
      {doneKey !== null && moderating.failure === null && (
        <Notice tone="success">{t(doneKey)}</Notice>
      )}
    </section>
  );
}
