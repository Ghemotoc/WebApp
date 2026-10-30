/**
 * Chip: a choice the reader can switch on and off, such as a filter (story S1-E1-03; DoD pill
 * system).
 *
 * The rule: white with a #8E7B99 border (3:1), plum text, 36 px tall with a 44 px touch target,
 * a visible focus ring, and the selected state shown by a tick and aria-pressed, never by colour
 * alone. Values from the Discover and Search boards (.tmc-chip).
 * Who uses it: filters on Discover and Search, tabs in the admin site.
 */
import type { ReactNode } from 'react';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { cn } from '@/lib/utils';

/** What a Chip needs. */
export interface ChipProps {
  isPressed: boolean;
  onPressedChange: (isPressed: boolean) => void;
  children: ReactNode;
  /** Can't be switched for now (CMS-1g: a fourth rank badge); shown faded. */
  isDisabled?: boolean;
}

/**
 * Renders a toggle chip. Its ::after layer stretches the touch target to 44 px without changing
 * how big it looks (DoD: 44 px touch target).
 *
 * @returns the chip button
 */
export function Chip({ isPressed, onPressedChange, children, isDisabled = false }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isPressed}
      disabled={isDisabled}
      onClick={() => onPressedChange(!isPressed)}
      className={cn(
        "relative inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-3.5 font-body text-sm leading-none font-semibold whitespace-nowrap after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']",
        isDisabled && 'cursor-not-allowed opacity-60',
        isPressed
          ? 'border-chip-on bg-chip-on text-chip-on-text'
          : 'border-control-border bg-surface text-heading hover:bg-tint',
      )}
    >
      {isPressed && <CheckIcon />}
      {children}
    </button>
  );
}
