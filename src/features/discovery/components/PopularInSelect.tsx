/**
 * PopularInSelect: the "Popular in" drop-down (bundle MARKETS-2, part d; Robert, 8 Nov 2026).
 *
 * "Everywhere" first, then the countries from the setting, named in the interface language and
 * sorted by name. Picking one re-sorts the popular list by that country's ranking.
 * Who uses it: PopularShelf (Discover) and StoryListFilters (the Popular See all page).
 * What it calls: usePopularInCountries and countryName.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';

import { everywhereRanking } from '../api/storyLists';
import { usePopularInCountries } from '../hooks/usePopularIn';
import { countryName } from '../lib/countryNames';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/** What the drop-down needs. */
export interface PopularInSelectProps {
  /** The page's id for it, unique on the page. */
  id: string;
  /** A country code or everywhereRanking. */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Renders the drop-down.
 *
 * @returns the labelled drop-down
 */
export function PopularInSelect({ id, value, onChange }: PopularInSelectProps) {
  const { t } = useDiscoveryTranslation();
  const { i18n } = useTranslation();
  const countries = usePopularInCountries();
  // Step 1: each country by its name in the interface language, in alphabetical order.
  const countryOptions = countries
    .map((code) => ({ value: code, label: countryName(code, i18n.language) }))
    .sort((first, second) => first.label.localeCompare(second.label, i18n.language));
  // Step 2: "Everywhere" leads.
  const options = [
    { value: everywhereRanking, label: t('popularIn.everywhere') },
    ...countryOptions,
  ];
  return (
    <Select
      id={id}
      label={t('popularIn.label')}
      isLabelVisible
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}
