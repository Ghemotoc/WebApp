/**
 * BecauseYouReadShelf: "Because you read <title>" on Discover (story S1-E15-06, bundle
 * ANALYTICS-1c; criterion 3).
 *
 * For a signed-in member with "Suggestions from reading" on: stories that at least 5 of the same
 * readers finished, beside the member's latest finished story that has any. The database works it
 * out when Discover opens and keeps nothing of it. Signed out, switched off or with nothing to
 * suggest, the row isn't drawn.
 * Who uses it: DiscoverPage. What it calls: useSuggestionRow → because_you_read().
 */
import { useSession } from '@/features/auth/hooks/useSession';
import { useDiscoveryTranslation } from '@/features/discovery/registerDiscoveryTranslations';

import { useSuggestionRow } from '../hooks/useSuggestionRow';

import { SuggestionShelf } from './SuggestionShelf';

/**
 * Renders the row, or nothing.
 *
 * @returns the shelf or null
 */
export function BecauseYouReadShelf() {
  const { t } = useDiscoveryTranslation();
  const { userId } = useSession();
  // A visitor has no finished stories, so the database isn't asked.
  const row = useSuggestionRow('because_you_read', '', userId !== null);
  if (row === null || row.source === null) return null;
  return (
    <SuggestionShelf
      anchorId="because-you-read"
      title={t('suggestions.becauseYouRead', { title: row.source.title })}
      why={t('suggestions.whyBecause', { title: row.source.title })}
      stories={row.stories}
    />
  );
}
