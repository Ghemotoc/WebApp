/**
 * useSettingsGroup: which Settings group is open, read from the address's hash, and bringing the
 * linked panel into view (bundle PROFILE-1, 6 Nov 2026).
 *
 * The hash is the single source of truth, so the browser's Back button, a bookmark and every
 * existing link (/settings#teacher-badge from an email, /settings#privacy from a notice) open the
 * right group. Panels load their data after the first paint, so the hook waits (up to a few
 * seconds) for the linked anchor to appear before scrolling to it.
 * Who calls it: components/SettingsPage.tsx. What it calls: React Router's useLocation and
 * lib/settingsGroups.ts.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { settingsGroupOfHash, type SettingsGroupKey } from '../lib/settingsGroups';

/** How long to wait for a linked panel that loads late (milliseconds). */
const waitForAnchorMs = 3000;

/** The id of the element that holds the open group's panels. */
export const settingsPanelId = 'settings-panel';

/**
 * Scrolls to the element with this id once it exists, or gives up after a while.
 *
 * @param anchor - the element's id
 * @returns a function that stops waiting (for the effect's clean-up)
 */
function scrollToWhenPresent(anchor: string): () => void {
  // Step 1: the panel may already be there.
  const present = document.getElementById(anchor);
  if (present !== null) {
    present.scrollIntoView({ block: 'start' });
    return () => {};
  }
  // Step 2: otherwise watch the page until it appears, then scroll once and stop watching.
  const observer = new MutationObserver(() => {
    const element = document.getElementById(anchor);
    if (element === null) return;
    element.scrollIntoView({ block: 'start' });
    observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const giveUp = window.setTimeout(() => observer.disconnect(), waitForAnchorMs);
  return () => {
    observer.disconnect();
    window.clearTimeout(giveUp);
  };
}

/**
 * Scrolls the open group's top into sight when it is above the screen or in its lower half.
 */
function bringPanelTopIntoSight() {
  const panel = document.getElementById(settingsPanelId);
  if (panel === null) return;
  const top = panel.getBoundingClientRect().top;
  if (top < 0 || top > window.innerHeight / 2) panel.scrollIntoView({ block: 'start' });
}

/**
 * The open group, kept in step with the address.
 *
 * @returns the open group's key and the hash it came from (without "#")
 */
export function useSettingsGroup(): { group: SettingsGroupKey; anchor: string } {
  const { hash } = useLocation();
  const anchor = hash.replace(/^#/, '');
  const group = settingsGroupOfHash(hash);

  // When the address names a panel inside a group (/settings#teacher-badge), scroll to it once
  // it has loaded. When it names a group, scroll only if the group's top is out of sight: on a
  // phone the menu sits above the group, on a wide screen the group is already beside it.
  useEffect(() => {
    if (anchor === '') return undefined;
    if (anchor !== group) return scrollToWhenPresent(anchor);
    bringPanelTopIntoSight();
    return undefined;
  }, [anchor, group]);

  return { group, anchor };
}
