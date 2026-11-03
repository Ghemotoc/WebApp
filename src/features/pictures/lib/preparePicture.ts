/**
 * Prepares a picture before it is uploaded: redraws it, which drops the location and camera data,
 * and makes it no bigger than it needs to be for reading (story S1-E3-09 criterion 2; S1-E3-01:
 * location data removed from covers; architecture 1.9: EXIF stripping).
 *
 * How: the browser decodes the file (turning it the right way up from its own orientation tag),
 * draws the pixels on a canvas at the new size, and encodes a fresh file from the canvas. A file
 * made from a canvas carries only pixels: no GPS position, camera model, date or any other
 * metadata survives. WebP is used where the browser can write it; otherwise JPEG, or PNG for a
 * PNG so a transparent background stays transparent.
 *
 * Who calls it: ../api/pictures.ts before every upload (covers, profile pictures and chapter
 * pictures). What it calls: the browser's createImageBitmap and canvas only; nothing is sent.
 */

/** How big each kind of picture is kept, on its longest side, in pixels. */
export const longestSideFor = {
  // A tall cover is 1,600 × 2,560 (S1-E3-01).
  cover: 2560,
  avatar: 1024,
  // A chapter picture at the reader's widest column on a sharp screen (S1-E3-09).
  chapterPicture: 1600,
  // A character's portrait or mood picture in Story Atlas (S1-E17-11).
  atlasImage: 1600,
  // A space's banner band, 168 px tall across a 1,440 px page on a sharp screen (FORUMS-2c).
  spaceBanner: 2400,
  // A signature picture is drawn at 56 px; 400 keeps it sharp on any screen (S1-E8-08).
  signaturePicture: 400,
  // A landing page's hero or text picture across a 1,440 px page on a sharp screen (S1-E11-14).
  landingPicture: 2400,
} as const;

/** The quality for WebP and JPEG: small files that still look sharp. */
const encodingQuality = 0.85;

/** The picture types the browser may write. */
export type PreparedType = 'image/webp' | 'image/jpeg' | 'image/png';

/** Why a picture couldn't be prepared: the browser couldn't read it as a picture. */
export class PicturePreparationError extends Error {
  constructor() {
    super('The picture could not be read.');
  }
}

/**
 * The size to draw at: the same shape, the longest side at most `longestSide`, never enlarged.
 *
 * @param width - the picture's width in pixels
 * @param height - its height in pixels
 * @param longestSide - the most either side may be
 * @returns the new width and height, whole pixels, at least 1
 */
export function fittedSize(
  width: number,
  height: number,
  longestSide: number,
): { width: number; height: number } {
  const scale = Math.min(1, longestSide / Math.max(width, height, 1));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * The type to fall back to when the browser can't write WebP.
 *
 * @param sourceType - the chosen file's type
 * @returns PNG for a PNG (it may be transparent), JPEG for everything else
 */
export function fallbackTypeFor(sourceType: string): PreparedType {
  return sourceType === 'image/png' ? 'image/png' : 'image/jpeg';
}

/**
 * The file ending for a prepared type.
 *
 * @param type - the prepared file's type
 * @returns webp, png or jpg
 */
export function endingForPreparedType(type: string): string {
  if (type === 'image/webp') return 'webp';
  if (type === 'image/png') return 'png';
  return 'jpg';
}

/**
 * Encodes the canvas as one type.
 *
 * @returns the file's bytes, or null when the browser can't write that type
 */
function canvasToBlob(canvas: HTMLCanvasElement, type: PreparedType): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, encodingQuality);
  });
}

/**
 * Prepares a picture: the metadata goes, and it is made smaller when it is bigger than needed.
 *
 * @param file - the picture the person chose (already checked to be a JPEG, PNG or WebP)
 * @param longestSide - the most its longest side may be (see longestSideFor)
 * @returns a new file with only the pixels, named after the original with the new ending
 * @throws PicturePreparationError when the browser can't read the file as a picture
 */
export async function preparePicture(file: File, longestSide: number): Promise<File> {
  // Step 1: decode it; the browser turns it the right way up from its orientation tag.
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (bitmap === null) throw new PicturePreparationError();
  // Step 2: draw only its pixels, at the new size.
  const size = fittedSize(bitmap.width, bitmap.height, longestSide);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (context === null) throw new PicturePreparationError();
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  // Step 3: a fresh file from the canvas. A browser that can't write WebP hands back PNG instead,
  // so the type of what came back decides whether to try the fallback.
  let blob = await canvasToBlob(canvas, 'image/webp');
  if (blob === null || blob.type !== 'image/webp') {
    blob = await canvasToBlob(canvas, fallbackTypeFor(file.type));
  }
  if (blob === null) throw new PicturePreparationError();
  const baseName = file.name.replace(/\.[^.]*$/, '') || 'picture';
  return new File([blob], `${baseName}.${endingForPreparedType(blob.type)}`, { type: blob.type });
}
