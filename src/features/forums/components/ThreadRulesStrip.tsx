/**
 * ThreadRulesStrip: the forum's rules thread, in one line above a thread (bundle GAPS-9; story
 * S1-E8-05; design/boards/Thread.dc.html: "Pinned | First chapters: read this before you post. |
 * Post up to 2,000 words at a time… | Locked: read only").
 *
 * A moderator picks one thread of a forum as its rules thread (ThreadModeration). Every other
 * thread of that forum shows this strip: the "Pinned" pill, the rules thread's title as a link,
 * the opening words of its first post, and "Locked: read only" when it takes no replies. The
 * server leaves the rules thread out for a reader who may not open it, so the strip never names
 * a thread the reader can't see.
 * Who uses it: ThreadPage. It calls nothing.
 */
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { InfoPill } from '@/components/ui/InfoPill';

import type { ForumThreadPointer } from '../api/forumThreads';
import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * Renders the strip.
 *
 * @param props.rules - the forum's rules thread, or null when there is none to show
 * @returns the strip, or nothing
 */
export function ThreadRulesStrip({ rules }: { rules: ForumThreadPointer | null }) {
  const { t } = useForumsTranslation();
  if (rules === null) return null;
  return (
    <aside
      aria-label={t('rulesStrip.label')}
      className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-[20px] border border-panel-border bg-panel px-5 py-4"
    >
      <InfoPill tone="gold">{t('list.pinned')}</InfoPill>
      <p className="m-0 min-w-0 flex-[1_1_360px] text-[15px] leading-normal [overflow-wrap:anywhere] text-body">
        <Link
          to={`/forums/${rules.forumSlug}/${rules.number}`}
          className="font-bold text-ink underline"
        >
          {rules.title}
        </Link>
        {rules.summary !== null && <> {rules.summary}</>}
      </p>
      {rules.isLocked && (
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-body">
          <ActionIcon name="lock" size={14} />
          {t('rulesStrip.readOnly')}
        </span>
      )}
    </aside>
  );
}
