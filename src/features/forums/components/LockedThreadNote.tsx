/**
 * LockedThreadNote: "This thread is locked", shown instead of the reply box (bundle FORUMS-1,
 * part e; S1-E8-05 criterion 2; board 5.2's locked state).
 *
 * Says when the moderation team locked the thread and why, and that everyone can still read every
 * post. The padlock doodle sits in the card's own top band, so it never reaches the post above.
 * It names the team, never the moderator: the board's "Locked by Andrei Mureșan, moderator"
 * would put a staff member's name in front of every reader (docs/board-fixes.md). The padlock
 * doodle is a widget doodle of this card, hidden on phones.
 * Who uses it: ReplyForm, when the thread has a lock.
 */
import lockIcon from '@/assets/icons/lock.svg';
import { Doodle } from '@/components/ui/Doodle';

import type { ForumThreadLock } from '../api/forumThreads';
import { threadDay } from '../lib/forumDates';
import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * Renders the note.
 *
 * @param props.lock - when and why the thread was locked
 * @returns the locked card
 */
export function LockedThreadNote({ lock }: { lock: ForumThreadLock }) {
  const { t, i18n } = useForumsTranslation();
  return (
    <section
      aria-labelledby="locked-heading"
      className="relative rounded-card border border-dashed border-control-border bg-surface p-5 min-[600px]:pt-16 md:p-6 md:pt-16"
    >
      <Doodle
        name="padlock"
        kind="widget"
        on="This thread is locked"
        hideBelow="phone"
        className="absolute top-2 right-8 w-[52px] rotate-[10deg]"
      />
      <div className="flex flex-wrap items-start gap-4 rounded-2xl bg-panel p-5">
        <span className="flex size-11 flex-none items-center justify-center rounded-full border border-border bg-surface">
          <img src={lockIcon} alt="" aria-hidden="true" className="size-6" />
        </span>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1.5">
          <h2 id="locked-heading" className="m-0 font-heading text-xl font-bold text-heading">
            {t('locked.heading')}
          </h2>
          <p className="m-0 text-[15px] leading-relaxed text-body">
            {t('locked.byTeam', {
              date: threadDay(lock.lockedAt, i18n.language),
              reason: lock.reason,
            })}
          </p>
          <p className="m-0 text-[15px] leading-relaxed text-body">{t('locked.stillRead')}</p>
        </div>
      </div>
    </section>
  );
}
