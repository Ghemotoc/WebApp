/**
 * ThreadAnswerNote: "Answered: see reply #4 by poppyverse" at the top of a thread whose starter
 * marked the reply that answered it (bundle 14d IDEAS-3, part f; idea IDEA-20261102-8,
 * criterion 1).
 *
 * The link opens the reply by its permalink (?post=4), which scrolls to it and focuses it, so the
 * next person with the same question finds the answer straight away.
 * Who uses it: ThreadPage, above the posts. What it calls: nothing; the answer comes with the
 * thread (forum_thread_header_json() "answer").
 */
import { Link } from 'react-router';

import type { ForumThreadHeader } from '../api/forumThreads';
import { postAddress } from '../lib/forumAddresses';
import { nameOf } from '../lib/forumPeople';
import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * Renders the note.
 *
 * @param props.thread - the thread's heading
 * @returns the note, or nothing when no reply is marked
 */
export function ThreadAnswerNote({ thread }: { thread: ForumThreadHeader }) {
  const { t } = useForumsTranslation();
  if (thread.answer === null) return null;
  const name = nameOf(thread.answer.author, t('person.deleted'));
  return (
    <aside
      aria-label={t('answer.noteLabel')}
      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-card border border-border bg-tint px-5 py-3"
    >
      <span className="text-sm font-semibold text-heading">{t('answer.noteLead')}</span>
      <Link
        to={postAddress(thread.forumSlug, thread.number, thread.answer.number)}
        className="inline-flex min-h-6 items-center text-sm font-semibold text-link underline"
      >
        {t('answer.noteLink', { number: thread.answer.number, name })}
      </Link>
    </aside>
  );
}
