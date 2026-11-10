/**
 * The EPUB's cover as a picture (story S1-E13-05, PRIVACY part f; Robert, 1 Nov 2026, 06:33: the
 * book takes the story's cover, and the writer may confirm it or choose another picture).
 *
 * Two ways in, one picture out (a JPEG of 1000 × 1600 pixels at most, the 5:8 shape e-readers
 * expect):
 * - drawnCoverPicture() draws a drawn or automatic cover the way DrawnCover shows it: the
 *   background, the pattern in the accent colour, then the title and the name at the bottom, on
 *   a box where the pattern is busy, in dark or light text so it reads at 4.5:1;
 * - pictureCoverFrom() draws an uploaded cover, or a file the writer picked on their device,
 *   again as a JPEG. The writer's own file never leaves the device: it goes only into the book.
 * Both draw on the browser's canvas; jsdom has none, so the e2e test checks them.
 * Who calls it: runEpub.ts. What it calls: the cover designs (src/components/covers).
 */
import {
  coverArtwork,
  coverDesignByKey,
  coverPalette,
  titleColourOn,
  titleSurfaceFor,
  type DrawnCoverChoice,
} from '@/components/covers/coverDesigns';
import type { EpubImage } from '@/lib/epub/epubTypes';
import { coverTitleSize } from '@/lib/cover-title';

/** The cover's size in pixels: the artwork's 100 × 160 canvas, ten times over. */
const coverWidth = 1000;
const coverHeight = 1600;
const artworkScale = 10;

/** The card cover's board values, five times over (DrawnCover is about 200 px wide as a card). */
const padding = 110;
const titleBaseSize = 140;
const nameSize = 65;
const accentBar = { width: 260, height: 15 };
const lineGap = 30;

/** The fonts, by the names src/styles/tokens.css gives them; sans-serif only if they can't load. */
const titleFont = (size: number) =>
  `700 ${size}px "Funnel Display Variable", "Funnel Display", sans-serif`;
const nameFont = `500 ${nameSize}px "Inter Variable", Inter, sans-serif`;

/** What a drawn cover needs. */
export interface DrawnCoverWords {
  title: string;
  name: string;
  choice: DrawnCoverChoice;
}

/** A fresh canvas of the cover's size, or an error when the browser can't draw. */
function newCanvas(
  width: number,
  height: number,
): {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('This browser cannot draw the cover.');
  return { canvas, context };
}

/** The canvas as JPEG bytes. */
async function jpegFrom(canvas: HTMLCanvasElement): Promise<EpubImage> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.9);
  });
  if (blob === null) throw new Error('This browser cannot save the cover as a picture.');
  const data = new Uint8Array(await blob.arrayBuffer());
  return { data, type: 'jpg', width: canvas.width, height: canvas.height };
}

/**
 * Breaks text into lines that fit the width, on spaces (DoD: the full title, never clipped).
 *
 * @returns the lines; a single word longer than the width keeps its own line
 */
function wrapText(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter((part) => part !== '')) {
    const candidate = current === '' ? word : `${current} ${word}`;
    if (current !== '' && context.measureText(candidate).width > width) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current !== '') lines.push(current);
  return lines;
}

/** The pattern, in the accent colour, scaled from 100 × 160. */
function drawArtwork(context: CanvasRenderingContext2D, choice: DrawnCoverChoice): void {
  const artwork = coverArtwork(coverDesignByKey(choice.design).kind);
  context.save();
  context.scale(artworkScale, artworkScale);
  context.fillStyle = coverPalette[choice.accent];
  context.strokeStyle = coverPalette[choice.accent];
  if (artwork.fillPath !== '') context.fill(new Path2D(artwork.fillPath));
  if (artwork.strokePath !== '') {
    context.lineWidth = artwork.strokeWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke(new Path2D(artwork.strokePath));
  }
  context.restore();
}

