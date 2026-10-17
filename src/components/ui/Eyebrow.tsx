/**
 * Eyebrow: the small kicker above or beside a heading (story S1-E1-03).
 *
 * The rule (DoD; Robert, canvas comment, 17 Oct 2026): Cutive, 14 px, weight 400, sentence case,
 * no added letter-spacing, in the eyebrow colour (dark gold on light, gold on night). Pills,
 * table headers and buttons are not eyebrows.
 * Who uses it: page headers, shelf headings, form section labels.
 */
import type { ReactNode } from 'react';

/**
 * Renders an eyebrow line. Write the text in sentence case; nothing here changes the case.
 *
 * @returns the eyebrow paragraph
 */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-eyebrow text-sm leading-[1.3] font-normal text-eyebrow">{children}</p>;
}
