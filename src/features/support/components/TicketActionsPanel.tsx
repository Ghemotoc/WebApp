/**
 * TicketActionsPanel: on a support ticket, marking it as spam (or not) and merging it into
 * another ticket from the same person (story S1-E11-13, part 13b; bundle ADMIN-2h4a; criteria 9
 * and 13). Both are checked again by the database, which also refuses someone else's ticket.
 *
 * Who shows it: StaffSupportTicketPage. What it calls: the onChange it is given (useStaffTicket).
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { StaffTicket } from '../api/staffSupportTickets';
import type { SupportFailure } from '../api/supportTickets';
import { supportFailureOf } from '../hooks/useMySupport';
import type { StaffTicketChange } from '../hooks/useStaffSupport';
import { useSupportTranslation } from '../registerSupportTranslations';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the panel needs. */
export interface TicketActionsPanelProps {
  ticket: StaffTicket;
  isBusy: boolean;
  onChange: (change: StaffTicketChange) => Promise<unknown>;
}

/**
 * The merge form: the other ticket's number and a button. Only digits are accepted.
 *
 * @returns the form
 */
function MergeForm({ ticket, isBusy, onChange }: TicketActionsPanelProps) {
  const { t } = useSupportTranslation();
  const [targetText, setTargetText] = useState('');
  const target = Number(targetText.replace(/^#/, ''));
  const isValid = Number.isInteger(target) && target > 0 && target !== ticket.number;

  /** Merges into the number given; the box empties once it worked. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!isValid) return;
    void onChange({ kind: 'merge', into: target })
      .then(() => setTargetText(''))
      .catch(errorShownByHook);
  }

  return (
    <form noValidate className="flex flex-col gap-3" onSubmit={submit}>
      <TextInput
        id="support-merge-target"
        label={t('staff.actions.mergeLabel')}
        hint={t('staff.actions.mergeHint', { number: ticket.number })}
        inputMode="numeric"
        value={targetText}
        onChange={(event) => setTargetText(event.target.value)}
      />
      <Button type="submit" variant="secondary" className="w-fit" disabled={isBusy || !isValid}>
        {t('staff.actions.merge')}
      </Button>
    </form>
  );
}

/**
 * Renders the panel. A closed or merged ticket shows only the spam switch.
 *
 * @returns the section
 */
export function TicketActionsPanel(props: TicketActionsPanelProps) {
  const { t } = useSupportTranslation();
  const { ticket, isBusy } = props;
  const [failure, setFailure] = useState<SupportFailure | null>(null);
  const canMerge = ticket.status !== 'closed' && !ticket.isSpam;

  /** Runs one change and keeps why it was refused, to say so beside the buttons. */
  async function onChange(change: StaffTicketChange) {
    setFailure(null);
    return props.onChange(change).catch((error: unknown) => {
      setFailure(supportFailureOf(error instanceof Error ? error : null).failure ?? 'unreachable');
      throw error;
    });
  }

  return (
    <section
      aria-labelledby="ticket-actions-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      <h2
        id="ticket-actions-heading"
        className="m-0 font-heading text-[20px] font-bold text-heading"
      >
        {t('staff.actions.heading')}
      </h2>
      {canMerge && <MergeForm ticket={ticket} isBusy={isBusy} onChange={onChange} />}
      <Button
        variant={ticket.isSpam ? 'secondary' : 'destructive'}
        className="w-fit"
        disabled={isBusy}
        onClick={() =>
          void onChange({ kind: 'spam', spam: !ticket.isSpam }).catch(errorShownByHook)
        }
      >
        {ticket.isSpam ? t('staff.actions.notSpam') : t('staff.actions.markSpam')}
      </Button>
      <div aria-live="polite">
        {failure !== null && <Notice tone="error">{t(`staff.actions.failures.${failure}`)}</Notice>}
      </div>
    </section>
  );
}
