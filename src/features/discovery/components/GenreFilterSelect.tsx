/**
 * GenreFilterSelect: the Genre drop-down inside "Filter and sort" on a See all, category or tag
 * page (story S1-E3-01; Robert, 26 Nov 2026).
 *
 * It lists only the genres that stories this reader may see carry (story_list_genres()), so no
 * choice leads to an empty page, and an 18+ genre never shows to anyone under 18 (rule 18). "Any
 * genre" turns the filter off. The choice goes into the address (?genre=), like every filter.
 * Who uses it: StoryListFilters. What it calls: hooks/useStoryListGenres.ts.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { genreName } from '@/features/writing/api/genres';

import type { ListRequest } from '../api/storyLists';
import { useStoryListGenres } from '../hooks/useStoryListGenres';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/** The value the drop-down uses for "Any genre". */
const anyGenre = '';

/** What the drop-down needs. */
export interface GenreFilterSelectProps {
  request: ListRequest;
  onChange: (request: ListRequest) => void;
  /** The list is read only once the panel opens, so a page that isn't filtered doesn't pay. */
  isPanelOpen: boolean;
}

/**
 * Renders the drop-down, or nothing while no story carries a genre yet.
 *
 * @returns the drop-down
 */
export function GenreFilterSelect({ request, onChange, isPanelOpen }: GenreFilterSelectProps) {
  const { t } = useDiscoveryTranslation();
  const { i18n } = useTranslation();
  const genres = useStoryListGenres(isPanelOpen || request.genreSlug != null);
  const chosen = request.genreSlug ?? anyGenre;
  // Step 1: one choice per genre in use, in the list's order.
  const options = [
    { value: anyGenre, label: t('seeAll.anyGenre') },
    ...genres.map((genre) => ({ value: genre.slug, label: genreName(genre, i18n.language) })),
  ];
  // Step 2: a genre from the address that no visible story carries now stays chosen, so the
  // drop-down never claims "Any genre" while the list is still filtered.
  if (chosen !== anyGenre && !genres.some((genre) => genre.slug === chosen)) {
    options.push({ value: chosen, label: chosen });
  }
  if (options.length === 1) return null;
  return (
    <Select
      id="story-list-genre"
      label={t('seeAll.genre')}
      isLabelVisible
      options={options}
      value={chosen}
      onChange={(value) => onChange({ ...request, genreSlug: value === anyGenre ? null : value })}
    />
  );
}
