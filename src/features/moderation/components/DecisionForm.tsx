/**
 * DecisionForm: "Decision": the actions as radio chips, the suspension length, the required note
 * and "Send decision" (stories S1-E10-03a and S1-E10-06; board 8.3's Decision panel).
 *
 * The chips are real radio buttons (arrow keys move between them; the group has a name), as the
 * report dialog's reasons are. "Restrict" waits for S1-E11-08 (decided 23 Oct 2026, Q3), so it
 * is left out of the chips. "Suspend" asks for how long: 1, 7 or 30 days (Q7; the choices mirror
 * the setting suspension_day_choices). The database refuses a decision without a note and a second
 * decision on a decided case; the form says the same in plain words before asking.
 * What a decision does (S1-E10-06): it closes the case and its reports, goes to the audit log and
 * carries the action out at once; the statement of reasons comes with S1-E10-04.
 * Who shows it: CasePage. What it calls: the decide() it is given (useCase).
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Constants } from '@/lib/database.types';
import { cn } from '@/lib/utils';

import type { ModerationAction, ModerationFailure } from '../api/moderationQueue';

/** What the form needs. */
export interface DecisionFormProps {
  /** What the case is about: a public note goes on a story or a chapter only (S1-E10-08). */
  itemType: string;
  onDecide: (action: ModerationAction, note: string, suspensionDays?: number) => Promise<unknown>;
  isDeciding: boolean;
  failure: ModerationFailure | null;
}

/** What is still missing when Send is pressed. */
type Problem = 'action_missing' | 'days_missing' | 'note_missing' | null;

/**
 * The actions a moderator may pick on a case: every value but restrict (S1-E11-08), and "Add a
 * public note" only on a story or a chapter (S1-E10-08; the database refuses it elsewhere too).
 *
 * @param itemType - what the case is about
 * @returns the actions to offer
 */
function offeredActionsFor(itemType: string): ModerationAction[] {
  const allowsPublicNote = itemType === 'story' || itemType === 'chapter';
  return Constants.public.Enums.moderation_action.filter((action) => {
    if (action === 'restrict') return false;
    return action !== 'public_note' || allowsPublicNote;
  });
}

/** The suspension lengths, the same as the setting suspension_day_choices (Q7). */
const suspensionDayChoices = [1, 7, 30] as const;

/**
 * The actions as radio chips.
 *
 * @returns the fieldset
 */
function ActionChips({
  offeredActions,
  chosen,
  onChoose,
  problem,
}: {
  offeredActions: ModerationAction[];
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
        {offeredActions.map((action) => {
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
 * "For how long?": the suspension length, shown once Suspend is chosen.
 *
 * @returns the drop-down and its error line
 */
function SuspensionDays({
  days,
  onChange,
  problem,
}: {
  days: string;
  onChange: (days: string) => void;
  problem: Problem;
}) {
  const { t } = useTranslation('moderation');
  return (
    <div className="flex flex-col gap-2">
      <Select
        id="decision-days"
        label={t('case.form.suspensionDays')}
        isLabelVisible
        value={days}
        onChange={onChange}
        options={[
          { value: '', label: t('case.form.daysChoose') },
          ...suspensionDayChoices.map((choice) => ({
            value: String(choice),
            label: t(`case.form.days_${choice}`),
          })),
        ]}
      />
      {problem === 'days_missing' && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {t('case.form.daysMissing')}
        </p>
      )}
    </div>
  );
}

/**
 * What is missing before the decision can be sent.
 *
 * @returns the first problem, or null when everything is there
 */
function findProblem(action: ModerationAction | null, days: string, note: string): Problem {
  if (action === null) return 'action_missing';
  if (action === 'suspend' && days === '') return 'days_missing';
  if (note.trim() === '') return 'note_missing';
  return null;
}

/**
 * Renders the form.
 *
 * @returns the Decision panel
 */
export function DecisionForm({ itemType, onDecide, isDeciding, failure }: DecisionFormProps) {
  const { t } = useTranslation('moderation');
  const [action, setAction] = useState<ModerationAction | null>(null);
  const [days, setDays] = useState('');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<Problem>(null);

  /** Checks for an action, the length and a note, then asks the database. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = findProblem(action, days, note);
    setProblem(found);
    if (found !== null || action === null) return;
    const suspensionDays = action === 'suspend' ? Number(days) : undefined;
    await onDecide(action, note.trim(), suspensionDays).catch(() => undefined);
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
      <ActionChips
        offeredActions={offeredActionsFor(itemType)}
        chosen={action}
        onChoose={setAction}
        problem={problem}
      />
      {action === 'suspend' && <SuspensionDays days={days} onChange={setDays} problem={problem} />}
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
