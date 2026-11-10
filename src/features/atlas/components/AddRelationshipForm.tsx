/**
 * AddRelationshipForm: "Add a relationship" on a character sheet and on the Connections page
 * (story S1-E17-14: "when I pick another character, a relationship type and an optional note,
 * then the relationship is saved"; bundle G10 ATLAS, part b, handoff A4 and A5).
 *
 * On a sheet the first character is the sheet's own, so only the other one is picked; on the
 * Connections page both are. The writer picks a kind (Family, Love, Allies, Conflict or Other),
 * then the relationship, then the other character. A cousin also says which cousin; "Other"
 * asks for the writer's own words both ways. When the new relationship clashes with one already
 * there, a warning explains it and offers a note on how both are true, with Go back and Save
 * anyway: it is advice, never a block. A relationship is saved once: a double click saves once,
 * and one that is already there is refused in plain words (GAPS-3 break test, 10 Nov 2026). Who
 * uses it: CharacterRelationshipsSection and ConnectionsPage. What it calls: useRelationshipAdd
 * (which calls the onAdd prop, useRelationshipChangers' relate), findClash and
 * useRelationshipWords for the warning's sentences.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

import type { CharacterRelationship, NewRelationship, StoryCast } from '../api/characters';
import { toneOf, useRelationshipAdd } from '../hooks/useRelationshipAdd';
import { useRelationshipWords } from '../hooks/useRelationshipWords';
import { findClash } from '../lib/relationshipClash';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CousinPickers } from './CousinPickers';
import { RelationshipClashPanel } from './RelationshipClashPanel';
import { RelationshipKindPickers } from './RelationshipKindPickers';
import { RelationshipOwnWords } from './RelationshipOwnWords';

/** What the form needs. */
export interface AddRelationshipFormProps {
  /** Makes the field ids unique when two forms could share a page. */
  idPrefix: string;
  cast: StoryCast;
  /** The sheet's character; left out on the Connections page, where both are picked. */
  fixedFromId?: string;
  /** The two characters to start with, when a card was dropped on another on the map (G10b2). */
  initialPair?: { fromId: string; toId: string };
  /** Saves the relationship; throws when it can't. */
  onAdd: (relationship: NewRelationship) => Promise<void>;
}

/** A blank form: a first cousin, not removed, is ready in case the writer picks "Cousin of". */
const emptyDraft: NewRelationship = {
  fromId: '',
  toId: '',
  kind: 'parent_of',
  customLabel: '',
  reverseLabel: '',
  cousinDegree: 1,
  cousinRemoved: 0,
  note: '',
};

/**
 * What is missing before the draft can be saved, as a text key, or null when it is ready.
 *
 * @param draft - what the writer has filled in so far
 */
function missingPart(draft: NewRelationship): string | null {
  if (draft.fromId === '' || draft.toId === '') return 'connections.add.pickBoth';
  if (draft.kind === 'custom' && draft.customLabel.trim() === '') {
    return 'connections.add.labelRequired';
  }
  return null;
}

/** The "Pick a character" option, then every character except the one to leave out. */
function characterOptions(cast: StoryCast, leaveOutId: string, pickLabel: string) {
  return [
    { value: '', label: pickLabel },
    ...cast.characters
      .filter((character) => character.id !== leaveOutId)
      .map((character) => ({ value: character.id, label: character.name })),
  ];
}

/** The draft as a relationship, so the warning can put it into words. */
function asRelationship(draft: NewRelationship): CharacterRelationship {
  return { ...draft, id: '' };
}

/** What the pickers need. */
interface RelationshipPickersProps {
  idPrefix: string;
  cast: StoryCast;
  draft: NewRelationship;
  /** False on a sheet, where the first character is the sheet's own. */
  isFromPicked: boolean;
  change: (part: Partial<NewRelationship>) => void;
}

/** The first character (Connections page only), the kind, the relationship and the other one. */
function RelationshipPickers({
  idPrefix,
  cast,
  draft,
  isFromPicked,
  change,
}: RelationshipPickersProps) {
  const { t } = useAtlasTranslation();
  const pickLabel = t('connections.add.pickCharacter');
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      {isFromPicked && (
        <Select
          id={`${idPrefix}-from`}
          label={t('connections.add.from')}
          isLabelVisible
          options={characterOptions(cast, draft.toId, pickLabel)}
          value={draft.fromId}
          onChange={(fromId) => change({ fromId })}
        />
      )}
      <RelationshipKindPickers idPrefix={idPrefix} kind={draft.kind} change={change} />
      <Select
        id={`${idPrefix}-to`}
        label={t('connections.add.to')}
        isLabelVisible
        options={characterOptions(cast, draft.fromId, pickLabel)}
        value={draft.toId}
        onChange={(toId) => change({ toId })}
      />
    </div>
  );
}

/** What the type's own fields need. */
interface KindDetailsProps {
  idPrefix: string;
  cast: StoryCast;
  draft: NewRelationship;
  change: (part: Partial<NewRelationship>) => void;
}

