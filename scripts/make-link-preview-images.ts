/**
 * Makes the link preview pictures: one plain square in each cover colour (story S1-E4-04).
 *
 * Why plain squares: the preview was to be the story's cover with its title, drawn on the server
 * with satori and resvg (Q13, option A). Drawing one takes about 30 to 50 ms of processor time,
 * and about 240 ms the first time, while Cloudflare's free plan allows 10 ms a request, so the
 * fallback Robert approved (Q13, option B) is used: a plain picture in the cover's colour, with
 * the full title beside it as text in every app's preview card (DoD: a thumbnail may show no
 * title only when the full title sits right beside it).
 * Who runs it: a developer, by hand, when the cover palette changes (server/link-preview-palette.ts):
 *   npx tsx scripts/make-link-preview-images.ts
 * What it writes: public/link-previews/<colour>.png, 400 × 400 px, which Cloudflare Pages serves
 * as static files; server/link-preview.ts points each story's og:image at its drawn cover's
 * colour (plum for automatic covers and for 16+ and 18+ stories).
 * It needs nothing but Node: a single-colour PNG is a header, one compressed block of pixel rows
 * and an end marker.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

import { linkPreviewPalette } from '../server/link-preview-palette.ts';

/** The pictures' width and height in pixels. */
const SIDE = 400;

/** Where the files go (served from the site's root by Vite and Cloudflare Pages). */
const OUTPUT_FOLDER = 'public/link-previews';

/** The CRC-32 table PNG uses for each chunk's checksum. */
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

/**
 * The CRC-32 checksum of some bytes.
 *
 * @param bytes - the chunk's type and data
 * @returns the checksum
 */
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * One PNG chunk: its length, type, data and checksum.
 *
 * @param type - four letters, for example "IHDR"
 * @param data - the chunk's content
 * @returns the chunk's bytes
 */
function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, checksum]);
}

/**
 * A square PNG filled with one colour.
 *
 * @param hex - the colour, for example "#481C5F"
 * @returns the file's bytes
 */
function solidPng(hex: string): Buffer {
  // Step 1: the header: size, 8 bits per channel, colour type 2 (red, green, blue).
  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIDE, 0);
  header.writeUInt32BE(SIDE, 4);
  header.set([8, 2, 0, 0, 0], 8);
  // Step 2: every row starts with filter byte 0, then the same colour for each pixel.
  const pixel = Buffer.from(hex.slice(1), 'hex');
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.concat(Array.from({ length: SIDE }, () => pixel)),
  ]);
  const rows = Buffer.concat(Array.from({ length: SIDE }, () => row));
  // Step 3: the signature, the header, the compressed rows and the end marker.
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(rows, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Write one file per palette colour.
mkdirSync(OUTPUT_FOLDER, { recursive: true });
for (const [colourName, hex] of Object.entries(linkPreviewPalette)) {
  writeFileSync(`${OUTPUT_FOLDER}/${colourName}.png`, solidPng(hex));
  console.log(`Wrote ${OUTPUT_FOLDER}/${colourName}.png (${hex})`);
}
