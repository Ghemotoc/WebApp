/**
 * Copies a link or a picture to the clipboard (stories S1-E4-05 and S1-E4-07).
 *
 * Browsers may refuse (no permission, an old browser, a page not in focus), so both helpers say
 * whether it worked instead of throwing, and the screen tells the reader what to do instead.
 * Who calls it: ShareButton, ShareDialog, QuoteLimitDialog and QuoteCardDialog.
 */

/**
 * Copies text.
 *
 * @param text - what to copy
 * @returns true when it was copied
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.warn('The browser refused to copy the link.', error);
    return false;
  }
}

/**
 * Copies a PNG picture.
 *
 * @param picture - the picture
 * @returns true when it was copied
 */
export async function copyPicture(picture: Blob): Promise<boolean> {
  try {
    if (typeof ClipboardItem === 'undefined') return false;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': picture })]);
    return true;
  } catch (error) {
    console.warn('The browser refused to copy the picture.', error);
    return false;
  }
}
