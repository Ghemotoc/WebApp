/**
 * IdeaQuickAdd: "Jot it down" on the Ideas page (story S1-E17-27; redrawn by user stories bundle
 * 6, story 6.12, board E31: "pick Question, Idea, To-do or Decision, write one line, press Enter
 * or Add (the one plum button). Empty: “Write something first.”").
 *
 * A section between hairlines, as board E31 draws it: the type as a switch under its visible
 * label "Type", then "Question or idea" with the line and the main "Add" side by side and the hint
 * under them. Enter in the line sends the form; the type stays as chosen, so a run of questions
 * needs no more clicks. Add stays pressable: pressed with an empty line it says "Write something
 * first." beside the field and puts the focus there (design books item 9, useMissingField).
 * Who uses it: IdeasPage. What it calls: the onAdd prop (useStoryIdeas' add).
 */
import { useState, type ChangeEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { FieldProblem } from '@/components/ui/FieldProblem';
import { Notice } from '@/components/ui/Notice';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useMissingField } from '@/lib/forms/useMissingField';
import { normaliseTypedText } from '@/lib/romanian-text';

import { ideaKinds, type IdeaKind } from '../api/ideas';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the box needs. */
export interface IdeaQuickAddProps {
  /** Adds the line; throws when it can't. */
  onAdd: (kind: IdeaKind, body: string) => Promise<void>;
}

/** The line's id, so the focus can come back to it when it is empty. */
const lineId = 'atlas-idea-line';

/**
 * "Question or idea": the label, the line and Add in one row, the hint, and the missing-line
 * message. Drawn by hand because the button sits in the field's row (board E31).
 */
function LineField({
  line,
  setLine,
  isMissingShown,
}: {
  line: string;
  setLine: (line: string) => void;
  isMissingShown: boolean;
}) {
  const { t } = useAtlasTranslation();
  const describedBy = isMissingShown ? `${lineId}-hint ${lineId}-error` : `${lineId}-hint`;

  /** Corrects Romanian letters, then keeps what was typed. */
  function typed(changed: ChangeEvent<HTMLInputElement>) {
    normaliseTypedText(changed.target);
    setLine(changed.target.value);
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={lineId} className="type-body font-semibold text-ink">
        {t('ideas.add.line')}
      </label>
      <div className="flex min-w-0 gap-2">
        <input
          id={lineId}
          type="text"
          maxLength={1000}
          value={line}
          aria-describedby={describedBy}
          aria-invalid={isMissingShown ? true : undefined}
          className="field-box h-12 min-w-0 flex-1 px-4 font-body type-body"
          onChange={typed}
        />
        <Button type="submit">{t('ideas.add.button')}</Button>
      </div>
      <p id={`${lineId}-hint`} className="m-0 type-meta text-ink-muted">
        {t('ideas.add.lineHint')}
      </p>
      <FieldProblem id={`${lineId}-error`} isShown={isMissingShown}>
        {t('ideas.add.empty')}
      </FieldProblem>
    </div>
  );
}

/**
 * Renders the section.
 *
 * @returns the heading and the form with its type, its line and Add
 */
export function IdeaQuickAdd({ onAdd }: IdeaQuickAddProps) {
  const { t } = useAtlasTranslation();
  const [kind, setKind] = useState<IdeaKind>('question');
  const [line, setLine] = useState('');
  const [hasFailed, setHasFailed] = useState(false);
  const missingLine = useMissingField(line.trim() === '', lineId);

  /** Adds the line and clears the box, or says why not. */
  async function add() {
    setHasFailed(false);
    // Step 1: an empty line adds nothing and says so beside the field (the database refuses it too).
    if (!missingLine.isReadyToSend()) return;
    // Step 2: add it; the box clears once it is saved.
    await onAdd(kind, line)
      .then(() => setLine(''))
      .catch(() => setHasFailed(true));
  }

  return (
    <section
      aria-labelledby="atlas-idea-add-heading"
      className="flex flex-col gap-4 border-t border-hairline pt-6"
    >
      <h2
        id="atlas-idea-add-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('ideas.add.heading')}
      </h2>
      <form
        noValidate
        className="flex min-w-0 flex-col gap-4"
        onSubmit={(submitted) => {
          submitted.preventDefault();
          void add();
        }}
      >
        <SegmentedControl
          legend={t('ideas.add.kind')}
          name="atlas-idea-kind"
          columns={4}
          options={ideaKinds.map((option) => ({
            value: option,
            label: t(`ideas.kinds.${option}`),
          }))}
          value={kind}
          onChange={setKind}
        />
        <LineField line={line} setLine={setLine} isMissingShown={missingLine.isShown} />
        <div aria-live="polite">
          {hasFailed && <Notice tone="error">{t('ideas.add.failed')}</Notice>}
        </div>
      </form>
    </section>
  );
}