/** A cousin's degree, or "Other"'s own words; nothing for the other types. */
function KindDetails({ idPrefix, cast, draft, change }: KindDetailsProps) {
  const { t } = useAtlasTranslation();
  const words = useRelationshipWords(cast);
  if (draft.kind === 'cousin_of') {
    return (
      <CousinPickers
        idPrefix={idPrefix}
        degree={draft.cousinDegree}
        removed={draft.cousinRemoved}
        change={change}
      />
    );
  }
  if (draft.kind !== 'custom') return null;
  // A name reads better than "the first character", once one is picked.
  const fromName = words.nameOf(draft.fromId) || t('connections.add.firstStandIn');
  const toName = words.nameOf(draft.toId) || t('connections.add.secondStandIn');
  return (
    <RelationshipOwnWords
      idPrefix={idPrefix}
      fromName={fromName}
      toName={toName}
      customLabel={draft.customLabel}
      reverseLabel={draft.reverseLabel}
      change={change}
    />
  );
}

/** What the form's lower part needs. */
interface NoteOrClashProps extends KindDetailsProps {
  clash: CharacterRelationship | null;
  /** True while a save is on its way: Add relationship waits. */
  isBusy: boolean;
  onBack: () => void;
  onSave: () => void;
}

/** The note and Add relationship, or, on a clash, the warning with its own note and buttons. */
function NoteOrClash(props: NoteOrClashProps) {
  const { idPrefix, cast, draft, clash, isBusy, change, onBack, onSave } = props;
  const { t } = useAtlasTranslation();
  const words = useRelationshipWords(cast);
  if (clash !== null) {
    return (
      <RelationshipClashPanel
        idPrefix={idPrefix}
        existing={words.sentence(clash)}
        proposed={words.sentence(asRelationship(draft))}
        note={draft.note}
        onNote={(note) => change({ note })}
        onBack={() => {
          // Back to the pickers: the kind drop-down takes the focus once the warning closes.
          onBack();
          requestAnimationFrame(() => document.getElementById(`${idPrefix}-group`)?.focus());
        }}
        onSave={onSave}
      />
    );
  }
  return (
    <>
      <Textarea
        id={`${idPrefix}-note`}
        label={t('connections.add.note')}
        maxLength={1000}
        value={draft.note}
        onChange={(event) => change({ note: event.target.value })}
      />
      <Button type="submit" variant="secondary" className="self-start" disabled={isBusy}>
        {t('connections.add.button')}
      </Button>
    </>
  );
}

/** The state of one form: the draft, the message, and the clash being shown. */
function useRelationshipDraft(
  fixedFromId: string | undefined,
  initialPair: AddRelationshipFormProps['initialPair'],
) {
  const freshDraft = { ...emptyDraft, fromId: fixedFromId ?? '' };
  // A pair from the map fills both characters once; after a save the form starts blank.
  const [draft, setDraft] = useState<NewRelationship>({ ...freshDraft, ...initialPair });
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [clash, setClash] = useState<CharacterRelationship | null>(null);
  /** Changes one part of the draft; a change to the pickers closes the warning. */
  const change = (part: Partial<NewRelationship>) => {
    setDraft({ ...draft, ...part });
    if (!('note' in part)) setClash(null);
  };
  const reset = () => {
    setDraft(freshDraft);
    setClash(null);
  };
  return { draft, change, reset, message, setMessage, clash, setClash };
}

/**
 * Renders the form.
 *
 * @returns the pickers, the type's own fields, the note, Add relationship and, on a clash, the
 *   warning
 */
export function AddRelationshipForm({
  idPrefix,
  cast,
  fixedFromId,
  initialPair,
  onAdd,
}: AddRelationshipFormProps) {
  const { t } = useAtlasTranslation();
  const { draft, change, reset, message, setMessage, clash, setClash } = useRelationshipDraft(
    fixedFromId,
    initialPair,
  );

  const { isBusy, addOnce } = useRelationshipAdd(cast.relationships, onAdd);

  /** Saves the relationship once and starts a fresh form, or says why not. */
  async function save() {
    const outcome = await addOnce(draft);
    // Another save is still running (a double click): this one did nothing.
    if (outcome === 'busy') return;
    if (outcome === 'added') reset();
    setMessage({ tone: toneOf(outcome), text: t(`connections.add.${outcome}`) });
  }

  /** Add relationship: checks what is missing, then any clash, then saves. */
  async function add() {
    setMessage(null);
    const missing = missingPart(draft);
    if (missing !== null) return setMessage({ tone: 'error', text: t(missing) });
    // A clash is advice: the warning opens, and Save anyway still saves.
    const found = findClash(cast.relationships, draft);
    if (found !== null) return setClash(found);
    await save();
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void add();
      }}
    >
      <p className="m-0 text-sm text-meta">{t('connections.add.hint')}</p>
      <RelationshipPickers
        idPrefix={idPrefix}
        cast={cast}
        draft={draft}
        isFromPicked={fixedFromId === undefined}
        change={change}
      />
      <KindDetails idPrefix={idPrefix} cast={cast} draft={draft} change={change} />
      <NoteOrClash
        idPrefix={idPrefix}
        cast={cast}
        draft={draft}
        clash={clash}
        isBusy={isBusy}
        change={change}
        onBack={() => setClash(null)}
        onSave={() => void save()}
      />
      <div aria-live="polite">
        {message !== null && <Notice tone={message.tone}>{message.text}</Notice>}
      </div>
    </form>
  );
}
