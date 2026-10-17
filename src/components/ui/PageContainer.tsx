/**
 * PageContainer: the centred column every page, the top bar and the footer sit in (story S1-E1-03).
 *
 * Board values: at most 1280 px wide, with side padding that grows from 16 px on phones to 64 px
 * on wide screens (clamp(16px, 4vw, 64px)), so nothing touches the screen edge at any width
 * (CLAUDE.md rule 21).
 * Who uses it: AppLayout, TopBar, Footer and the pages.
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
      className={cn('mx-auto box-content max-w-[1280px] px-[clamp(16px,4vw,64px)]', className)}
      {...divProps}
    />
  );
}
