/**
 * Select: the one drop-down style used everywhere (story S1-E1-03; DoD design rules, Robert,
 * canvas comment, 17 Oct 2026).
 *
 * The rule: only as wide as its longest option (never stretched), a 14 px chevron 14 px from the
 * right edge and vertically centred, 36 px right padding, a control-border edge (#725F88 by day since CALM-1b, 3:1), 44 px tall and
 * a visible focus ring. The boards also draw 40 and 48 px versions; the DoD's 44 px wins
 * (docs/board-fixes.md). On member pages it is a rounded square with the 12 px field corner,
 * like a text field, not a pill (Robert, Atlas look-check comment, 26 Nov 2026); staff pages
 * keep the pill. It is a real <select>, so keyboards and screen readers work as usual.
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

/** A named group of choices, drawn as an <optgroup> (the page builder's block families, CMS-2b). */
export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

/** What a Select needs. */
export interface SelectProps {
  /** Unique id; the label points at it. */
  id: string;
  /** The label. Always present for screen readers; shown on screen when isLabelVisible. */
  label: string;
  isLabelVisible?: boolean;
  options: SelectOption[];
  /** When given, the choices are drawn in these named groups instead of `options`. */
  groups?: SelectGroup[];
  value: string;
  onChange: (value: string) => void;
  /** 'bar' in the top bar and footer (plum chevron), 'form' in forms (ink chevron), as on the boards. */
  placement?: 'bar' | 'form';
  /** The id of a hint under the drop-down, read with it by screen readers (S1-E2-06). */
  descriptionId?: string;
  /**
   * True in a form whose other fields have their label above them (bundle 10, board J20): the
   * label is shown above the drop-down in the same type as a text field's label, whatever
   * isLabelVisible says. Left out, the label sits beside it, small, as in a filter bar.
   */
  isLabelAbove?: boolean;
  /**
   * A visible label beside the drop-down in the label style (15 px, semibold, the heading colour)
   * instead of the small meta style, as board E26 draws "Whose tree".
   */
  isLabelStrong?: boolean;
  /** True while the choice is missing or wrong after a send, so screen readers say so. */
  isInvalid?: boolean;
}

/**
 * The classes of the wrapper and the label: side by side and small, or stacked like a text
 * field's label.
 *
 * @param isLabelVisible - whether the label shows on screen
 * @param isLabelAbove - whether it sits above the drop-down
 * @param isLabelStrong - whether a label beside it takes the label style
 * @returns the two class strings
 */
function labelLayout(isLabelVisible: boolean, isLabelAbove: boolean, isLabelStrong: boolean) {
  // A label above the drop-down is always shown: a form field's label is never hidden
  // (WCAG 3.3.2; bundle 10, boards J11 and J20), so isLabelAbove alone is enough.
  if (isLabelAbove) {
    return {
      wrapper: 'flex flex-col items-start gap-2',
      label: 'type-body font-semibold wrap-anywhere text-ink',
    };
  }
  if (!isLabelVisible) {
    return { wrapper: 'inline-flex flex-wrap items-center gap-2', label: 'sr-only' };
  }
  // Board E26: a strong label beside the drop-down, in the label style.
  if (isLabelStrong) {
    return {
      wrapper: 'inline-flex flex-wrap items-center gap-2',
      label: 'type-label font-semibold text-ink-heading',
    };
  }
  return {
    wrapper: 'inline-flex flex-wrap items-center gap-2',
    label: 'type-meta font-semibold text-ink-muted',
  };
}

/**
 * The <option> elements of a list of choices.
 *
 * @returns the options
 */
function SelectOptions({ options }: { options: SelectOption[] }) {
  return options.map((option) => (
    <option key={option.value} value={option.value} lang={option.lang}>
      {option.label}
    </option>
  ));
}

/**
 * Renders a labelled drop-down.
 *
 * @returns the label and the drop-down, side by side (or the label above, with isLabelAbove)
 */
export function Select({
  id,
  label,
  isLabelVisible = false,
  options,
  groups,
  value,
  onChange,
  placement = 'form',
  descriptionId,
  isLabelAbove = false,
  isLabelStrong = false,
  isInvalid = false,
}: SelectProps) {
  const layout = labelLayout(isLabelVisible, isLabelAbove, isLabelStrong);
  /** Passes the chosen value up; the parent keeps the state. */
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value);
  }

  return (
    // max-w-full and min-w-0: a very long option (a story title without spaces) shortens with an
    // ellipsis inside the row, and never pushes the page sideways (rule 21; G10c4 break test).
    <span className={`max-w-full min-w-0 ${layout.wrapper}`}>
      <label htmlFor={id} className={layout.label}>
        {label}
      </label>
      <span className="tmc-sel relative inline-flex w-fit max-w-full items-center align-middle">
        <select
          id={id}
          value={value}
          aria-describedby={descriptionId}
          aria-invalid={isInvalid || undefined}
          onChange={handleChange}
          className="h-11 w-auto max-w-full cursor-pointer appearance-none text-ellipsis rounded-field in-data-[area=staff]:rounded-full border border-control-border bg-surface pr-9 pl-4 font-body type-body font-semibold text-ink"
        >
          {groups === undefined ? (
            <SelectOptions options={options} />
          ) : (
            groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                <SelectOptions options={group.options} />
              </optgroup>
            ))
          )}
        </select>
        <ChevronDownIcon
          className={cn(
            'pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2',
            placement === 'bar' ? 'text-ink-heading' : 'text-ink',
          )}
        />
      </span>
    </span>
  );
}
