/**
 * Textarea: a labelled multi-line text field (story S1-E1-03).
 *
 * Board values: at least 96 px tall, 20 px radius, 14 by 18 px padding, line height 1.5, resizes
 * vertically. Border #8E7B99 for 3:1 contrast, as for TextInput (docs/board-fixes.md).
 * Typed or pasted ş and ţ become ș and ț straight away (CLAUDE.md rule 4; S1-E1-04).
 * Who uses it: comments (S1-E6-01), reports (S1-E10-01) and staff notes.
 */
import type { ChangeEvent, Ref, TextareaHTMLAttributes } from 'react';

import { normaliseTypedText } from '@/lib/romanian-text';
import { cn } from '@/lib/utils';

/** A normal <textarea>'s attributes plus the label and an optional hint. */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  hint?: string;
  /** Lets a form read the field, for example its selection (staff passage removal, ADMIN-2b2). */
  ref?: Ref<HTMLTextAreaElement>;
}

/**
 * Renders the label, the field and the hint.
 *
 * @returns the field group
 */
export function Textarea({
  id,
  label,
  hint,
  className,
  onChange,
  ...textareaProps
}: TextareaProps) {
  const hintId = hint === undefined ? undefined : `${id}-hint`;

  /** Corrects Romanian letters, then hands the change to the form. */
  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    normaliseTypedText(event.target);
    onChange?.(event);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={id}
        aria-describedby={hintId}
        className={cn(
          'min-h-24 resize-y rounded-[20px] border border-control-border bg-surface px-[18px] py-3.5 font-body text-base leading-normal text-ink',
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
    </div>
  );
}
