/**
 * useOnlineStatus: whether the browser has a network connection, and whether it just came back
 * (story S1-E1-05).
 *
 * Who calls it: components/OfflineBanner.tsx.
 * What it calls: the browser's navigator.onLine and its "online" and "offline" events. The
 * browser can only say whether there is any network at all, not whether our servers answer; a
 * failed read still shows its own message.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** How long "You're back online" stays up after the connection returns. */
export const backOnlineMilliseconds = 5_000;

/** What the hook answers. */
export interface OnlineStatus {
  isOnline: boolean;
  /** True for a few seconds after the connection came back. */
  isJustBackOnline: boolean;
}

/**
 * Listens for the browser's connection changes.
 *
 * @param onChange - called by React whenever the connection changes
 * @returns a function that stops listening
 */
function subscribeToConnection(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/**
 * Follows the connection.
 *
 * @returns whether the browser is online and whether it just came back
 */
export function useOnlineStatus(): OnlineStatus {
  // Step 1: the connection itself, read straight from the browser.
  const isOnline = useSyncExternalStore(
    subscribeToConnection,
    () => navigator.onLine,
    () => true,
  );

  // Step 2: when the connection comes back, say "back online" for a few seconds.
  const wasOnline = useRef(isOnline);
  const [isJustBackOnline, setIsJustBackOnline] = useState(false);
  useEffect(() => {
    const hasComeBack = isOnline && !wasOnline.current;
    wasOnline.current = isOnline;
    if (!hasComeBack) {
      setIsJustBackOnline(false);
      return undefined;
    }
    setIsJustBackOnline(true);
    const timer = window.setTimeout(() => setIsJustBackOnline(false), backOnlineMilliseconds);
    return () => window.clearTimeout(timer);
  }, [isOnline]);

  return { isOnline, isJustBackOnline };
}
