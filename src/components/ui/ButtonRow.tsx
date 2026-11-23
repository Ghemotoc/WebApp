/**
 * ButtonRow: the one footer for every member form and dialog (design books item 8, approved by
 * Robert, 23 Nov 2026, 13:25 UTC).
 *
 * The rule (Practical UI): buttons sit on the left, the main one first, then the quiet ones.
 * A button at the right edge of a wide form is easy to miss, above all with a screen magnifier.
 * The row wraps on a narrow screen and keeps 12 px between buttons (the spacing scale).
 * Who uses it: every member form and dialog footer. Staff screens keep their own rows.
 * What it calls: nothing; the buttons are its children, in the order they should read.
 */
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** What the row needs. */
interface ButtonRowProps {
  /** The buttons: the main one first, then the quiet ones, then any status text. */
  children: ReactNode;
  /** Extra classes for the row's place on the page, such as a top rule or margin. */
  className?: string;
}

/**
 * Renders the buttons left-aligned, main first.
 *
 * @returns a wrapping row of buttons
 */
export function ButtonRow({ children, className }: ButtonRowProps) {
  return <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>;
}
