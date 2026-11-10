/**
 * LockedThreadNote: "This thread is locked", shown instead of the reply box (bundle FORUMS-1,
 * part e; S1-E8-05 criterion 2; board 5.2's locked state).
 *
 * Says when the moderation team locked the thread and why, and that everyone can still read every
 * post. It names the team, never the moderator: the board's "Locked by Andrei Mureșan, moderator"
 * would put a staff member's name in front of every reader (docs/board-fixes.md). No padlock
 * doodle: the liquid glass design has none (bundle G4).
 * GAPS-9: when a moderator pointed the thread at the one that carries on, "Go to …" links there
 * (board: "Go to the October prompt"); the server leaves it out for a reader who may not open it.
 * Who uses it: ReplyForm, when the thread has a lock.
 */
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';

import type { ForumThreadLock } from '../api/forumThreads';
import { threadDay } from '../lib/forumDates';
import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * Renders the note.
 *
 * @param props.lock - when and why the thread was locked, and where it carries on
 * @returns the locked card
 */
export function LockedThreadNote({ lock }: { lock: ForumThreadLock }) {
  const { t, i18n } = useForumsTranslation();
  return (
    <section
      aria-labelledby="locked-heading"
      className="rounded-card border border-dashed border-control-border bg-surface p-5 md:p-6"
    >
      <div className="flex flex-wrap items-start gap-4 rounded-2xl bg-panel p-5">
        <span className="flex size-11 flex-none items-center justify-center rounded-full border border-border bg-surface text-heading">
          <ActionIcon name="lock" size={22} />
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
          {lock.next !== null && (
            <Link
              to={`/forums/${lock.next.forumSlug}/${lock.next.number}`}
              className="inline-block max-w-full self-start py-2.5 text-[15px] font-semibold [overflow-wrap:anywhere] text-link underline"
            >
              {t('locked.goTo', { title: lock.next.title })}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
