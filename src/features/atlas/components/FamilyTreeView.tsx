/**
 * FamilyTreeView: the family tree on the Connections page (story S1-E17-16).
 *
 * - Built from "Parent of" and "Partner or spouse of" (lib/familyTree.ts), laid out by
 *   lib/familyTreeLayout.ts: the oldest generation at the top, partners side by side, elbow lines
 *   from parents to children.
 * - "Include turned or made" counts makers as parents too (vampire and maker bloodlines); their
 *   lines are the lineage category's dotted ones, so they differ from birth lines by more than
 *   colour.
 * - Characters with no family link are left off, and a note says how many.
 * - Each box is a real link to the character's sheet. The lines are drawing only; a screen reader
 *   gets the generations as a list instead.
 * Who uses it: ConnectionsPage.
 */
import { useState } from 'react';

import { Chip } from '@/components/ui/Chip';

import type { StoryCast } from '../api/characters';
import type { RelationshipWords } from '../hooks/useRelationshipWords';
import { buildFamilyTree, type FamilyTree } from '../lib/familyTree';
import { boxHeight, boxWidth, layoutFamilyTree, type TreeLayout } from '../lib/familyTreeLayout';
import { lineStyles } from '../lib/relationshipCategories';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { MaybeLink } from './MaybeLink';

/** What the tree needs. */
export interface FamilyTreeViewProps {
  /** Where a character's box opens: their sheet, a reader page, or null for no link. */
  addressOf: (characterId: string) => string | null;
  cast: StoryCast;
  words: RelationshipWords;
}

/** The tree's lines: birth and partner lines solid, maker lines dotted. */
function TreeLines({ layout, madeKeys }: { layout: TreeLayout; madeKeys: Set<string> }) {
  const family = lineStyles.family;
  const lineage = lineStyles.lineage;
  return (
    <svg
      aria-hidden="true"
      width={layout.width}
      height={layout.height}
      className="pointer-events-none absolute inset-0"
    >
      {layout.parentPaths.map(({ key, path }) => {
        const style = madeKeys.has(key) ? lineage : family;
        return (
          <path
            key={key}
            d={path}
            fill="none"
            stroke={style.colour}
            strokeWidth={style.width}
            strokeDasharray={style.dashes}
          />
        );
      })}
      {layout.partnerPaths.map(({ key, path }) => (
        <path key={key} d={path} fill="none" stroke={family.colour} strokeWidth={4} />
      ))}
    </svg>
  );
}

/** The boxes, each a link to the character's sheet. */
function TreeBoxes({
  addressOf,
  layout,
  words,
}: {
  addressOf: FamilyTreeViewProps['addressOf'];
  layout: TreeLayout;
  words: RelationshipWords;
}) {
  return (
    <ul className="m-0 list-none p-0">
      {layout.boxes.map((box) => (
        <li
          key={box.id}
          className="absolute"
          style={{ left: box.x, top: box.y, width: boxWidth, height: boxHeight }}
        >
          <MaybeLink
            to={addressOf(box.id)}
            className="flex size-full items-center justify-center rounded-xl border-2 border-control-border bg-surface px-2 text-center text-sm font-semibold break-words text-heading no-underline hover:bg-tint"
          >
            {words.nameOf(box.id)}
          </MaybeLink>
        </li>
      ))}
    </ul>
  );
}

/** The generations written out, for screen readers. */
function GenerationsList({ tree, words }: { tree: FamilyTree; words: RelationshipWords }) {
  const { t } = useAtlasTranslation();
  return (
    <ol aria-label={t('connections.tree.generationsLabel')} className="sr-only">
      {tree.generations.map((row, index) => (
        <li key={row.join('|')}>
          {t('connections.tree.generation', {
            number: index + 1,
            names: row.map((id) => words.nameOf(id)).join(', '),
          })}
        </li>
      ))}
    </ol>
  );
}

/**
 * Renders the tree with its switch and note.
 *
 * @returns the switch, the scrolling tree, the note and the screen-reader list
 */
export function FamilyTreeView({ addressOf, cast, words }: FamilyTreeViewProps) {
  const { t } = useAtlasTranslation();
  const [includeMade, setIncludeMade] = useState(false);
  const characterIds = cast.characters.map((character) => character.id);
  const tree = buildFamilyTree(characterIds, cast.relationships, includeMade);
  const layout = layoutFamilyTree(tree);
  // Which parent lines come from "turned or made", so they are drawn dotted.
  const madeKeys = new Set(
    cast.relationships
      .filter((relationship) => relationship.kind === 'made')
      .map((relationship) => `${relationship.fromId}>${relationship.toId}`),
  );
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <Chip isPressed={includeMade} onPressedChange={setIncludeMade}>
          {t('connections.tree.includeMade')}
        </Chip>
      </div>
      {tree.generations.length === 0 && (
        <p className="m-0 text-body">{t('connections.tree.none')}</p>
      )}
      {tree.generations.length > 0 && (
        <div
          role="region"
          aria-label={t('connections.tree.region')}
          tabIndex={0}
          className="max-w-full overflow-x-auto rounded-card border border-hairline"
          data-testid="atlas-family-tree"
        >
          <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
            <TreeLines layout={layout} madeKeys={madeKeys} />
            <TreeBoxes addressOf={addressOf} layout={layout} words={words} />
          </div>
        </div>
      )}
      {tree.leftOffCount > 0 && (
        <p className="m-0 text-sm text-meta">
          {t('connections.tree.leftOff', { count: tree.leftOffCount })}
        </p>
      )}
      <GenerationsList tree={tree} words={words} />
    </div>
  );
}
