/**
 * Which notices the visitor closed during this visit (story S1-E11-10 criterion 6).
 *
 * Who calls it: NoticeStrip. Storage: sessionStorage, which ends with the visit and needs no
 * consent; it may be missing or refuse, so every access is wrapped and a refusal just means the
 * notice shows again on the next page.
 */

/** The storage key for the list of closed notices. */
const storageKey = 'closed-notices';

/**
 * Reads the closed notices.
 *
 * @returns their keys, empty when storage can't be read
 */
function closedKeys(): string[] {
  try {
    const saved = sessionStorage.getItem(storageKey);
    const parsed: unknown = saved === null ? [] : JSON.parse(saved);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

/**
 * Says whether a notice was closed during this visit.
 *
 * @param noticeKey - the notice's market, key and start date
 * @returns true when it was
 */
export function isNoticeClosed(noticeKey: string): boolean {
  return closedKeys().includes(noticeKey);
}

/**
 * Remembers that a notice was closed, for the rest of the visit.
 *
 * @param noticeKey - the notice's market, key and start date
 */
export function rememberNoticeClosed(noticeKey: string): void {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify([...closedKeys(), noticeKey]));
  } catch {
    // Storage is off: the notice is closed on this page and shows again on the next one.
  }
}