/** The lines of the words block and how tall it is, measured before drawing. */
function measureWords(context: CanvasRenderingContext2D, words: DrawnCoverWords) {
  const titleSize = coverTitleSize(words.title, titleBaseSize);
  const innerWidth = coverWidth - padding * 3;
  context.font = titleFont(titleSize);
  const titleLines = wrapText(context, words.title, innerWidth);
  const titleWidth = Math.max(...titleLines.map((line) => context.measureText(line).width));
  context.font = nameFont;
  const nameWidth = context.measureText(words.name).width;
  const hasBar = coverDesignByKey(words.choice.design).kind === 'plain';
  const lineHeight = titleSize * 1.05;
  const height =
    titleLines.length * lineHeight + (hasBar ? lineGap + accentBar.height : 0) + lineGap + nameSize;
  return {
    titleSize,
    titleLines,
    lineHeight,
    hasBar,
    height,
    width: Math.max(titleWidth, nameWidth),
  };
}

/** The title, the accent line on plain designs and the name, at the bottom left. */
function drawWords(context: CanvasRenderingContext2D, words: DrawnCoverWords): void {
  const measured = measureWords(context, words);
  const { boxFill, surface } = titleSurfaceFor(words.choice);
  const boxPadding = boxFill === null ? 0 : padding / 2;
  let top = coverHeight - padding - boxPadding - measured.height;
  // Step 1: the box behind the words, on busy patterns (the board's boxes).
  if (boxFill !== null) {
    context.fillStyle = boxFill;
    const boxWidth = Math.min(measured.width + boxPadding * 2, coverWidth - padding * 2);
    context.fillRect(padding, top - boxPadding, boxWidth, measured.height + boxPadding * 2);
  }
  // Step 2: the title lines, in the colour that reads best on the surface.
  const left = padding + boxPadding;
  context.fillStyle = titleColourOn(surface);
  context.textBaseline = 'top';
  context.font = titleFont(measured.titleSize);
  for (const line of measured.titleLines) {
    context.fillText(line, left, top);
    top += measured.lineHeight;
  }
  // Step 3: the accent line (plain designs), then the name.
  if (measured.hasBar) {
    top += lineGap;
    context.fillStyle = coverPalette[words.choice.accent];
    context.fillRect(left, top, accentBar.width, accentBar.height);
    context.fillStyle = titleColourOn(surface);
    top += accentBar.height;
  }
  context.font = nameFont;
  context.fillText(words.name, left, top + lineGap);
}

/**
 * Draws a drawn or automatic cover as a JPEG for the book.
 *
 * @param words - the title and name the writer confirmed, and the design and colours
 * @returns the cover picture
 * @throws Error with a plain message when the browser can't draw
 */
export async function drawnCoverPicture(words: DrawnCoverWords): Promise<EpubImage> {
  const { canvas, context } = newCanvas(coverWidth, coverHeight);
  // Load the two fonts first: a canvas doesn't wait for them, and would draw a fallback.
  await Promise.all([document.fonts.load(titleFont(titleBaseSize)), document.fonts.load(nameFont)]);
  context.fillStyle = coverPalette[words.choice.background];
  context.fillRect(0, 0, coverWidth, coverHeight);
  drawArtwork(context, words.choice);
  drawWords(context, words);
  return jpegFrom(canvas);
}

/**
 * Draws a picture file (the uploaded cover, or one from the writer's device) as a JPEG for the
 * book, no larger than 1000 × 1600 and in its own shape.
 *
 * @param file - a JPEG, PNG or WebP picture
 * @returns the cover picture
 * @throws Error with a plain message when the file isn't a picture the browser can read
 */
export async function pictureCoverFrom(file: Blob): Promise<EpubImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('That file could not be read as a picture.');
  }
  const scale = Math.min(1, coverWidth / bitmap.width, coverHeight / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const { canvas, context } = newCanvas(width, height);
  // A white page behind it, so a see-through PNG doesn't turn black as a JPEG.
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return jpegFrom(canvas);
}
