/**
 * InfoTooltip: the one tooltip pattern for short explanations, such as why sign-up asks for the
 * year of birth (story S1-E2-02; Definition of Done, design rules, tooltip pattern; WCAG 2.2, 1.4.13).
 *
 * How it behaves:
 * - a 32 px "i" button (above the 24 px minimum target) opens it on hover, on keyboard focus and
 *   on tap; it stays open while the pointer is over the button or the tooltip;
 * - Escape closes it without moving focus;
 * - its text is always in the page and the field points at it with aria-describedby (pass
 *   tooltipId to the field), so screen readers read it with the field even when it is closed;
 * - it never holds the only copy of something a person needs to finish the task.
 * Board values (design/boards/Main.dc.html): #26142E background, #FBF7EC text, 260 px wide.
 * Where it opens: under the row that holds the button, from the row's left edge; that row needs
 * the class `relative`.
 * Who uses it: YearOfBirthField and MonthOfBirthField (src/features/auth/components/).
 */
import { useState, type KeyboardEvent } from 'react';

/** What the tooltip needs. */
export interface InfoTooltipProps {
  /** The tooltip's id; the field it explains lists it in aria-describedby. */
  tooltipId: string;
  /** The button's accessible name, for example "Why we ask for your year of birth". */
  buttonLabel: string;
  /** The explanation itself. */
  text: string;
}

/**
 * Renders the button and its tooltip.
 *
 * @returns the "i" button with the tooltip under it when open
 */
export function InfoTooltip({ tooltipId, buttonLabel, text }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  /** Escape closes the tooltip and leaves focus where it is (WCAG 2.2, 1.4.13 "dismissible"). */
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') setIsOpen(false);
  }

  return (
    // No positioning here: the tooltip opens under the row that holds the button (which must be
    // `relative`), lined up with the field, so it never runs off a 390 px screen.
    <span className="inline-flex">
      <button
        type="button"
        aria-label={buttonLabel}
        aria-expanded={isOpen}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex size-8 items-center justify-center rounded-full border border-control-border bg-surface font-heading text-sm font-bold text-heading"
      >
        i
      </button>
      {/* The tooltip listens for the pointer only so it stays open while the pointer is over it
          (WCAG 2.2, 1.4.13 "hoverable"); it takes no clicks or keys, so this is not a hidden control. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <span
        id={tooltipId}
        role="tooltip"
        hidden={!isOpen}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="absolute top-full left-0 z-20 w-[260px] max-w-[calc(100vw-48px)] rounded-2xl bg-ink px-4 py-3 text-[13px] leading-normal font-normal text-on-primary shadow-popover"
      >
        {text}
      </span>
    </span>
  );
}
