/**
 * Puts a test in a viewer's own time zone (bundle CALM-8b).
 * Why: the pause end shows in the viewer's local time (Robert, design canvas comment,
 * 20 Nov 2026, 17:49 UTC), and the browser's zone is whatever machine runs the tests (UTC in CI).
 * Pinning a zone such as Europe/Stockholm keeps the expected times the same everywhere and shows
 * the time is not Romania time.
 * Who calls it: the component tests of the paused line, the side column and the pause switch.
 * What it calls: Vitest's beforeEach and afterEach; Node reads process.env.TZ again when it changes.
 */
import { afterEach, beforeEach } from 'vitest';

/**
 * Sets the time zone the browser APIs use for every test in the current describe block, and puts
 * the earlier one back afterwards.
 * @param timeZone an IANA zone name, for example 'Europe/Stockholm'
 * @returns nothing; it registers the two hooks
 */
export function pinViewerTimeZone(timeZone: string): void {
  // Remember the machine's own zone so the next test file starts from it again.
  const machineTimeZone = process.env.TZ;
  beforeEach(() => {
    process.env.TZ = timeZone;
  });
  afterEach(() => {
    // An unset TZ has to be deleted, not set to the string "undefined".
    if (machineTimeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = machineTimeZone;
    }
  });
}

/**
 * Runs one piece of a test in another time zone, then puts the zone back.
 * @param timeZone an IANA zone name, for example 'America/New_York'
 * @param check the part of the test to run in that zone
 */
export function inTimeZone(timeZone: string, check: () => void): void {
  const earlierTimeZone = process.env.TZ;
  process.env.TZ = timeZone;
  try {
    check();
  } finally {
    // Put the zone back even when the check fails, so later tests are not affected.
    if (earlierTimeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = earlierTimeZone;
    }
  }
}
