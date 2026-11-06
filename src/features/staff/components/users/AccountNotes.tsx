/**
 * AccountNotes: the "Staff notes" section of the account page (bundle LOGS-1, part a; Robert,
 * 6 Nov 2026: on every profile, "a place for them to leave comments").
 *
 * Who shows it: AccountPage, for every staff member who may open the account (owner, admin,
 * moderator, support). What it calls: hooks/useAccountNotes.ts.
 * Notes are plain text, shown as text (never as HTML), newest first, 20 to a page, each with its
 * author and time. Nobody can change or delete one, so there are no edit buttons.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import type { AccountNote } from '../../api/accountNotes';
import { useAccountNotes } from '../../hooks/useAccountNotes';
import { useAccountWords } from '../../hooks/useAccountWords';

import { AccountNoteForm } from './AccountNoteForm';
import { AccountPager } from './AccountPager';

/**
 * One note: who wrote it and when, then the words, keeping the writer's line breaks.
 *
 * @returns the list item
 */
function AccountNoteItem({ note }: { note: AccountNote }) {
  const { t } = useTranslation('staff');
  const words = useAccountWords();
  const author = note.authorHandle === null ? note.authorUserIdShort : `@${note.authorHandle}`;
  return (
    <li className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0">
      <p className="m-0 text-sm text-meta">
        {t('users.notes.byline', { who: author, when: words.dateTime(note.createdAt) })}
      </p>
      <p className="m-0 whitespace-pre-wrap text-body [overflow-wrap:anywhere]">{note.body}</p>
    </li>
  );
}

/**
 * The section: heading, form, the page of notes and the pager.
 *
 * @param props.userId - the account
 * @returns the section
 */
export function AccountNotes({ userId }: { userId: string }) {
  const { t } = useTranslation('staff');
  const notes = useAccountNotes(userId);
  return (
    <section aria-labelledby="account-notes-heading" className="flex flex-col gap-3">
      <h2
        id="account-notes-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('users.notes.heading')}
      </h2>
      <AccountNoteForm
        addNote={notes.addNote}
        isAdding={notes.isAdding}
        addFailure={notes.addFailure}
      />
      {notes.readFailure !== null && (
        <Notice tone="error">{t(`users.notes.failures.${notes.readFailure}`)}</Notice>
      )}
      {!notes.isLoading && notes.readFailure === null && notes.totalCount === 0 && (
        <p className="m-0 text-body">{t('users.notes.none')}</p>
      )}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {notes.notes.map((note) => (
          <AccountNoteItem key={note.id} note={note} />
        ))}
      </ul>
      <AccountPager
        label={t('users.notes.pages')}
        pageNumber={notes.pageNumber}
        pageCount={notes.pageCount}
        hasNextPage={notes.pageNumber < notes.pageCount}
        onShowPage={notes.showPage}
      />
    </section>
  );
}
