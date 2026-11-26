/**
 * FamilyTreeDrawing: the drawn family tree, its cards and the scrolling box around it (story
 * S1-E17-16; user stories bundle 6, story 6.7, board E26).
 *
 * - Cards are 200 × 58: the name, and under it "b. 1948 · ex-miner" (useCardMeta). Each card is a
 *   real link to the character's sheet. The tree's chosen character ("Whose tree") has a 2 px ring
 *   in the thread colour.
 * - The tree sits in a tinted box (32 px above and below, 16 px at the sides). On a tablet or
 *   phone it scrolls sideways inside that box and opens scrolled to the chosen character, with
 *   the line "Swipe sideways to see the whole tree." shown once: while the tree is wider than its
 *   box, on the first visit that needs it (story 6.7: "On narrow screens a swipe hint shows once").
 * Who uses it: FamilyTreeView. What it calls: lib/familyTreeLayout.ts, useCardMeta,
 * FamilyTreeLines and MaybeLink.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';

import type { StoryCast } from '../api/characters';
import { useCardMeta } from '../hooks/useCardMeta';
import type { RelationshipWords } from '../hooks/useRelationshipWords';
import type { FamilyTree } from '../lib/familyTree';
import { boxHeight, boxWidth, layoutFamilyTree, type TreeLayout } from '../lib/familyTreeLayout';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { TreeLines } from './FamilyTreeLines';
import { MaybeLink } from './MaybeLink';

/** What the drawing needs. */
export interface FamilyTreeDrawingProps {
  /** Where a character's card opens: their sheet, a reader page, or null for no link. */
  addressOf: (characterId: string) => string | null;
  cast: StoryCast;
  tree: FamilyTree;
  words: RelationshipWords;
  /** "Whose tree": the character in focus. */
  rootId: string;
}

/** The cards, each a link to the character's sheet. */
function TreeCards({
  addressOf,
  cast,
  layout,
  words,
  rootId,
}: Omit<FamilyTreeDrawingProps, 'tree'> & { layout: TreeLayout }) {
  const metaOf = useCardMeta(false);
  /** The line under a card's name, or nothing for a character no longer in the cast. */
  const lineOf = (characterId: string) => {
    const character = cast.characters.find((candidate) => candidate.id === characterId);
    return character === undefined ? '' : metaOf(character);
  };
  return (
    <ul className="m-0 list-none p-0">
      {layout.boxes.map((box) => (
        <li
          key={box.id}
          className="absolute"
          style={{ left: box.x, top: box.y, width: boxWidth, height: boxHeight }}
        >
          {/* The chosen character's card has a 2 px ring in the thread colour (board E26). */}
          <MaybeLink
            to={addressOf(box.id)}
            className={`flex size-full min-w-0 flex-col justify-center rounded-field bg-paper px-4 py-2 no-underline hover:bg-tint ${box.id === rootId ? 'ring-2 ring-thread ring-inset' : 'ring-1 ring-hairline ring-inset'}`}
          >
            {/* Long words stay inside the card: one line each, cut with an ellipsis. The link
                still reads the whole name and line. */}
            <span className="truncate type-label font-semibold text-ink-heading">
              {words.nameOf(box.id)}
            </span>
            <span className="truncate type-meta text-ink-muted">{lineOf(box.id)}</span>
          </MaybeLink>
        </li>
      ))}
    </ul>
  );
}

/**
 * Scrolls the box to the chosen character (or the middle of the tree) whenever the tree or the
 * choice changes, and says whether the tree is wider than its box.
 *
 * @returns true while the tree needs sideways scrolling
 */
function useScrollToChosen(
  regionRef: RefObject<HTMLDivElement | null>,
  layout: TreeLayout,
  rootId: string,
): boolean {
  const [isWider, setIsWider] = useState(false);
  const chosen = layout.boxes.find((box) => box.id === rootId);
  const target = chosen === undefined ? layout.width / 2 : chosen.x + boxWidth / 2;
  useEffect(() => {
    const region = regionRef.current;
    if (region === null) return undefined;
    // Step 1: centre the target in the box (the browser clamps at either end).
    region.scrollLeft = target - region.clientWidth / 2;
    // Step 2: keep "Swipe sideways" in step with the box's width as the window changes.
    const measure = () => setIsWider(region.scrollWidth > region.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(region);
    return () => observer.disconnect();
  }, [regionRef, target, layout.width]);
  return isWider;
}

/** Where the browser remembers that the swipe line was shown (story 6.7: it shows once). */
const swipeSeenKey = 'atlas-tree-swipe-seen';

/** Whether this browser has shown the swipe line before; false when storage is off. */
function hasSeenSwipe(): boolean {
  try {
    return window.localStorage.getItem(swipeSeenKey) !== null;
  } catch {
    return false;
  }
}

/**
 * Shows the swipe line on the first visit whose tree is wider than its box, and remembers it, so
 * later visits leave it out (story 6.7). Within that visit it stays while the tree is wider.
 *
 * @returns true while the swipe line shows
 */
function useSwipeOnce(isWider: boolean): boolean {
  // Read once per visit: a line shown now stays until the page is left.
  const [hadSeen] = useState(hasSeenSwipe);
  const isShown = isWider && !hadSeen;
  useEffect(() => {
    if (!isShown) return;
    try {
      window.localStorage.setItem(swipeSeenKey, '1');
    } catch {
      // Storage is off: the line shows again next time, which does no harm.
    }
  }, [isShown]);
  return isShown;
}

/**
 * Renders the tree in its scrolling box, with the swipe line once when it is wider than the box.
 *
 * @returns the drawing and, on a narrow screen, the swipe line
 */
export function FamilyTreeDrawing({ tree, rootId, ...cardProps }: FamilyTreeDrawingProps) {
  const { t } = useAtlasTranslation();
  const layout = layoutFamilyTree(tree);
  const regionRef = useRef<HTMLDivElement>(null);
  const isWider = useScrollToChosen(regionRef, layout, rootId);
  const showsSwipe = useSwipeOnce(isWider);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        ref={regionRef}
        role="region"
        aria-label={t('connections.tree.region')}
        tabIndex={0}
        className="max-w-full overflow-x-auto rounded-card bg-surface-solid py-4"
        data-testid="atlas-family-tree"
      >
        <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
          <TreeLines layout={layout} />
          <TreeCards {...cardProps} layout={layout} rootId={rootId} />
        </div>
      </div>
      {showsSwipe && <p className="m-0 type-meta text-ink-muted">{t('connections.tree.swipe')}</p>}
    </div>
  );
}
