/**
 * DiscoverCards: "Your dashboard", the three "pick up where you left off" cards at the top of
 * Discover for a signed-in member (story S1-E5-12, bundle LOOK-4b; board Discover).
 *
 * Board values (liquid glass board Discover, bundle G7): the side column, cards stacked with 18 px
 * gaps. From 1024 px it sits beside the Featured carousel and the shelves, starting level with the
 * carousel (design rulebook: a side column starts level with the first block of the main column);
 * narrower, it comes straight after the carousel. Each card shows only when it has something real
 * to show (DoD: never draw a feature that doesn't exist): Continue reading when there is an
 * unfinished story, Your draft when there is a draft, and Start a new story when the member may
 * write. With none of the three, and for a visitor, nothing is drawn and the main column takes the
 * whole width.
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
 * @returns the side column or null
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
    <aside
      aria-label={t('cards.label')}
      data-discover-side=""
      className="flex min-w-0 flex-col gap-[18px] lg:col-start-2 lg:row-span-2 lg:row-start-1"
    >
      {continueReading !== null && <ContinueCard item={continueReading} />}
      {draft !== null && <DraftCard draft={draft} />}
      {mayWrite && <NewStoryCard />}
    </aside>
  );
}
