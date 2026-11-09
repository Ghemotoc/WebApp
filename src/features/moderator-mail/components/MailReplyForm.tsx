/**
 * MailReplyForm: one text box and a send button, for answering in a moderator mail thread
 * (story S1-E10-11). Staff get a second button for an internal note. The member's page passes a
 * hint ("Text only…"), which sits on the left of the buttons as board ModMailOne draws it (bundle
 * G8c); Send carries the paper plane icon.
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

  /** Sends the words, as a reply or a note, and empties the box once saved. */
  async function send(isNote: boolean) {
    if (body.trim() === '') return;
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
        maxLength={mailLimits.body}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        aria-describedby={hint === undefined ? undefined : `${id}-hint`}
      />
      <div aria-live="polite">
        {failure !== null && (
          <Notice tone="error">{t(`failures.${failure}`, { minutes: waitMinutes ?? 60 })}</Notice>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {hint !== undefined && (
          <p id={`${id}-hint`} className="m-0 text-[13px] text-meta">
            {hint}
          </p>
        )}
        <ReplyButtons
          isDisabled={isBusy || body.trim() === ''}
          onNote={allowsNote ? () => void send(true) : null}
        />
      </div>
    </form>
  );
}
