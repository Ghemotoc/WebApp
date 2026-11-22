/**
 * competitionDates: the moments the competition form starts with, and how its date and time
 * fields turn into moments (bundle CLASS-POINTS, part 2, story S1-E8-15; a date and a time on
 * the teacher's own clock since CALM-7d, part 3). The database decides what is allowed (a start
 * from today, an end before the class locks); these are only a sensible starting point.
 *
 * Who calls it: CompetitionFormPage. What it calls: localFieldsFor() and localTimeToInstant()
 * from src/lib/local-time.ts.
 */
import type { DateTimeValue } from '@/components/ui/DateTimeField';
import { localFieldsFor, localTimeToInstant } from '@/lib/local-time';

/** How many days a new competition runs unless the teacher changes the dates. */
const defaultLengthInDays = 14;

/** The time a competition's end starts at in the form: the end of its last day. */
const defaultEndTime = '23:59';

/** The start and the end, as the form's two date and time fields hold them. */
export interface CompetitionMomentFields {
  starts: DateTimeValue;
  ends: DateTimeValue;
}

/**
 * The fields a new competition's form starts with: open from now, closing at 23:59 two weeks
 * later, both on the teacher's own clock. Starting "now" means the competition opens as soon as it
 * is saved, as a first day of "today" did before.
 *
 * @param now - the current moment
 * @returns the two fields
 */
export function defaultMomentFields(now: Date): CompetitionMomentFields {
  const lastDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + defaultLengthInDays,
    12,
  );
  return {
    starts: localFieldsFor(now),
    ends: { date: localFieldsFor(lastDay).date, time: defaultEndTime },
  };
}

/**
 * The fields for a competition already saved.
 *
 * @param startsAt - its start (ISO)
 * @param endsAt - its end (ISO)
 * @returns the two fields, on the viewer's own clock
 */
export function savedMomentFields(startsAt: string, endsAt: string): CompetitionMomentFields {
  return { starts: localFieldsFor(new Date(startsAt)), ends: localFieldsFor(new Date(endsAt)) };
}

/**
 * The moment one field means, ready for save_class_competition().
 *
 * @param fields - the typed date and time, on the viewer's own clock
 * @returns the ISO moment, or null when it isn't a real date and time (the database then answers
 *   competition:dates)
 */
export function momentOf(fields: DateTimeValue): string | null {
  const instant = localTimeToInstant(fields.date, fields.time);
  return instant === null ? null : instant.toISOString();
}
