/**
 * LikesFields: "I like to read", "I want to write" and "Topics" as chips (story S1-E2-06,
 * criterion 2; board Onboarding 2.5, step 2).
 *
 * Who shows it: LikesStep and LikesSettingsSection. What it calls: nothing; the parent keeps the
 * picks and saves them. Each group is a fieldset with its legend, and each chip a switch
 * (aria-pressed, a tick when on: never colour alone; DoD pill system). The count of picks is
 * announced politely as it changes.
 */
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/Chip';

import type { Preferences } from '../api/onboarding';
import { useOnboardingChoices } from '../hooks/useOnboardingChoices';

/** One chip group: its legend and its choices. */
interface ChipGroupProps {
  legend: string;
  choices: { value: string; label: string }[];
  picked: string[];
  onChange: (picked: string[]) => void;
}

/**
 * Adds or removes one value from a list.
 *
 * @returns the new list
 */
function toggled(list: string[], value: string, isOn: boolean): string[] {
  if (isOn) return list.includes(value) ? list : [...list, value];
  return list.filter((item) => item !== value);
}

/**
 * One group of chips.
 *
 * @returns the fieldset
 */
function ChipGroup({ legend, choices, picked, onChange }: ChipGroupProps) {
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 text-[13px] font-semibold text-body">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <Chip
            key={choice.value}
            isPressed={picked.includes(choice.value)}
            onPressedChange={(isOn) => onChange(toggled(picked, choice.value, isOn))}
          >
            {choice.label}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Renders the three groups and the count.
 *
 * @param props.value - the picks so far
 * @param props.onChange - called with every change
 * @returns the fields
 */
export function LikesFields({
  value,
  onChange,
}: {
  value: Preferences;
  onChange: (value: Preferences) => void;
}) {
  const { t } = useTranslation('account');
  const { categories, topics } = useOnboardingChoices();
  const categoryChoices = categories.map((category) => ({
    value: category.slug,
    label: t(`categories.${category.slug}`, { ns: 'writing' }),
  }));
  const topicChoices = topics.map((topic) => ({ value: topic.tagId, label: topic.name }));
  const count =
    value.readCategories.length + value.writeCategories.length + value.topicTagIds.length;
  return (
    <div className="flex flex-col gap-5">
      <ChipGroup
        legend={t('onboarding.likes.read')}
        choices={categoryChoices}
        picked={value.readCategories}
        onChange={(readCategories) => onChange({ ...value, readCategories })}
      />
      <ChipGroup
        legend={t('onboarding.likes.write')}
        choices={categoryChoices}
        picked={value.writeCategories}
        onChange={(writeCategories) => onChange({ ...value, writeCategories })}
      />
      {topicChoices.length === 0 ? (
        <p className="m-0 text-[13px] text-meta">{t('onboarding.likes.noTopics')}</p>
      ) : (
        <ChipGroup
          legend={t('onboarding.likes.topics')}
          choices={topicChoices}
          picked={value.topicTagIds}
          onChange={(topicTagIds) => onChange({ ...value, topicTagIds })}
        />
      )}
      <p role="status" className="m-0 text-[13px] text-meta">
        {t('onboarding.likes.picked', { count })}
      </p>
    </div>
  );
}
