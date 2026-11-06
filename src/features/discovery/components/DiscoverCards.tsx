/**
 * DiscoverCards: "Your dashboard", the three "pick up where you left off" cards at the top of
 * Discover for a signed-in member (story S1-E5-12, bundle LOOK-4b; board Discover).
 *
 * Board values: a grid of cards at least 260 px wide with 20 px gaps; Continue reading spans two
 * columns where there is room. Each card shows only when it has something real to show (DoD:
 * never draw a feature that doesn't exist): Continue reading when there is an unfinished story,
 * Your draft when there is a draft, and the gold card when the member may write. With none of the
 * three, and for a visitor, nothing is drawn.
 * Who shows it: DiscoverPage. What it calls: useDiscoverCards → my_discover_cards().
 */
import { useDiscoverCards } from '../hooks/useDiscoverCards';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { ContinueCard } from './ContinueCard';
import { DraftCard } from './DraftCard';
import { NewStoryCard } from './NewStoryCard';

/**
 * Renders the cards, or nothing.
 *
 * @returns the dashboard section or null
 */
export function DiscoverCards() {
  const { t } = useDiscoveryTranslation();
  const { cards } = useDiscoverCards();
  // Step 1: nothing for a visitor, while loading or when the read failed.
  if (cards === null) return null;
  const { continueReading, draft, mayWrite } = cards;
  // Step 2: nothing when no card has anything to show.
  if (continueReading === null && draft === null && !mayWrite) return null;
  return (
    <section
      aria-label={t('cards.label')}
      className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5"
    >
      {continueReading !== null && <ContinueCard item={continueReading} />}
      {draft !== null && <DraftCard draft={draft} />}
      {mayWrite && <NewStoryCard />}
    </section>
  );
}
