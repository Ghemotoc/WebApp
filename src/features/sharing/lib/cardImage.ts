/**
 * Turning a drawn card into a PNG and saving it (stories S1-E4-07 and S1-E4-11).
 *
 * Who calls it: hooks/useQuoteCardActions.ts (quote cards) and hooks/usePictureCardActions.ts
 * (picture cards). What it calls: the browser's canvas and download APIs.
 */

/**
 * The canvas as a PNG.
 *
 * @param canvas - the drawn card
 * @returns the picture
 * Errors: throws when the browser can't make the picture.
 */
export function pictureOf(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) reject(new Error('The browser could not make the picture.'));
      else resolve(blob);
    }, 'image/png');
  });
}

/**
 * Hands the picture to the browser as a download.
 *
 * @param picture - the PNG
 * @param fileName - the name without ".png"
 */
export function downloadPicture(picture: Blob, fileName: string) {
  const address = URL.createObjectURL(picture);
  const link = document.createElement('a');
  link.href = address;
  link.download = `${fileName}.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(address), 1000);
}
