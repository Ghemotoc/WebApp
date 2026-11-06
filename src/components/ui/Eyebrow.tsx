/**
 * Eyebrow: the small kicker above or beside a heading (story S1-E1-03).
 *
 * The rule (DoD; Robert, 6 Nov 2026, replacing the Cutive rule of 17 Oct): exactly the parent
 * company's eyebrow, Inter Bold at 12 px, in capitals, with 0.2em letter-spacing, in the eyebrow
 * colour (dark gold #815E18 on light, gold #E6C24C on night). The look lives in one place, the
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
