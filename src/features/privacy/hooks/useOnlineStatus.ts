/**
 * Online status: the heartbeat that says "I have the app open" and the question "who on this
 * screen is online?" (story S1-E13-01; board 6.3: "people you follow see a small dot by your name
 * while you're using" the app).
 *
 * Who calls them: PresenceHeartbeat (in AppLayout) and OnlineDot's parents (the profile header,
 * the chat header and the chat list).
 * What they call: note_i_am_online() and who_is_online() through api/privacy.ts.
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchOnlineHandles, noteIAmOnline } from '../api/privacy';

/** How often the heartbeat and the dots refresh: a minute, well inside the 5 online minutes. */
export const onlineRefreshMilliseconds = 60_000;

/**
 * Tells the database every minute that the caller has the app open, while the tab is in front
 * and the switch is on. A failed beat is only logged: the dot is a nicety and must never break a
 * page.
 *
 * @param isSwitchedOn - the caller's "Show when I'm online" choice
 */
export function useHeartbeat(isSwitchedOn: boolean) {
  useEffect(() => {
    if (!isSwitchedOn) return undefined;
    // Step 1: one beat, only while the page is the one in front.
    const beat = () => {
      if (document.visibilityState !== 'visible') return;
      void requireClient()
        .then(noteIAmOnline)
        .catch((error: unknown) => console.warn('Online status heartbeat failed', error));
    };
    // Step 2: beat now, every minute, and again when the person comes back to the tab.
    beat();
    const timer = window.setInterval(beat, onlineRefreshMilliseconds);
    document.addEventListener('visibilitychange', beat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [isSwitchedOn]);
}

/**
 * Which of some usernames show as online to the caller, read again every minute.
 *
 * @param handles - the usernames on screen
 * @returns a set of the online usernames in lower case (empty while loading or signed out)
 */
export function useOnlineHandles(handles: string[]): Set<string> {
  const { userId } = useSession();
  const sortedHandles = [...new Set(handles.map((handle) => handle.toLowerCase()))].sort();
  const result = useQuery({
    queryKey: ['online-handles', userId, sortedHandles],
    enabled: userId !== null && sortedHandles.length > 0,
    refetchInterval: onlineRefreshMilliseconds,
    retry: false,
    queryFn: async () => fetchOnlineHandles(await requireClient(), sortedHandles),
  });
  return result.data ?? new Set<string>();
}
