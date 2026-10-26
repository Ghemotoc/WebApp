/**
 * ClassicStoryFields: the story part of the "Add a classic work" form (story S1-E11-16 AC 1 and 5):
 * title, blurb, the language of this text, category, rating and content note.
 *
 * Who shows it: ClassicWorkForm. What it calls: useStoryFormOptions (the open languages and the
 * categories, as the writer's new story form offers them) and onChange.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import type { ClassicDetails } from '../../api/classics';

/** The ratings staff choose from (rule 18: Ion is not All ages, for example). */
const ratings = ['all_ages', '13_plus', '16_plus', '18_plus'] as const;

/** What the fields need. */
export interface ClassicFieldsProps {
  details: ClassicDetails;
  onChange: (field: keyof ClassicDetails, value: string) => void;
}

/**
 * The three drop-downs: the text's language, its category and its rating.
 *
 * @returns the drop-downs
 */
function ClassicStorySelects({ details, onChange }: ClassicFieldsProps) {
  const { t } = useTranslation('staff');
  const { languages, categories } = useStoryFormOptions();
  return (
    <div className="flex flex-wrap gap-4">
      <Select
        id="classic-language"
        label={t('classics.form.language')}
        isLabelVisible
        placement="form"
        value={details.languageCode}
        onChange={(value) => onChange('languageCode', value)}
        options={languages.map((code) => ({
          value: code,
          label: t(`languages.${code}`, { ns: 'writing' }),
        }))}
      />
      <Select
        id="classic-category"
        label={t('classics.form.category')}
        isLabelVisible
        placement="form"
        value={details.categorySlug}
        onChange={(value) => onChange('categorySlug', value)}
        options={categories.map((category) => ({
          value: category.slug,
          label: t(`categories.${category.slug}`, { ns: 'writing' }),
        }))}
      />
      <Select
        id="classic-rating"
        label={t('classics.form.rating')}
        isLabelVisible
        placement="form"
        value={details.rating}
        onChange={(value) => onChange('rating', value)}
        options={ratings.map((rating) => ({
          value: rating,
          label: t(`rating.${rating}`, { ns: 'writing' }),
        }))}
      />
    </div>
  );
}

/**
 * Renders the fields.
 *
 * @returns the story fields
 */
export function ClassicStoryFields({ details, onChange }: ClassicFieldsProps) {
  const { t } = useTranslation('staff');
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="mb-2 font-heading text-lg font-bold text-heading">
        {t('classics.form.storyLegend')}
      </legend>
      <TextInput
        id="classic-title"
        label={t('classics.form.title')}
        value={details.title}
        maxLength={120}
        onChange={(event) => onChange('title', event.target.value)}
      />
      <Textarea
        id="classic-blurb"
        label={t('classics.form.blurb')}
        value={details.blurb}
        maxLength={500}
        rows={3}
        onChange={(event) => onChange('blurb', event.target.value)}
      />
      <ClassicStorySelects details={details} onChange={onChange} />
      <TextInput
        id="classic-content-note"
        label={t('classics.form.contentNote')}
        hint={t('classics.form.contentNoteHint')}
        value={details.contentNote}
        maxLength={300}
        onChange={(event) => onChange('contentNote', event.target.value)}
      />
    </fieldset>
  );
}
