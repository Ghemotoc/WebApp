/**
 * PageContainer: the centred column every page and the footer sit in (story S1-E1-03).
 *
 * The column is narrower than the floating navigation bar above it, so the bar reads as floating
 * over the page instead of sharing its edges (GLASS-4; Robert, 12 Nov 2026). Since CALM-9
 * (Robert's canvas comments of 23 Nov 2026) the bar (TopBar) is up to 1376 px wide with side
 * space of clamp(16px, 2.2vw, 32px), and the column is up to 1280 px wide. Its side space is on the
 * design books' spacing steps (user stories Section 1: 64 px gutter at 1440 px): 24 px on phones,
 * 32 px from 768 px and 64 px from 1024 px, so at 1440 px the column sits 48 px inside the bar on
 * each side, and at least 8 px inside it at every width. Nothing touches the screen edge (CLAUDE.md rule 21).
 * A page with one column and nothing on the right (the waiting list's holding page, board H08)
 * passes `narrow`: the column is then at most 760 px wide and centred, so on a desktop the text
 * doesn't run along the left edge with an empty band beside it (flat themes bundle, part 2;
 * design books review, 23 Nov 2026).
 * Who uses it: AppLayout, Footer and the pages.
 */
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** What the column takes: any div attribute, plus whether it is the narrow single column. */
interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** True for a single-column page: at most 760 px wide, centred. */
  narrow?: boolean;
}

/**
 * Renders the column around its children.
 *
 * @param props.narrow - true for a single-column page (760 px, centred)
 * @returns the container
 */
export function PageContainer({ className, narrow = false, ...divProps }: PageContainerProps) {
  // The widest the column grows: 1280 px for a normal page, 760 px for a single column.
  const widthClass = narrow ? 'max-w-[760px]' : 'max-w-[1280px]';
  return (
    <div
      // Lets the layout test find the column and measure it against the bar (GLASS-4).
      data-page-column
      className={cn('mx-auto box-content px-6 md:px-8 lg:px-16', widthClass, className)}
      {...divProps}
    />
  );
}
