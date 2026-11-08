/**
 * Card: the glass panel with a soft border and shadow that most boards build on (story S1-E1-03;
 * restyled in bundle G3 COMPONENTS from the liquid glass handoff, "Cards and status").
 *
 * Values: see-through white glass (bg-surface), a 28 px radius (--r-lg), 24 px padding and the card
 * shadow. index.css gives every such card the bright glass rim and a top highlight; the staff area
 * stays flat.
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
