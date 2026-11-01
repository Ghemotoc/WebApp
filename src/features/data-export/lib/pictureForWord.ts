/**
 * Readies one chapter picture for a Word file (story S1-E13-02; S1-E11-09: pictures are included
 * with their alt text).
 *
 * Why: chapter pictures are saved as WebP (src/features/pictures/lib/preparePicture.ts) and Word
 * reads PNG and JPEG, so the picture is drawn again as PNG, at most 576 pixels wide (six inches,
 * the width of the page's text) so it never spills over the margin.
 * Who calls it: runDataExport(). What it calls: the browser's createImageBitmap and a canvas.
 */
import type { WordPicture } from '@/lib/word/wordTypes';

/** The widest a picture is drawn in the Word file, in pixels. */
const maximumWidth = 576;

/** A canvas that can save itself as a PNG: OffscreenCanvas where there is one, a page canvas otherwise. */
async function pngFrom(bitmap: ImageBitmap, width: number, height: number): Promise<Blob | null> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: 'image/png' });
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/**
 * Draws a picture file again as a PNG for Word.
 *
 * @param file - the picture as stored
 * @returns the PNG with its size, or null when the browser can't read it (the Word file then
 *   says "Picture: <alt text>" instead)
 */
export async function pictureForWord(file: Blob): Promise<WordPicture | null> {
  try {
    // Step 1: read the picture and work out its size on the page.
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maximumWidth / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    // Step 2: draw it as a PNG.
    const png = await pngFrom(bitmap, width, height);
    bitmap.close();
    if (png === null) return null;
    return { data: new Uint8Array(await png.arrayBuffer()), type: 'png', width, height };
  } catch (error) {
    console.warn(`A chapter picture couldn't be added to its Word file: ${String(error)}`);
    return null;
  }
}
