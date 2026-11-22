/**
 * The meta line on the writer's preview card, "How readers will see it" (bundle CALM-9c; replaces
 * the chips and StoryLabelPills of S1-E3-01 and S1-E3-06; the story page has shown its labels as a
 * meta line since CALM-7c, storyLabelFacts in src/features/reading/lib/).
 *
 * Order: the category, the language, the rating when it is 13+, 16+ or 18+, "Fan fiction" and
 * "Parody" when ticked, then the AI answer when the writer used AI. An unanswered rating or AI
 * question shows nothing yet, so a new story's preview stays short.
 * Who uses it: StoryPreviewAside. It calls nothing; it is pure.
 */
import type { TFunction } from 'i18next';

import type { MetaFact } from '@/components/ui/MetaLine';

import type { StoryAnswers } from '../hooks/storyAnswers';

/**
 * The facts for the preview's meta line.
 *
 * @param answers - what the writer has filled in so far
 * @param t - the writing namespace's translate function
 * @returns the facts, in reading order
 */
export function storyPreviewFacts(answers: StoryAnswers, t: TFunction<'writing'>): MetaFact[] {
  // Step 1: the category and the language, named in the interface language.
  const facts: MetaFact[] = [
    { text: t(`categories.${answers.categorySlug}`, { defaultValue: answers.categorySlug }) },
    { text: t(`languages.${answers.languageCode}`, { defaultValue: answers.languageCode }) },
  ];
  // Step 2: the rating, only when it limits who can read (All ages says nothing new).
  if (answers.rating !== null && answers.rating !== 'all_ages') {
    facts.push({ text: t(`rating.${answers.rating}`) });
  }
  // Step 3: the writer's ticks.
  if (answers.isFanFiction) facts.push({ text: t('pills.fanFiction') });
  if (answers.isParody) facts.push({ text: t('pills.parody') });
  // Step 4: the AI answer, only when the writer used AI.
  if (answers.aiDisclosure !== null && answers.aiDisclosure !== 'no_ai') {
    facts.push({ text: t(`aiDisclosure.${answers.aiDisclosure}`) });
  }
  return facts;
}
