/**
 * useNewStorySteps: the five steps of the new story wizard and which answers each holds (CALM-9,
 * board D02: "1 The basics, 2 Type, tags and setting (Category before FORMS-1), 3 Cover, 4 Who can read it, 5 Labels,
 * rating and AI").
 *
 * Who uses it: NewStoryPage, which hands the steps to StepWizard. Each step wraps the same form
 * section story settings uses, drawn without its own card (InWizardFormSections), and says in one
 * line what a done step holds ("The Weather Station · English").
 * What it calls: the five form sections, lib/setInCountries.ts for the "Set in" summary and
 * useGenres with lib/genreChoices.ts for the genres in it (S1-E3-01).
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { WizardStep } from '@/components/ui/StepWizard';
import { languageMenuName, type LanguageChoice } from '@/lib/language-names';

import type { Genre } from '../api/genres';
import type { StoryCategory } from '../api/stories';
import type { SetStoryAnswer, StoryAnswers, StoryFieldErrors } from './storyAnswers';
import { chosenGenreNames } from '../lib/genreChoices';
import { setInPhrase } from '../lib/setInCountries';
import { useGenres } from './useGenres';

import { CategoryTagsSection } from '../components/CategoryTagsSection';
import { CoverSection } from '../components/CoverSection';
import { InWizardFormSections } from '../components/FormSection';
import { StoryBasicsSection } from '../components/StoryBasicsSection';
import { StoryLabelsSection } from '../components/StoryLabelsSection';
import { StoryVisibilitySection } from '../components/StoryVisibilitySection';

/** Which answers each step asks for, in step order; every other answer belongs to the last step. */
export const newStoryStepFields: readonly (readonly (keyof StoryAnswers)[])[] = [
  ['storyId', 'title', 'blurb', 'languageCode'],
  ['categorySlug', 'genreSlugs', 'tags', 'setInCountries'],
  ['cover'],
  ['visibility'],
];

/**
 * The step that holds a field: the step listed for it, else the last step (labels and rating).
 *
 * @param field - an answer with a mistake
 * @returns the step's index, from 0
 */
export function stepOfField(field: keyof StoryAnswers): number {
  const index = newStoryStepFields.findIndex((fields) => fields.includes(field));
  return index === -1 ? newStoryStepFields.length : index;
}

/** What the steps need from the page. */
export interface NewStoryStepsInput {
  answers: StoryAnswers;
  errors: StoryFieldErrors;
  set: SetStoryAnswer;
  languages: readonly LanguageChoice[];
  categories: StoryCategory[];
  penName: string;
}

/** What the summaries are written from. */
interface SummaryInput {
  answers: StoryAnswers;
  genres: readonly Genre[];
  t: TFunction<'writing'>;
  language: string;
}

/** The done summaries, one line per step. */
function stepSummaries({ answers, genres, t, language }: SummaryInput): string[] {
  const title = answers.title.trim() === '' ? t('newStory.summary.noTitle') : answers.title.trim();
  const categoryTags = [
    t(`categories.${answers.categorySlug}`, { defaultValue: answers.categorySlug }),
    // S1-E3-01: the genres' names, as picked ("Cosy mystery, Family saga").
    chosenGenreNames(answers.genreSlugs, genres, language).join(', '),
    answers.tags.length > 0 ? t('newStory.summary.tags', { count: answers.tags.length }) : '',
    answers.setInCountries.length > 0
      ? t('newStory.summary.setIn', { countries: setInPhrase(answers.setInCountries, language) })
      : '',
  ];
  const coverKeys = {
    automatic: 'newStory.summary.coverAutomatic',
    drawn: 'newStory.summary.coverDrawn',
    upload: 'newStory.summary.coverUpload',
  } as const;
  return [
    // S1-E3-01: any language of the world, named in the interface language.
    `${title} · ${languageMenuName(answers.languageCode, language)}`,
    categoryTags.filter((part) => part !== '').join(' · '),
    t(coverKeys[answers.cover.kind]),
    t(`visibility.options.${answers.visibility}`),
    '',
  ];
}

/**
 * Builds the wizard's steps.
 *
 * @param input - the form's answers, mistakes and setter, the choices and the pen name
 * @returns the five steps, for StepWizard
 */
export function useNewStorySteps(input: NewStoryStepsInput): WizardStep[] {
  const { t, i18n } = useTranslation('writing');
  const { answers, errors, set } = input;
  const { genres } = useGenres();
  const summaries = stepSummaries({ answers, genres, t, language: i18n.language });
  const contents = [
    <StoryBasicsSection
      key="basics"
      answers={answers}
      errors={errors}
      languages={input.languages}
      set={set}
    />,
    <CategoryTagsSection
      key="categoryTags"
      answers={answers}
      errors={errors}
      categories={input.categories}
      set={set}
    />,
    <CoverSection
      key="cover"
      storyId={answers.storyId}
      title={answers.title}
      penName={input.penName}
      cover={answers.cover}
      onChange={(cover) => set('cover', cover)}
    />,
    <StoryVisibilitySection key="whoCanRead" answers={answers} set={set} />,
    <StoryLabelsSection key="labels" answers={answers} errors={errors} set={set} />,
  ];
  // Steps 2 to 4 have answers that start sensibly, so they can be skipped; the basics need a
  // title and the last step needs a rating and an AI answer (S1-E3-06).
  const optionalSteps = ['categoryTags', 'cover', 'whoCanRead'];
  const keys = ['basics', 'categoryTags', 'cover', 'whoCanRead', 'labels'] as const;
  return keys.map((key, index) => ({
    key,
    title: t(`newStory.steps.${key}`),
    summary: summaries[index] ?? '',
    isOptional: optionalSteps.includes(key),
    content: <InWizardFormSections>{contents[index]}</InWizardFormSections>,
  }));
}
