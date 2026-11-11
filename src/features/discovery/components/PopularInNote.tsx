/**
 * PopularInNote: the line that says a country has too few ranked stories, so the list shows the
 * overall ranking (bundle MARKETS-2, part d; Robert, 8 Nov 2026: "a country with too few stories
 * to rank shows the overall ranking, with a note saying so").
 *
 * Who uses it: PopularShelf and StoryListPage. What it calls: countryName.
 */
import { useTranslation } from 'react-i18next';

import { popularInFor, type ListRequest } from '../api/storyLists';
import { countryName } from '../lib/countryNames';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/** What the note needs. */
export interface PopularInNoteProps {
  request: ListRequest;
  /** The country the database ranked by (null for the overall ranking), once the list loaded. */
  rankedCountry: string | null | undefined;
}

/**
 * Renders the note, or nothing when the list follows the country asked for.
 *
 * @returns the note or null
 */
export function PopularInNote({ request, rankedCountry }: PopularInNoteProps) {
  const { t } = useDiscoveryTranslation();
  const { i18n } = useTranslation();
  const askedCountry = popularInFor(request);
  // Nothing to say while loading, for "Everywhere", or when the country's ranking was used.
  if (askedCountry === null || rankedCountry === undefined || rankedCountry !== null) return null;
  return (
    <p role="status" className="m-0 text-sm text-meta">
      {t('popularIn.fallbackNote', { country: countryName(askedCountry, i18n.language) })}
    </p>
  );
}
