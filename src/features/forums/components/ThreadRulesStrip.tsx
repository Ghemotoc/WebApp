/**
 * ThreadRulesStrip: the forum's rules thread, in one line above a thread (bundle GAPS-9; story
 * S1-E8-05; design/boards/Thread.dc.html: "Pinned | First chapters: read this before you post. |
 * Post up to 2,000 words at a time… | Locked: read only").
 *
 * A moderator picks one thread of a forum as its rules thread (ThreadModeration). Every other
 * thread of that forum shows this strip: the word "Pinned", the rules thread's title as a link,
 * the opening words of its first post, and "Locked: read only" when it takes no replies. The
 * server leaves the rules thread out for a reader who may not open it, so the strip never names
 * a thread the reader can't see.
 * CALM-9b (board simplified F05): "Pinned" is a word in bold, not a pill.
 * Who uses it: ThreadPage. It calls nothing.
 */
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';

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
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-panel-border bg-panel px-4 py-4"
    >
      <span className="type-meta font-semibold text-ink">{t('list.pinned')}</span>
      <p className="m-0 min-w-0 flex-[1_1_360px] type-body leading-normal [overflow-wrap:anywhere] text-ink-muted">
        <Link
          to={`/forums/${rules.forumSlug}/${rules.number}`}
          className="font-semibold text-ink underline"
        >
          {rules.title}
        </Link>
        {rules.summary !== null && <> {rules.summary}</>}
      </p>
      {rules.isLocked && (
        <span className="inline-flex items-center gap-2 type-meta font-semibold text-ink-muted">
          <ActionIcon name="lock" size={14} />
          {t('rulesStrip.readOnly')}
        </span>
      )}
    </aside>
  );
}
