/**
 * FamilyTreeView: the family tree on the Relationships page (story S1-E17-16; user stories bundle
 * 6, story 6.7, board E26).
 *
 * - "Whose tree" picks any character; their family is drawn with older generations at the top and
 *   the chosen person ringed. It opens on the protagonist, or the first character with a family.
 * - "Include turned or made" counts makers as parents too (vampires, golems and the like); their
 *   lines are dotted, so they differ from birth lines by their shape.
 * - A real tree with branches (FamilyTreeDrawing): partners side by side, children hanging from
 *   their line, siblings under one dashed "Sibling of" bracket.
 * - Characters with no family link are named under the tree, so nobody silently disappears.
 * - "Add a relationship", the one plum button, opens the same dialog as on a sheet (the writer's
 *   tree only; readers' trees don't have it).
 * - "Generations" repeats the tree in words, for screen readers and small screens.
 * Who uses it: ConnectionsPage and PublicConnections. What it calls: lib/familyTree.ts,
 * FamilyTreeDrawing, FamilyTreeGenerations and AddRelationshipDialog.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ActionIcon } from '@/components/icons/ActionIcon';
import { Select } from '@/components/ui/Select';

import type { NewRelationship, StoryCast } from '../api/characters';
import type { RelationshipWords } from '../hooks/useRelationshipWords';
import { buildFamilyTree, type FamilyTree } from '../lib/familyTree';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AddRelationshipDialog } from './AddRelationshipDialog';
import { FamilyTreeDrawing } from './FamilyTreeDrawing';
import { FamilyTreeGenerations } from './FamilyTreeGenerations';

/** What the tree needs. */
export interface FamilyTreeViewProps {
  /** Where a character's card opens: their sheet, a reader page, or null for no link. */
  addressOf: (characterId: string) => string | null;
  cast: StoryCast;
  words: RelationshipWords;
  /** Saves a relationship added from the tree; left out on readers' trees. */
  onAdd?: (relationship: NewRelationship) => Promise<void>;
}

/**
 * The character the tree opens on: the protagonist, else the first character with a family,
 * else the first character (board E26 opens on Mara, the protagonist).
 *
 * @returns a character's ID, or an empty string for a story with no characters
 */
function firstRootOf(cast: StoryCast, leftOff: string[]): string {
  const protagonist = cast.characters.find((character) => character.role === 'protagonist');
  if (protagonist !== undefined) return protagonist.id;
  const withFamily = cast.characters.find((character) => !leftOff.includes(character.id));
  return withFamily?.id ?? cast.characters[0]?.id ?? '';
}

/** "Whose tree" and "Include turned or made", on one line (board E26). */
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
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      {/* Any character can have a tree (story 6.7), so every character is a choice. */}
      <Select
        id="atlas-tree-root"
        label={t('connections.tree.whose')}
        isLabelVisible
        isLabelStrong
        options={cast.characters.map((character) => ({
          value: character.id,
          label: character.name,
        }))}
        value={rootId}
        onChange={onRoot}
      />
      <label className="inline-flex min-h-11 items-center gap-2 type-body text-ink">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={includeMade}
          onChange={(changed) => onIncludeMade(changed.target.checked)}
        />
        {t('connections.tree.includeMade')}
      </label>
    </div>
  );
}

/** The tree itself, or the line that says why there is none. */
function TreeOrNone({
  addressOf,
  cast,
  words,
  tree,
  rootId,
}: Omit<FamilyTreeViewProps, 'onAdd'> & { tree: FamilyTree; rootId: string }) {
  const { t } = useAtlasTranslation();
  // Step 1: nobody in the story has a family link yet (story 6.7's empty state).
  if (tree.leftOff.length === cast.characters.length) {
    return <p className="m-0 type-body text-ink-muted">{t('connections.tree.none')}</p>;
  }
  // Step 2: the chosen character has no family link, though others do.
  if (tree.generations.length === 0) {
    return (
      <p className="m-0 type-body text-ink-muted">
        {t('connections.tree.noneFor', { name: words.nameOf(rootId) })}
      </p>
    );
  }
  // Step 3: the tree.
  return (
    <FamilyTreeDrawing
      addressOf={addressOf}
      cast={cast}
      tree={tree}
      words={words}
      rootId={rootId}
    />
  );
}

/** "4 characters with no family links are left off: Teo Stan, Mrs Dobre, …" */
function LeftOffLine({ leftOff, words }: { leftOff: string[]; words: RelationshipWords }) {
  const { t, i18n } = useAtlasTranslation();
  // The names joined the way the language joins a list ("A, B and C"; "A, B și C"). English is
  // British English here, which has no comma before "and" (board E26).
  const listLocale = i18n.language === 'en' ? 'en-GB' : i18n.language;
  const names = new Intl.ListFormat(listLocale, { type: 'conjunction' }).format(
    leftOff.map((id) => words.nameOf(id)),
  );
  return (
    <p className="m-0 type-meta text-ink-muted">
      {t('connections.tree.leftOff', { count: leftOff.length, names })}
    </p>
  );
}

/** "Add a relationship": the tree's one main button and the dialog it opens. */
function AddRelationshipButton({
  cast,
  onAdd,
}: {
  cast: StoryCast;
  onAdd: (relationship: NewRelationship) => Promise<void>;
}) {
  const { t } = useAtlasTranslation();
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <Button className="self-start" onClick={() => setOpen(true)}>
        <ActionIcon name="plus" />
        {t('connections.add.heading')}
      </Button>
      <AddRelationshipDialog
        isOpen={isOpen}
        onClose={() => setOpen(false)}
        cast={cast}
        idPrefix="atlas-tree-relationship"
        onAdd={onAdd}
      />
    </>
  );
}

/**
 * Renders the tree with its controls, key line, names left off, button and generations.
 *
 * @returns the whole Family tree view
 */
export function FamilyTreeView({ addressOf, cast, words, onAdd }: FamilyTreeViewProps) {
  const { t } = useAtlasTranslation();
  const [includeMade, setIncludeMade] = useState(false);
  const characterIds = cast.characters.map((character) => character.id);
  // Step 1: who is left off decides where the tree opens, so build the whole story's tree first.
  const everyFamily = buildFamilyTree(characterIds, cast.relationships, includeMade);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const rootId = chosenId ?? firstRootOf(cast, everyFamily.leftOff);
  // Step 2: the chosen character's family.
  const tree = buildFamilyTree(characterIds, cast.relationships, includeMade, rootId || null);
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div className="flex min-w-0 flex-col gap-3">
        <TreeControls
          cast={cast}
          rootId={rootId}
          onRoot={setChosenId}
          includeMade={includeMade}
          onIncludeMade={setIncludeMade}
        />
        <p className="m-0 max-w-none type-meta text-ink-muted">{t('connections.tree.hint')}</p>
        <TreeOrNone addressOf={addressOf} cast={cast} words={words} tree={tree} rootId={rootId} />
        {tree.leftOff.length > 0 && tree.leftOff.length < cast.characters.length && (
          <LeftOffLine leftOff={tree.leftOff} words={words} />
        )}
        {onAdd !== undefined && cast.characters.length > 1 && (
          <AddRelationshipButton cast={cast} onAdd={onAdd} />
        )}
      </div>
      {tree.generations.length > 0 && <FamilyTreeGenerations tree={tree} words={words} />}
    </div>
  );
}
