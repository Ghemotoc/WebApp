/**
 * AddRelationshipForm: "Add a relationship" on a character sheet and on the Connections page
 * (story S1-E17-14: "when I pick another character, a relationship type and an optional note,
 * then the relationship is saved"; bundle G10 ATLAS, part b, handoff A4 and A5).
 *
 * On a sheet the first character is the sheet's own, shown alone in its drop-down; on the
 * Relationships page both are picked. Character, Relationship (the twelve kinds, Cousin of and
 * Custom) and Other character stand one under the other in the sheet's dialog (user stories
 * bundle 6, story 6.5, board E24), and side by side at the foot of the Relationships page (story
 * 6.6, board E25), where the "Read it from the first character…" hint shows for the first three
 * visits only. A cousin also says which cousin; Custom asks for the writer's own label both ways. When
 * the new relationship clashes with one already there, a warning explains it and offers a note on
 * how both are true, and the button turns to Save anyway: it is advice, never a block. In the
 * dialog, Go back closes it (onCancel). A relationship is saved once: a double click saves once,
 * and one that is already there is refused in plain words (GAPS-3 break test, 10 Nov 2026). Who
 * uses it: CharacterRelationshipsSection and ConnectionsPage. What it calls: useRelationshipAdd
 * (which calls the onAdd prop, useRelationshipChangers' relate), findClash and
 * useRelationshipWords for the warning's sentences.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
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
import { RelationshipKindPicker } from './RelationshipKindPicker';
import { RelationshipOwnWords } from './RelationshipOwnWords';

/** What the form needs. */
export interface AddRelationshipFormProps {
  /** Makes the field ids unique when two forms could share a page. */
  idPrefix: string;
  cast: StoryCast;
  /** The sheet's character; left out on the Connections page, where both are picked. */
  fixedFromId?: string;
  /** 'row' puts the three pickers side by side from 768 px (board E25); 'stacked' by default. */
  layout?: 'stacked' | 'row';
  /** False once the writer has seen the hint for three visits (story 6.6). */
  showsHint?: boolean;
  /** Saves the relationship; throws when it can't. */
  onAdd: (relationship: NewRelationship) => Promise<void>;
  /** In the dialog: Go back, beside Add relationship, closes it (story 6.5). */
  onCancel?: () => void;
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
  layout: 'stacked' | 'row';
  change: (part: Partial<NewRelationship>) => void;
}

/**
 * The first character, the relationship and the other one: one under the other (board E24), or
 * side by side on the Relationships page (board E25).
 */
function RelationshipPickers({
  idPrefix,
  cast,
  draft,
  isFromPicked,
  layout,
  change,
}: RelationshipPickersProps) {
  const { t } = useAtlasTranslation();
  const pickLabel = t('connections.add.pickCharacter');
  // On a sheet the first character is fixed: its drop-down holds the sheet's character alone.
  const fromOptions = isFromPicked
    ? characterOptions(cast, draft.toId, pickLabel)
    : cast.characters
        .filter((character) => character.id === draft.fromId)
        .map((character) => ({ value: character.id, label: character.name }));
  return (
    <div
      className={
        layout === 'row'
          ? 'grid items-start gap-4 md:grid-cols-3'
          : 'flex flex-col items-start gap-4'
      }
    >
      <Select
        id={`${idPrefix}-from`}
        label={t('connections.add.from')}
        isLabelVisible
        isLabelAbove
        options={fromOptions}
        value={draft.fromId}
        onChange={(fromId) => change({ fromId })}
      />
      <RelationshipKindPicker idPrefix={idPrefix} kind={draft.kind} change={change} />
      <Select
        id={`${idPrefix}-to`}
        label={t('connections.add.to')}
        isLabelVisible
        isLabelAbove
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
  /** In the dialog: Go back beside Add relationship closes it. */
  onCancel?: () => void;
}

/** The note and Add relationship, or, on a clash, the warning with its own note and buttons. */
function NoteOrClash(props: NoteOrClashProps) {
  const { idPrefix, cast, draft, clash, isBusy, change, onBack, onSave, onCancel } = props;
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
          // Back to the pickers: the Relationship drop-down takes the focus once the warning closes.
          onBack();
          requestAnimationFrame(() => document.getElementById(`${idPrefix}-kind`)?.focus());
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
      {/* The main button first, then Go back in the dialog (ButtonRow; design books item 8). */}
      <ButtonRow>
        <Button type="submit" disabled={isBusy}>
          {t('connections.add.button')}
        </Button>
        {onCancel !== undefined && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t('connections.clash.back')}
          </Button>
        )}
      </ButtonRow>
    </>
  );
}

/** The state of one form: the draft, the message, and the clash being shown. */
function useRelationshipDraft(fixedFromId: string | undefined) {
  // On a sheet the first character is the sheet's own; after a save the form starts blank.
  const freshDraft = { ...emptyDraft, fromId: fixedFromId ?? '' };
  const [draft, setDraft] = useState<NewRelationship>(freshDraft);
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
  layout = 'stacked',
  showsHint = true,
  onAdd,
  onCancel,
}: AddRelationshipFormProps) {
  const { t } = useAtlasTranslation();
  const { draft, change, reset, message, setMessage, clash, setClash } =
    useRelationshipDraft(fixedFromId);

  const { isBusy, addOnce } = useRelationshipAdd(cast.relationships, onAdd);
  // What every part of the form shares.
  const shared = { idPrefix, cast, draft, change };

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
      {showsHint && <p className="m-0 type-meta">{t('connections.add.hint')}</p>}
      <RelationshipPickers {...shared} isFromPicked={fixedFromId === undefined} layout={layout} />
      <KindDetails {...shared} />
      <NoteOrClash
        {...shared}
        clash={clash}
        isBusy={isBusy}
        onBack={() => setClash(null)}
        onSave={() => void save()}
        onCancel={onCancel}
      />
      <div aria-live="polite">
        {message !== null && <Notice tone={message.tone}>{message.text}</Notice>}
      </div>
    </form>
  );
}
