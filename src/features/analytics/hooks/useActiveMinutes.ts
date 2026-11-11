/**
 * useActiveMinutes: says "here" once a minute while someone signed in uses the app (story
 * S1-E15-04, bundle ANALYTICS-1a).
 *
 * How: while signed in, it listens for scrolls, keys and touches; once a minute, if the tab is
 * visible and the person was there in the last two minutes (lib/activeMinute.ts), it calls
 * note_active_minute(), saying whether a chapter is open. The database ignores a second minute
 * within 45 seconds, so two open tabs don't count double. Signed-out visitors send nothing.
 * Who calls it: components/ActiveMinutesCounter.tsx. What it calls: api/activeMinutes.ts.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { noteActiveMinute } from '../api/activeMinutes';
import { isChapterPath, minuteCounts } from '../lib/activeMinute';

/** How often a minute is checked. */
const minuteMilliseconds = 60 * 1000;
/** What counts as the person being there. */
const activityEvents = ['scroll', 'keydown', 'pointerdown', 'touchstart', 'wheel'] as const;

/** Sends one minute; a lost minute isn't worth interrupting anyone for. */
async function sendMinute(isReading: boolean) {
  try {
    await noteActiveMinute(await requireClient(), isReading);
  } catch (error) {
    console.warn('A minute in the app was not counted.', error);
  }
}

/**
 * Counts the minutes while signed in.
 *
 * @param isSignedIn - whether someone is signed in
 */
export function useActiveMinutes(isSignedIn: boolean) {
  const { pathname } = useLocation();
  // The address is read when the minute is sent, so moving between pages doesn't restart the clock.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  useEffect(() => {
    if (!isSignedIn) return;
    // Step 1: opening the app counts as being there, and as the day's first minute.
    let lastActivityAt = Date.now();
    void sendMinute(isChapterPath(pathnameRef.current));
    const noteActivity = () => {
      lastActivityAt = Date.now();
    };
    for (const name of activityEvents) {
      window.addEventListener(name, noteActivity, { passive: true });
    }
    // Step 2: once a minute, count it if the person was there.
    const timer = window.setInterval(() => {
      const isVisible = document.visibilityState === 'visible';
      if (minuteCounts(isVisible, lastActivityAt, Date.now())) {
        void sendMinute(isChapterPath(pathnameRef.current));
      }
    }, minuteMilliseconds);
    return () => {
      window.clearInterval(timer);
      for (const name of activityEvents) window.removeEventListener(name, noteActivity);
    };
  }, [isSignedIn]);
}
