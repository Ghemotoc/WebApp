/**
 * ClassicSourceFields: the public-domain part of the "Add a classic work" form (story S1-E11-16
 * AC 1): the kind, the original language, the source edition and its link, the translator and
 * the year of first publication. TRANSLATE-1d adds the translation rights: a translated text has
 * its own copyright, so staff say why it may be shown.
 *
 * Who shows it: ClassicWorkForm. What it calls: onChange. Language names come from Intl in the
 * interface language, so the code holds none; the choices are every world language
 * (src/lib/world-languages.ts).
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import { languageChoices } from '@/lib/language-names';
import { worldLanguageCodes } from '@/lib/world-languages';

import type { ClassicKind } from '../../api/classics';

import type { ClassicFieldsProps } from './ClassicStoryFields';
import { TranslationRightsSelect } from './TranslationRightsSelect';

/** The kinds of work (the classic_kind enum). */
const kinds: ClassicKind[] = ['novel', 'short_story', 'fairy_tale', 'poem', 'play', 'essay'];

/**
 * The kind of work and its original language.
 *
 * @returns the two drop-downs
 */
function KindAndLanguage({ details, onChange }: ClassicFieldsProps) {
  const { t, i18n } = useTranslation('staff');
  return (
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
        // Every ISO 639-1 language, the same list a story may be written in (S1-E3-01): the
        // classics come from far more languages than the first few (Robert, 27 Nov 2026).
        options={languageChoices(worldLanguageCodes, i18n.language).map(({ code, label }) => ({
          value: code,
          label,
        }))}
      />
    </div>
  );
}

/**
 * Renders the fields.
 *
 * @returns the source fields
 */
export function ClassicSourceFields({ details, onChange }: ClassicFieldsProps) {
  const { t } = useTranslation('staff');
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
      <KindAndLanguage details={details} onChange={onChange} />
      {field('sourceTitle')}
      {field('sourceUrl', 'url')}
      <p className="m-0 text-sm text-meta">{t('classics.form.translatorHint')}</p>
      {field('translatorName')}
      <TranslationRightsSelect
        id="classic-translation-rights"
        value={details.translationRights}
        onChange={(value) => onChange('translationRights', value)}
      />
      <div className="flex flex-wrap gap-4">
        {year('translatorDiedYear')}
        {year('firstPublishedYear')}
      </div>
    </fieldset>
  );
}
