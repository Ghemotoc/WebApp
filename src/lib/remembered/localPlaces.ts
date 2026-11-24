/**
 * The browser's copy of remembered places (design books item 17, "Don't start from zero").
 *
 * A signed-out visitor's places live only here; a signed-in person's places live in the account
 * (rememberedPlaces.ts) and are copied here too, so the page can open at the right place before
 * the account answers. One small JSON object per kind, keyed by item (a story's address or a
 * hint's name), at most 200 items a kind, the oldest dropped first.
 * Storage can be empty, blocked or throw (private windows), so every read and write is guarded:
 * the page then simply starts from the beginning, as it did before.
 * Who calls it: useRememberedPlace.ts. What it calls: localStorage only.
 */
import type { Enums, Json } from '@/lib/database.types';

/** What is remembered: a story's edition, Atlas section or caret, or an Atlas hint's visits. */
export type RememberedPlaceKind = Enums<'remembered_place_kind'>;

/** The most items kept for one kind in this browser. */
const itemsPerKind = 200;

/** The storage key for one kind. */
function storageKey(kind: RememberedPlaceKind): string {
  return `remembered-${kind}`;
}

/** Reads every item of one kind; empty when nothing valid is stored. */
function readKind(kind: RememberedPlaceKind): Record<string, Json> {
  try {
    const stored = window.localStorage.getItem(storageKey(kind));
    if (stored === null) return {};
    const parsed: unknown = JSON.parse(stored);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, Json>;
  } catch {
    return {};
  }
}

/**
 * Reads one place from this browser.
 *
 * @param kind - what is remembered
 * @param itemKey - the story's address or the hint's name
 * @returns the stored place, or null when there is none
 */
export function readLocalPlace(kind: RememberedPlaceKind, itemKey: string): Json | null {
  return readKind(kind)[itemKey] ?? null;
}

/**
 * Keeps one place in this browser, newest last, dropping the oldest past 200 items.
 *
 * @param kind - what is remembered
 * @param itemKey - the story's address or the hint's name
 * @param place - the place (small JSON)
 */
export function writeLocalPlace(kind: RememberedPlaceKind, itemKey: string, place: Json): void {
  // Step 1: move the item to the end, so the oldest items are the first ones dropped.
  const earlier = Object.entries(readKind(kind)).filter(([key]) => key !== itemKey);
  const items: [string, Json][] = [...earlier, [itemKey, place]];
  // Step 2: keep only the newest 200.
  const kept = Object.fromEntries(items.slice(-itemsPerKind));
  try {
    window.localStorage.setItem(storageKey(kind), JSON.stringify(kept));
  } catch {
    // Storage is blocked or full: the place lasts only for this visit, which is how it was before.
  }
}
