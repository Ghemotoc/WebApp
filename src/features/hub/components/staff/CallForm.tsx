/**
 * CallForm: adds a call for submissions or changes one: the title and a line of details in
 * English and Romanian, the organiser's page, the last day and whether it pays (bundle
 * GAPS-12d). English comes first: it is the main language (Robert, 10 Nov 2026).
 *
 * Who shows it: CallsSection and CallItem. What it calls: the onSave and onCancel it is given.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { errorShownByHook } from '@/lib/errorShownByHook';

import { callLimits, type CallDraft } from '../../api/hubCalls';
import { useHubTranslation } from '../../registerHubTranslations';

/** What the form needs. */
export interface CallFormProps {
  /** The call to change, or a draft with id null for a new one. */
  initial: CallDraft;
  isBusy: boolean;
  onSave: (draft: CallDraft) => Promise<unknown>;
  onCancel: () => void;
}

/** The four text fields, in the order the form shows them, with each one's limit and language. */
const textFields = [
  { field: 'titleEn', labelKey: 'titleEnLabel', limit: callLimits.title, lang: 'en' },
  { field: 'titleRo', labelKey: 'titleRoLabel', limit: callLimits.title, lang: 'ro' },
  { field: 'detailsEn', labelKey: 'detailsEnLabel', limit: callLimits.details, lang: 'en' },
  { field: 'detailsRo', labelKey: 'detailsRoLabel', limit: callLimits.details, lang: 'ro' },
] as const;

/**
 * Whether every field is filled in and the link starts with https://, so Save can switch on.
 * The database checks the same things again.
 *
 * @param draft - the form's values
 * @returns true when the draft can be sent
 */
function isComplete(draft: CallDraft): boolean {
  const texts = [draft.titleEn, draft.titleRo, draft.detailsEn, draft.detailsRo, draft.closesOn];
  return texts.every((text) => text.trim() !== '') && draft.linkUrl.trim().startsWith('https://');
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function CallForm({ initial, isBusy, onSave, onCancel }: CallFormProps) {
  const { t } = useHubTranslation();
  const [draft, setDraft] = useState<CallDraft>(initial);
  const idPrefix = `call-${initial.id ?? 'new'}`;

  /** Saves the draft; the section closes the form once it is saved and shows why when it isn't. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (isComplete(draft)) void onSave(draft).catch(errorShownByHook);
  }

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
      {textFields.map((text) => (
        <TextInput
          key={text.field}
          id={`${idPrefix}-${text.field}`}
          label={t(`hubStaff.calls.${text.labelKey}`)}
          lang={text.lang}
          maxLength={text.limit}
          value={draft[text.field]}
          onChange={(event) => setDraft({ ...draft, [text.field]: event.target.value })}
        />
      ))}
      <TextInput
        id={`${idPrefix}-link`}
        type="url"
        label={t('hubStaff.calls.linkLabel')}
        hint={t('hubStaff.calls.linkHint')}
        maxLength={callLimits.link}
        value={draft.linkUrl}
        onChange={(event) => setDraft({ ...draft, linkUrl: event.target.value })}
      />
      <TextInput
        id={`${idPrefix}-day`}
        type="date"
        label={t('hubStaff.calls.dayLabel')}
        hint={t('hubStaff.calls.dayHint')}
        value={draft.closesOn}
        onChange={(event) => setDraft({ ...draft, closesOn: event.target.value })}
      />
      <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          className="h-5 w-5 shrink-0"
          checked={draft.isPaid}
          onChange={(event) => setDraft({ ...draft, isPaid: event.target.checked })}
        />
        <span>{t('hubStaff.calls.paidLabel')}</span>
      </label>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isBusy || !isComplete(draft)}>
          {t('hubStaff.save')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('hubStaff.cancel')}
        </Button>
      </div>
    </form>
  );
}
