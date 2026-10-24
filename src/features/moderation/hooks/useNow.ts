/**
 * useNow: the current moment, refreshed every minute, for countdowns (story S1-E10-03a).
 *
 * Why a hook: a component must not read the clock while it renders (React's purity rule), so the
 * moment is state, set once and then moved on by a timer. One minute is enough for labels that
 * show minutes.
 * Who calls it: DeadlineLabel.
 */
import { useEffect, useState } from 'react';

/** How often the moment moves on. */
const tickEveryMs = 60_000;

/**
 * Follows the clock, a minute at a time.
 *
 * @returns the current moment, as of the last tick
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), tickEveryMs);
    return () => clearInterval(timer);
  }, []);
  return now;
}
