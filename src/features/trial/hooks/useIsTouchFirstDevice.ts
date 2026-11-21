/**
 * useIsTouchFirstDevice: whether this is a phone or a touch-only tablet, kept up to date when a
 * mouse or trackpad is plugged in or taken away (TRIAL-DESKTOP).
 *
 * Who calls it: components/DesktopOnlyGate.tsx.
 * What it calls: lib/touchFirstDevice.ts, through React's useSyncExternalStore.
 */
import { useSyncExternalStore } from 'react';

import { isTouchFirstDevice, touchFirstQuery } from '../lib/touchFirstDevice';

/**
 * Listens for the media query to change.
 *
 * @param onChange - React's callback
 * @returns the function that stops listening
 */
function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const query = window.matchMedia(touchFirstQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * Reads whether the device is touch first.
 *
 * @returns true on a phone or a touch-only tablet
 */
export function useIsTouchFirstDevice(): boolean {
  // The server render (link previews) has no device, so it counts as a computer.
  return useSyncExternalStore(subscribe, isTouchFirstDevice, () => false);
}
