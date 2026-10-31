/**
 * A small PNG maker for the Canva stand-in (story S1-E3-12; ADR 0009).
 *
 * The stand-in has no real design to export, so it draws one: a plum sheet with a lighter band
 * across the middle, at the size the story asks for (1600 × 2560). It is a real PNG, so the cover
 * travels the same road as a real export (location data removed, resized, then the picture check).
 * How: each row of pixels is one filter byte (0, none) and the colours; the rows are compressed
 * with the platform's own CompressionStream("deflate"), which writes the zlib format PNG wants;
 * every chunk ends with its CRC-32.
 * Who calls it: server/canva/stub.ts.
 */

/** The PNG file's first eight bytes. */
const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

/** The CRC-32 table, built once (the polynomial PNG uses). */
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

/**
 * The CRC-32 of some bytes, as PNG chunks carry it.
 *
 * @param bytes - the chunk's type and data
 * @returns the checksum
 */
export function crc32(bytes: Uint8Array<ArrayBuffer>): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crcTable[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * One PNG chunk: its length, type, data and CRC.
 *
 * @param type - four letters, for example "IHDR"
 * @param data - the chunk's data
 * @returns the chunk's bytes
 */
function chunk(type: string, data: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  const typeAndData = new Uint8Array(4 + data.length);
  typeAndData.set(new TextEncoder().encode(type), 0);
  typeAndData.set(data, 4);
  const bytes = new Uint8Array(12 + data.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, data.length);
  bytes.set(typeAndData, 4);
  view.setUint32(8 + data.length, crc32(typeAndData));
  return bytes;
}

/**
 * Compresses bytes in the zlib format.
 *
 * @param bytes - the raw rows
 * @returns the compressed bytes
 */
async function deflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** A colour as red, green and blue. */
type Colour = [number, number, number];

/** The sheet's plum and the band's lighter lilac. */
const sheetColour: Colour = [72, 28, 95];
const bandColour: Colour = [214, 196, 226];

/**
 * The raw rows: one filter byte, then three bytes per pixel.
 *
 * @returns the rows, ready to compress
 */
function rawRows(width: number, height: number): Uint8Array<ArrayBuffer> {
  const rowLength = 1 + width * 3;
  const rows = new Uint8Array(rowLength * height);
  const bandTop = Math.floor(height * 0.42);
  const bandBottom = Math.floor(height * 0.58);
  for (let row = 0; row < height; row += 1) {
    // Step 1: the band's rows are lilac, every other row plum.
    const colour = row >= bandTop && row < bandBottom ? bandColour : sheetColour;
    const start = row * rowLength;
    rows[start] = 0;
    for (let column = 0; column < width; column += 1) rows.set(colour, start + 1 + column * 3);
  }
  return rows;
}

/**
 * Draws the stand-in design as a PNG.
 *
 * @param width - in pixels
 * @param height - in pixels
 * @returns the PNG file's bytes
 */
export async function standInDesignPng(
  width: number,
  height: number,
): Promise<Uint8Array<ArrayBuffer>> {
  // Step 1: the header: size, 8 bits per colour, colour type 2 (red, green, blue), no interlace.
  const header = new Uint8Array(13);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, width);
  headerView.setUint32(4, height);
  header.set([8, 2, 0, 0, 0], 8);
  // Step 2: the pixels, compressed; then the end.
  const parts = [
    pngSignature,
    chunk('IHDR', header),
    chunk('IDAT', await deflate(rawRows(width, height))),
    chunk('IEND', new Uint8Array(0)),
  ];
  const file = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    file.set(part, offset);
    offset += part.length;
  }
  return file;
}
