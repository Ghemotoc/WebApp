/**
 * PlayCastPanel: "Characters", the play's cast beside the paper (LAYOUTS-2; board D14, the right
 * column from 1024 px; in the plan's sheet below 1024 px).
 *
 * Board values: the box surface with 20 px inside; "Characters" in the subheading type with an
 * "Add" text button at the right; the meta line "For the whole story. Readers see this list at
 * the start of the play."; then one row per character, its name in capitals, its note under it
 * and its lines in this chapter at the right ("3 lines"), the speaker at the caret on the tint;
 * then, over a hairline, the keys: Enter, Tab, "(", "NAME:" (and Esc, then Tab, which leaves the
 * text: WCAG 2.1.2).
 * Each row is a button, named by its own words (WCAG 2.5.3), that opens the character's form (change the name or note, or remove it);
 * "Add" opens an empty one. A changed name is also changed in this chapter's speeches. A save
 * that fails puts the list back and says why under it.
 * Who uses it: ChapterEditorPage. What it calls: usePlayCast's state, PlayCastForm and
 * renameSpeeches().
 */
import type { Editor } from '@tiptap/react';
import { useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Notice } from '@/components/ui/Notice';
import { buttonClassName } from '@/components/ui/buttonStyles';
import type { CastMember } from '@/schemas/playCast';

import type { PlayCastState } from '../hooks/usePlayCast';
import type { PlayCaret } from '../hooks/usePlayCaret';
import { renameSpeeches } from '../lib/playCommands';
import { useEditorTranslation } from '../registerEditorTranslations';

import { PlayCastForm } from './PlayCastForm';

/** What the panel needs. */
export interface PlayCastPanelProps {
  editor: Editor | null;
  cast: PlayCastState;
  caret: PlayCaret;
}

/** Which form is open: none, a new character, or the character at this place in the list. */
type OpenForm = { kind: 'none' } | { kind: 'new' } | { kind: 'change'; index: number };

/** The keys box under the list, in the board's order (with Esc added for leaving the text). */
const KEY_ROWS = ['enter', 'tab', 'bracket', 'name', 'escape'] as const;

