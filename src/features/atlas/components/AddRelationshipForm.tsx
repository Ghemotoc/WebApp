/**
 * AddRelationshipForm: "Add a relationship" on a character sheet and on the Connections page
 * (story S1-E17-14: "when I pick another character, a relationship type and an optional note,
 * then the relationship is saved").
 *
 * On a sheet the first character is the sheet's own, so only the other one is picked; on the
 * Connections page both are. The type list offers every type in the story's order, and "Custom"
 * adds a box for the writer's own label. A plain message says what is missing or that it didn't
 * save. Who uses it: CharacterRelationshipsSection and ConnectionsPage. What it calls: the
 * onAdd prop (useRelationshipChangers' relate).
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';

import {
  relationshipKinds,
  type NewRelationship,
  type RelationshipKind,
  type StoryCast,
} from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the form needs. */
export interface AddRelationshipFormProps {
  /** Makes the field ids unique when two forms could share a page. */
  idPrefix: string;
  cast: StoryCast;
  /** The sheet's character; left out on the Connections page, where both are picked. */
  fixedFromId?: string;
  /** Saves the relationship; throws when it can't. */
  onAdd: (relationship: NewRelationship) => Promise<void>;
}

/** A blank form. */
const emptyDraft: NewRelationship = {
  fromId: '',
  toId: '',
  kind: 'parent_of',
  customLabel: '',
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

/** What the three pickers need. */
interface RelationshipPickersProps {
  idPrefix: string;
  cast: StoryCast;
  draft: NewRelationship;
  /** False on a sheet, where the first character is the sheet's own. */
  isFromPicked: boolean;
  change: (part: Partial<NewRelationship>) => void;
}

/** The first character (on the Connections page only), the type and the other character. */
function RelationshipPickers({
  idPrefix,
  cast,
  draft,
  isFromPicked,
  change,
}: RelationshipPickersProps) {
  const { t } = useAtlasTranslation();
  const pickLabel = t('connections.add.pickCharacter');
  const kindOptions = relationshipKinds.map((kind) => ({
    value: kind,
    label: t(`connections.kinds.${kind}`),
  }));
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
      <Select
        id={`${idPrefix}-kind`}
        label={t('connections.add.kind')}
        isLabelVisible
        options={kindOptions}
        value={draft.kind}
        onChange={(kind) => change({ kind: kind as RelationshipKind })}
      />
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

/** The writer's own label (for a custom relationship only) and the note. */
function RelationshipTextFields({
  idPrefix,
  draft,
  change,
}: Pick<RelationshipPickersProps, 'idPrefix' | 'draft' | 'change'>) {
  const { t } = useAtlasTranslation();
  return (
    <>
      {draft.kind === 'custom' && (
        <TextInput
          id={`${idPrefix}-label`}
          label={t('connections.add.customLabel')}
          hint={t('connections.add.customHint')}
          maxLength={60}
          value={draft.customLabel}
          onChange={(event) => change({ customLabel: event.target.value })}
        />
      )}
      <Textarea
        id={`${idPrefix}-note`}
        label={t('connections.add.note')}
        maxLength={1000}
        value={draft.note}
        onChange={(event) => change({ note: event.target.value })}
      />
    </>
  );
}

/**
 * Renders the form.
 *
 * @returns the pickers, the label and note boxes, and Add relationship
 */
export function AddRelationshipForm({
  idPrefix,
  cast,
  fixedFromId,
  onAdd,
}: AddRelationshipFormProps) {
  const { t } = useAtlasTranslation();
  const [draft, setDraft] = useState<NewRelationship>({ ...emptyDraft, fromId: fixedFromId ?? '' });
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  /** Changes one part of the draft. */
  const change = (part: Partial<NewRelationship>) => setDraft({ ...draft, ...part });

  /** Saves the relationship and starts a fresh form, or says why not. */
  async function add() {
    setMessage(null);
    const missing = missingPart(draft);
    if (missing !== null) return setMessage({ tone: 'error', text: t(missing) });
    await onAdd(draft)
      .then(() => {
        setDraft({ ...emptyDraft, fromId: fixedFromId ?? '' });
        setMessage({ tone: 'success', text: t('connections.add.added') });
      })
      .catch(() => setMessage({ tone: 'error', text: t('connections.add.failed') }));
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
      <RelationshipTextFields idPrefix={idPrefix} draft={draft} change={change} />
      <Button type="submit" variant="secondary" className="self-start">
        {t('connections.add.button')}
      </Button>
      <div aria-live="polite">
        {message !== null && <Notice tone={message.tone}>{message.text}</Notice>}
      </div>
    </form>
  );
}
