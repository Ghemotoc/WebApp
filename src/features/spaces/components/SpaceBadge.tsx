/**
 * SpaceBadge: a space's round badge with its letters (bundle FORUMS-2, part a; S1-E8-06; the
 * board's 88 px circle with a white ring). Decorative: the space's name is always written beside
 * it, so the badge is hidden from screen readers.
 * Who shows it: SpaceHeaderCard (large) and SpaceRow (small). What it calls: lib/spaceLook.ts.
 */
import { cn } from '@/lib/utils';

import type { SpaceBanner } from '../api/spaces';
import { badgeStyles, spaceInitials } from '../lib/spaceLook';

/** What the badge needs. */
interface SpaceBadgeProps {
  name: string;
  banner: SpaceBanner;
  /** 'large' for the space's header (88 px), 'small' for a list row (44 px). */
  size: 'large' | 'small';
}

/**
 * Renders the badge.
 *
 * @returns the circle with one or two letters
 */
export function SpaceBadge({ name, banner, size }: SpaceBadgeProps) {
  const sizeClasses =
    size === 'large'
      ? 'h-[88px] w-[88px] border-4 border-surface-solid text-[28px]'
      : 'h-11 w-11 text-base';
  return (
    <span
      aria-hidden="true"
      style={badgeStyles[banner]}
      className={cn(
        'inline-flex flex-none items-center justify-center rounded-full font-heading font-extrabold',
        sizeClasses,
      )}
    >
      {spaceInitials(name)}
    </span>
  );
}
