/**
 * Switch: the one on and off switch (bundle CALM-4; handover Step 2, Switch). It replaces the
 * 56 × 32 px gold-knob switch of S1-E11-03 everywhere: SwitchButton now draws this one.
 *
 * The rules (the simplified design, Robert, 20 Nov 2026):
 *   - A real <button role="switch" aria-checked>, inside a 44 px tall target.
 *   - The track is 52 × 32 px with a 3 px inset; the knob is 26 px, the surface colour with the
 *     card shadow. Off, the track is the control-border colour; on, it is the primary colour and
 *     the knob slides to the right.
 *   - The state never shows as colour alone (WCAG 1.4.1): the knob's place and, when given, the
 *     word "On" or "Off" beside it.
 * Who uses it: SwitchButton (settings, flags, appearance, notifications, privacy) and any new
 * screen that needs a switch.
 */
import { cn } from '@/lib/utils';

/** What the switch needs. */
export interface SwitchProps {
  /** The accessible name, for example the setting's label. */
  label: string;
  isOn: boolean;
  onToggle: () => void;
  /** The word shown beside the track, "On" or "Off"; left out when the row says it already. */
  stateWord?: string;
  isDisabled?: boolean;
  /** The id of a line that explains the switch, read after its name. */
  describedBy?: string;
  className?: string;
}

/**
 * Renders the switch.
 *
 * @returns the button
 */
export function Switch({
  label,
  isOn,
  onToggle,
  stateWord,
  isDisabled = false,
  describedBy,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={isDisabled}
      onClick={onToggle}
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-1 type-body font-semibold text-ink-heading disabled:opacity-60',
        className,
      )}
    >
      {/* The track: 52 × 32 px; control-border when off, primary when on. */}
      <span
        aria-hidden="true"
        data-state={isOn ? 'on' : 'off'}
        className={cn(
          'relative box-border block h-8 w-[52px] rounded-full border border-transparent transition-colors motion-reduce:transition-none',
          // switch-track-on: cobalt with a light rim at night (index.css, NIGHT-1).
          isOn ? 'switch-track-on bg-primary' : 'bg-control-border',
        )}
      >
        {/* The knob: 26 px, 3 px in from the track's edge. The track's 1 px border counts, so the
            knob sits at 2 px inside it: 3 px from the outside edge, 52 - 3 - 26 = 23 px when on. */}
        <span
          className={cn(
            'absolute top-[2px] block size-[26px] rounded-full bg-surface shadow-card transition-[left] motion-reduce:transition-none',
            isOn ? 'left-[22px]' : 'left-[2px]',
          )}
        />
      </span>
      {stateWord !== undefined && <span aria-hidden="true">{stateWord}</span>}
    </button>
  );
}
