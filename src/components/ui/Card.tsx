/**
 * Card: the white panel with a soft border and shadow that most boards build on (story S1-E1-03).
 *
 * Board values: white surface, 1 px #DED3E4 border, 24 px radius, 24 px padding, the card shadow.
 * Who uses it: settings panels, side cards, staff panels.
 */
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Renders a card around its children. Pass any <div> attribute, for example aria-labelledby.
 *
 * @returns the card
 */
export function Card({ className, ...divProps }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-border bg-surface p-6 shadow-card', className)}
      {...divProps}
    />
  );
}
