/**
 * MessageComposer: the box at the bottom of a chat, "Send" and "Text only…" (story S1-E9-01,
 * criterion 4; board Messages 5.5).
 *
 * Text only: images in messages are OPEN and off (the story's proposal). The box takes at most
 * 2,000 characters, as the database does. A refusal shows in plain words; "isn't taking
 * messages" never says why (S1-E9-03). The box empties once the message is saved. It can start
 * with words already in it: the story link a reader is sending from a share dialog (GAPS-7a).
 * Who shows it: ChatPanel. What it calls: the onSend it is given.
 * Before sending, usePersonalDetailsGate asks "Post anyway?" when the words look like contact
 * details (MUST-1b; PersonalDetailsGateNote); it never blocks.
 */
import { useEffect, useRef, useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PersonalDetailsGateNote } from '@/features/privacy/components/PersonalDetailsNote';
import { usePersonalDetailsGate } from '@/features/privacy/hooks/usePersonalDetailsCheck';

import { longestMessage, type MessagesFailure } from '../api/messages';
import { useMessagesTranslation } from '../registerMessagesTranslations';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the composer needs. */
export interface MessageComposerProps {
  otherName: string;
  isSending: boolean;
  failure: MessagesFailure | null;
  waitMinutes: number | null;
  onSend: (body: string) => Promise<unknown>;
  /** Words the box starts with (a story link being shared); empty when left out. */
  initialBody?: string;
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function MessageComposer({
  otherName,
  isSending,
  failure,
  waitMinutes,
  onSend,
  initialBody = '',
}: MessageComposerProps) {
  const { t } = useMessagesTranslation();
  const [body, setBody] = useState(initialBody);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  // A box that starts with a link puts the caret after it, so words typed next follow the link
  // instead of running into its start. Focus is left where it is.
  useEffect(() => {
    if (initialBody === '') return;
    boxRef.current?.setSelectionRange(initialBody.length, initialBody.length);
  }, [initialBody]);

  /** Sends the words and empties the box once saved; a failure keeps them for another try. */
  function sendNow() {
    if (body.trim() === '') return;
    void onSend(body.trim())
      .then(() => setBody(''))
      .catch(errorShownByHook);
  }
  // MUST-1b: asks "Post anyway?" before words that look like contact details go out.
  const gate = usePersonalDetailsGate({ text: body, sendNow });

  return (
    <form
      noValidate
      onSubmit={gate.submit}
      className="flex flex-col gap-2 border-t border-border p-4"
    >
      <div className="flex items-end gap-3">
        <label htmlFor="message-body" className="sr-only">
          {t('chat.composerLabel', { name: otherName })}
        </label>
        <textarea
          id="message-body"
          ref={boxRef}
          rows={1}
          maxLength={longestMessage}
          value={body}
          placeholder={t('chat.composerLabel', { name: otherName })}
          aria-describedby="message-text-only"
          onChange={(event) => gate.whileEditing(setBody)(event.target.value)}
          className="min-h-11 min-w-0 flex-1 resize-y rounded-[22px] border border-control-border bg-surface px-4 py-2.5 text-[15px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        />
        <Button type="submit" disabled={isSending || body.trim() === ''}>
          <ActionIcon name="send" size={16} />
          {t('chat.send')}
        </Button>
      </div>
      <PersonalDetailsGateNote gate={gate} isSending={isSending} />
      <p id="message-text-only" className="m-0 px-4 text-xs text-meta">
        {t('chat.textOnly')}
      </p>
      <div aria-live="polite">
        {failure !== null && (
          <Notice tone="error">{t(`failures.${failure}`, { minutes: waitMinutes ?? 60 })}</Notice>
        )}
      </div>
    </form>
  );
}
