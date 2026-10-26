/**
 * ClassicSourceFields: the public-domain part of the "Add a classic work" form (story S1-E11-16
 * AC 1): the kind, the original language, the source edition and its link, the translator and
 * the year of first publication.
 *
 * Who shows it: ClassicWorkForm. What it calls: onChange. Language names come from Intl in the
 * interface language, so the code holds none.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import type { ClassicKind } from '../../api/classics';

import type { ClassicFieldsProps } from './ClassicStoryFields';

/** The kinds of work (the classic_kind enum). */
const kinds: ClassicKind[] = ['novel', 'short_story', 'fairy_tale', 'poem', 'play', 'essay'];

/** Original languages staff are likely to need; more can be added here. */
const originalLanguages = ['ro', 'en', 'fr', 'de', 'it', 'es', 'ru', 'el', 'la'];

/**
 * A language's name in the interface language.
 *
 * @param code - a two-letter code
 * @param interfaceLanguage - the language to name it in
 * @returns the name, or the code if Intl can't name it
 */
function languageName(code: string, interfaceLanguage: string): string {
  return new Intl.DisplayNames([interfaceLanguage], { type: 'language' }).of(code) ?? code;
}

/**
 * Renders the fields.
 *
 * @returns the source fields
 */
export function ClassicSourceFields({ details, onChange }: ClassicFieldsProps) {
  const { t, i18n } = useTranslation('staff');
  /** A short text input for one field. */
  const field = (name: 'sourceTitle' | 'sourceUrl' | 'translatorName', type = 'text') => (
    <TextInput
      id={`classic-${name}`}
      label={t(`classics.form.${name}`)}
      type={type}
      value={details[name]}
      onChange={(event) => onChange(name, event.target.value)}
    />
  );
  /** A year input for one field. */
  const year = (name: 'translatorDiedYear' | 'firstPublishedYear') => (
    <TextInput
      id={`classic-${name}`}
      label={t(`classics.form.${name}`)}
      inputMode="numeric"
      maxLength={4}
      value={details[name]}
      onChange={(event) => onChange(name, event.target.value.replace(/\D/g, ''))}
    />
  );
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="mb-2 font-heading text-lg font-bold text-heading">
        {t('classics.form.sourceLegend')}
      </legend>
      <div className="flex flex-wrap gap-4">
        <Select
          id="classic-kind"
          label={t('classics.form.kind')}
          isLabelVisible
          placement="form"
          value={details.kind}
          onChange={(value) => onChange('kind', value)}
          options={kinds.map((kind) => ({ value: kind, label: t(`classics.kinds.${kind}`) }))}
        />
        <Select
          id="classic-original-language"
          label={t('classics.form.originalLanguage')}
          isLabelVisible
          placement="form"
          value={details.originalLanguage}
          onChange={(value) => onChange('originalLanguage', value)}
          options={originalLanguages.map((code) => ({
            value: code,
            label: languageName(code, i18n.language),
          }))}
        />
      </div>
      {field('sourceTitle')}
      {field('sourceUrl', 'url')}
      <p className="m-0 text-sm text-meta">{t('classics.form.translatorHint')}</p>
      {field('translatorName')}
      <div className="flex flex-wrap gap-4">
        {year('translatorDiedYear')}
        {year('firstPublishedYear')}
      </div>
    </fieldset>
  );
}
