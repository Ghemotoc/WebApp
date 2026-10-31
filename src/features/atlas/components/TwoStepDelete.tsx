/**
 * TwoStepDelete: a Delete button that asks once more before it deletes (Story Atlas principle:
 * "Nothing is deleted without a second, confirming click").
 *
 * The first click shows the question with Yes and Keep; the focus moves to the question so a
 * screen reader hears it. Yes runs the delete; a refusal the caller expects (an outcome message,
 * such as "only an empty section can be deleted") or a failure is said plainly.
 * Who uses it: the bible's section rows and entry view (S1-E17-17, S1-E17-18).
 */
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

/** What the control needs. */
export interface TwoStepDeleteProps {
  /** The first button's visible words. */
  buttonLabel: string;
  /** Its full name for screen readers when the words alone are ambiguous ("Delete History"). */
  buttonAccessibleName?: string;
  question: string;
  yesLabel: string;
  keepLabel: string;
  failedMessage: string;
  /** Deletes; resolves to a message to show instead (a refusal), or null when done. */
  onDelete: () => Promise<string | null>;
}

/**
 * Renders the button, or the question with Yes and Keep.
 *
 * @returns the control and its message area
 */
export function TwoStepDelete(props: TwoStepDeleteProps) {
  const [isAsking, setIsAsking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const question = useRef<HTMLParagraphElement>(null);

  // The question takes the focus when it appears, so it is read out.
  useEffect(() => {
    if (isAsking) question.current?.focus();
  }, [isAsking]);

  /** The second click: deletes, or says why not. */
  async function confirm() {
    setMessage(null);
    const refusal = await props.onDelete().catch(() => props.failedMessage);
    if (refusal !== null) {
      setIsAsking(false);
      setMessage(refusal);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {!isAsking && (
        <Button
          variant="secondary"
          className="self-start"
          aria-label={props.buttonAccessibleName}
          onClick={() => {
            setMessage(null);
            setIsAsking(true);
          }}
        >
          {props.buttonLabel}
        </Button>
      )}
      {isAsking && (
        <>
          <p ref={question} tabIndex={-1} className="m-0 text-body">
            {props.question}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="destructive" onClick={() => void confirm()}>
              {props.yesLabel}
            </Button>
            <Button variant="secondary" onClick={() => setIsAsking(false)}>
              {props.keepLabel}
            </Button>
          </div>
        </>
      )}
      <div aria-live="polite">{message !== null && <Notice tone="error">{message}</Notice>}</div>
    </div>
  );
}
