/**
 * ReadSideColumn: the Read page's side column for a signed-in member, "For Lia" (story S1-E5-12,
 * bundle LOOK-4b; since CALM-7c the simplified board New-Read).
 *
 * Board values: from 1024 px a 300 px column beside the hero and the rows, starting level with the
 * hero (design rulebook: a side column starts level with the first block of the main column);
 * narrower, it moves under the rows. No cards: sections one under another. In order: Continue
 * reading (the latest unfinished story), the latest draft, "Start a new story" (today's page has
 * it, the board doesn't, so it stays as one line) and New and rising writers. Each part shows only
 * when it has something real to show (DoD: never draw a feature that doesn't exist); with nothing
 * at all, nothing is drawn and the main column takes the whole width.
 * The board's 300 × 250 advert isn't here yet: Discover's second ad slot is a list card in the
 * database (sponsors a1), so a box there needs a change to the slots first (pull request
 * follow-up).
 * Who shows it: DiscoverPage, only for someone signed in. What it calls: useDiscoverCards →
 * my_discover_cards(), useMyNames (the name in its label), useRisingWriters (whether the writers'
 * list has anyone), ContinueCard, DraftCard, NewStoryCard and RisingWritersList.
 */
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { displayName } from '@/features/account/lib/nameRules';

import { useDiscoverCards } from '../hooks/useDiscoverCards';
import { useRisingWriters } from '../hooks/useRisingWriters';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { ContinueCard } from './ContinueCard';
import { DraftCard } from './DraftCard';
import { NewStoryCard } from './NewStoryCard';
import { RisingWritersList } from './RisingWritersList';

/**
 * What each part of the column has to show (the cards are null for a visitor and while loading).
 *
 * @returns the latest unfinished story, the latest draft, whether the member may write, and
 *   whether any writer is suggested
 */
function useColumnParts() {
  const { cards } = useDiscoverCards();
  const { writers } = useRisingWriters();
  return {
    continueReading: cards?.continueReading ?? null,
    draft: cards?.draft ?? null,
    mayWrite: cards?.mayWrite ?? false,
    hasWriters: writers.length > 0,
  };
}

/**
 * The column's name: "For Lia" once the name is known (the pen name or username, never a real
 * name; rule 5), "Dashboard" until then.
 *
 * @returns the label
 */
function useColumnLabel(): string {
  const { t } = useDiscoveryTranslation();
  const { names } = useMyNames();
  if (names === null) return t('cards.label');
  return t('cards.labelFor', { name: displayName(names.handle, names.penName) });
}

/**
 * Renders the column, or nothing.
 *
 * @returns the side column or null
 */
export function ReadSideColumn() {
  const { continueReading, draft, mayWrite, hasWriters } = useColumnParts();
  const label = useColumnLabel();
  // Nothing at all when no part has anything to show.
  if (continueReading === null && draft === null && !mayWrite && !hasWriters) return null;
  return (
    <aside
      aria-label={label}
      data-discover-side=""
      className="flex min-w-0 flex-col gap-10 lg:col-start-2 lg:row-span-2 lg:row-start-1"
    >
      {continueReading !== null && <ContinueCard item={continueReading} />}
      {draft !== null && <DraftCard draft={draft} />}
      {mayWrite && <NewStoryCard />}
      <RisingWritersList />
    </aside>
  );
}
