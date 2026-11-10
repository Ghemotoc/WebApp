/**
 * FamilyTreeView: the family tree on the Connections page (story S1-E17-16; bundle G10 ATLAS,
 * part b2, board AtlasFamilyTree).
 *
 * - Built from the family relationships (lib/familyTree.ts), laid out by
 *   lib/familyTreeLayout.ts: the oldest generation at the top, partners and siblings side by
 *   side, elbow lines from parents to children.
 * - Each kind of line has its own style, so meaning never rests on colour alone: parent solid,
 *   sibling dashed, partner double, cousin dotted. A legend under the tree says which is which.
 * - "Whose tree" shows one character's family, or every family in the story.
 * - "Include turned or made" counts makers as parents too (vampire and maker bloodlines); their
 *   lines are the lineage category's dotted ones, so they differ from birth lines by more than
 *   colour.
 * - Characters with no family link are left off, and a note says how many.
 * - Each box is a real link to the character's sheet. The lines are drawing only; a screen reader
 *   gets the generations as a list instead.
 * - The writer's own tree has "Add to this tree" (bundle GAPS-3): a form that adds a parent,
 *   child, sibling, partner or cousin of the tree's character. Readers' trees don't have it.
 * Who uses it: ConnectionsPage and PublicConnections. What it calls: lib/familyTree.ts,
 * lib/familyTreeLayout.ts, FamilyTreeLines (the lines and their legend) and AddToTreeForm.
 */
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';

import { Chip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Select';

import type { NewRelationship, StoryCast } from '../api/characters';
import type { RelationshipWords } from '../hooks/useRelationshipWords';
import { buildFamilyTree, type FamilyTree } from '../lib/familyTree';
import { boxHeight, boxWidth, layoutFamilyTree, type TreeLayout } from '../lib/familyTreeLayout';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AddToTreeForm } from './AddToTreeForm';
import { TreeLegend, TreeLines } from './FamilyTreeLines';
import { MaybeLink } from './MaybeLink';

/** What the tree needs. */
export interface FamilyTreeViewProps {
  /** Where a character's box opens: their sheet, a reader page, or null for no link. */
  addressOf: (characterId: string) => string | null;
  cast: StoryCast;
  words: RelationshipWords;
  /** Saves a relationship added from the tree; left out on readers' trees (GAPS-3). */
  onAdd?: (relationship: NewRelationship) => Promise<void>;
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
            className="flex size-full items-center justify-center rounded-xl border-2 border-control-border bg-surface px-2 text-center text-sm leading-tight font-semibold text-heading no-underline hover:bg-tint"
          >
            {/* A long name stays inside its box: two lines at most, broken anywhere (GAPS-3
                break test, 10 Nov 2026). The link still reads the whole name. */}
            <span className="line-clamp-2 min-w-0 wrap-anywhere">{words.nameOf(box.id)}</span>
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

/** "Whose tree", "Include turned or made" and, for the writer, "Add to this tree". */
function TreeControls({
  cast,
  rootId,
  onRoot,
  includeMade,
  onIncludeMade,
  action,
}: {
  cast: StoryCast;
  rootId: string;
  onRoot: (rootId: string) => void;
  includeMade: boolean;
  onIncludeMade: (includeMade: boolean) => void;
  /** The "Add to this tree" button, or nothing on a reader's tree. */
  action: ReactNode;
}) {
  const { t } = useAtlasTranslation();
  // Everyone with a family link can be the tree's centre.
  const everyFamily = buildFamilyTree(
    cast.characters.map((character) => character.id),
    cast.relationships,
    includeMade,
  );
  const members = new Set(everyFamily.generations.flat());
  return (
    <div className="flex flex-wrap items-end gap-4">
      <Select
        id="atlas-tree-root"
        label={t('connections.tree.whose')}
        isLabelVisible
        options={[
          { value: '', label: t('connections.tree.everyFamily') },
          ...cast.characters
            .filter((character) => members.has(character.id))
            .map((character) => ({ value: character.id, label: character.name })),
        ]}
        value={rootId}
        onChange={onRoot}
      />
      <Chip isPressed={includeMade} onPressedChange={onIncludeMade}>
        {t('connections.tree.includeMade')}
      </Chip>
      {action}
    </div>
  );
}

/** The scrolling drawing of the tree. */
function TreeDrawing({
  addressOf,
  tree,
  madeKeys,
  words,
}: {
  addressOf: FamilyTreeViewProps['addressOf'];
  tree: FamilyTree;
  madeKeys: Set<string>;
  words: RelationshipWords;
}) {
  const { t } = useAtlasTranslation();
  const layout = layoutFamilyTree(tree);
  return (
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
  );
}

/** "Add to this tree": opens and closes the form under the controls (GAPS-3). */
function AddToTreeButton({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const { t } = useAtlasTranslation();
  return (
    <Button
      type="button"
      variant="secondary"
      aria-expanded={isOpen}
      aria-controls="atlas-tree-add"
      onClick={onToggle}
    >
      {t('connections.tree.add.open')}
    </Button>
  );
}

/**
 * Renders the tree with its controls, legend and note.
 *
 * @returns the controls, the scrolling tree, the legend, the note and the screen-reader list
 */
export function FamilyTreeView({ addressOf, cast, words, onAdd }: FamilyTreeViewProps) {
  const { t } = useAtlasTranslation();
  const [includeMade, setIncludeMade] = useState(false);
  const [rootId, setRootId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const characterIds = cast.characters.map((character) => character.id);
  const tree = buildFamilyTree(characterIds, cast.relationships, includeMade, rootId || null);
  // Which parent lines come from "turned or made", so they are drawn dotted.
  const madeKeys = new Set(
    cast.relationships
      .filter((relationship) => relationship.kind === 'made')
      .map((relationship) => `${relationship.fromId}>${relationship.toId}`),
  );
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="m-0 text-sm text-meta">{t('connections.tree.hint')}</p>
      <TreeControls
        cast={cast}
        rootId={rootId}
        onRoot={setRootId}
        includeMade={includeMade}
        onIncludeMade={setIncludeMade}
        action={
          onAdd !== undefined && (
            <AddToTreeButton isOpen={isAdding} onToggle={() => setIsAdding(!isAdding)} />
          )
        }
      />
      {/* A new form per tree, so it always adds to the tree that shows. */}
      {isAdding && onAdd !== undefined && (
        <AddToTreeForm
          key={rootId}
          cast={cast}
          rootId={rootId}
          words={words}
          onAdd={onAdd}
          onClose={() => setIsAdding(false)}
        />
      )}
      {tree.generations.length === 0 && (
        <p className="m-0 text-body">{t('connections.tree.none')}</p>
      )}
      {tree.generations.length > 0 && (
        <>
          <TreeDrawing addressOf={addressOf} tree={tree} madeKeys={madeKeys} words={words} />
          <TreeLegend />
        </>
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
