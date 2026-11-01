/**
 * The device's own share sheet (story S1-E4-05; moved here in IDEAS-1c so the chapter and the
 * whole-story Share buttons use the same rules).
 * Who calls it: ShareButton and StoryShareButton. What it calls: navigator.share.
 */

/**
 * Whether to use the system share sheet: a touch screen whose browser offers one.
 *
 * @returns true on phones and tablets with navigator.share
 */
export function prefersSystemShare(): boolean {
  return typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Opens the system share sheet.
 *
 * @param title - the title the sheet shows
 * @param link - the link to share
 * @returns true when the reader shared, false when they cancelled; throws when the sheet failed
 */
export async function shareWithSystem(title: string, link: string): Promise<boolean> {
  try {
    await navigator.share({ title, url: link });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false;
    throw error;
  }
}
