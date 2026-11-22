/**
 * A class assignment's due moment: how it reads and how the teacher's date and time field turns
 * into it (bundle MUST-1, part d, IDEA-20261108-8; a date and a time since CALM-7d, part 2).
 *
 * The database keeps the moment (forum_threads.due_at). The teacher types a date and a time on
 * their own clock in DateTimeField, and every member reads the moment on theirs (the viewer's
 * local time, CALM-8b): "Friday 13 Nov, 08:00".
 * Who calls it: ThreadHeader, ClassAssignmentsCard and ClassDueDateField.
 * What it calls: the browser's Intl.DateTimeFormat; localFieldsFor() and localTimeToInstant()
 * from src/lib/local-time.ts.
 */
import type { DateTimeValue } from '@/components/ui/DateTimeField';
import { localFieldsFor, localTimeToInstant } from '@/lib/local-time';
import { dateLocaleFor } from '@/lib/romania-time';

/** The time the field offers before the teacher picks one: the end of the day. */
const defaultDueTime = '23:59';

/**
 * Formats a due moment on the reader's own clock.
 *
 * @param dueAt - the moment as the database gives it (ISO)
 * @param language - the interface language ("en", "ro")
 * @param timeZone - an IANA zone for tests; left out, the browser's own zone is used
 * @returns "Friday 13 Nov, 08:00" in English, "vineri, 13 nov., 08:00" in Romanian
 */
export function dueMomentText(dueAt: string, language: string, timeZone?: string): string {
  // The weekday spelled out, the day, the short month and the 24-hour time, as the idea asks.
  // English reads it the British way, day before month, as the rest of the copy does.
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(dueAt));
}

/**
 * The field's starting values for a due moment.
 *
 * @param dueAt - the moment already set (ISO), or null
 * @returns its date and time on the viewer's clock; with none set, no date and 23:59
 */
export function dueFieldsOf(dueAt: string | null): DateTimeValue {
  if (dueAt === null) return { date: '', time: defaultDueTime };
  return localFieldsFor(new Date(dueAt));
}

/**
 * The moment the field's date and time mean, ready for set_forum_thread_due_date().
 *
 * @param fields - the typed date and time, on the viewer's own clock
 * @returns the ISO moment, or null when the date is empty or not a real date and time
 */
export function dueAtOf(fields: DateTimeValue): string | null {
  const instant = localTimeToInstant(fields.date, fields.time);
  return instant === null ? null : instant.toISOString();
}
