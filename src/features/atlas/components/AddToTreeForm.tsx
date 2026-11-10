/**
 * AddToTreeForm: "Add to this tree" on the family tree (bundle GAPS-3, board AtlasFamilyTree:
 * "Add to Mara's tree" with Character, "How they're related to Mara", Which cousin and Removed).
 *
 * The writer picks a character and how they are related to the tree's own character, in family
 * words (parent, child, sibling, partner, cousin); lib/treeAdditions.ts turns that into the
 * relationship, the right way round. When the tree shows every family, the form first asks who
 * the character is related to. A clash with a relationship already there opens the same warning
 * as "Add a relationship": advice, never a block. The tree redraws once the relationship is
 * saved. A relationship is saved once: a double click on Add saves once, and one that is already
 * there is refused in plain words (break test, 10 Nov 2026). Who uses it: FamilyTreeView. What
 * it calls: useRelationshipAdd (which calls the onAdd prop, useRelationshipChangers' relate),
 * findClash and useRelationshipWords for the warning.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';

import type { CharacterRelationship, NewRelationship, StoryCast } from '../api/characters';
import { toneOf, useRelationshipAdd } from '../hooks/useRelationshipAdd';
import type { RelationshipWords } from '../hooks/useRelationshipWords';
import { findClash } from '../lib/relationshipClash';
import {
  relationshipForTree,
  treeRelations,
  type TreeAddition,
  type TreeRelation,
} from '../lib/treeAdditions';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CousinPickers } from './CousinPickers';
import { RelationshipClashPanel } from './RelationshipClashPanel';

/** What the form needs. */
export interface AddToTreeFormProps {
  cast: StoryCast;
  /** "Whose tree": the character whose tree it is, or '' when every family shows. */
  rootId: string;
  words: RelationshipWords;
  /** Saves the relationship; throws when it can't. */
  onAdd: (relationship: NewRelationship) => Promise<void>;
  /** Closes the form. */
  onClose: () => void;
}

/** The field ids' shared start. */
const idPrefix = 'atlas-tree-add';

/** "Pick a character", then every character except the one to leave out. */
function characterOptions(cast: StoryCast, leaveOutId: string, pickLabel: string) {
  return [
    { value: '', label: pickLabel },
    ...cast.characters
      .filter((character) => character.id !== leaveOutId)
      .map((character) => ({ value: character.id, label: character.name })),
  ];
}

/** What the pickers need. */
interface TreePickersProps {
  cast: StoryCast;
  draft: TreeAddition;
  /** True when the tree shows every family, so the form asks whose relative this is. */
  isAnchorPicked: boolean;
  anchorName: string;
  change: (part: Partial<TreeAddition>) => void;
}

/** "Related to" (every family only), the character, how they are related and which cousin. */
function TreePickers({ cast, draft, isAnchorPicked, anchorName, change }: TreePickersProps) {
  const { t } = useAtlasTranslation();
  const pickLabel = t('connections.add.pickCharacter');
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {isAnchorPicked && (
          <Select
            id={`${idPrefix}-anchor`}
            label={t('connections.tree.add.relatedTo')}
            isLabelVisible
            options={characterOptions(cast, draft.otherId, pickLabel)}
            value={draft.anchorId}
            onChange={(anchorId) => change({ anchorId })}
          />
        )}
        <Select
          id={`${idPrefix}-character`}
          label={t('connections.tree.add.character')}
          isLabelVisible
          options={characterOptions(cast, draft.anchorId, pickLabel)}
          value={draft.otherId}
          onChange={(otherId) => change({ otherId })}
        />
        <Select
          id={`${idPrefix}-relation`}
          label={
            anchorName === ''
              ? t('connections.tree.add.howAny')
              : t('connections.tree.add.how', { name: anchorName })
          }
          isLabelVisible
          options={treeRelations.map((value) => ({
            value,
            label: t(`connections.tree.add.relations.${value}`),
          }))}
          value={draft.relation}
          onChange={(relation) => change({ relation: relation as TreeRelation })}
        />
      </div>
      {draft.relation === 'cousin' && (
        <CousinPickers
          idPrefix={idPrefix}
          degree={draft.cousinDegree}
          removed={draft.cousinRemoved}
          change={(part) =>
            change({
              cousinDegree: part.cousinDegree ?? draft.cousinDegree,
              cousinRemoved: part.cousinRemoved ?? draft.cousinRemoved,
            })
          }
        />
      )}
    </>
  );
}

