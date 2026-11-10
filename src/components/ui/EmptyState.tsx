/**
 * EmptyState: what a screen shows when there is nothing to list yet (story S1-E1-03).
 *
 * Board values (Search, empty results): 40 by 32 px padding, white surface, 1 px border, 24 px
 * radius, a 26 px Funnel Display heading, 16 px text and one action.
 * Who uses it: Search with no results, an empty library, an empty queue.
 */
import type { ReactNode } from 'react';

/** What an EmptyState needs. */
export interface EmptyStateProps {
  title: string;
  description: string;
  /** Usually one Button or link that helps the reader move on. */
  action?: ReactNode;
}

/**
 * Renders the empty state box.
 *
 * @returns the box
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface px-8 py-10">
      <h2 className="m-0 text-[26px] font-bold">{title}</h2>
      <p className="m-0 text-base text-body">{description}</p>
      {action}
    </div>
  );
}
