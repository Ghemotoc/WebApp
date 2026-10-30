/**
 * SafetyContactForm: add a safety contact or change one, in both languages (story S1-E10-13, part
 * b, criterion 6).
 *
 * The label is the service's official name, a proper noun, so it is the same in Romanian and
 * English; only the opening hours have a Romanian version. A link must be https and a contact
 * needs a number or a link: the database refuses anything else and the page shows why. Saving
 * counts as checking the contact today. Plain components, no doodles (staff screens).
 * Who shows it: SafetyContactsAdminPage. What it calls: the onSave it is given.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import { Constants } from '@/lib/database.types';

import type { SafetyContactKind } from '../api/safetyContacts';
import type { SafetyContactDraft } from '../api/staffSafetyContacts';

/** What the form needs. */
export interface SafetyContactFormProps {
  /** The values to start from: a contact's, or an empty one for a new contact. */
  initial: SafetyContactDraft;
  isSaving: boolean;
  onSave: (draft: SafetyContactDraft) => Promise<unknown>;
  onCancel: () => void;
}

/** How sure the research is of a contact, as content/safety-contacts.json writes it. */
const confidenceLevels = ['High', 'Medium', 'Low'];

/**
 * The text fields, each tied to one draft field.
 *
 * @returns the inputs
 */
function TextFields({
  draft,
  setField,
}: {
  draft: SafetyContactDraft;
  setField: (field: keyof SafetyContactDraft, value: string) => void;
}) {
  const { t } = useTranslation('safety');
  return (
    <>
      <TextInput
        id="safety-contact-label"
        label={t('admin.form.label')}
        hint={t('admin.form.labelHint')}
        value={draft.label}
        required
        onChange={(event) => setField('label', event.target.value)}
      />
      <TextInput
        id="safety-contact-phone"
        label={t('admin.form.phone')}
        value={draft.phoneNumber}
        onChange={(event) => setField('phoneNumber', event.target.value)}
      />
      <TextInput
        id="safety-contact-link"
        type="url"
        label={t('admin.form.link')}
        hint={t('admin.form.linkHint')}
        value={draft.link}
        onChange={(event) => setField('link', event.target.value)}
      />
      <TextInput
        id="safety-contact-hours"
        label={t('admin.form.hours')}
        value={draft.openingHours}
        onChange={(event) => setField('openingHours', event.target.value)}
      />
      <TextInput
        id="safety-contact-hours-ro"
        label={t('admin.form.hoursRo')}
        value={draft.openingHoursRo}
        onChange={(event) => setField('openingHoursRo', event.target.value)}
      />
      <Textarea
        id="safety-contact-note"
        label={t('admin.form.note')}
        value={draft.note}
        onChange={(event) => setField('note', event.target.value)}
      />
    </>
  );
}

/**
 * The two drop-downs: what the contact is for and how sure its source is.
 *
 * @returns the selects
 */
function ChoiceFields({
  draft,
  setField,
}: {
  draft: SafetyContactDraft;
  setField: (field: keyof SafetyContactDraft, value: string) => void;
}) {
  const { t } = useTranslation('safety');
  return (
    <div className="flex flex-wrap gap-4">
      <Select
        id="safety-contact-kind"
        label={t('admin.form.kind')}
        isLabelVisible
        value={draft.kind}
        onChange={(value) => setField('kind', value as SafetyContactKind)}
        options={Constants.public.Enums.safety_contact_kind.map((kind) => ({
          value: kind,
          label: t(`kinds.${kind}`),
        }))}
      />
      <Select
        id="safety-contact-confidence"
        label={t('admin.form.confidence')}
        isLabelVisible
        value={draft.confidence}
        onChange={(value) => setField('confidence', value)}
        options={confidenceLevels.map((level) => ({
          value: level,
          label: t(`admin.confidence.${level}`),
        }))}
      />
    </div>
  );
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function SafetyContactForm({ initial, isSaving, onSave, onCancel }: SafetyContactFormProps) {
  const { t } = useTranslation('safety');
  const [draft, setDraft] = useState(initial);
  const hasWayToReach = draft.phoneNumber.trim() !== '' || draft.link.trim() !== '';
  const isComplete = draft.label.trim() !== '' && hasWayToReach;

  /** One field's change, kept with the others. */
  function setField(field: keyof SafetyContactDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  /** Saves once a label and a number or link are there; closes the form when it worked. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isComplete) return;
    void onSave(draft)
      .then(onCancel)
      .catch(() => undefined);
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label={draft.id === null ? t('admin.form.addLabel') : t('admin.form.editLabel')}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      <ChoiceFields draft={draft} setField={setField} />
      <TextFields draft={draft} setField={setField} />
      {!hasWayToReach && <p className="m-0 text-sm text-meta">{t('admin.form.needsWay')}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={!isComplete || isSaving}>
          {t('admin.form.save')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('admin.form.cancel')}
        </Button>
      </div>
    </form>
  );
}
