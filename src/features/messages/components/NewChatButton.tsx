/**
 * NewChatButton: "+ New chat" and the dialog it opens (story S1-E9-01; user story 4.2, board
 * E12-Messages). Two looks: a quiet pill under the page title, and the same quiet button across
 * the "Pick a chat" card.
 *
 * User story 4.2: "New chat lists writers the member follows (and who allow messages); nobody
 * else can be found from here." The dialog lists exactly the people new_chat_people() returns:
 * those the member follows whom the database says they may write to now (can_message(), blocks
 * and the under-18 rules decide; nothing is loosened). There is no username search any more.
 * A person's profile still has its own Message button. A story link being sent into a chat
 * (GAPS-7a) stays in the address.
 * Who shows it: MessagesPage. What it calls: PeopleDialog (S1-E5-05), useNewChatPeople and the
 * router.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PeopleDialog } from '@/features/people/components/PeopleDialog';

import type { NewChatPerson } from '../api/messages';
import { useNewChatPeople } from '../hooks/useMessages';
import { useSharedLink } from '../hooks/useSharedLink';
import { useMessagesTranslation } from '../registerMessagesTranslations';

import { ChatAvatar } from './ChatAvatar';

/**
 * One person in the list: a link that opens the chat with them.
 *
 * @returns a list item
 */
function PersonRow({ person, onOpen }: { person: NewChatPerson; onOpen: () => void }) {
  const shared = useSharedLink();
  return (
    <li className="border-t border-hairline first:border-t-0">
      <Link
        to={`/messages/${encodeURIComponent(person.handle)}${shared.query}`}
        onClick={onOpen}
        className="-mx-3 flex min-h-11 items-center gap-3 rounded-field px-3 py-2 text-ink no-underline hover:bg-tint"
      >
        <ChatAvatar name={person.displayName} handle={person.handle} />
        <span className="min-w-0 flex-1 truncate type-label text-ink-heading">
          {person.displayName}
        </span>
      </Link>
    </li>
  );
}

/**
 * What the dialog says: the list, the empty line, or that it couldn't load.
 *
 * @returns the dialog's content
 */
function PeopleList({ isOpen, onOpen }: { isOpen: boolean; onOpen: () => void }) {
  const { t } = useMessagesTranslation();
  const people = useNewChatPeople(isOpen);
  if (people.isError) return <Notice tone="error">{t('newChat.loadFailed')}</Notice>;
  if (people.data === undefined) return null;
  if (people.data.length === 0) {
    return <p className="m-0 type-body text-ink-muted">{t('newChat.empty')}</p>;
  }
  return (
    <ul className="m-0 flex list-none flex-col p-0" aria-label={t('newChat.listLabel')}>
      {people.data.map((person) => (
        <PersonRow key={person.handle} person={person} onOpen={onOpen} />
      ))}
    </ul>
  );
}

/**
 * Renders the button and its dialog.
 *
 * @param props.isWide - true for the button across the "Pick a chat" card
 * @returns the button and the dialog
 */
export function NewChatButton({ isWide = false }: { isWide?: boolean }) {
  const { t } = useMessagesTranslation();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        aria-haspopup="dialog"
        className={isWide ? 'w-full' : 'w-fit'}
        onClick={() => setIsOpen(true)}
      >
        <ActionIcon name="plus" size={16} />
        {t('chat.newChat')}
      </Button>
      <PeopleDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        eyebrow={t('newChat.eyebrow')}
        title={t('newChat.title')}
        closeLabel={t('newChat.close')}
      >
        <p className="m-0 type-body text-ink-muted">{t('newChat.intro')}</p>
        <PeopleList isOpen={isOpen} onOpen={() => setIsOpen(false)} />
      </PeopleDialog>
    </>
  );
}
