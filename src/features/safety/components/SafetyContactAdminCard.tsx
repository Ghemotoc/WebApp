/**
 * SafetyContactAdminCard: one safety contact on Staff › Safety contacts, with what it says in both
 * languages, when it was last checked and by whom, and the three actions: confirm it is still
 * right, change it, or remove it with a reason (story S1-E10-13, part b, criteria 6 and 7).
 *
 * Moderators read only (architecture 1.8.3), so they see no buttons; the database refuses them too.
 * Plain components, no doodles (staff screens).
 * Who shows it: SafetyContactsAdminPage. What it calls: the handlers it is given.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import { LabelRows } from '@/components/ui/LabelRows';
import { Textarea } from '@/components/ui/Textarea';

import type { StaffSafetyContact } from '../api/staffSafetyContacts';

/** What the card needs. */
export interface SafetyContactAdminCardProps {
  contact: StaffSafetyContact;
  /** Whether the caller may change contacts (support, admin, owner). */
  canAct: boolean;
  isChanging: boolean;
  onConfirm: () => Promise<unknown>;
  onEdit: () => void;
  onRemove: (reason: string) => Promise<unknown>;
}

/**
 * The reason box shown before a contact is removed.
 *
 * @returns the reason field and the two buttons
 */
function RemoveStep({
  contactId,
  contactLabel,
  isChanging,
  onRemove,
  onCancel,
}: {
  contactId: string;
  contactLabel: string;
  isChanging: boolean;
  onRemove: (reason: string) => Promise<unknown>;
  onCancel: () => void;
}) {
  const { t } = useTranslation('safety');
  const [reason, setReason] = useState('');
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <Textarea
        id={`remove-reason-${contactId}`}
        label={t('admin.removeReason', { label: contactLabel })}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          variant="destructive"
          disabled={reason.trim() === '' || isChanging}
          onClick={() => void onRemove(reason).catch(() => undefined)}
        >
          {t('admin.removeConfirm')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('admin.form.cancel')}
        </Button>
      </div>
    </div>
  );
}

/**
 * The contact's details as label and value rows.
 *
 * @returns the rows
 */
function ContactDetails({ contact }: { contact: StaffSafetyContact }) {
  const { t } = useTranslation('safety');
  const none = t('admin.none');
  return (
    <LabelRows
      rows={[
        { label: t('admin.form.phone'), value: contact.phoneNumber ?? none },
        { label: t('admin.form.link'), value: contact.link ?? none },
        { label: t('admin.form.hours'), value: contact.openingHours ?? none },
        { label: t('admin.form.hoursRo'), value: contact.openingHoursRo ?? none },
        { label: t('admin.form.confidence'), value: t(`admin.confidence.${contact.confidence}`) },
        {
          label: t('admin.lastChecked'),
          value: t('admin.checkedOnBy', { date: contact.lastCheckedOn, who: contact.checkedBy }),
        },
      ]}
    />
  );
}

/**
 * Renders the card.
 *
 * @returns a list item
 */
export function SafetyContactAdminCard(props: SafetyContactAdminCardProps) {
  const { contact, canAct, isChanging } = props;
  const { t } = useTranslation('safety');
  const [isRemoving, setIsRemoving] = useState(false);
  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 font-heading text-lg font-bold text-heading">{contact.label}</h3>
        <InfoPill tone="neutral">{t(`kinds.${contact.kind}`)}</InfoPill>
      </div>
      <ContactDetails contact={contact} />
      {contact.note !== null && <p className="m-0 text-sm text-body">{contact.note}</p>}
      {canAct && !isRemoving && (
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={isChanging}
            aria-label={t('admin.confirmLabel', { label: contact.label })}
            onClick={() => void props.onConfirm().catch(() => undefined)}
          >
            {t('admin.confirm')}
          </Button>
          <Button variant="secondary" onClick={props.onEdit}>
            {t('admin.edit')}
          </Button>
          <Button variant="destructive" onClick={() => setIsRemoving(true)}>
            {t('admin.remove')}
          </Button>
        </div>
      )}
      {canAct && isRemoving && (
        <RemoveStep
          contactId={contact.id}
          contactLabel={contact.label}
          isChanging={isChanging}
          onRemove={props.onRemove}
          onCancel={() => setIsRemoving(false)}
        />
      )}
    </li>
  );
}
