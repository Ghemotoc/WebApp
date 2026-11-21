/**
 * StoryWhereItShowsSection: "Where it shows" in story settings, the countries where the story is
 * hidden (bundle COUNTRY-1; Robert, 21 Nov 2026, approved on canvas v43; board D07).
 *
 * The line under the heading says it works by the reader's connection, as a block and not a lock.
 * The picker itself (chips, "Add a country", the explanation) is shared with staff's classics
 * screen. Saved with the rest of the settings by set_my_story_hidden_countries(); the database
 * hides the story on every reading path (reader_visible_story(), listed_stories()).
 * Who uses it: StorySettingsPage, after "Who can read it" and "In the app only".
 */
import { useTranslation } from 'react-i18next';

import { HiddenCountriesPicker } from '@/features/country-block/components/HiddenCountriesPicker';

import type { SetStoryAnswer, StoryAnswers } from '../hooks/storyAnswers';

import { FormSection } from './FormSection';

/** What the section needs. */
export interface StoryWhereItShowsSectionProps {
  answers: StoryAnswers;
  set: SetStoryAnswer;
}

/**
 * Renders the section.
 *
 * @returns the fieldset
 */
export function StoryWhereItShowsSection({ answers, set }: StoryWhereItShowsSectionProps) {
  const { t } = useTranslation('writing');
  return (
    <FormSection legend={t('whereItShows.heading')}>
      <p className="m-0 text-sm text-meta">{t('whereItShows.intro')}</p>
      <HiddenCountriesPicker
        hidden={answers.hiddenInCountries}
        onChange={(hidden) => set('hiddenInCountries', hidden)}
      />
    </FormSection>
  );
}
