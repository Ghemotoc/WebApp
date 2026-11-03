/**
 * SupportReplyForm: one text box and a send button, for answering in a support ticket (story
 * S1-E11-13; bundle ADMIN-2h1). Staff get a second button for an internal note (criterion 5).
 *
 * Who shows it: MySupportTicketPage and StaffSupportTicketPage. What it calls: the onSend it is
 * given; the box empties once the message is saved.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';

import { supportLimits, type SupportFailure } from '../api/supportTickets';
import { useSupportTranslation } from '../registerSupportTranslations';

/** What the form needs. */
export interface SupportReplyFormProps {
  id: string;
  label: string;
  sendLabel: string;
  isBusy: boolean;
  failure: SupportFailure | null;
  waitMinutes: number | null;
  onSend: (body: string, isNote: boolean) => Promise<unknown>;
  /** Staff only: the "Add an internal note" button's words. */
  noteLabel?: string;
  /** False when only a note may be added (a closed ticket, for staff). */
  allowsReply?: boolean;
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function SupportReplyForm(props: SupportReplyFormProps) {
  const { t } = useSupportTranslation();
  const [body, setBody] = useState('');
  const allowsReply = props.allowsReply ?? true;
  const isEmpty = body.trim() === '';

  /** Sends the words, as an answer or a note, and empties the box once saved. */
  async function send(isNote: boolean) {
    if (isEmpty) return;
    await props
      .onSend(body.trim(), isNote)
      .then(() => setBody(''))
      .catch(() => undefined);
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (allowsReply) void send(false);
      }}
    >
      <Textarea
        id={props.id}
        label={props.label}
        rows={5}
        maxLength={supportLimits.body}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <div aria-live="polite">
        {props.failure !== null && (
          <Notice tone="error">
            {t(`failures.${props.failure}`, { minutes: props.waitMinutes ?? 60 })}
          </Notice>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {allowsReply && (
          <Button type="submit" disabled={props.isBusy || isEmpty}>
            {props.sendLabel}
          </Button>
        )}
        {props.noteLabel !== undefined && (
          <Button
            type="button"
            variant="secondary"
            disabled={props.isBusy || isEmpty}
            onClick={() => void send(true)}
          >
            {props.noteLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
