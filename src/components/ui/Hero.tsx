/**
 * Hero: the one panel at the top of a page (bundle CALM-4; handover Step 2, Hero).
 *
 * The rules (the simplified design, Robert, 20 Nov 2026):
 *   - One hero per page: the solid box surface with its soft edge, shadow-popover and the card
 *     corners. It was glass until the flat themes bundle (Robert, 23 Nov 2026, 19:26 UTC: no glass
 *     except the nav bars).
 *   - Padding 40 px, 24 px under 900 px.
 *   - It holds the page's title and a line or two; a Meter (src/components/ui/Meter.tsx) can sit
 *     inside it when the page tracks progress.
 * The caller gives the heading level, so the page keeps one h1.
 * Who uses it: pages that open with a summary (the /design page shows it); bundles after CALM-4
 * move each page's opening card onto it.
 */
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** What a Hero needs. */
export interface HeroProps {
  children: ReactNode;
  /** Its accessible name, when the hero is a landmark of its own (an id of its heading). */
  labelledBy?: string;
  className?: string;
}

/**
 * The hero's look on its own, for a section that must stay its own element (the Read page's
 * featured carousel needs its own role description and name; CALM-7c).
 */
export const heroClasses =
  'box-surface flex flex-col gap-4 rounded-card p-6 shadow-popover min-[900px]:p-8';

/**
 * Renders the hero.
 *
 * @returns the section
 */
export function Hero({ children, labelledBy, className }: HeroProps) {
  return (
    <section aria-labelledby={labelledBy} className={cn(heroClasses, className)}>
      {children}
    </section>
  );
}