/** The form's state: what is picked, the message and the clash being shown. */
function useTreeDraft(rootId: string) {
  const freshDraft: TreeAddition = {
    anchorId: rootId,
    otherId: '',
    relation: 'parent',
    cousinDegree: 1,
    cousinRemoved: 0,
    note: '',
  };
  const [draft, setDraft] = useState(freshDraft);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [clash, setClash] = useState<CharacterRelationship | null>(null);
  /** Changes one part of the draft; a change to the pickers closes the warning. */
  const change = (part: Partial<TreeAddition>) => {
    setDraft({ ...draft, ...part });
    if (!('note' in part)) setClash(null);
  };
  /** After a save: the same tree, ready for the next character. */
  const reset = () => {
    setDraft({ ...freshDraft, anchorId: draft.anchorId });
    setClash(null);
  };
  return { draft, change, reset, message, setMessage, clash, setClash };
}

/** Cancel and Add, or, on a clash, the warning with its note, Go back and Save anyway. */
function TreeFormActions({
  clash,
  draft,
  words,
  isBusy,
  change,
  onBack,
  onSave,
  onClose,
}: {
  clash: CharacterRelationship | null;
  /** True while a save is on its way: Add waits. */
  isBusy: boolean;
  draft: TreeAddition;
  words: RelationshipWords;
  change: (part: Partial<TreeAddition>) => void;
  onBack: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { t } = useAtlasTranslation();
  if (clash !== null) {
    return (
      <RelationshipClashPanel
        idPrefix={idPrefix}
        existing={words.sentence(clash)}
        proposed={words.sentence({ ...relationshipForTree(draft), id: '' })}
        note={draft.note}
        onNote={(note) => change({ note })}
        onBack={onBack}
        onSave={onSave}
      />
    );
  }
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="secondary" onClick={onClose}>
        {t('connections.tree.add.cancel')}
      </Button>
      <Button type="submit" variant="secondary" disabled={isBusy}>
        {t('connections.tree.add.button')}
      </Button>
    </div>
  );
}

/**
 * Renders the form.
 *
 * @returns the heading, the pickers, Cancel and Add and, on a clash, the warning
 */
export function AddToTreeForm({ cast, rootId, words, onAdd, onClose }: AddToTreeFormProps) {
  const { t } = useAtlasTranslation();
  const { draft, change, reset, message, setMessage, clash, setClash } = useTreeDraft(rootId);
  const { isBusy, addOnce } = useRelationshipAdd(cast.relationships, onAdd);
  const anchorName = words.nameOf(draft.anchorId);

  /** Saves the relationship once and readies the form for the next one, or says why not. */
  async function save() {
    const outcome = await addOnce(relationshipForTree(draft));
    // Another save is still running (a double click): this one did nothing.
    if (outcome === 'busy') return;
    if (outcome === 'added') reset();
    setMessage({ tone: toneOf(outcome), text: t(`connections.add.${outcome}`) });
  }

  /** Add: both characters are needed; a clash opens the warning first. */
  async function add() {
    setMessage(null);
    if (draft.anchorId === '' || draft.otherId === '') {
      return setMessage({ tone: 'error', text: t('connections.add.pickBoth') });
    }
    const found = findClash(cast.relationships, relationshipForTree(draft));
    if (found !== null) return setClash(found);
    await save();
  }

  return (
    <form
      id="atlas-tree-add"
      aria-labelledby="atlas-tree-add-heading"
      className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface px-5 py-5 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        void add();
      }}
    >
      <h3 id="atlas-tree-add-heading" className="m-0 font-heading text-lg font-bold text-heading">
        {anchorName === ''
          ? t('connections.tree.add.headingAny')
          : t('connections.tree.add.heading', { name: anchorName })}
      </h3>
      <TreePickers
        cast={cast}
        draft={draft}
        isAnchorPicked={rootId === ''}
        anchorName={anchorName}
        change={change}
      />
      <TreeFormActions
        clash={clash}
        draft={draft}
        words={words}
        isBusy={isBusy}
        change={change}
        onBack={() => setClash(null)}
        onSave={() => void save()}
        onClose={onClose}
      />
      <div aria-live="polite">
        {message !== null && <Notice tone={message.tone}>{message.text}</Notice>}
      </div>
    </form>
  );
}
