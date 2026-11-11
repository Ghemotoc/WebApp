/**
 * ClassRepliesPanel: "Who has replied" beside a thread in a class space, for the teacher only
 * (bundle 14d IDEAS-3, part b; idea IDEA-20261102-5).
 *
 * A closed box with a button; opening it shows two lists, "Replied" and "Not yet", with a count
 * on each. Students, other members and visitors never see it, because the database answers null
 * for them (criterion 2). The lists show names only, never ages.
 * MUST-1d: the panel also holds the assignment's due date (ClassDueDateField), and a reply that
 * came after it reads "after the due date" here, for the teacher only.
 * Who shows it: ThreadPage's side column, for a thread in a space.
 * What it calls: useClassThreadReplies → class_thread_replies(); ClassDueDateField.
 */
import { useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { ClassMemberName, ClassReply } from '../api/classThreadReplies';
import { useClassThreadReplies } from '../hooks/useClassThreadReplies';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { ClassDueDateField } from './ClassDueDateField';

/**
 * One of the two lists, with its heading and count, or a line saying it is empty.
 *
 * @param props.heading - "Replied" or "Not yet", with the count
 * @param props.members - the members in it
 * @param props.emptyText - what to say when nobody is in it
 * @returns the list
 */
function MemberList({
  heading,
  members,
  emptyText,
}: {
  heading: string;
  members: (ClassMemberName & Partial<Pick<ClassReply, 'isLate'>>)[];
  emptyText: string;
}) {
  const { t } = useSpacesTranslation();
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="m-0 text-sm font-semibold text-ink">{heading}</h3>
      {members.length === 0 ? (
        <p className="m-0 text-sm text-meta">{emptyText}</p>
      ) : (
        <ul aria-label={heading} className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
          {members.map((member) => (
            <li key={member.handle} className="text-body">
              {member.displayName} <span className="text-meta">@{member.handle}</span>
              {member.isLate === true && (
                <span className="font-semibold text-body"> · {t('classReplies.late')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Renders the panel.
 *
 * @param props.threadId - the thread's ID
 * @param props.isInSpace - whether the thread lives in a space (only those can be class threads)
 * @returns the panel for the teacher; nothing for anyone else
 */
export function ClassRepliesPanel({
  threadId,
  isInSpace,
}: {
  threadId: string;
  isInSpace: boolean;
}) {
  const { t, i18n } = useSpacesTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const listsId = useId();
  const query = useClassThreadReplies(threadId, isInSpace);
  // Step 1: a failed read says so plainly; a null answer means "not for you", so nothing shows.
  if (query.isError) return <Notice tone="error">{t('classReplies.loadFailed')}</Notice>;
  const replies = query.data;
  if (replies === undefined || replies === null) return null;
  const format = new Intl.NumberFormat(i18n.language);
  // Step 2: a closed box with one button, so the side column stays short until it is wanted.
  return (
    <section
      aria-label={t('classReplies.title')}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      <h2 className="m-0 font-heading text-xl font-bold text-heading">{t('classReplies.title')}</h2>
      <p className="m-0 text-sm text-body">
        {t('classReplies.summary', {
          replied: format.format(replies.replied.length),
          total: format.format(replies.replied.length + replies.notYet.length),
        })}
      </p>
      <Button
        variant="secondary"
        aria-expanded={isOpen}
        aria-controls={listsId}
        onClick={() => setIsOpen(!isOpen)}
      >
        {t(isOpen ? 'classReplies.hide' : 'classReplies.show')}
      </Button>
      {isOpen && (
        <div id={listsId} className="flex flex-col gap-4">
          <MemberList
            heading={t('classReplies.replied', { count: replies.replied.length })}
            members={replies.replied}
            emptyText={t('classReplies.nobodyYet')}
          />
          <MemberList
            heading={t('classReplies.notYet', { count: replies.notYet.length })}
            members={replies.notYet}
            emptyText={t('classReplies.everyone')}
          />
        </div>
      )}
      <ClassDueDateField threadId={threadId} dueOn={replies.dueOn} />
    </section>
  );
}
