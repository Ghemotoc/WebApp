/**
 * ClassicEditionForm: "Add an edition" and an edition's details on /staff/classics (bundle
 * TRANSLATE-1d; board TrStaff; Robert, 16 Nov 2026: a classic may come in other languages, with
 * its translator named).
 *
 * What staff fill in: the edition's language (only when adding: a language is fixed afterwards),
 * its title and short description in that language, the translator as the credit shows them, and
 * the translation rights. A public-domain translation also asks for the year the translator died,
 * because the translation stays protected for 70 years after that (Law 8/1996 art. 28(1)).
 * Everything else (author, kind, category, rating) is shared with the classic and not asked again.
 *
 * Who shows it: ClassicEditionsPanel. What it calls: onSave(values); saving keeps the edition a
 * draft. Plain components, no doodles (staff screens).
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import { languageOwnName } from '@/lib/language-names';

import type { ClassicDetails } from '../../api/classics';

import { TranslationRightsSelect } from './TranslationRightsSelect';

/** The fields of an edition that differ from the classic's first edition. */
export type EditionValues = Pick<
  ClassicDetails,
  'languageCode' | 'title' | 'blurb' | 'translatorName' | 'translatorDiedYear' | 'translationRights'
>;

/** What the form needs. */
export interface ClassicEditionFormProps {
  /** Unique part of the fields' ids: 'new' or the edition's story id. */
  formId: string;
  initial: EditionValues;
  /** The languages to offer when adding; null for an existing edition (its language is fixed). */
  languageChoices: string[] | null;
  isSaving: boolean;
  onSave: (values: EditionValues) => Promise<unknown>;
  onCancel: () => void;
}

/** What the text fields need. */
interface EditionFieldsProps {
  formId: string;
  values: EditionValues;
  onChange: (field: keyof EditionValues, value: string) => void;
}

/**
 * The title, the description and the translator's name.
 *
 * @returns the three text fields
 */
function EditionTextFields({ formId, values, onChange }: EditionFieldsProps) {
  const { t } = useTranslation('staff');
  return (
    <>
      <TextInput
        id={`edition-title-${formId}`}
        label={t('classics.editions.form.title')}
        value={values.title}
        maxLength={120}
        onChange={(event) => onChange('title', event.target.value)}
      />
      <Textarea
        id={`edition-blurb-${formId}`}
        label={t('classics.editions.form.blurb')}
        value={values.blurb}
        maxLength={500}
        rows={3}
        onChange={(event) => onChange('blurb', event.target.value)}
      />
      <TextInput
        id={`edition-translator-${formId}`}
        label={t('classics.editions.form.translator')}
        hint={t('classics.editions.form.translatorHint')}
        value={values.translatorName}
        maxLength={120}
        onChange={(event) => onChange('translatorName', event.target.value)}
      />
    </>
  );
}

/**
 * The translation rights and, for a public-domain translation, the year its translator died.
 *
 * @returns the drop-down and, when needed, the year field
 */
function EditionRightsFields({ formId, values, onChange }: EditionFieldsProps) {
  const { t } = useTranslation('staff');
  return (
    <>
      <TranslationRightsSelect
        id={`edition-rights-${formId}`}
        value={values.translationRights}
        onChange={(value) => onChange('translationRights', value)}
      />
      {values.translationRights === 'public_domain' && (
        <TextInput
          id={`edition-translator-died-${formId}`}
          label={t('classics.editions.form.translatorDiedYear')}
          hint={t('classics.editions.form.translatorDiedYearHint')}
          inputMode="numeric"
          maxLength={4}
          value={values.translatorDiedYear}
          onChange={(event) =>
            onChange('translatorDiedYear', event.target.value.replace(/\D/g, ''))
          }
        />
      )}
    </>
  );
}

/**
 * Renders the form.
 *
 * @returns the edition's fields with "Save as draft" and Cancel
 */
export function ClassicEditionForm({
  formId,
  initial,
  languageChoices,
  isSaving,
  onSave,
  onCancel,
}: ClassicEditionFormProps) {
  const { t } = useTranslation('staff');
  const [values, setValues] = useState(initial);
  const update = (field: keyof EditionValues, value: string) =>
    setValues((previous) => ({ ...previous, [field]: value }));

  /** Sends the values; the database checks them and answers with a hint when one is wrong. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void onSave(values);
  }

  return (
    <form noValidate className="flex flex-col gap-3" onSubmit={handleSubmit}>
      {languageChoices !== null && (
        <Select
          id={`edition-language-${formId}`}
          label={t('classics.editions.form.language')}
          isLabelVisible
          placement="form"
          value={values.languageCode}
          onChange={(value) => update('languageCode', value)}
          options={languageChoices.map((code) => ({
            value: code,
            label: languageOwnName(code),
            lang: code,
          }))}
        />
      )}
      <EditionTextFields formId={formId} values={values} onChange={update} />
      <EditionRightsFields formId={formId} values={values} onChange={update} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('classics.editions.form.saving') : t('classics.editions.form.saveDraft')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('classics.editions.form.cancel')}
        </Button>
      </div>
    </form>
  );
}
