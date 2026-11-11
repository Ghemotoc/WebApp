/**
 * svgToPng: redraws an SVG picture as a PNG, so only its pixels are ever uploaded (bundle G13b; a
 * school's crest on its class certificates may be an SVG).
 *
 * Why redraw it instead of cleaning the markup: an SVG is a small program as much as a picture. It
 * can hold scripts, links and references to other files, and Arachnid Shield, which checks every
 * uploaded picture (CLAUDE.md rule 19), reads pixels, not markup. Drawing it through an <img> runs
 * none of its scripts and loads none of its outside files, and the PNG keeps nothing but what it
 * shows. A crest is drawn at most 1,024 px on its longest side, plenty for an 84 px seal in print.
 * Who calls it: uploadCertificateCrest() in ../api/pictures.ts. What it calls: the browser's
 * Image and canvas only; nothing is sent.
 */

/** The SVG file type. */
export const svgType = 'image/svg+xml';

/** The longest side of the redrawn picture, in pixels. */
const longestSide = 1024;

/** Thrown when the browser can't draw the SVG (broken markup, or no size it can read). */
export class SvgDrawingError extends Error {
  constructor() {
    super('The SVG picture could not be drawn.');
    this.name = 'SvgDrawingError';
  }
}

/**
 * Loads the SVG into an image element, which never runs its scripts.
 *
 * @param file - the SVG file
 * @returns the loaded image
 * @throws SvgDrawingError when the browser can't read it
 */
async function loadImage(file: File): Promise<HTMLImageElement> {
  const address = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = address;
    await image.decode().catch(() => {
      throw new SvgDrawingError();
    });
    return image;
  } finally {
    URL.revokeObjectURL(address);
  }
}

/**
 * The size to draw at: the SVG's own shape, scaled so its longest side is 1,024 px. An SVG with no
 * size of its own is drawn as a square.
 *
 * @param width - the image's natural width (0 when the SVG names none)
 * @param height - the image's natural height
 * @returns the width and height in pixels
 */
export function drawingSize(width: number, height: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: longestSide, height: longestSide };
  const scale = longestSide / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Redraws an SVG as a PNG file with a transparent background.
 *
 * @param file - the SVG the person chose
 * @returns a PNG file with the same name ending in .png
 * @throws SvgDrawingError when it can't be drawn
 */
export async function svgToPng(file: File): Promise<File> {
  // Step 1: load it as a picture; scripts and outside files never run or load.
  const image = await loadImage(file);
  // Step 2: draw its pixels at the crest's size.
  const size = drawingSize(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (context === null) throw new SvgDrawingError();
  context.drawImage(image, 0, 0, size.width, size.height);
  // Step 3: keep the pixels as a PNG, so transparent parts stay transparent. Some browsers treat
  // a drawn SVG as foreign and refuse to read the canvas back (a SecurityError); that is the same
  // as an SVG that can't be drawn, so the teacher sees the plain "can't use this file" message.
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, 'image/png');
    } catch {
      resolve(null);
    }
  });
  if (blob === null) throw new SvgDrawingError();
  const name = file.name.replace(/\.svg$/i, '') + '.png';
  return new File([blob], name, { type: 'image/png' });
}
