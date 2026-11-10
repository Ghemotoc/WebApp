/**
 * downloadQr: hands the Marketing page's QR code to the browser as an SVG or a PNG file (bundle
 * G10c3, board AtlasMarketing: "Download PNG", "Download SVG").
 *
 * Both files are made in the browser from the same SVG text (lib/storyQr.ts); nothing is
 * uploaded. Who calls it: components/StoryQrCard.tsx. What it calls: the browser's Blob, Image
 * and canvas.
 */

/** The PNG's width and height in pixels: large enough to print on a poster. */
const pngSize = 1024;

/** Starts a download of a blob under a file name, then lets the blob go. */
function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Downloads the code as an SVG file (sharp at any size).
 *
 * @param svgFile - the SVG document (qrSvgFile)
 * @param fileName - the name to save it under
 */
export function downloadQrSvg(svgFile: string, fileName: string) {
  saveBlob(new Blob([svgFile], { type: 'image/svg+xml;charset=utf-8' }), fileName);
}

/**
 * Downloads the code as a 1,024 px PNG picture.
 *
 * @param svgFile - the SVG document (qrSvgFile)
 * @param fileName - the name to save it under
 * @returns a promise that settles once the download has started
 * Errors: rejects when the browser can't draw the picture; the card says so in plain words.
 */
export async function downloadQrPng(svgFile: string, fileName: string): Promise<void> {
  // Step 1: load the SVG as a picture.
  const picture = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    picture.onload = () => resolve();
    picture.onerror = () => reject(new Error('The QR code could not be drawn.'));
  });
  picture.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgFile)}`;
  await loaded;
  // Step 2: draw it on a canvas without smoothing, so the squares keep hard edges.
  const canvas = document.createElement('canvas');
  canvas.width = pngSize;
  canvas.height = pngSize;
  const drawing = canvas.getContext('2d');
  if (drawing === null) throw new Error('The QR code could not be drawn.');
  drawing.imageSmoothingEnabled = false;
  drawing.drawImage(picture, 0, 0, pngSize, pngSize);
  // Step 3: turn the canvas into a PNG file and save it.
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob === null) throw new Error('The QR code could not be drawn.');
  saveBlob(blob, fileName);
}
