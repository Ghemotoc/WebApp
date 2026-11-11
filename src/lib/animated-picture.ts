/**
 * Tells whether a picture file moves: an animated PNG (APNG) or an animated WebP (story S1-E8-08
 * criterion 1: a signature has "one static image"; animated images are refused).
 *
 * Why read the bytes: both formats keep the same file type (image/png, image/webp) whether they
 * move or not, so only the file's own markers say so:
 * - an animated PNG has an "acTL" (animation control) chunk before its first "IDAT" (image data);
 * - an animated WebP is a RIFF file with a "VP8X" header whose animation flag is set, or with an
 *   "ANIM" chunk.
 * JPEG can't move, and GIF is refused earlier as the wrong type.
 * Who calls it: src/features/pictures/api/pictureUploads.ts (refuses an animated signature picture
 * before it is uploaded) and server/picture-check.ts (holds one that reached Storage some other
 * way). What it calls: nothing; it only reads the bytes it is given.
 */

/** The eight bytes every PNG file starts with. */
const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** The VP8X header's flag for "this WebP moves" (WebP container specification). */
const webpAnimationFlag = 0x02;

/**
 * Reads four bytes as text, for chunk names such as "acTL".
 *
 * @param bytes - the file
 * @param offset - where the four bytes start
 * @returns the four characters, or '' past the end
 */
function fourCharacters(bytes: Uint8Array, offset: number): string {
  if (offset + 4 > bytes.length) return '';
  return String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0,
  );
}

/**
 * Reads a big-endian 32-bit length (PNG chunk lengths).
 *
 * @returns the number, or 0 past the end
 */
function bigEndianLength(bytes: Uint8Array, offset: number): number {
  if (offset + 4 > bytes.length) return 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(offset, false);
}

/**
 * Reads a little-endian 32-bit length (RIFF chunk lengths in WebP).
 *
 * @returns the number, or 0 past the end
 */
function littleEndianLength(bytes: Uint8Array, offset: number): number {
  if (offset + 4 > bytes.length) return 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(offset, true);
}

/**
 * Whether the file is a PNG with an animation control chunk.
 *
 * @param bytes - the file
 * @returns true for an animated PNG
 */
function isAnimatedPng(bytes: Uint8Array): boolean {
  // Step 1: the PNG signature, or it isn't a PNG at all.
  if (!pngSignature.every((value, index) => bytes[index] === value)) return false;
  // Step 2: walk the chunks (4-byte length, 4-byte name, the data, a 4-byte checksum).
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const name = fourCharacters(bytes, offset + 4);
    // acTL must come before the image data; once IDAT starts, the picture is a still.
    if (name === 'acTL') return true;
    if (name === 'IDAT' || name === 'IEND') return false;
    offset += 12 + bigEndianLength(bytes, offset);
  }
  return false;
}

/**
 * Whether the file is a WebP that moves.
 *
 * @param bytes - the file
 * @returns true for an animated WebP
 */
function isAnimatedWebp(bytes: Uint8Array): boolean {
  // Step 1: "RIFF" at the start and "WEBP" at byte 8, or it isn't a WebP.
  if (fourCharacters(bytes, 0) !== 'RIFF' || fourCharacters(bytes, 8) !== 'WEBP') return false;
  // Step 2: walk the chunks (4-byte name, 4-byte little-endian length, the data, padded to even).
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const name = fourCharacters(bytes, offset);
    // The extended header's first byte holds the flags; one of them says it moves.
    if (name === 'VP8X' && ((bytes[offset + 8] ?? 0) & webpAnimationFlag) !== 0) return true;
    if (name === 'ANIM' || name === 'ANMF') return true;
    const length = littleEndianLength(bytes, offset + 4);
    offset += 8 + length + (length % 2);
  }
  return false;
}

/**
 * Whether a picture file moves.
 *
 * @param bytes - the whole file, as it was chosen or as it is stored
 * @returns true for an animated PNG or WebP; false for a still or anything else
 * Errors: none; a broken file simply isn't recognised as moving.
 */
export function isAnimatedPicture(bytes: Uint8Array): boolean {
  return isAnimatedPng(bytes) || isAnimatedWebp(bytes);
}
