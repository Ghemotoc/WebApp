/**
 * ChoiceChips: pick one of a few choices, drawn as chips (story S1-E3-01; DoD pill system).
 *
 * Where Chip is one switch (aria-pressed), this is a group where exactly one is chosen: a
 * radiogroup of role="radio" buttons, as the boards draw language, category, status and rating
 * (NewStory 4.2, class .tmc-chip with role="radio"). Keyboard: Tab reaches the chosen chip, the
 * arrow keys move the choice, Space or Enter picks the focused one (the ARIA radio pattern).
 * Look: the same as Chip (white, #8E7B99 border, 36 px tall with a 44 px touch target; the chosen
 * one plum with a tick, never colour alone). A disabled choice is dashed and greyed, as on the
 * board's "coming" languages.
 * Who uses it: the new story form (language, category) and story settings; later Discover's
 * sort and the rating picker (S1-E3-06), and the reader's reading settings (S1-E4-02).
 */
import { useId, type KeyboardEvent, type ReactNode } from 'react';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { cn } from '@/lib/utils';

/** One choice in the group. */
export interface ChoiceOption {
  value: string;
  label: string;
  /** A small coloured dot before the label (the board's category chips). */
  dotColour?: string;
  isDisabled?: boolean;
  /** The option's own language when it differs from the page (WCAG 3.1.2). */
  lang?: string;
}

/** What a ChoiceChips group needs. */
export interface ChoiceChipsProps {
  /** The group's accessible name; shown on screen when isLabelVisible. */
  label: string;
  isLabelVisible?: boolean;
  /** Shows the visible label as an eyebrow (Cutive 14 px), as form section labels are drawn. */
  isLabelEyebrow?: boolean;
  options: ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  /** Text under the chips, linked with aria-describedby (a hint or an error). */
  description?: ReactNode;
  descriptionId?: string;
}

/**
 * Finds the next choice that can be picked for an arrow key, wrapping round at either end.
 *
 * @param key - the key pressed
 * @param options - the choices
 * @param currentIndex - the focused chip's index
 * @returns the index to pick, or null when the key is not an arrow key
 */
function nextIndexFor(key: string, options: ChoiceOption[], currentIndex: number): number | null {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[key];
  if (step === undefined) return null;
  let index = currentIndex;
  for (let tries = 0; tries < options.length; tries += 1) {
    index = (index + step + options.length) % options.length;
    if (!options[index]?.isDisabled) return index;
  }
  return null;
}

/** The classes for a chip in each state. */
function chipClasses(isChosen: boolean, isDisabled: boolean): string {
  return cn(
    "relative inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-3.5 font-body text-sm leading-none font-semibold whitespace-nowrap after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']",
    isChosen && 'border-chip-on bg-chip-on text-chip-on-text',
    !isChosen && !isDisabled && 'border-control-border bg-surface text-heading hover:bg-tint',
    isDisabled && 'cursor-not-allowed border-dashed border-dashed-border bg-panel text-meta',
  );
}

/** The label's classes: hidden, plain or an eyebrow (DoD: form section labels are eyebrows). */
function labelClasses(isVisible: boolean, isEyebrow: boolean): string {
  if (!isVisible) return 'sr-only';
  if (isEyebrow) return 'font-eyebrow text-sm leading-[1.3] font-normal text-eyebrow';
  return 'text-sm font-semibold text-ink';
}

/** One chip of the group. */
function ChoiceChip({
  id,
  option,
  isChosen,
  isTabStop,
  onPick,
  onKeyDown,
}: {
  id: string;
  option: ChoiceOption;
  isChosen: boolean;
  isTabStop: boolean;
  onPick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="radio"
      aria-checked={isChosen}
      aria-disabled={option.isDisabled ? true : undefined}
      lang={option.lang}
      tabIndex={isTabStop ? 0 : -1}
      onClick={onPick}
      onKeyDown={onKeyDown}
      className={chipClasses(isChosen, option.isDisabled === true)}
    >
      {isChosen && <CheckIcon />}
      {option.dotColour !== undefined && (
        <span
          aria-hidden="true"
          className="inline-block size-2.5 rounded-full"
          style={{ backgroundColor: option.dotColour }}
        />
      )}
      {option.label}
    </button>
  );
}

/**
 * Renders the group.
 *
 * @returns the radiogroup with its chips
 */
export function ChoiceChips({
  label,
  isLabelVisible = false,
  isLabelEyebrow = false,
  options,
  value,
  onChange,
  description,
  descriptionId,
}: ChoiceChipsProps) {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const chosenIndex = options.findIndex((option) => option.value === value);

  /** Picks a choice and moves focus to its chip, so arrow keys keep working. */
  function pick(index: number) {
    const option = options[index];
    if (option === undefined || option.isDisabled) return;
    onChange(option.value);
    document.getElementById(`${generatedId}-${index}`)?.focus();
  }

  /** The arrow keys move the choice. */
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = nextIndexFor(event.key, options, index);
    if (next === null) return;
    event.preventDefault();
    pick(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className={labelClasses(isLabelVisible, isLabelEyebrow)}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        className="flex flex-wrap gap-2"
      >
        {options.map((option, index) => (
          <ChoiceChip
            key={option.value}
            id={`${generatedId}-${index}`}
            option={option}
            isChosen={option.value === value}
            // Tab lands on the chosen chip, or the first one when nothing is chosen yet.
            isTabStop={option.value === value || (chosenIndex === -1 && index === 0)}
            onPick={() => pick(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          />
        ))}
      </div>
      {description !== undefined && (
        <p id={descriptionId} className="m-0 text-[13px] text-meta">
          {description}
        </p>
      )}
    </div>
  );
}
