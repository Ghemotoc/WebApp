/**
 * Meter: a thin progress line, the thread on its track (bundle CALM-4; handover Step 2, Hero).
 *
 * The rules (the simplified design, Robert, 20 Nov 2026): 2 px tall, the thread colour on the
 * --track colour, never a colour alone: it is a role="meter" with aria-valuenow and a
 * valuetext in words ("3 of 10 chapters read"), and the caller writes the same words beside it.
 * Who uses it: Hero (pages that track progress) and the /design page.
 */
import { cn } from '@/lib/utils';

/** What a Meter needs. */
export interface MeterProps {
  /** Its accessible name, for example "Your writing month". */
  label: string;
  value: number;
  /** The largest value; 100 when left out. */
  max?: number;
  /** The value in words, for example "3 of 10 chapters". */
  valueText: string;
  className?: string;
}

/**
 * Renders the meter.
 *
 * @returns the line
 */
export function Meter({ label, value, max = 100, valueText, className }: MeterProps) {
  // Keep the value inside 0 to max, then turn it into the share of the line to fill.
  const clamped = Math.min(max, Math.max(0, value));
  const percent = max > 0 ? (clamped / max) * 100 : 0;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      aria-valuetext={valueText}
      className={cn('block h-0.5 w-full bg-[var(--track)]', className)}
    >
      <span className="block h-full bg-thread" style={{ width: `${String(percent)}%` }} />
    </div>
  );
}
