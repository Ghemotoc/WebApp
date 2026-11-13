/**
 * ConfirmedButton: a button that asks once before it acts (bundle CLASS-POINTS, part 2). Ending
 * and deleting a competition and confirming its results can't be undone, so the first press
 * shows the question with "yes" and "Cancel" in place, with no browser dialog.
 *
 * Who shows it: TeacherControls and ResultsForm. What it calls: nothing.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';

/** What the button needs. */
export interface ConfirmedButtonProps {
  label: string;
  question: string;
  yesLabel: string;
  cancelLabel: string;
  variant?: 'primary' | 'secondary';
  isDisabled: boolean;
  onConfirm: () => void;
}

/**
 * Renders the button, or the question once it was pressed.
 *
 * @returns the button or the question with its two answers
 */
export function ConfirmedButton(props: ConfirmedButtonProps) {
  const [isAsking, setIsAsking] = useState(false);
  if (!isAsking) {
    return (
      <Button
        variant={props.variant ?? 'secondary'}
        disabled={props.isDisabled}
        onClick={() => setIsAsking(true)}
      >
        {props.label}
      </Button>
    );
  }
  return (
    <div
      role="group"
      aria-label={props.label}
      className="flex flex-col gap-2 rounded-2xl border border-border px-4 py-3"
    >
      <p className="m-0 text-body">{props.question}</p>
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={props.isDisabled}
          onClick={() => {
            setIsAsking(false);
            props.onConfirm();
          }}
        >
          {props.yesLabel}
        </Button>
        <Button variant="secondary" onClick={() => setIsAsking(false)}>
          {props.cancelLabel}
        </Button>
      </div>
    </div>
  );
}
