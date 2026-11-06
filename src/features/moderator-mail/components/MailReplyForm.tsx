/**
 * MailReplyForm: one text box and a send button, for answering in a moderator mail thread
 * (story S1-E10-11). Staff get a second button for an internal note.
 *
 * Who shows it: MailThreadPage and StaffMailThreadPage. What it calls: the onSend it is given;
 * the box empties once the message is saved.
 */
import { useState, type FormEvent } from 'react';

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
      />
      <div aria-live="polite">
        {failure !== null && (
          <Notice tone="error">{t(`failures.${failure}`, { minutes: waitMinutes ?? 60 })}</Notice>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isBusy || body.trim() === ''}>
          {t('thread.send')}
        </Button>
        {allowsNote && (
          <Button
            type="button"
            variant="secondary"
            disabled={isBusy || body.trim() === ''}
            onClick={() => void send(true)}
          >
            {t('staff.addNote')}
          </Button>
        )}
      </div>
    </form>
  );
}
