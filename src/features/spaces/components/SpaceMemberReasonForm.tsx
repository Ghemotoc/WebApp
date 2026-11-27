/**
 * SpaceMemberReasonForm: the short form under a member's row once "Remove" or "Block" is picked:
 * an optional reason, kept in the space's log, and the button that does it, so one slip of the
 * mouse removes or blocks nobody (bundle FORUMS-2, part b; bundle BOOKS-7, board F11, user story
 * 7.11).
 *
 * Who shows it: SpaceMemberRow. What it calls: nothing; the row sends the change.
 */
import { useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { Textarea } from '@/components/ui/Textarea';

import { useSpacesTranslation } from '../registerSpacesTranslations';

/** The words of one kind of form. */
export interface ReasonFormWords {
  /** The reason field's label ("Why remove ilinca.r? (optional)"). */
  label: string;
  /** What happens to the reason. */
  hint: string;
  /** The button ("Yes, remove") and its name for screen readers ("Yes, remove ilinca.r"). */
  confirm: string;
  confirmLabel: string;
}

/** What the form needs. */
export interface SpaceMemberReasonFormProps {
  words: ReasonFormWords;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isRunning: boolean;
}

/**
 * Renders the form.
 *
 * @returns the reason field and the two buttons, the one that acts first
 */
export function SpaceMemberReasonForm({
  words,
  onConfirm,
  onCancel,
  isRunning,
}: SpaceMemberReasonFormProps) {
  const { t } = useSpacesTranslation();
  const reasonId = useId();
  const [reason, setReason] = useState('');
  return (
    <div className="flex flex-col gap-3">
      <Textarea
        id={reasonId}
        label={words.label}
        hint={words.hint}
        value={reason}
        maxLength={500}
        onChange={(event) => setReason(event.target.value)}
      />
      <ButtonRow>
        <Button
          variant="destructive"
          aria-label={words.confirmLabel}
          disabled={isRunning}
          onClick={() => onConfirm(reason)}
        >
          {words.confirm}
        </Button>
        <Button variant="secondary" disabled={isRunning} onClick={onCancel}>
          {t('form.cancel')}
        </Button>
      </ButtonRow>
    </div>
  );
}
