/**
 * The last website content this browser saw, so a failed read shows the last published version
 * instead of an empty hero (story S1-E11-06 criterion 10).
 *
 * Who calls it: hooks/useWebsiteContent.ts, after every good read and when a read fails.
 * Storage: localStorage, which may be missing or refuse (private windows, blocked site data), so
 * every read and write is wrapped and simply does nothing then. It holds only published website
 * copy, nothing about the visitor, so it needs no consent.
 */

/** The storage key's prefix; the kind and the language follow it. */
const storagePrefix = 'website-content:';

/**
 * Saves a read for later.
 *
 * @param cacheKey - the kind and language, for example "home_page:ro"
 * @param entries - what the read gave
 */
export function rememberContent(cacheKey: string, entries: unknown): void {
  try {
    localStorage.setItem(storagePrefix + cacheKey, JSON.stringify(entries));
  } catch {
    // Storage is off or full: the page still works, it just has no copy for a failed read.
  }
}

/**
 * Reads the saved copy.
 *
 * @param cacheKey - the same key rememberContent() used
 * @returns what was saved, or null when nothing was (or storage can't be read)
 */
export function recallContent(cacheKey: string): unknown {
  try {
    const saved = localStorage.getItem(storagePrefix + cacheKey);
    return saved === null ? null : (JSON.parse(saved) as unknown);
  } catch {
    return null;
  }
}
