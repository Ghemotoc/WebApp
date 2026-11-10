/**
 * Chip: a choice the reader can switch on and off, such as a filter (story S1-E1-03; DoD pill
 * system).
 *
 * The rule: clear grey glass (button-glass) with a #8E7B99 border (3:1) and ink text, 36 px tall
 * with a 44 px touch target, a visible focus ring, and the selected state shown by a tick and
 * aria-pressed, never by colour alone; a pressed chip takes the "on" fill with its glass sheen
 * (bundle G3 COMPONENTS, handoff: "Every pill is liquid glass"). It stays 36 px tall as the DoD pill
 * system says, so filter rows keep their room; its touch target is the handoff's 44 px.
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
  /**
   * A fuller name for screen readers when several chips share the same words ("Add to quotes:
   * post 3", FORUMS-1c). It must start with the visible words (WCAG 2.5.3, label in name).
   */
  accessibleName?: string;
}

/**
 * Renders a toggle chip. Its ::after layer stretches the touch target to 44 px without changing
 * how big it looks (DoD: 44 px touch target).
 *
 * @returns the chip button
 */
export function Chip({
  isPressed,
  onPressedChange,
  children,
  isDisabled = false,
  accessibleName,
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isPressed}
      aria-label={accessibleName}
      disabled={isDisabled}
      onClick={() => onPressedChange(!isPressed)}
      className={cn(
        // max-w-full with the truncating span below: a chip whose text a member typed as one very
        // long word (a detail's name) shortens with an ellipsis and never pushes the page
        // sideways (rule 21; GAPS-1 break test). Its full text stays the accessible name.
        "relative inline-flex h-9 max-w-full items-center justify-center gap-1.5 rounded-full border px-3.5 font-body text-sm leading-none font-semibold whitespace-nowrap after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']",
        isDisabled && 'cursor-not-allowed opacity-60',
        isPressed ? 'border-chip-on bg-chip-on text-chip-on-text' : 'button-glass',
      )}
    >
      {isPressed && <CheckIcon />}
      <span className="min-w-0 truncate py-1">{children}</span>
    </button>
  );
}
