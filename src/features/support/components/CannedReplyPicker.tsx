/**
 * CannedReplyPicker: on a support ticket, a drop-down of canned replies and an Insert button
 * (story S1-E11-13, part 13b; bundle ADMIN-2h3b; criterion 8). Inserting fills in the person's
 * name and the ticket's number in the ticket's language and puts the words in the reply box,
 * where staff edit them before sending. Nothing is sent by inserting.
 *
 * Who shows it: StaffSupportTicketPage, through SupportReplyForm's renderTools. What it calls:
 * useCannedReplies and lib/fillCannedReply.ts.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

import { useCannedReplies } from '../hooks/useCannedReplies';
import { fillCannedReply, type CannedReplyTicket } from '../lib/fillCannedReply';
import { useSupportTranslation } from '../registerSupportTranslations';

/** What the picker needs. */
export interface CannedReplyPickerProps {
  ticket: CannedReplyTicket;
  /** Puts words into the reply box (from SupportReplyForm). */
  insert: (text: string) => void;
}

/**
 * Renders the picker; nothing while the replies load, and a quiet line when there are none.
 *
 * @returns the picker
 */
export function CannedReplyPicker({ ticket, insert }: CannedReplyPickerProps) {
  const { t } = useSupportTranslation();
  const { replies } = useCannedReplies();
  const [chosenId, setChosenId] = useState('');
  const [insertedTitle, setInsertedTitle] = useState<string | null>(null);
  const list = replies.data ?? [];

  /** Fills the chosen reply for this ticket and hands it to the reply box. */
  function insertChosen() {
    const chosen = list.find((reply) => reply.id === chosenId);
    if (chosen === undefined) return;
    insert(fillCannedReply(chosen, ticket));
    setInsertedTitle(chosen.title);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          id="staff-support-canned"
          label={t('staff.canned.pickerLabel')}
          isLabelVisible
          value={chosenId}
          onChange={setChosenId}
          options={[
            { value: '', label: t('staff.canned.pickerNone') },
            ...list.map((reply) => ({ value: reply.id, label: reply.title })),
          ]}
        />
        <Button variant="secondary" disabled={chosenId === ''} onClick={insertChosen}>
          {t('staff.canned.insert')}
        </Button>
        <Link to="/staff/support/canned" className="text-sm font-semibold text-link underline">
          {t('staff.canned.manageLink')}
        </Link>
      </div>
      <p className="m-0 text-sm text-meta" aria-live="polite">
        {insertedTitle === null ? '' : t('staff.canned.inserted', { title: insertedTitle })}
      </p>
    </div>
  );
}
