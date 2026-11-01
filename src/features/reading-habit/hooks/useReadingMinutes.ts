/**
 * useReadingMinutes: counts minutes of active reading in the chapter reader, for the private
 * streak (bundle IDEAS-1, part b; idea IDEA-20261031-13, criterion 2).
 *
 * How:
 * - Only while the reader's streak is on; a reader who never turned it on sends nothing at all.
 * - Once a minute, if the tab is visible and the reader scrolled, pressed a key or touched the
 *   page in the last two minutes (lib/activeReading.ts), it adds one minute (add_reading_minute()).
 *   The database adds it to today on the reader's clock and ignores a second one within 45
 *   seconds, so two open tabs don't count double.
 * - Only the day's total is kept: never which chapter or story.
 * Who calls it: ChapterReaderPage. What it calls: api/readingHabit.ts, hooks/useReadingHabit.ts.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { addReadingMinute } from '../api/readingHabit';
import { isActivelyReading } from '../lib/activeReading';

import { readingHabitQueryKey, useReadingHabit } from './useReadingHabit';

/** How often a minute is checked. */
const minuteMilliseconds = 60 * 1000;
/** What counts as the reader being there. */
const activityEvents = ['scroll', 'keydown', 'pointerdown', 'touchstart', 'wheel'] as const;

/** Sends one minute, and refreshes the streak so the Library shows it. */
async function sendMinute(refresh: () => void) {
  try {
    await addReadingMinute(await requireClient());
    refresh();
  } catch (error) {
    // A lost minute is not worth interrupting the chapter for; say so in the console only.
    console.warn('A minute of reading was not counted.', error);
  }
}

/**
 * Counts the minutes while the streak is on.
 */
export function useReadingMinutes() {
  const { habit } = useReadingHabit();
  const queryClient = useQueryClient();
  const isOn = habit !== null && habit !== undefined;
  useEffect(() => {
    if (!isOn) return;
    // Step 1: opening the chapter counts as being there.
    let lastActivityAt = Date.now();
    const noteActivity = () => {
      lastActivityAt = Date.now();
    };
    for (const name of activityEvents) {
      window.addEventListener(name, noteActivity, { passive: true });
    }
    // Step 2: once a minute, count it if the reader was there.
    const refresh = () => void queryClient.invalidateQueries({ queryKey: [readingHabitQueryKey] });
    const timer = window.setInterval(() => {
      const isVisible = document.visibilityState === 'visible';
      if (isActivelyReading(isVisible, lastActivityAt, Date.now())) void sendMinute(refresh);
    }, minuteMilliseconds);
    return () => {
      window.clearInterval(timer);
      for (const name of activityEvents) window.removeEventListener(name, noteActivity);
    };
  }, [isOn, queryClient]);
}
