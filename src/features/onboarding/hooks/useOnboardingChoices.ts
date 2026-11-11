/**
 * useOnboardingChoices: what the steps offer: the counties, the categories and the topics in the
 * page's language (story S1-E2-06).
 *
 * Who calls it: NameStep, LikesFields. What it calls: api/onboarding.ts (the regions table and
 * onboarding_topics()) and useStoryFormOptions for the categories (S1-E3-01). Works signed out,
 * but only signed-in pages use it.
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';

import { fetchRegions, fetchTopics } from '../api/onboarding';
import { writtenLanguageFor } from '@/schemas/interfaceLanguages';

/**
 * Reads the choices.
 *
 * @returns regions, categories, topics and loadFailed
 */
export function useOnboardingChoices() {
  const { i18n } = useTranslation();
  const language = writtenLanguageFor(i18n.language);
  const { categories, loadFailed: categoriesFailed } = useStoryFormOptions();
  const regions = useQuery({
    queryKey: ['regions'],
    staleTime: Infinity,
    queryFn: async () => fetchRegions(await requireClient()),
  });
  const topics = useQuery({
    queryKey: ['onboarding-topics', language],
    queryFn: async () => fetchTopics(await requireClient(), language),
  });
  return {
    regions: regions.data ?? [],
    categories,
    topics: topics.data ?? [],
    loadFailed: regions.isError || topics.isError || categoriesFailed,
  };
}
