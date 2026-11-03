/**
 * TicketFieldsPanel: a support ticket's status, priority, category, assignee and tags, with one
 * "Save changes" (story S1-E11-13 criterion 4; bundle ADMIN-2h1).
 *
 * Only the fields that changed are sent; each goes into the ticket's history and the audit log.
 * The database refuses an assignee who can't answer tickets and tags of the wrong shape, and the
 * panel says so.
 * Who shows it: StaffSupportTicketPage. What it calls: the onSave it is given.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import {
  ticketCategories,
  ticketStatuses,
  type TicketCategory,
  type TicketStatus,
} from '../api/supportTickets';
import {
  ticketPriorities,
  type StaffTicket,
  type TicketChanges,
  type TicketPriority,
} from '../api/staffSupportTickets';
import { changedFields, type TicketFieldValues } from '../lib/ticketFields';
import { useSupportTranslation } from '../registerSupportTranslations';

/** What the panel needs. */
export interface TicketFieldsPanelProps {
  ticket: StaffTicket;
  isBusy: boolean;
  onSave: (changes: TicketChanges) => Promise<unknown>;
}

/** The panel's starting values, from the ticket as loaded. */
function valuesOf(ticket: StaffTicket): TicketFieldValues {
  return {
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    assignee: ticket.assignedHandle ?? '',
    tags: ticket.tags.join(', '),
  };
}

/**
 * The three drop-downs.
 *
 * @returns the selects
 */
function FieldSelects({
  values,
  onChange,
}: {
  values: TicketFieldValues;
  onChange: (values: TicketFieldValues) => void;
}) {
  const { t } = useSupportTranslation();
  return (
    <>
      <Select
        id="ticket-status"
        label={t('staff.fields.status')}
        isLabelVisible
        placement="form"
        value={values.status}
        onChange={(value) => onChange({ ...values, status: value as TicketStatus })}
        options={ticketStatuses.map((value) => ({ value, label: t(`statuses.${value}`) }))}
      />
      <Select
        id="ticket-priority"
        label={t('staff.fields.priority')}
        isLabelVisible
        placement="form"
        value={values.priority}
        onChange={(value) => onChange({ ...values, priority: value as TicketPriority })}
        options={ticketPriorities.map((value) => ({
          value,
          label: t(`staff.priorities.${value}`),
        }))}
      />
      <Select
        id="ticket-category"
        label={t('staff.fields.category')}
        isLabelVisible
        placement="form"
        value={values.category}
        onChange={(value) => onChange({ ...values, category: value as TicketCategory })}
        options={ticketCategories.map((value) => ({ value, label: t(`categories.${value}`) }))}
      />
    </>
  );
}

/**
 * Renders the panel.
 *
 * @returns the section
 */
export function TicketFieldsPanel({ ticket, isBusy, onSave }: TicketFieldsPanelProps) {
  const { t } = useSupportTranslation();
  const [values, setValues] = useState(() => valuesOf(ticket));
  const [outcome, setOutcome] = useState<'saved' | 'failed' | null>(null);
  const changes = changedFields(valuesOf(ticket), values);
  const hasChanges = Object.keys(changes).length > 0;

  /** Sends the changed fields and says how it went. */
  function save() {
    setOutcome(null);
    onSave(changes)
      .then(() => setOutcome('saved'))
      .catch(() => setOutcome('failed'));
  }

  return (
    <section
      aria-labelledby="ticket-fields-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      <h2
        id="ticket-fields-heading"
        className="m-0 font-heading text-[20px] font-bold text-heading"
      >
        {t('staff.fields.heading')}
      </h2>
      <FieldSelects values={values} onChange={setValues} />
      <TextInput
        id="ticket-assignee"
        label={t('staff.fields.assignee')}
        hint={t('staff.fields.assigneeHint')}
        value={values.assignee}
        onChange={(event) => setValues({ ...values, assignee: event.target.value })}
      />
      <TextInput
        id="ticket-tags"
        label={t('staff.fields.tags')}
        hint={t('staff.fields.tagsHint')}
        value={values.tags}
        onChange={(event) => setValues({ ...values, tags: event.target.value })}
      />
      <div aria-live="polite">
        {outcome === 'saved' && <Notice tone="success">{t('staff.fields.saved')}</Notice>}
        {outcome === 'failed' && <Notice tone="error">{t('staff.fields.failed')}</Notice>}
      </div>
      <div>
        <Button onClick={save} disabled={isBusy || !hasChanges}>
          {t('staff.fields.save')}
        </Button>
      </div>
    </section>
  );
}
