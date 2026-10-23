/**
 * DecisionForm: "Decision": the six actions as radio chips, the required note and "Send decision"
 * (story S1-E10-03a; board 8.3's Decision panel).
 *
 * The chips are real radio buttons (arrow keys move between them; the group has a name), as the
 * report dialog's reasons are. The database refuses a decision without a note and a second
 * decision on a decided case; the form says the same in plain words before asking.
 * What a decision does today: it closes the case and its reports and goes to the audit log. The
 * action itself is carried out by S1-E10-06 and the statement of reasons sent by S1-E10-04; the
 * form says so under the button, so nobody expects more yet.
 * Who shows it: CasePage. What it calls: the decide() it is given (useCase).
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import { Constants } from '@/lib/database.types';
import { cn } from '@/lib/utils';

import type { ModerationAction, ModerationFailure } from '../api/moderationQueue';

/** What the form needs. */
export interface DecisionFormProps {
  onDecide: (action: ModerationAction, note: string) => Promise<unknown>;
  isDeciding: boolean;
  failure: ModerationFailure | null;
}

/** What is still missing when Send is pressed. */
type Problem = 'action_missing' | 'note_missing' | null;

/**
 * The six actions as radio chips.
 *
 * @returns the fieldset
 */
function ActionChips({
  chosen,
  onChoose,
  problem,
}: {
  chosen: ModerationAction | null;
  onChoose: (action: ModerationAction) => void;
  problem: Problem;
}) {
  const { t } = useTranslation('moderation');
  return (
    <fieldset
      className="m-0 flex flex-col gap-3 border-0 p-0"
      aria-describedby={problem === 'action_missing' ? 'decision-action-error' : undefined}
      aria-invalid={problem === 'action_missing' ? true : undefined}
    >
      <legend className="mb-3 p-0 text-sm font-semibold text-ink">{t('case.form.legend')}</legend>
      <div className="flex flex-wrap gap-2">
        {Constants.public.Enums.moderation_action.map((action) => {
          const isChosen = action === chosen;
          return (
            <label
              key={action}
              className={cn(
                "relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm leading-none whitespace-nowrap after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[''] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--focus-ring)",
                isChosen
                  ? 'border-chip-on bg-chip-on font-bold text-chip-on-text'
                  : 'border-control-border bg-surface font-semibold text-heading hover:bg-tint',
              )}
            >
              <input
                type="radio"
                name="decision-action"
                value={action}
                checked={isChosen}
                onChange={() => onChoose(action)}
                className="sr-only"
              />
              {t(`actions.${action}`)}
            </label>
          );
        })}
      </div>
      {problem === 'action_missing' && (
        <p id="decision-action-error" role="alert" className="m-0 text-sm text-destructive">
          {t('case.form.actionMissing')}
        </p>
      )}
    </fieldset>
  );
}

/**
 * Renders the form.
 *
 * @returns the Decision panel
 */
export function DecisionForm({ onDecide, isDeciding, failure }: DecisionFormProps) {
  const { t } = useTranslation('moderation');
  const [action, setAction] = useState<ModerationAction | null>(null);
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<Problem>(null);

  /** Checks for an action and a note, then asks the database. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (action === null) return setProblem('action_missing');
    if (note.trim() === '') return setProblem('note_missing');
    setProblem(null);
    await onDecide(action, note.trim()).catch(() => undefined);
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-labelledby="decision-heading"
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2 id="decision-heading" className="m-0 font-heading text-[24px] font-bold text-heading">
        {t('case.form.heading')}
      </h2>
      <ActionChips chosen={action} onChoose={setAction} problem={problem} />
      <Textarea
        id="decision-note"
        label={t('case.form.note')}
        hint={t('case.form.noteHint')}
        rows={4}
        value={note}
        aria-invalid={problem === 'note_missing' ? true : undefined}
        onChange={(event) => setNote(event.target.value)}
      />
      {problem === 'note_missing' && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {t('case.form.noteMissing')}
        </p>
      )}
      {failure !== null && <Notice tone="error">{t(`failures.${failure}`)}</Notice>}
      <div>
        <Button type="submit" disabled={isDeciding}>
          {t(isDeciding ? 'case.form.sending' : 'case.form.send')}
        </Button>
      </div>
      <p className="m-0 text-sm text-meta">{t('case.form.nextSteps')}</p>
    </form>
  );
}
