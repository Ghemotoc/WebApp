/**
 * FamilyTreeView: the family tree on the Connections page (story S1-E17-16; bundle G10 ATLAS,
 * part b2, board AtlasFamilyTree).
 *
 * - Built from the family relationships (lib/familyTree.ts) and drawn as a real tree (CALM-9,
 *   board E26; FamilyTreeDrawing): partners side by side joined by a line, children hanging from
 *   the middle of it, brothers and sisters under one dashed bracket. The key line above the tree
 *   says so in words.
 * - "Whose tree" shows one character's family, or every family in the story; the chosen
 *   character's card is ringed and, on a narrow screen, scrolled into view.
 * - "Include turned or made" counts makers as parents too (vampire and maker bloodlines); their
 *   lines are dotted, so they differ from birth lines by their shape.
 * - Characters with no family link are left off, and a note says how many.
 * - Each box is a real link to the character's sheet. The lines are drawing only; a screen reader
 *   gets the generations as a list instead.
 * - The writer's own tree has "Add to this tree" (bundle GAPS-3): a form that adds a parent,
 *   child, sibling, partner or cousin of the tree's character. Readers' trees don't have it.
 * Who uses it: ConnectionsPage and PublicConnections. What it calls: lib/familyTree.ts,
 * FamilyTreeDrawing (the cards and lines) and AddToTreeForm.
 */
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';

import { Chip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Select';

import type { NewRelationship, StoryCast } from '../api/characters';
import type { RelationshipWords } from '../hooks/useRelationshipWords';
import { buildFamilyTree, type FamilyTree } from '../lib/familyTree';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AddToTreeForm } from './AddToTreeForm';
import { FamilyTreeDrawing } from './FamilyTreeDrawing';

/** What the tree needs. */
export interface FamilyTreeViewProps {
  /** Where a character's box opens: their sheet, a reader page, or null for no link. */
  addressOf: (characterId: string) => string | null;
  cast: StoryCast;
  words: RelationshipWords;
  /** Saves a relationship added from the tree; left out on readers' trees (GAPS-3). */
  onAdd?: (relationship: NewRelationship) => Promise<void>;
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
 * Renders the tree with its controls, key and note.
 *
 * @returns the controls, the key, the scrolling tree, the note and the screen-reader list
 */
export function FamilyTreeView({ addressOf, cast, words, onAdd }: FamilyTreeViewProps) {
  const { t } = useAtlasTranslation();
  const [includeMade, setIncludeMade] = useState(false);
  const [rootId, setRootId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const characterIds = cast.characters.map((character) => character.id);
  const tree = buildFamilyTree(characterIds, cast.relationships, includeMade, rootId || null);
  return (
    <div className="flex min-w-0 flex-col gap-4">
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
      {/* The key, in words, between the controls and the tree (board E26). */}
      <p className="m-0 type-body text-ink-muted">{t('connections.tree.hint')}</p>
      {tree.generations.length === 0 && (
        <p className="m-0 text-ink-muted">{t('connections.tree.none')}</p>
      )}
      {tree.generations.length > 0 && (
        <FamilyTreeDrawing
          addressOf={addressOf}
          cast={cast}
          tree={tree}
          words={words}
          rootId={rootId || null}
        />
      )}
      {tree.leftOffCount > 0 && (
        <p className="m-0 type-body text-ink-muted">
          {t('connections.tree.leftOff', { count: tree.leftOffCount })}
        </p>
      )}
      <GenerationsList tree={tree} words={words} />
    </div>
  );
}
