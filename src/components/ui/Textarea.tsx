/**
 * Textarea: a labelled multi-line text field (story S1-E1-03).
 *
 * Board values: at least 96 px tall, 20 px radius, 14 by 18 px padding, line height 1.5, resizes
 * vertically. Border --control-border (#725F88 by day since CALM-1b) for 3:1 contrast, as for TextInput (docs/board-fixes.md).
 * Typed or pasted ş and ţ become ș and ț straight away (CLAUDE.md rule 4; S1-E1-04).
 * An error (such as "Write your reply first" after pressing Send on an empty box, design books
 * item 9) sits under the field, is linked with aria-describedby and sets aria-invalid, as on
 * TextInput.
 * Who uses it: comments (S1-E6-01), reports (S1-E10-01) and staff notes.
 */
import type { ChangeEvent, Ref, TextareaHTMLAttributes } from 'react';

import { normaliseTypedText } from '@/lib/romanian-text';
import { cn } from '@/lib/utils';

/** A normal <textarea>'s attributes plus the label, an optional hint and an optional error. */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  hint?: string;
  /** Said under the field when what was typed can't be sent, for example nothing yet. */
  errorMessage?: string;
  /** Lets a form read the field, for example its selection (staff passage removal, ADMIN-2b2). */
  ref?: Ref<HTMLTextAreaElement>;
}

/**
 * Renders the label, the field, then the hint and the error under it.
 *
 * @returns the field group
 */
export function Textarea({
  id,
  label,
  hint,
  errorMessage,
  className,
  onChange,
  ...textareaProps
}: TextareaProps) {
  // Ids for the hint and error, so the field can point at whichever exist.
  const hintId = hint === undefined ? undefined : `${id}-hint`;
  const errorId = errorMessage === undefined ? undefined : `${id}-error`;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  /** Corrects Romanian letters, then hands the change to the form. */
  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    normaliseTypedText(event.target);
    onChange?.(event);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* wrap-anywhere: a label a member typed as one long word (a detail's name on a character
          sheet) breaks inside its column and never pushes the page sideways (rule 21). */}
      <label htmlFor={id} className="text-sm font-semibold wrap-anywhere text-ink">
        {label}
      </label>
      <textarea
        id={id}
        aria-describedby={describedBy}
        aria-invalid={errorMessage === undefined ? undefined : true}
        className={cn(
          'field-box min-h-24 resize-y px-4 py-3 font-body text-base leading-normal',
          className,
        )}
        {...textareaProps}
        onChange={handleChange}
      />
      {hint !== undefined && (
        <p id={hintId} className="text-[13px] text-meta">
          {hint}
        </p>
      )}
      {errorMessage !== undefined && (
        <p id={errorId} className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
