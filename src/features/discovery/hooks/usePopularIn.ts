/**
 * usePopularIn: the "Popular in" countries and where the drop-down starts (bundle MARKETS-2, part
 * d; Robert, 8 Nov 2026, 09:51 UTC).
 *
 * The drop-down lists the countries in the popular_in_countries setting (the eleven launch
 * countries) plus "Everywhere". It starts on the reader's own country: a member's profile country,
 * or the connection's country when signed out (useVisitorCountry). A country that isn't on the
 * list, or an unknown one, starts on "Everywhere".
 * Who calls it: PopularShelf (Discover) and StoryListPage (the Popular See all page).
 * What it calls next: usePublicSettings and useVisitorCountry.
 */
import { usePublicSettings } from '@/features/flags/hooks/usePublicSettings';
import { useVisitorCountry } from '@/features/safety/hooks/useVisitorCountry';

import { everywhereRanking, type ListRequest } from '../api/storyLists';

/** The launch countries (Robert, 8 Nov 2026), used until the setting arrives or if it can't be read. */
const launchCountries = ['GB', 'IE', 'US', 'CA', 'AU', 'NZ', 'SE', 'DK', 'NO', 'RO', 'MD'] as const;

/**
 * The countries on the drop-down, from the setting, keeping only two-letter codes.
 *
 * @returns the country codes, in the setting's order
 */
export function usePopularInCountries(): readonly string[] {
  const { wordsOf } = usePublicSettings();
  return wordsOf('popular_in_countries', launchCountries).filter((code) => /^[A-Z]{2}$/.test(code));
}

/**
 * Where the drop-down starts for this reader.
 *
 * @returns the country code or everywhereRanking, or null until the reader's country is known
 */
export function useStartingPopularIn(): string | null {
  const countries = usePopularInCountries();
  const { countryCode, isKnown } = useVisitorCountry();
  // Step 1: wait for the country, so the list loads once.
  if (!isKnown) return null;
  // Step 2: the reader's own country when it is on the list, otherwise the overall ranking.
  if (countryCode !== null && countries.includes(countryCode)) return countryCode;
  return everywhereRanking;
}

/**
 * The request with "Popular in" filled in: the page's own choice, or where the drop-down starts.
 *
 * @param request - the list as the page or address asks for it
 * @returns the request (unchanged for any list but popular), or null while the start is unknown
 */
export function useWithPopularIn(request: ListRequest): ListRequest | null {
  const starting = useStartingPopularIn();
  if (request.kind !== 'popular' || request.popularIn != null) return request;
  if (starting === null) return null;
  return { ...request, popularIn: starting };
}
