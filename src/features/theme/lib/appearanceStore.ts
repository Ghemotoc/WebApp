/**
 * appearanceStore: the one copy of the member's appearance choices on this page: mode (light,
 * night or device), year-round look, the seasonal switch (bundle G2 THEMES), the "Less motion"
 * switch (bundle MOTION-1) and the "High contrast" switch (bundle CONTRAST-1).
 *
 * Why a store: Settings › Appearance, the footer's mode drop-down and the account sync all read
 * and change the same choices, and each must see the others' changes at once. React reads it with
 * useSyncExternalStore (hooks/useAppearance.ts).
 * It also counts the choices made on this page, so a slow read of the account never switches back
 * a choice the member has just made (the same guard as the account language, S1-E1-QA).
 * What it calls: src/lib/theme.ts, src/lib/looks.ts, src/lib/motion.ts and src/lib/highContrast.ts
 * to remember the choices on this device.
 * Who calls it: hooks/useAppearance.ts and hooks/useAccountAppearance.ts.
 */
import { readHighContrastChoice, saveHighContrastChoice } from '@/lib/highContrast';
import { readStoredLookChoice, saveStoredLookChoice, type YearRoundLook } from '@/lib/looks';
import { readLessMotionChoice, saveLessMotionChoice } from '@/lib/motion';
import { readThemePreference, saveThemePreference, type ThemePreference } from '@/lib/theme';

/** The member's five choices. */
export interface Appearance {
  /** Light, night or device ("Match my device"). */
  mode: ThemePreference;
  /** The year-round theme. */
  look: YearRoundLook;
  /** Whether the seasonal looks may switch on by themselves. */
  isSeasonalOn: boolean;
  /** Whether the member turned "Less motion" on (the device's own setting counts by itself). */
  isLessMotionOn: boolean;
  /** Whether the member turned "High contrast" on (the device's own setting counts by itself). */
  isHighContrastOn: boolean;
}

/**
 * Reads what this device remembers.
 *
 * @returns the stored choices, or the defaults
 */
function readStoredAppearance(): Appearance {
  const lookChoice = readStoredLookChoice();
  return {
    mode: readThemePreference(),
    look: lookChoice.look,
    isSeasonalOn: lookChoice.isSeasonalOn,
    isLessMotionOn: readLessMotionChoice(),
    isHighContrastOn: readHighContrastChoice(),
  };
}

/** The choices on this page; filled from the device before the first render. */
let current: Appearance = readStoredAppearance();

/** Everything that wants to hear about a change (React's subscriptions). */
const listeners = new Set<() => void>();

/** Choices the member made on this page: how many so far, and how many are still being saved. */
const choices = { made: 0, saving: 0 };

/**
 * The current choices, for useSyncExternalStore.
 *
 * @returns the choices (the same object until something changes)
 */
export function getAppearance(): Appearance {
  return current;
}

/**
 * Listens for changes, for useSyncExternalStore.
 *
 * @param listener - called after every change
 * @returns a function that stops listening
 */
export function subscribeToAppearance(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Replaces the choices, remembers them on this device and tells every listener.
 *
 * @param next - the new choices
 */
export function replaceAppearance(next: Appearance): void {
  current = next;
  saveThemePreference(next.mode);
  saveStoredLookChoice({ look: next.look, isSeasonalOn: next.isSeasonalOn });
  saveLessMotionChoice(next.isLessMotionOn);
  saveHighContrastChoice(next.isHighContrastOn);
  listeners.forEach((listener) => listener());
}

/**
 * Notes that the member made a choice. Call it before saving.
 *
 * @returns a function to call once the save has finished (or failed)
 */
export function startAppearanceChoice(): () => void {
  choices.made += 1;
  choices.saving += 1;
  let isDone = false;
  return () => {
    if (isDone) return;
    isDone = true;
    choices.saving -= 1;
  };
}

/**
 * How many choices were made on this page so far, to compare before and after a read.
 *
 * @returns the count
 */
export function appearanceChoiceCount(): number {
  return choices.made;
}

/**
 * Says whether the account's choices may still be applied after a read.
 *
 * @param countBeforeRead - appearanceChoiceCount() when the read started
 * @returns true when no choice was made during the read and none is still being saved
 */
export function mayApplyAccountAppearance(countBeforeRead: number): boolean {
  return choices.saving === 0 && choices.made === countBeforeRead;
}
