/**
 * useStaffStoryWords: how Staff › Stories writes a story's category, language, rating, status,
 * audience and dates in the page's language (bundle ADMIN-2, part a; story S1-E11-07).
 *
 * Who calls it: StaffStoryFiltersBar, StaffStoryResults and StaffStoryPage. Category and rating
 * names come from the writing namespace, so staff see the same words writers chose; language
 * names come from the browser (any language of the world, S1-E3-01).
 */
import { useTranslation } from 'react-i18next';

import type { PillTone } from '@/components/ui/InfoPill';
import type { Enums } from '@/lib/database.types';
import { languageMenuName } from '@/lib/language-names';

import type { StaffStoryAudience, StaffStoryStatus } from '../api/staffStories';
import { dateLocaleFor } from '../../../lib/romania-time';

/** The pill colour for each status (DoD pill system: no solid red, which is kept for urgent items). */
const statusTones: Record<StaffStoryStatus, PillTone> = {
  draft: 'gold',
  published: 'sage',
  restricted: 'gold',
  hidden: 'blush',
  removed: 'blush',
};

/**
 * The word helpers.
 *
 * @returns category(), language(), rating(), status(), statusTone(), audience() and date()
 */
export function useStaffStoryWords() {
  const { t, i18n } = useTranslation('staff');
  const { t: tWriting } = useTranslation('writing');

  return {
    category: (slug: string | null) =>
      slug === null ? t('stories.noCategory') : tWriting(`categories.${slug}`),
    // S1-E3-01: any language of the world, named by the browser in the page's language.
    language: (code: string) => languageMenuName(code, i18n.language),
    rating: (rating: Enums<'story_rating'>) => tWriting(`rating.${rating}`),
    status: (status: StaffStoryStatus) => t(`stories.statuses.${status}`),
    statusTone: (status: StaffStoryStatus) => statusTones[status],
    audience: (audience: StaffStoryAudience) => t(`stories.audiences.${audience}`),
    // A date in the page's language, for example "24 Oct 2026".
    date: (isoTime: string) =>
      new Intl.DateTimeFormat(dateLocaleFor(i18n.language), { dateStyle: 'medium' }).format(
        new Date(isoTime),
      ),
  };
}
