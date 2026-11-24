/**
 * useReadingSettings: the reader's reading settings, applied at once and remembered (story
 * S1-E4-02: "saved to their account and applied on every device"; BOOKS B04, user story 2.4:
 * "remembered: in the account when signed in, in the browser when signed out").
 *
 * How:
 * - A signed-in reader's settings are read once (reading_settings, their own row); until they
 *   arrive the defaults apply. A signed-out visitor's settings come from this browser
 *   (browserReadingSettings), or the defaults when none were kept.
 * - A change shows on the page straight away (the query's cached copy is replaced), and the whole
 *   set is saved 600 ms after the last change, so dragging the size slider saves once, not at
 *   every step. Leaving the chapter saves anything still waiting. A visitor's change is kept in
 *   the browser straight away.
 * Who calls it: useReadingLook (applies them) and ReadingSettingsPanel (changes them).
 * What it calls: api/readingSettings.ts → reading_settings and save_reading_settings(), and
 * lib/browserReadingSettings.ts for visitors.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  defaultReadingSettings,
  fetchReadingSettings,
  saveReadingSettings,
  type ReadingSettings,
} from '../api/readingSettings';
import {
  readBrowserReadingSettings,
  storeBrowserReadingSettings,
} from '../lib/browserReadingSettings';

/** The query's first key, shared so every chapter reads the same cached copy. */
export const readingSettingsQueryKey = 'reading-settings';

/** How long after the last change the settings are saved. */
const saveDelayMilliseconds = 600;

/**
 * Follows and changes the reader's settings.
 *
 * @returns settings (always a full set), isSignedIn, change(partial), saveFailed
 */
export function useReadingSettings() {
  const { userId, isKnown } = useSession();
  const isSignedIn = isKnown && userId !== null;
  const queryClient = useQueryClient();
  const queryKey = [readingSettingsQueryKey, userId];
  // Step 1: the saved settings, read once for the session.
  const query = useQuery({
    queryKey,
    enabled: isSignedIn,
    staleTime: Infinity,
    queryFn: async () => fetchReadingSettings(await requireClient()),
  });
  // A visitor's kept settings stand in for the account's; a reader waits on the defaults.
  const fallback = isSignedIn ? defaultReadingSettings : readBrowserReadingSettings();
  const settings = query.data ?? fallback;
  // Step 2: the save, waiting for the changes to stop.
  const { scheduleSave, saveFailed } = useDelayedSave();
  // Step 3: a change replaces the cached copy at once, then waits to be saved.
  const change = useCallback(
    (changes: Partial<ReadingSettings>) => {
      const next = { ...settings, ...changes };
      queryClient.setQueryData([readingSettingsQueryKey, userId], next);
      if (isSignedIn) scheduleSave(next);
      else storeBrowserReadingSettings(next);
    },
    [settings, queryClient, userId, isSignedIn, scheduleSave],
  );
  return { settings, isSignedIn, change, saveFailed };
}

/**
 * Saves the latest settings once the changes stop, and anything still waiting on unmount.
 *
 * @returns scheduleSave(settings) and saveFailed (true after a save the database refused)
 */
function useDelayedSave() {
  const waiting = useRef<ReadingSettings | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const [saveFailed, setSaveFailed] = useState(false);
  // Sends what is waiting; a refusal is shown under the panel, never swallowed.
  const flush = useCallback(() => {
    const settings = waiting.current;
    waiting.current = null;
    if (settings === null) return;
    void (async () => {
      try {
        await saveReadingSettings(await requireClient(), settings);
        setSaveFailed(false);
      } catch (error) {
        console.warn('The reading settings were not saved.', error);
        setSaveFailed(true);
      }
    })();
  }, []);
  const scheduleSave = useCallback(
    (settings: ReadingSettings) => {
      waiting.current = settings;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, saveDelayMilliseconds);
    },
    [flush],
  );
  // Leaving the chapter: save now rather than lose the last change.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      flush();
    },
    [flush],
  );
  return { scheduleSave, saveFailed };
}
