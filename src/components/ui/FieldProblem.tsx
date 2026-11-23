/**
 * FieldProblem: one short line under a field that says what is wrong with it, such as "Write a
 * comment first." after Post was pressed on an empty box (design books item 9).
 *
 * For fields drawn by hand rather than through TextInput or Textarea (which show their own
 * errorMessage). The field points at this line with aria-describedby and sets aria-invalid, so a
 * screen reader reads it with the field.
 * Who uses it: CommentComposer, MessageComposer and the competition template picker.
 * What it calls: nothing.
 */
import type { ReactNode } from 'react';

/** What the line needs. */
export interface FieldProblemProps {
  /** The id the field's aria-describedby names. */
  id: string;
  /** False draws nothing. */
  isShown: boolean;
  children: ReactNode;
}

/**
 * Renders the line, or nothing while there is no problem.
 *
 * @returns the line, or null
 */
export function FieldProblem({ id, isShown, children }: FieldProblemProps) {
  if (!isShown) return null;
  return (
    <p id={id} className="m-0 text-sm text-destructive">
      {children}
    </p>
  );
}
