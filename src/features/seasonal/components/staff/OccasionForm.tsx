/**
 * OccasionForm: adds or changes one seasonal occasion (story S1-E11-11 criteria 1, 2 and 5).
 *
 * Fields: the name in Romanian and English, the first and last day, "Every year", the doodle
 * (DoodlePicker), where it shows (Discover, Search or both) and "Season default". Saving applies
 * at once; the database checks every field again and names any to fix under it.
 * Who shows it: SeasonalTab. What it calls: the onSave and onCancel it is given.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import type { WebsiteContentError } from '@/features/website/api/websiteContentStore';
import { problemAt } from '@/features/website/lib/fieldProblems';

import type { OccasionDraft } from '../../api/seasonalStore';

import { DoodlePicker } from './DoodlePicker';

/** What the form needs. */
interface OccasionFormProps {
  initial: OccasionDraft;
  failure: WebsiteContentError | null;
  isBusy: boolean;
  onSave: (draft: OccasionDraft) => void;
  onCancel: () => void;
}

/** What one field part of the form needs. */
interface FieldsProps {
  draft: OccasionDraft;
  onChange: (draft: OccasionDraft) => void;
  errorOf: (field: string) => string | undefined;
}

/**
 * The two names and the two dates.
 *
 * @returns the text and date fields
 */
function NameAndDateFields({ draft, onChange, errorOf }: FieldsProps) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextInput
        id="occasion-name-ro"
        label={t('seasonal.fields.nameRo')}
        lang="ro"
        maxLength={60}
        value={draft.nameRo}
        errorMessage={errorOf('nameRo')}
        onChange={(event) => onChange({ ...draft, nameRo: event.target.value })}
      />
      <TextInput
        id="occasion-name-en"
        label={t('seasonal.fields.nameEn')}
        lang="en"
        maxLength={60}
        value={draft.nameEn}
        errorMessage={errorOf('nameEn')}
        onChange={(event) => onChange({ ...draft, nameEn: event.target.value })}
      />
      <TextInput
        id="occasion-starts-on"
        type="date"
        label={t('seasonal.fields.startsOn')}
        value={draft.startsOn}
        errorMessage={errorOf('startsOn')}
        onChange={(event) => onChange({ ...draft, startsOn: event.target.value })}
      />
      <TextInput
        id="occasion-ends-on"
        type="date"
        label={t('seasonal.fields.endsOn')}
        hint={t('seasonal.fields.endsOnHint')}
        min={draft.startsOn}
        value={draft.endsOn}
        errorMessage={errorOf('endsOn')}
        onChange={(event) => onChange({ ...draft, endsOn: event.target.value })}
      />
    </div>
  );
}

/**
 * "Every year", where it shows and "Season default".
 *
 * @returns the choices
 */
function ScheduleChoices({ draft, onChange }: Omit<FieldsProps, 'errorOf'>) {
  const { t } = useTranslation('websiteAdmin');
  const places = ['both', 'discover', 'search'] as const;
  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-11 items-center gap-3 text-body">
        <input
          type="checkbox"
          className="size-5"
          checked={draft.everyYear}
          onChange={(event) => onChange({ ...draft, everyYear: event.target.checked })}
        />
        {t('seasonal.fields.everyYear')}
      </label>
      <Select
        id="occasion-shows-on"
        label={t('seasonal.fields.showsOn')}
        isLabelVisible
        value={draft.showsOn}
        options={places.map((place) => ({ value: place, label: t(`seasonal.places.${place}`) }))}
        onChange={(value) => {
          const chosen = places.find((place) => place === value) ?? 'both';
          onChange({ ...draft, showsOn: chosen });
        }}
      />
      <label className="flex min-h-11 items-center gap-3 text-body">
        <input
          type="checkbox"
          className="size-5"
          checked={draft.isSeasonDefault}
          onChange={(event) => onChange({ ...draft, isSeasonDefault: event.target.checked })}
        />
        {t('seasonal.fields.isSeasonDefault')}
      </label>
    </div>
  );
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function OccasionForm({ initial, failure, isBusy, onSave, onCancel }: OccasionFormProps) {
  const { t } = useTranslation('websiteAdmin');
  const [draft, setDraft] = useState(initial);
  // The database's problem word for a field, as a message under it.
  const errorOf = (field: string) => {
    const problem = problemAt(failure, field);
    return problem === null
      ? undefined
      : t(`problems.${problem}`, { defaultValue: t('problems.invalid') });
  };
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSave(draft);
  };
  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label={t('seasonal.formLabel')}
      className="flex flex-col gap-5 rounded-lg border border-hairline bg-surface p-5"
    >
      <NameAndDateFields draft={draft} onChange={setDraft} errorOf={errorOf} />
      <ScheduleChoices draft={draft} onChange={setDraft} />
      <DoodlePicker value={draft.doodle} onChange={(doodle) => setDraft({ ...draft, doodle })} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isBusy}>
          {t('seasonal.save')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('seasonal.cancel')}
        </Button>
      </div>
    </form>
  );
}
