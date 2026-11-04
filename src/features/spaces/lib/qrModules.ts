/**
 * qrModules: turns a class joining link into the dark and light squares of a QR code (bundle 14d
 * IDEAS-3, part b; idea IDEA-20261102-3, "a printable class invite sheet with a QR code").
 *
 * The code is worked out here, in the browser, by the qrcode-generator library (MIT), so the link
 * never leaves the device to be drawn (the idea's privacy note). Nothing is fetched.
 * Who calls it: ClassInviteQrCode. What it calls: qrcode-generator.
 */
import qrcode from 'qrcode-generator';

/** The squares of one QR code: `rows[row][column]` is true for a dark square. */
export type QrModules = boolean[][];

/**
 * Works out the QR code for a piece of text.
 *
 * @param text - the text the code should hold (the class's joining link)
 * @returns the squares, row by row; the code is always square
 * Errors: throws when the text is empty or too long for any QR code (a joining link never is).
 * Where it fits: ClassInviteQrCode draws these squares as one SVG path.
 */
export function qrModulesFor(text: string): QrModules {
  // Step 1: an empty code would scan as nothing, which helps nobody; say so loudly.
  if (text === '') throw new Error('A QR code needs some text to hold.');
  // Step 2: size 0 lets the library pick the smallest code that fits. Level M recovers from
  // about 15% damage, enough for a creased sheet on a classroom wall.
  const code = qrcode(0, 'M');
  code.addData(text, 'Byte');
  code.make();
  // Step 3: read the squares out row by row.
  const size = code.getModuleCount();
  const rows: QrModules = [];
  for (let row = 0; row < size; row += 1) {
    const squares: boolean[] = [];
    for (let column = 0; column < size; column += 1) squares.push(code.isDark(row, column));
    rows.push(squares);
  }
  return rows;
}

/**
 * Writes the dark squares as one SVG path, one small square ("h1v1h-1z") per dark square, so
 * the drawing is crisp at any size and in print.
 *
 * @param modules - the squares from qrModulesFor()
 * @param quietZone - the white border, in squares, that scanners need round the code (4 by the
 *   QR standard)
 * @returns the path's `d` attribute
 */
export function qrPathFor(modules: QrModules, quietZone: number): string {
  const parts: string[] = [];
  modules.forEach((squares, row) => {
    squares.forEach((isDark, column) => {
      if (isDark) parts.push(`M${column + quietZone} ${row + quietZone}h1v1h-1z`);
    });
  });
  return parts.join('');
}
