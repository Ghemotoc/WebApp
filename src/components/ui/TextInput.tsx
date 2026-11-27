/**
 * TextInput: a labelled one-line text field, with an optional hint and error (story S1-E1-03).
 *
 * Handoff values (bundle G3): 48 px tall, 14 px radius, the --field fill, 16 px horizontal padding
 * (field-box in index.css). The border is the control-border token (#725F88 by day since CALM-1b, 3:1),
 * not the boards' paler #DED3E4, so the field's edge meets WCAG 2.2, 1.4.11 (docs/board-fixes.md).
 * The hint and the error are linked with aria-describedby so screen readers read them with the
 * field; an error also sets aria-invalid. Typed or pasted ş and ţ become ș and ț straight away
 * (CLAUDE.md rule 4; S1-E1-04), before the form's own onChange sees the value.
 * Who uses it: every form from S1-E2 on.
 */
import type { ChangeEvent, InputHTMLAttributes } from 'react';

import { normaliseTypedText } from '@/lib/romanian-text';
import { cn } from '@/lib/utils';

/** A normal <input>'s attributes plus the label, hint and error text. */
export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: string;
  errorMessage?: string;
  /**
   * True when the row around the field already says what it is (a learning outcome's line on the
   * competition form, BOOKS-8b): the label is kept for screen readers only.
   */
  isLabelHidden?: boolean;
}

/**
 * Renders the label, the field, then the hint and the error under it.
 *
 * @returns the field group
 */
export function TextInput({
  id,
  label,
  hint,
  errorMessage,
  className,
  onChange,
  isLabelHidden = false,
  ...inputProps
}: TextInputProps) {
  // Ids for the hint and error, so the field can point at whichever exist.
  const hintId = hint === undefined ? undefined : `${id}-hint`;
  const errorId = errorMessage === undefined ? undefined : `${id}-error`;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  /** Corrects Romanian letters, then hands the change to the form. */
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    normaliseTypedText(event.target);
    onChange?.(event);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* wrap-anywhere: a label a member typed as one long word (a detail's name on a character
          sheet) breaks inside its column and never pushes the page sideways (rule 21). */}
      <label
        htmlFor={id}
        className={cn('type-body font-semibold wrap-anywhere text-ink', isLabelHidden && 'sr-only')}
      >
        {label}
      </label>
      <input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={errorMessage === undefined ? undefined : true}
        className={cn('field-box h-12 px-4 font-body type-body', className)}
        {...inputProps}
        onChange={handleChange}
      />
      {hint !== undefined && (
        <p id={hintId} className="type-meta text-ink-muted">
          {hint}
        </p>
      )}
      {errorMessage !== undefined && (
        <p id={errorId} className="type-body text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