/** One character's row: a button with the name, the note and the lines in this chapter. */
function CastRow(props: {
  member: CastMember;
  lines: number;
  isSpeaking: boolean;
  onOpen: () => void;
}) {
  const { t } = useEditorTranslation();
  const { member } = props;
  return (
    <li>
      <button
        type="button"
        onClick={props.onOpen}
        className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 rounded-field px-3 py-2 text-left hover:bg-tint ${props.isSpeaking ? 'bg-tint' : ''}`}
      >
        <span className="type-meta font-semibold tracking-wide wrap-anywhere text-ink-heading uppercase">
          {member.name}
        </span>
        <span className="row-span-2 type-meta font-semibold text-ink-muted">
          {t('play.lines', { count: props.lines })}
        </span>
        {member.note !== '' && (
          <span className="type-meta wrap-anywhere text-ink-muted">{member.note}</span>
        )}
      </button>
    </li>
  );
}

/** The keys under the list (board D14). */
function KeysList() {
  const { t } = useEditorTranslation();
  return (
    <dl
      aria-label={t('play.cast.keysLabel')}
      className="m-0 mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 border-t border-hairline pt-3"
    >
      {KEY_ROWS.map((key) => (
        <div key={key} className="contents">
          <dt className="justify-self-start">
            <kbd className="rounded-full bg-tint px-2 font-body type-meta font-semibold whitespace-nowrap text-ink-heading">
              {t(`play.cast.keyNames.${key}`)}
            </kbd>
          </dt>
          <dd className="m-0 type-meta text-ink-muted">{t(`play.cast.keys.${key}`)}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The panel's open form and the changes it makes: a new character, a changed one (its new name
 * also put in this chapter's speeches) or one taken off the list.
 */
function useCastEditing(editor: Editor | null, cast: PlayCastState) {
  const { t } = useEditorTranslation();
  const [openForm, setOpenForm] = useState<OpenForm>({ kind: 'none' });
  const [renamedNote, setRenamedNote] = useState<string | null>(null);
  const members = cast.cast;

  /** Saves the open form's character. */
  function saveMember(member: CastMember) {
    setRenamedNote(null);
    setOpenForm({ kind: 'none' });
    if (openForm.kind === 'new') {
      cast.save([...members, member]);
      return;
    }
    if (openForm.kind !== 'change') return;
    const before = members[openForm.index];
    cast.save(members.map((old, index) => (index === openForm.index ? member : old)));
    if (before === undefined || editor === null || before.name === member.name) return;
    const count = renameSpeeches(editor, before.name, member.name);
    if (count > 0) setRenamedNote(t('play.cast.renamed', { count, name: member.name }));
  }

  /** Takes the open character off the list (their speeches keep the name). */
  function removeMember(index: number) {
    cast.save(members.filter((_member, place) => place !== index));
    setOpenForm({ kind: 'none' });
  }

  return { openForm, setOpenForm, renamedNote, saveMember, removeMember };
}

/** The panel's heading with "Add" at its right, and the line under it. */
function CastHeading({ onAdd }: { onAdd: () => void }) {
  const { t } = useEditorTranslation();
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 id="play-cast-heading" className="m-0 type-subheading text-ink-heading">
          {t('play.cast.heading')}
        </h2>
        <button type="button" onClick={onAdd} className={buttonClassName({ variant: 'text' })}>
          <ActionIcon name="plus" />
          {t('play.cast.add')}
        </button>
      </div>
      <p className="m-0 type-meta text-ink-muted">{t('play.cast.intro')}</p>
    </>
  );
}

/** The words for a failed save: a refusal the panel knows, or "couldn't save". */
function problemKey(problem: PlayCastState['problem']): string {
  return problem !== null && problem in PROBLEM_KEYS ? problem : 'failed';
}

/**
 * Renders the panel.
 *
 * @returns the Characters box
 */
export function PlayCastPanel({ editor, cast, caret }: PlayCastPanelProps) {
  const { t } = useEditorTranslation();
  const editing = useCastEditing(editor, cast);
  const { openForm } = editing;
  const members = cast.cast;
  const speaking = caret.speakerName.trim().toLowerCase();
  const openIndex = openForm.kind === 'change' ? openForm.index : -1;
  return (
    <section
      aria-labelledby="play-cast-heading"
      className="box-surface flex flex-col gap-2 rounded-card p-6"
    >
      <CastHeading onAdd={() => editing.setOpenForm({ kind: 'new' })} />
      {members.length === 0 && openForm.kind === 'none' && (
        <p className="m-0 type-meta text-ink-muted">{t('play.cast.empty')}</p>
      )}
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {members.map((member, index) =>
          index === openIndex ? null : (
            <CastRow
              key={member.name}
              member={member}
              lines={caret.counts.linesByName.get(member.name.toLowerCase()) ?? 0}
              isSpeaking={member.name.toLowerCase() === speaking}
              onOpen={() => editing.setOpenForm({ kind: 'change', index })}
            />
          ),
        )}
      </ul>
      {openForm.kind !== 'none' && (
        <PlayCastForm
          member={members[openIndex] ?? null}
          otherNames={members
            .filter((_member, index) => index !== openIndex)
            .map((member) => member.name)}
          onSave={editing.saveMember}
          onCancel={() => editing.setOpenForm({ kind: 'none' })}
          onRemove={openIndex === -1 ? undefined : () => editing.removeMember(openIndex)}
        />
      )}
      {editing.renamedNote !== null && (
        <p role="status" className="m-0 type-meta text-ink-muted">
          {editing.renamedNote}
        </p>
      )}
      {cast.problem !== null && (
        <Notice tone="error">{t(`play.cast.problems.${problemKey(cast.problem)}`)}</Notice>
      )}
      <KeysList />
    </section>
  );
}

/** The refusals the panel has words for; anything else says the save failed. */
const PROBLEM_KEYS = { too_many: true, bad_name: true, bad_note: true, duplicate_name: true };
