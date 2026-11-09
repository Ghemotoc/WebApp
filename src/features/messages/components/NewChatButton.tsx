/**
 * NewChatButton: the round + beside the chats, and the small dialog it opens to start a chat by
 * username (story S1-E9-01; board Messages 5.5). Bundle G8c (board Messages in the liquid glass
 * redesign) adds a second look: a grey glass "New chat" pill with a plus, under "Pick a chat"
 * while no chat is open.
 *
 * The dialog only opens /messages/:handle; whether the person may be written to is decided there
 * by the database, so this never reveals anything about anyone.
 * Who shows it: ChatList. What it calls: PeopleDialog (S1-E5-05) and the router.
 */
import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { PeopleDialog } from '@/features/people/components/PeopleDialog';

import { useMessagesTranslation } from '../registerMessagesTranslations';

/**
 * The button that opens the dialog: a round + (named for screen readers) or a pill with words.
 *
 * @returns the button
 */
function OpenButton({ look, onOpen }: { look: 'round' | 'pill'; onOpen: () => void }) {
  const { t } = useMessagesTranslation();
  if (look === 'pill') {
    return (
      <Button variant="secondary" aria-haspopup="dialog" className="w-fit" onClick={onOpen}>
        <ActionIcon name="plus" size={16} />
        {t('chat.newChat')}
      </Button>
    );
  }
  return (
    <button
      type="button"
      aria-label={t('list.newChat')}
      aria-haspopup="dialog"
      onClick={onOpen}
      className="inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-full button-glass text-heading"
    >
      <ActionIcon name="plus" size={18} />
    </button>
  );
}

/**
 * Renders the button and its dialog.
 *
 * @param props.look - 'round' (the default, beside the chats) or 'pill' (under "Pick a chat")
 * @returns the button and the dialog
 */
export function NewChatButton({ look = 'round' }: { look?: 'round' | 'pill' }) {
  const { t } = useMessagesTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [handle, setHandle] = useState('');
  // Two of these can be on the page at once, so each dialog's field gets its own ID.
  const fieldId = `new-chat-handle-${useId()}`;

  /** Opens the chat with the username typed, without the @. */
  function open(event: FormEvent) {
    event.preventDefault();
    const username = handle.trim().replace(/^@/, '');
    if (username === '') return;
    setIsOpen(false);
    setHandle('');
    void navigate(`/messages/${encodeURIComponent(username)}`);
  }

  return (
    <>
      <OpenButton look={look} onOpen={() => setIsOpen(true)} />
      <PeopleDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        eyebrow={t('newChat.eyebrow')}
        title={t('newChat.title')}
        closeLabel={t('newChat.close')}
      >
        <form noValidate onSubmit={open} className="flex flex-col gap-4">
          <TextInput
            id={fieldId}
            label={t('newChat.label')}
            hint={t('newChat.hint')}
            autoComplete="off"
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
          />
          <Button type="submit" className="w-fit" disabled={handle.trim() === ''}>
            {t('newChat.open')}
          </Button>
        </form>
      </PeopleDialog>
    </>
  );
}
