/**
 * Select: the one drop-down style used everywhere (story S1-E1-03; DoD design rules, Robert,
 * canvas comment, 17 Oct 2026).
 *
 * The rule: only as wide as its longest option (never stretched), a 14 px chevron 14 px from the
 * right edge and vertically centred, 36 px right padding, a #8E7B99 border (3:1), 44 px tall and
 * a visible focus ring. The boards also draw 40 and 48 px versions; the DoD's 44 px wins
 * (docs/board-fixes.md). It is a real <select>, so keyboards and screen readers work as usual.
 *
 * Who uses it: the theme drop-down in the footer (S1-E1-03), the language drop-downs (S1-E1-04)
 * and every form after that.
 */
import type { ChangeEvent } from 'react';

import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { cn } from '@/lib/utils';

/** One choice in the drop-down. */
export interface SelectOption {
  value: string;
  label: string;
  /** The option's own language when it differs from the page, such as "Română" (WCAG 3.1.2). */
  lang?: string;
}

/** What a Select needs. */
export interface SelectProps {
  /** Unique id; the label points at it. */
  id: string;
  /** The label. Always present for screen readers; shown on screen when isLabelVisible. */
  label: string;
  isLabelVisible?: boolean;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** 'bar' in the top bar and footer (plum chevron), 'form' in forms (ink chevron), as on the boards. */
  placement?: 'bar' | 'form';
}

/**
 * Renders a labelled drop-down.
 *
 * @returns the label and the drop-down, side by side
 */
export function Select({
  id,
  label,
  isLabelVisible = false,
  options,
  value,
  onChange,
  placement = 'form',
}: SelectProps) {
  /** Passes the chosen value up; the parent keeps the state. */
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value);
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <label
        htmlFor={id}
        className={isLabelVisible ? 'text-[13px] font-semibold text-body' : 'sr-only'}
      >
        {label}
      </label>
      <span className="tmc-sel relative inline-flex w-fit max-w-full items-center align-middle">
        <select
          id={id}
          value={value}
          onChange={handleChange}
          className="h-11 w-auto max-w-full cursor-pointer appearance-none rounded-full border border-control-border bg-surface pr-9 pl-4 font-body text-sm font-semibold text-ink"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} lang={option.lang}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          className={cn(
            'pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2',
            placement === 'bar' ? 'text-heading' : 'text-ink',
          )}
        />
      </span>
    </span>
  );
}
