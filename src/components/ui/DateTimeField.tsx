/**
 * DateTimeField: the one date and time field of the app, a date box and a time box side by side
 * with an optional note under them (bundle CALM-1c).
 *
 * Why: Robert asked on 21 Nov 2026 that every fix from his full-canvas review becomes a default of
 * the rules, not per-page styling (rules doc "Design: website rules from Robert", section
 * "Defaults from the full-canvas review (20 to 21 Nov 2026)", Times). So every screen that asks
 * for a moment draws it the same way: the time is typed on the viewer's own clock (CALM-8b), and a
 * time in the hour the clocks skip in spring shows a quiet note saying when it will really run
 * ("That time does not exist on that day because the clocks go forward. It will run at 03:00.";
 * DESIGN thread, 20 Nov 2026, 20:09 UTC).
 * Staff scheduled items add a time zone next to it in CALM-9; that field sits beside this one.
 *
 * Who uses it: the chapter Publish panel (PublishPanel); other member screens move onto it as
 * they are redrawn. What it calls: TextInput for each box and skippedHourRunTime from
 * src/lib/local-time.ts. The words come from the caller, so it fits any locale namespace.
 */
import { TextInput } from './TextInput';

import { skippedHourRunTime } from '@/lib/local-time';

/** The typed date ("YYYY-MM-DD") and time ("HH:MM"), as the native fields give them. */
export interface DateTimeValue {
  date: string;
  time: string;
}

/** What a DateTimeField needs. */
export interface DateTimeFieldProps {
  /** A stem for the two boxes' ids: "<id>-date" and "<id>-time". */
  id: string;
  value: DateTimeValue;
  onChange: (value: DateTimeValue) => void;
  dateLabel: string;
  timeLabel: string;
  /** A quiet line under the boxes, such as "Your local time." Left out, none shows. */
  note?: string;
  /**
   * The words for the skipped-hour note, given the hour it will run ("03:00"). Left out, the
   * note never shows.
   */
  skippedHourNote?: (runTime: string) => string;
}

/**
 * Renders the date and time boxes, the note and, when it applies, the skipped-hour note.
 *
 * @returns the field group
 */
export function DateTimeField({
  id,
  value,
  onChange,
  dateLabel,
  timeLabel,
  note,
  skippedHourNote,
}: DateTimeFieldProps) {
  // Step 1: work out whether the typed time is in the hour the clocks skip, and when it runs.
  const runTime = skippedHourRunTime(value.date, value.time);
  return (
    <div className="flex flex-wrap gap-3">
      {/* Step 2: the date box; it wraps under the time only on a very narrow screen. */}
      <div className="min-w-[140px] flex-1">
        <TextInput
          id={`${id}-date`}
          type="date"
          label={dateLabel}
          value={value.date}
          onChange={(event) => onChange({ ...value, date: event.target.value })}
        />
      </div>
      {/* Step 3: the time box, on the viewer's own clock. */}
      <div className="min-w-[110px] flex-1">
        <TextInput
          id={`${id}-time`}
          type="time"
          label={timeLabel}
          value={value.time}
          onChange={(event) => onChange({ ...value, time: event.target.value })}
        />
      </div>
      {/* Step 4: the quiet notes under both boxes. */}
      {note !== undefined && <p className="m-0 w-full type-meta text-ink-muted">{note}</p>}
      {runTime !== null && skippedHourNote !== undefined && (
        <p className="m-0 w-full type-meta text-ink-muted" role="status">
          {skippedHourNote(runTime)}
        </p>
      )}
    </div>
  );
}
