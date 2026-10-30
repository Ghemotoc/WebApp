/**
 * AppealDecisionForm: decide one appeal: keep the decision or change it, a note for the team and
 * the words the person reads (story S1-E10-07; DSA art. 20(4) and (5)).
 *
 * The person must be told the reasons, so the message is required; the database refuses an empty
 * one too. "Change the decision" restores what was hidden or removed and lifts a sanction.
 * Who shows it: AppealCard, for an open appeal the caller may decide.
 * What it calls: the onDecide it is given (useAppeals().decide).
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Textarea } from '@/components/ui/Textarea';

import type { AppealDecision } from '../api/appeals';

/** What the form needs. */
export interface AppealDecisionFormProps {
  reference: string;
  isDeciding: boolean;
  onDecide: (decision: AppealDecision) => Promise<unknown>;
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function AppealDecisionForm({ reference, isDeciding, onDecide }: AppealDecisionFormProps) {
  const { t } = useTranslation('moderation');
  const [outcome, setOutcome] = useState<AppealDecision['outcome'] | ''>('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const isComplete = outcome !== '' && note.trim() !== '' && message.trim() !== '';

  /** Sends the decision once everything is filled in. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (outcome === '' || !isComplete) return;
    void onDecide({ outcome, note: note.trim(), messageToPerson: message.trim() }).catch(
      () => undefined,
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label={t('appeals.formLabel', { reference })}
      className="flex flex-col gap-4 border-t border-border pt-4"
    >
      <ChoiceChips
        label={t('appeals.outcome')}
        isLabelVisible
        value={outcome}
        onChange={(value) => setOutcome(value as AppealDecision['outcome'])}
        options={[
          { value: 'upheld', label: t('appeals.outcomes.upheld') },
          { value: 'overturned', label: t('appeals.outcomes.overturned') },
        ]}
      />
      <Textarea
        id={`appeal-note-${reference}`}
        label={t('appeals.note')}
        hint={t('appeals.noteHint')}
        rows={3}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <Textarea
        id={`appeal-message-${reference}`}
        label={t('appeals.message')}
        hint={t('appeals.messageHint')}
        rows={4}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      <div>
        <Button type="submit" disabled={isDeciding || !isComplete}>
          {isDeciding ? t('appeals.deciding') : t('appeals.decide')}
        </Button>
      </div>
    </form>
  );
}
