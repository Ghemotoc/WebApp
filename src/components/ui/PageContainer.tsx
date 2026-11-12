/**
 * PageContainer: the centred column every page and the footer sit in (story S1-E1-03).
 *
 * The column is a little narrower than the floating navigation bar above it: 10 px in from each
 * of the bar's edges, at every screen width, so the bar reads as floating over the page instead of
 * sharing its edges (GLASS-4; Robert, 12 Nov 2026). The bar (TopBar) is at most 1280 px wide with
 * side space of clamp(16px, 4vw, 64px); the column is therefore at most 1260 px wide with that
 * side space plus 10 px. Nothing touches the screen edge at any width (CLAUDE.md rule 21).
 * Who uses it: AppLayout, Footer and the pages.
 */
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Renders the column around its children.
 *
 * @returns the container
 */
export function PageContainer({ className, ...divProps }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // Lets the layout test find the column and measure it against the bar (GLASS-4).
      data-page-column
      className={cn(
        'mx-auto box-content max-w-[1260px] px-[calc(clamp(16px,4vw,64px)+10px)]',
        className,
      )}
      {...divProps}
    />
  );
}
