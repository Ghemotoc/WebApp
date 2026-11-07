/**
 * Eyebrow: the small kicker above or beside a heading (story S1-E1-03).
 *
 * The rule (DoD; the liquid glass design, Robert, 7 Nov 2026, replacing the dark gold of 6 Nov):
 * Inter Bold at 11 px, in capitals, with 0.18em letter-spacing, black by day and white at night,
 * never gold. The look lives in one place, the
 * `eyebrow` utility in src/styles/index.css. Pills, table headers and buttons are not eyebrows.
 * Who uses it: page headers, shelf headings, form section labels.
 */
import type { ReactNode } from 'react';

/**
 * Renders an eyebrow line. Write the text in sentence case: the style shows it in capitals, and
 * screen readers still read the words as written.
 *
 * @returns the eyebrow paragraph
 */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}
