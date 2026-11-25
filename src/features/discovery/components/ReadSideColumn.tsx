/**
 * ReadSideColumn: the Read page's row of cards for a signed-in member, "For Lia" (story S1-E5-12,
 * bundle LOOK-4b; since user story 1.4 board A04, a row under the featured story instead of a
 * side column).
 *
 * Board values (A04): three cards side by side from 900 px, each on the box surface: Continue
 * reading (the latest unfinished story), the latest draft and "Start a new story"; under 900 px
 * they stack. Each card shows only when it has something real to show (DoD: never draw a feature
 * that doesn't exist); with nothing at all, nothing is drawn. The name stays "For Lia", so the
 * row is still one labelled landmark. New and rising writers moved to the box beside the
 * featured story (ReadWritersBox); when no story is featured the box joins this row instead.
 * Who shows it: DiscoverPage, only for someone signed in. What it calls: useDiscoverCards →
 * my_discover_cards(), useMyNames (the name in its label), ContinueCard, DraftCard,
 * NewStoryCard and ReadWritersBox.
 */
import { useMyNames } from '@/features/account/hooks/useMyNames';
import { displayName } from '@/features/account/lib/nameRules';

import { useDiscoverCards } from '../hooks/useDiscoverCards';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { ContinueCard } from './ContinueCard';
import { DraftCard } from './DraftCard';
import { NewStoryCard } from './NewStoryCard';
import { ReadWritersBox } from './ReadWritersBox';

/** Each card's paper: the one box surface (CALM-1c), 24 px inside. */
const cardClasses = 'box-surface min-w-0 rounded-card p-6';

/**
 * What each part of the column has to show (the cards are null for a visitor and while loading).
 *
 * @returns the latest unfinished story, the latest draft and whether the member may write
 */
function useColumnParts() {
  const { cards } = useDiscoverCards();
  return {
    continueReading: cards?.continueReading ?? null,
    draft: cards?.draft ?? null,
    mayWrite: cards?.mayWrite ?? false,
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
 * Renders the row, or nothing.
 *
 * @param props.withWriters - true when no story is featured, so the writers' box joins the row
 * @returns the row of cards or null
 */
export function ReadSideColumn({ withWriters }: { withWriters: boolean }) {
  const { continueReading, draft, mayWrite } = useColumnParts();
  const label = useColumnLabel();
  // Nothing at all when no part has anything to show.
  if (continueReading === null && draft === null && !mayWrite && !withWriters) return null;
  return (
    <aside
      aria-label={label}
      className="grid min-w-0 items-start gap-4 min-[900px]:grid-cols-3 min-[900px]:gap-6"
    >
      {continueReading !== null && (
        <div className={cardClasses}>
          <ContinueCard item={continueReading} />
        </div>
      )}
      {draft !== null && (
        <div className={cardClasses}>
          <DraftCard draft={draft} />
        </div>
      )}
      {mayWrite && (
        <div className={cardClasses}>
          <NewStoryCard />
        </div>
      )}
      {withWriters && <ReadWritersBox />}
    </aside>
  );
}
