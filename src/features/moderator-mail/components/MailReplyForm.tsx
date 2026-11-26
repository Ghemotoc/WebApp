/**
 * MailReplyForm: one text box and a send button, for answering in a moderator mail thread
 * (story S1-E10-11). Staff get a second button for an internal note. The member's page passes a
 * hint ("Text only…"), which sits under the box as board J24 draws it (user stories bundle 10);
 * Send carries the paper plane icon. Send stays pressable: pressed with the box empty, it says so
 * beside the box and puts the focus there (DoD, design books item 9).
 *
 * Who shows it: MailThreadPage and StaffMailThreadPage. What it calls: the onSend it is given;
 * the box empties once the message is saved.
 */
import { useState, type FormEvent } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';

import { mailLimits, type MailFailure } from '../api/moderatorMail';
import { useMailTranslation } from '../registerMailTranslations';
import { errorShownByHook } from '@/lib/errorShownByHook';
import { useMissingField } from '@/lib/forms/useMissingField';

/** What the form needs. */
export interface MailReplyFormProps {
  id: string;
  label: string;
  isBusy: boolean;
  failure: MailFailure | null;
  waitMinutes: number | null;
  onSend: (body: string, isNote: boolean) => Promise<unknown>;
  /** Staff only: shows "Add an internal note". */
  allowsNote?: boolean;
  /** A short line beside the buttons, linked to the box for screen readers. */
  hint?: string;
}

/**
 * Send, and for staff "Add an internal note".
 *
 * @param props.isDisabled - true while sending or while the box is empty
 * @param props.onNote - saves the words as a note, or null when notes aren't offered
 * @returns the buttons
 */
function ReplyButtons({
  isDisabled,
  onNote,
}: {
  isDisabled: boolean;
  onNote: (() => void) | null;
}) {
  const { t } = useMailTranslation();
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="submit" disabled={isDisabled}>
        <ActionIcon name="send" size={16} />
        {t('thread.send')}
      </Button>
      {onNote !== null && (
        <Button type="button" variant="secondary" disabled={isDisabled} onClick={onNote}>
          {t('staff.addNote')}
        </Button>
      )}
    </div>
  );
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function MailReplyForm({
  id,
  label,
  isBusy,
  failure,
  waitMinutes,
  onSend,
  allowsNote = false,
  hint,
}: MailReplyFormProps) {
  const { t } = useMailTranslation();
  const [body, setBody] = useState('');
  // Design books item 9: Send stays pressable and says what is missing beside the box.
  const missing = useMissingField(body.trim() === '', id);

  /** Sends the words, as a reply or a note, and empties the box once saved. */
  async function send(isNote: boolean) {
    if (!missing.isReadyToSend()) return;
    await onSend(body.trim(), isNote)
      .then(() => setBody(''))
      .catch(errorShownByHook);
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void send(false);
      }}
    >
      <Textarea
        id={id}
        label={label}
        rows={5}
        hint={hint}
        maxLength={mailLimits.body}
        errorMessage={missing.isShown ? t('new.missingBody') : undefined}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <div aria-live="polite">
        {failure !== null && (
          <Notice tone="error">{t(`failures.${failure}`, { minutes: waitMinutes ?? 60 })}</Notice>
        )}
      </div>
      <ReplyButtons isDisabled={isBusy} onNote={allowsNote ? () => void send(true) : null} />
    </form>
  );
}
