/**
 * ThreadHeader: a thread's breadcrumb, title, "Started by … on … · 23 replies" and its Report
 * button (bundle FORUMS-1, part b; S1-E8-02; board 5.2's heading).
 *
 * Board values: the title in Bricolage Grotesque at 36 to 48 px, the line under it in 14 px with
 * the starter's name as a link (no doodle since bundle G4). A thread staff hid shows its starter a note; nobody else sees it.
 * Who uses it: ThreadPage. What it calls: ForumBreadcrumb, ReportButton (rule 6).
 */
import { Trans } from 'react-i18next';
import { Link } from 'react-router';

import { ReportButton } from '@/features/reporting/components/ReportButton';

import type { ForumEntry } from '../api/forumIndex';
import type { ForumThreadHeader } from '../api/forumThreads';
import { threadDay } from '../lib/forumDates';
import { nameOf } from '../lib/forumPeople';
import { useForumsTranslation } from '../registerForumsTranslations';

import { ForumBreadcrumb } from './ForumBreadcrumb';

/**
 * "Started by inkwolf on 14 October · 23 replies".
 *
 * @param props.thread - the thread
 * @returns the line
 */
function StartedByLine({ thread }: { thread: ForumThreadHeader }) {
  const { t, i18n } = useForumsTranslation();
  const author = thread.author;
  const nameElement =
    author === null ? (
      <span />
    ) : (
      <Link to={`/u/${author.handle}`} className="text-link underline" />
    );
  return (
    <p className="m-0 text-sm text-body">
      <Trans
        t={t}
        i18nKey="thread.startedBy"
        values={{
          name: nameOf(author, t('person.deleted')),
          date: threadDay(thread.createdAt, i18n.language),
        }}
        components={{ author: nameElement }}
      />
      {' · '}
      {t('thread.replies', { count: thread.replyCount })}
    </p>
  );
}

/**
 * Renders the heading.
 *
 * @param props.thread - the thread
 * @param props.path - its forums, from the category down
 * @returns the header
 */
export function ThreadHeader({ thread, path }: { thread: ForumThreadHeader; path: ForumEntry[] }) {
  const { t } = useForumsTranslation();
  return (
    <header className="relative flex flex-col gap-3">
      <ForumBreadcrumb path={path} current={thread.title} space={thread.space} />
      {/* A title with no spaces in it wraps instead of pushing the page sideways (rule 21). */}
      <h1 className="page-title max-w-[1100px] [overflow-wrap:anywhere]">{thread.title}</h1>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StartedByLine thread={thread} />
        {!thread.isMine && (
          <ReportButton
            itemType="forum_thread"
            itemReference={thread.id}
            itemLabel={t('thread.reportLabel', { title: thread.title })}
          />
        )}
      </div>
      {thread.state === 'hidden' && (
        <p className="m-0 text-sm font-semibold text-body">{t('thread.hiddenNote')}</p>
      )}
    </header>
  );
}
