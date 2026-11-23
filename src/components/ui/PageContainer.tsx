/**
 * PageContainer: the centred column every page and the footer sit in (story S1-E1-03).
 *
 * The column is narrower than the floating navigation bar above it, so the bar reads as floating
 * over the page instead of sharing its edges (GLASS-4; Robert, 12 Nov 2026). Since CALM-9
 * (Robert's canvas comments of 23 Nov 2026) the bar (TopBar) is up to 1376 px wide with side
 * space of clamp(16px, 2.2vw, 32px), and the column is up to 1280 px wide with side space of
 * clamp(16px, 4vw, 64px) plus 10 px: at 1440 px the column sits 48 px inside the bar on each
 * side, and at least 10 px at every width. Nothing touches the screen edge (CLAUDE.md rule 21).
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
        'mx-auto box-content max-w-[1280px] px-[calc(clamp(16px,4vw,64px)+10px)]',
        className,
      )}
      {...divProps}
    />
  );
}
