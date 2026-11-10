/**
 * ThreadModeration: the moderator tools on a thread page (bundle FORUMS-1, part e; S1-E8-05
 * criteria 1 and 2).
 *
 * Shown only when the server says the reader is moderation staff (can_moderate). The moderator
 * writes a reason, then makes the thread sticky (or removes sticky) and locks (or unlocks) it.
 * Every change needs a reason, which goes in the audit log (in a space, the space's moderation log,
 * FORUMS-2b; the hint says which since FORUMS-2c); a lock's reason is also shown on the thread for
 * everyone. Staff tools use plain components (CLAUDE.md, Designs).
 * GAPS-9 adds "Make rules thread" (the forum's other threads then show it in a strip,
 * ThreadRulesStrip) and, on a locked thread, pointing at the thread that carries on
 * (ThreadNextControl).
 * Who uses it: ThreadPage's side column. What it calls: useModerateThread →
 * admin_set_forum_thread_sticky(), admin_lock_forum_thread(), admin_unlock_forum_thread(),
 * admin_set_forum_rules_thread() and admin_set_forum_thread_next().
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';

import type { ThreadModeration as ModerationChange } from '../api/forumModeration';
import type { ForumThreadHeader } from '../api/forumThreads';
import { useModerateThread } from '../hooks/useForumModeration';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ThreadNextControl } from './ThreadNextControl';

/**
 * "Make sticky", "Lock thread" and "Make rules thread", each showing its opposite once done.
 *
 * @param props.thread - the thread's heading
 * @param props.isWaiting - no reason yet, or a change is being saved
 * @param props.onChange - makes one change with the reason
 * @returns the row of buttons
 */
function ThreadSwitches({
  thread,
  isWaiting,
  onChange,
}: {
  thread: ForumThreadHeader;
  isWaiting: boolean;
  onChange: (action: ModerationChange['action']) => Promise<boolean>;
}) {
  const { t } = useForumsTranslation();
  const isLocked = thread.lock !== null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        disabled={isWaiting}
        onClick={() => void onChange(thread.isSticky ? 'unsticky' : 'sticky')}
      >
        {thread.isSticky ? t('moderation.unsticky') : t('moderation.sticky')}
      </Button>
      <Button
        variant="secondary"
        disabled={isWaiting}
        onClick={() => void onChange(isLocked ? 'unlock' : 'lock')}
      >
        {isLocked ? t('moderation.unlock') : t('moderation.lock')}
      </Button>
      <Button
        variant="secondary"
        disabled={isWaiting}
        onClick={() => void onChange(thread.isRules ? 'unrules' : 'rules')}
      >
        {thread.isRules ? t('moderation.unrules') : t('moderation.rules')}
      </Button>
    </div>
  );
}

/**
 * Renders the tools.
 *
 * @param props.thread - the thread's heading, with is_sticky, is_rules and lock
 * @returns the card, or nothing for a reader who isn't moderation staff
 */
export function ThreadModeration({ thread }: { thread: ForumThreadHeader }) {
  const { t } = useForumsTranslation();
  const [reason, setReason] = useState('');
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const moderating = useModerateThread();
  if (!thread.canModerate) return null;

  /**
   * Makes one change with the reason typed, then clears the reason and says it is done.
   *
   * @returns true when the server took the change
   */
  async function change(action: ModerationChange['action'], nextThreadNumber?: number) {
    setDoneKey(null);
    try {
      const where = { action, threadNumber: thread.number, reason };
      await moderating.run(nextThreadNumber === undefined ? where : { ...where, nextThreadNumber });
      setReason('');
      setDoneKey(`moderation.done.${action}`);
      return true;
    } catch {
      // The refusal shows from moderating.failure.
      return false;
    }
  }

  const isWaiting = reason.trim() === '' || moderating.isRunning;
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
        hint={t(thread.space === null ? 'moderation.reasonHint' : 'moderation.reasonHintSpace')}
        value={reason}
        maxLength={500}
        onChange={(event) => setReason(event.target.value)}
      />
      <ThreadSwitches thread={thread} isWaiting={isWaiting} onChange={change} />
      {thread.lock !== null && (
        <ThreadNextControl
          hasNext={thread.lock.next !== null}
          isWaiting={isWaiting}
          onChange={change}
        />
      )}
      {moderating.failure !== null && (
        <Notice tone="error">{t(`moderation.failures.${moderating.failure.failure}`)}</Notice>
      )}
      {doneKey !== null && moderating.failure === null && (
        <Notice tone="success">{t(doneKey)}</Notice>
      )}
    </section>
  );
}
