/**
 * MessageComposer: the box at the bottom of a chat and "Send" (story S1-E9-01, criterion 4;
 * user story 4.3, board E13-Chat: "the field with Send inside is the one main button"). A pill
 * field that grows with the words, with the round main Send button inside it at the right. No
 * "Text only" line on the page (user story 4.3).
 *
 * Text only: images in messages are OPEN and off (the story's proposal), so the box has no file
 * button. The box takes at most
 * 2,000 characters, as the database does. A refusal shows in plain words; "isn't taking
 * messages" never says why (S1-E9-03). The box empties once the message is saved. It can start
 * with words already in it: the story link a reader is sending from a share dialog (GAPS-7a).
 * The main button stays pressable; pressed with nothing typed, it says what is missing beside the
 * field and puts the focus there (design books item 9).
 * Who shows it: ChatPanel. What it calls: the onSend it is given.
 * Before sending, usePersonalDetailsGate asks "Post anyway?" when the words look like contact
 * details (MUST-1b; PersonalDetailsGateNote); it never blocks.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { FieldProblem } from '@/components/ui/FieldProblem';
import { Notice } from '@/components/ui/Notice';
import { PersonalDetailsGateNote } from '@/features/privacy/components/PersonalDetailsNote';
import { usePersonalDetailsGate } from '@/features/privacy/hooks/usePersonalDetailsCheck';

import { longestMessage, type MessagesFailure } from '../api/messages';
import { useMessagesTranslation } from '../registerMessagesTranslations';
import { errorShownByHook } from '@/lib/errorShownByHook';
import { useMissingField } from '@/lib/forms/useMissingField';

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
 * A box that starts with words (a story link being shared) puts the caret after them, so words
 * typed next follow the link instead of running into its start. Focus is left where it is.
 *
 * @param boxRef - the text box
 * @param initialBody - the words the box starts with; empty does nothing
 */
function useCaretAfterStartingWords(
  boxRef: RefObject<HTMLTextAreaElement | null>,
  initialBody: string,
) {
  useEffect(() => {
    if (initialBody === '') return;
    boxRef.current?.setSelectionRange(initialBody.length, initialBody.length);
  }, [boxRef, initialBody]);
}

/**
 * The round main Send button inside the field, at the right (board E13).
 *
 * @returns the submit button
 */
function SendButton({ label, isSending }: { label: string; isSending: boolean }) {
  return (
    <button
      type="submit"
      disabled={isSending}
      aria-label={label}
      className="button-main absolute right-1 bottom-1 inline-flex size-9 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
    >
      <ActionIcon name="send" size={16} />
    </button>
  );
}

/**
 * Sends a message at most once at a time. A double click fires two submits before Send can turn
 * off, so a ref (which changes at once, unlike state) lets only the first through until it settles.
 *
 * @param onSend - saves the words; rejects when the save fails (the hook shows why)
 * @param onSent - empties the box once the words are saved
 * @returns the function that sends
 */
function useSendOnce(onSend: (words: string) => Promise<unknown>, onSent: () => void) {
  const isInFlight = useRef(false);
  return (words: string) => {
    if (isInFlight.current) return;
    isInFlight.current = true;
    void onSend(words)
      .then(onSent)
      .catch(errorShownByHook)
      .finally(() => {
        isInFlight.current = false;
      });
  };
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
  useCaretAfterStartingWords(boxRef, initialBody);
  // Design books item 9: Send stays pressable and says what is missing beside the box.
  const missing = useMissingField(body.trim() === '', 'message-body');

  const sendOnce = useSendOnce(onSend, () => setBody(''));
  /** Sends the words and empties the box once saved; a failure keeps them for another try. */
  const sendNow = () => sendOnce(body.trim());
  // MUST-1b: asks "Post anyway?" before words that look like contact details go out.
  const gate = usePersonalDetailsGate({ text: body, sendNow });

  return (
    <form
      noValidate
      onSubmit={missing.submitWhenReady(gate.submit)}
      className="flex flex-col gap-2"
    >
      {/* Board E13: one pill field with the round Send inside at the right, the one main button. */}
      <div className="relative">
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
          onChange={(event) => gate.whileEditing(setBody)(event.target.value)}
          aria-describedby={missing.isShown ? 'message-body-missing' : undefined}
          aria-invalid={missing.isShown ? true : undefined}
          className="block max-h-40 min-h-11 w-full resize-none rounded-[22px] border border-control-border bg-surface py-2 pr-12 pl-4 type-body text-ink [field-sizing:content] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        />
        <SendButton label={t('chat.send')} isSending={isSending} />
      </div>
      <FieldProblem id="message-body-missing" isShown={missing.isShown}>
        {t('chat.missing')}
      </FieldProblem>
      <PersonalDetailsGateNote gate={gate} isSending={isSending} />
      <div aria-live="polite">
        {failure !== null && (
          <Notice tone="error">{t(`failures.${failure}`, { minutes: waitMinutes ?? 60 })}</Notice>
        )}
      </div>
    </form>
  );
}
