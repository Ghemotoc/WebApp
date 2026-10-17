/**
 * TextInput: a labelled one-line text field, with an optional hint and error (story S1-E1-03).
 *
 * Board values: 44 px tall, pill-shaped, 16 px horizontal padding. The border is #8E7B99 (3:1),
 * not the boards' paler #DED3E4, so the field's edge meets WCAG 2.2, 1.4.11 (docs/board-fixes.md).
 * The hint and the error are linked with aria-describedby so screen readers read them with the
 * field; an error also sets aria-invalid.
 * Who uses it: every form from S1-E2 on.
 */
import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** A normal <input>'s attributes plus the label, hint and error text. */
export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: string;
  errorMessage?: string;
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
  ...inputProps
}: TextInputProps) {
  // Ids for the hint and error, so the field can point at whichever exist.
  const hintId = hint === undefined ? undefined : `${id}-hint`;
  const errorId = errorMessage === undefined ? undefined : `${id}-error`;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={errorMessage === undefined ? undefined : true}
        className={cn(
          'h-11 rounded-full border border-control-border bg-surface px-4 font-body text-[15px] text-ink',
          errorMessage !== undefined && 'border-destructive',
          className,
        )}
        {...inputProps}
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
