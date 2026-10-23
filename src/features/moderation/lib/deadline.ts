/**
 * Works out how a case's deadline reads: "5 h 50 min left", "6 d 23 h left" or "2 h overdue"
 * (story S1-E10-03a; board 8.2's Deadline column).
 *
 * Who calls it: components/DeadlineLabel.tsx, which turns the parts into the reader's language.
 * Pure arithmetic with no dates read from the clock here, so it can be unit-tested with a fixed
 * "now" (src/features/moderation/lib/deadline.test.ts).
 */

/** How far a deadline is, in whole units, and which side of it we are on. */
export interface DeadlineParts {
  /** 'left' before the deadline, 'overdue' after it. */
  side: 'left' | 'overdue';
  days: number;
  hours: number;
  minutes: number;
}

/** One minute, one hour and one day in milliseconds. */
const minuteMs = 60_000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

/**
 * Splits the time between now and the deadline into days, hours and minutes.
 *
 * @param deadlineAt - the deadline, as the database gives it (ISO 8601)
 * @param now - the moment to measure from
 * @returns the parts; a deadline in the past comes back as overdue, measured the other way
 */
export function describeDeadline(deadlineAt: string, now: Date): DeadlineParts {
  // Step 1: which side of the deadline we are on; measure the gap as a positive number.
  const gapMs = new Date(deadlineAt).getTime() - now.getTime();
  const side: DeadlineParts['side'] = gapMs >= 0 ? 'left' : 'overdue';
  const absoluteMs = Math.abs(gapMs);
  // Step 2: whole days, then the hours and minutes left over.
  const days = Math.floor(absoluteMs / dayMs);
  const hours = Math.floor((absoluteMs - days * dayMs) / hourMs);
  const minutes = Math.floor((absoluteMs - days * dayMs - hours * hourMs) / minuteMs);
  return { side, days, hours, minutes };
}

/**
 * Which two units matter for a label: days and hours past a day, hours and minutes under it.
 *
 * @param parts - from describeDeadline()
 * @returns 'days' or 'hours'
 */
export function deadlineScale(parts: DeadlineParts): 'days' | 'hours' {
  return parts.days >= 1 ? 'days' : 'hours';
}
