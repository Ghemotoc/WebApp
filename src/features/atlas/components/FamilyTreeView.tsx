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
 * Who uses it: ConnectionsPage.
 */
import { useState } from 'react';

import { Chip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Select';

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

/** How each kind of family line is drawn (G10b2, board AtlasFamilyTree's legend). */
const treeLines = {
  sibling: '7 5',
  cousin: '1 6',
} as const;

/** The tree's lines: parent solid (maker dotted in the lineage colour), partner double,
 * sibling dashed, cousin dotted. */
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
      {/* A double line: a wide stroke with a thin gap of the card's colour along its middle. */}
      {layout.partnerPaths.map(({ key, path }) => (
        <g key={key}>
          <path d={path} fill="none" stroke={family.colour} strokeWidth={7} />
          <path d={path} fill="none" stroke="var(--surface)" strokeWidth={2.5} />
        </g>
      ))}
      {layout.siblingPaths.map(({ key, path }) => (
        <path
          key={key}
          d={path}
          fill="none"
          stroke={family.colour}
          strokeWidth={2.5}
          strokeDasharray={treeLines.sibling}
        />
      ))}
      {layout.cousinPaths.map(({ key, path }) => (
        <path
          key={key}
          d={path}
          fill="none"
          stroke={family.colour}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={treeLines.cousin}
        />
      ))}
    </svg>
  );
}

/** One legend entry: a short sample of the line, then its name. */
function LegendLine({
  label,
  dashes,
  isDouble,
}: {
  label: string;
  dashes?: string;
  isDouble?: boolean;
}) {
  const colour = lineStyles.family.colour;
  return (
    <li className="flex items-center gap-2 text-sm text-ink">
      <svg aria-hidden="true" width="32" height="12" viewBox="0 0 32 12" className="shrink-0">
        <line
          x1="2"
          y1="6"
          x2="30"
          y2="6"
          stroke={colour}
          strokeWidth={isDouble ? 7 : 3}
          strokeDasharray={dashes}
          strokeLinecap={dashes === treeLines.cousin ? 'round' : undefined}
        />
        {isDouble && (
          <line x1="2" y1="6" x2="30" y2="6" stroke="var(--surface)" strokeWidth={2.5} />
        )}
      </svg>
      {label}
    </li>
  );
}

/** The legend: parent, sibling, partner and cousin lines. */
function TreeLegend() {
  const { t } = useAtlasTranslation();
  return (
    <ul
      aria-label={t('connections.tree.legend')}
      className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0"
    >
      <LegendLine label={t('connections.tree.lineParent')} />
      <LegendLine label={t('connections.tree.lineSibling')} dashes={treeLines.sibling} />
      <LegendLine label={t('connections.tree.linePartner')} isDouble />
      <LegendLine label={t('connections.tree.lineCousin')} dashes={treeLines.cousin} />
    </ul>
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

/** "Whose tree" and "Include turned or made". */
function TreeControls({
  cast,
  rootId,
  onRoot,
  includeMade,
  onIncludeMade,
}: {
  cast: StoryCast;
  rootId: string;
  onRoot: (rootId: string) => void;
  includeMade: boolean;
  onIncludeMade: (includeMade: boolean) => void;
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

/**
 * Renders the tree with its controls, legend and note.
 *
 * @returns the controls, the scrolling tree, the legend, the note and the screen-reader list
 */
export function FamilyTreeView({ addressOf, cast, words }: FamilyTreeViewProps) {
  const { t } = useAtlasTranslation();
  const [includeMade, setIncludeMade] = useState(false);
  const [rootId, setRootId] = useState('');
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
      />
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
