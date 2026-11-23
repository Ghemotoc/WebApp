/**
 * FamilyTreeDrawing: the drawn family tree, its cards and the scrolling box around it (story
 * S1-E17-16; CALM-9, board E26; moved out of FamilyTreeView to keep that file short).
 *
 * - Cards are 200 × 58: the name, and under it the character in a line (their summary) or their
 *   role. Each card is a real link to the character's sheet. The tree's chosen character ("Whose
 *   tree") has a ring in the thread colour.
 * - On a tablet or phone the tree scrolls sideways inside its box and opens scrolled to the
 *   chosen character (or to the middle), with the line "Swipe sideways to see the whole tree."
 *   shown only while the tree is wider than its box.
 * Who uses it: FamilyTreeView. What it calls: lib/familyTreeLayout.ts, FamilyTreeLines and
 * MaybeLink.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';

import type { StoryCast } from '../api/characters';
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
  /** "Whose tree": the character in focus, or null for every family. */
  rootId: string | null;
}

/** The short line under a card's name: the character's summary, or their role. */
function useCardLine(cast: StoryCast) {
  const { t } = useAtlasTranslation();
  return (characterId: string): string => {
    const character = cast.characters.find((candidate) => candidate.id === characterId);
    if (character === undefined) return '';
    const summary = character.sheet.summary?.trim() ?? '';
    return summary === '' ? t(`characters.role.${character.role}`) : summary;
  };
}

/** The cards, each a link to the character's sheet. */
function TreeCards({
  addressOf,
  cast,
  layout,
  words,
  rootId,
}: Omit<FamilyTreeDrawingProps, 'tree'> & { layout: TreeLayout }) {
  const lineOf = useCardLine(cast);
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
            className={`flex size-full min-w-0 flex-col justify-center rounded-[14px] bg-paper px-3.5 py-2 no-underline hover:bg-tint ${box.id === rootId ? 'shadow-[inset_0_0_0_2px_var(--thread)]' : 'shadow-[inset_0_0_0_1px_var(--border)]'}`}
          >
            {/* Long words stay inside the card: one line each, cut with an ellipsis. The link
                still reads the whole name and line. */}
            <span className="truncate type-body font-semibold text-ink-heading">{words.nameOf(box.id)}</span>
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
  rootId: string | null,
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

/**
 * Renders the tree in its scrolling box, with the swipe line when it is wider than the box.
 *
 * @returns the drawing and, on a narrow screen, the swipe line
 */
export function FamilyTreeDrawing({ tree, rootId, ...cardProps }: FamilyTreeDrawingProps) {
  const { t } = useAtlasTranslation();
  const layout = layoutFamilyTree(tree);
  const regionRef = useRef<HTMLDivElement>(null);
  const isWider = useScrollToChosen(regionRef, layout, rootId);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        ref={regionRef}
        role="region"
        aria-label={t('connections.tree.region')}
        tabIndex={0}
        className="max-w-full overflow-x-auto rounded-card border border-hairline"
        data-testid="atlas-family-tree"
      >
        <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
          <TreeLines layout={layout} />
          <TreeCards {...cardProps} layout={layout} rootId={rootId} />
        </div>
      </div>
      {isWider && <p className="m-0 type-body text-ink-muted">{t('connections.tree.swipe')}</p>}
    </div>
  );
}
