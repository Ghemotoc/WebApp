/**
 * SwitchButton: an on and off switch, a real button with role="switch" (story S1-E11-03; board
 * AdminSettings: a 56 by 32 px track inside a 44 px tall button, so the touch target stays big).
 *
 * The state shows as the knob's place and the words On or Off beside it, never colour alone
 * (WCAG 1.4.1). Who uses it: FlagRow, the Appearance settings
 * section and the "Unread only" switch on the notifications page (G8d).
 */
import { cn } from '@/lib/utils';

/** What the switch needs. */
interface SwitchButtonProps {
  /** The accessible name, for example the flag's label. */
  label: string;
  isOn: boolean;
  /** The word shown beside the track: "On" or "Off". */
  stateWord: string;
  isDisabled: boolean;
  onToggle: () => void;
}

/**
 * Renders the switch.
 *
 * @returns the button
 */
export function SwitchButton({ label, isOn, stateWord, isDisabled, onToggle }: SwitchButtonProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={label}
      disabled={isDisabled}
      onClick={onToggle}
      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-1 text-sm font-semibold text-heading disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative block h-8 w-14 rounded-full border transition-colors',
          isOn ? 'switch-track-on border-primary bg-primary' : 'border-control-border bg-tint',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] block h-6 w-6 rounded-full shadow transition-[left]',
            isOn ? 'left-[27px] bg-gold' : 'left-[3px] bg-surface',
          )}
        />
      </span>
      <span aria-hidden="true">{stateWord}</span>
    </button>
  );
}
