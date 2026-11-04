/**
 * StaffStorySettingsFields: the settings staff may change on a story, as form fields (bundle
 * ADMIN-2, part b1; story S1-E11-08; board AdminStory 8.11): rating, finished or ongoing,
 * category, language, comments, the three content labels and the tags; since SPONSORS-f also why
 * a 16+ or 18+ story has its rating (StaffRatingReasons).
 *
 * Never the title, blurb, content note or a chapter's words: those are the writer's (Q14). The
 * labels use the writer's own words from the writing namespace, so staff and writers see the same.
 * Who shows it: StaffStorySettingsForm. What it calls: useStoryFormOptions for the categories and
 * open languages.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { LabelCheckbox } from '@/features/writing/components/LabelCheckbox';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import type { StaffStorySettings } from '../../api/staffStories';
import { useStaffStoryWords } from '../../hooks/useStaffStoryWords';
import { staffStoryRatings } from '../../lib/staffStoryFilters';

import { StaffRatingReasons } from './StaffRatingReasons';

/** What the fields need. */
export interface StaffStorySettingsFieldsProps {
  settings: StaffStorySettings;
  onChange: (settings: StaffStorySettings) => void;
  /** The tags as staff type them, comma separated. */
  typedTags: string;
  onTypedTagsChange: (typed: string) => void;
}

/**
 * The rating and whether the story is finished.
 *
 * @returns the two drop-downs
 */
function RatingAndStatus({
  settings,
  onChange,
}: Pick<StaffStorySettingsFieldsProps, 'settings' | 'onChange'>) {
  const { t } = useTranslation('staff');
  const { t: tWriting } = useTranslation('writing');
  const words = useStaffStoryWords();
  return (
    <>
      <Select
        id="story-settings-rating"
        label={t('stories.columns.rating')}
        isLabelVisible
        placement="form"
        value={settings.rating}
        onChange={(value) =>
          onChange({
            ...settings,
            rating: staffStoryRatings.find((rating) => rating === value) ?? settings.rating,
          })
        }
        options={staffStoryRatings.map((rating) => ({
          value: rating,
          label: words.rating(rating),
        }))}
      />
      <Select
        id="story-settings-completion"
        label={tWriting('status.label')}
        isLabelVisible
        placement="form"
        value={settings.completionStatus}
        onChange={(value) =>
          onChange({
            ...settings,
            completionStatus: value === 'completed' ? 'completed' : 'ongoing',
          })
        }
        options={[
          { value: 'ongoing', label: tWriting('status.ongoing') },
          { value: 'completed', label: tWriting('status.completed') },
        ]}
      />
    </>
  );
}

/**
 * The category and the language, from the same lists writers pick from.
 *
 * @returns the two drop-downs
 */
function CategoryAndLanguage({
  settings,
  onChange,
}: Pick<StaffStorySettingsFieldsProps, 'settings' | 'onChange'>) {
  const { t } = useTranslation('staff');
  const words = useStaffStoryWords();
  const { categories, languages } = useStoryFormOptions();
  return (
    <>
      <Select
        id="story-settings-category"
        label={t('stories.columns.category')}
        isLabelVisible
        placement="form"
        value={settings.categorySlug ?? ''}
        onChange={(value) => onChange({ ...settings, categorySlug: value })}
        options={categories.map((category) => ({
          value: category.slug,
          label: words.category(category.slug),
        }))}
      />
      <Select
        id="story-settings-language"
        label={t('stories.languageLabel')}
        isLabelVisible
        placement="form"
        value={settings.languageCode}
        onChange={(value) => onChange({ ...settings, languageCode: value })}
        options={languages.map((language) => ({
          value: language.code,
          label: words.language(language.code),
          lang: language.code,
        }))}
      />
    </>
  );
}

/**
 * The tick boxes: comments and the three content labels.
 *
 * @returns the tick boxes
 */
function SettingsTicks({
  settings,
  onChange,
}: Pick<StaffStorySettingsFieldsProps, 'settings' | 'onChange'>) {
  const { t } = useTranslation('staff');
  const { t: tWriting } = useTranslation('writing');
  return (
    <div className="flex flex-col gap-3">
      <LabelCheckbox
        id="story-settings-comments"
        label={t('stories.change.commentsOn')}
        hint={t('stories.change.commentsHint')}
        isChecked={settings.commentsEnabled}
        onChange={(isChecked) => onChange({ ...settings, commentsEnabled: isChecked })}
      />
      <LabelCheckbox
        id="story-settings-fan-fiction"
        label={tWriting('labels.fanFiction')}
        hint={tWriting('labels.fanFictionHint')}
        isChecked={settings.isFanFiction}
        onChange={(isChecked) => onChange({ ...settings, isFanFiction: isChecked })}
      />
      <LabelCheckbox
        id="story-settings-parody"
        label={tWriting('labels.parody')}
        hint={tWriting('labels.parodyHint')}
        isChecked={settings.isParody}
        onChange={(isChecked) => onChange({ ...settings, isParody: isChecked })}
      />
      <LabelCheckbox
        id="story-settings-abuse"
        label={tWriting('labels.abuse')}
        hint={t('stories.change.abuseHint')}
        isChecked={settings.dealsWithAbuseOrCoercion}
        onChange={(isChecked) => onChange({ ...settings, dealsWithAbuseOrCoercion: isChecked })}
      />
    </div>
  );
}

/**
 * Renders every field.
 *
 * @returns the drop-downs, the tick boxes and the tags
 */
export function StaffStorySettingsFields(props: StaffStorySettingsFieldsProps) {
  const { t } = useTranslation('staff');
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <RatingAndStatus settings={props.settings} onChange={props.onChange} />
        <CategoryAndLanguage settings={props.settings} onChange={props.onChange} />
      </div>
      <StaffRatingReasons settings={props.settings} onChange={props.onChange} />
      <SettingsTicks settings={props.settings} onChange={props.onChange} />
      <TextInput
        id="story-settings-tags"
        label={t('stories.change.tagsLabel')}
        hint={t('stories.change.tagsHint')}
        value={props.typedTags}
        onChange={(event) => props.onTypedTagsChange(event.target.value)}
      />
    </div>
  );
}
