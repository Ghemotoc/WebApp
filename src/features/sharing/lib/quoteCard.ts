/**
 * Draws the quote-share card on a canvas (story S1-E4-07; board 3.6 Share, "Your quote card").
 *
 * The card is drawn on the reader's device and never stored: the passage, the story's title,
 * "by <pen name>", the link and the product's name (S1-E4-07, first criterion). It is a square
 * 1080 px picture, the size most social apps take without cropping.
 * Backgrounds (S1-E4-07, fourth criterion; Robert, canvas comments, 16 Oct 2026): the default is
 * plain brand purple with no gold glow (the board's purple gradient), or one of our nine palette
 * colours. Light colours get dark words, dark ones light words, so the text keeps its contrast.
 * Who calls it: components/QuoteCardCanvas.tsx, and lib/pictureCard.ts for the shared footer
 * (S1-E4-11). What it calls: the canvas 2D API only.
 */

/** One background a card can have. */
export interface QuoteCardBackground {
  /** The key the picker and the translations use. */
  key: string;
  /** A flat colour, or the default purple's gradient stops. */
  colours: readonly string[];
  /** True for light colours, which take dark words. */
  isLight: boolean;
}

/** The default: the board's brand purple (#2A0F36 to #7A3D96), no gold glow. */
export const purpleBackground: QuoteCardBackground = {
  key: 'purple',
  colours: ['#2A0F36', '#4D1B5E', '#7A3D96'],
  isLight: false,
};

/** "Or one of our colours": the board's nine swatches, in its order. */
export const paletteBackgrounds: readonly QuoteCardBackground[] = [
  { key: 'plum', colours: ['#481C5F'], isLight: false },
  { key: 'violet', colours: ['#672786'], isLight: false },
  { key: 'gold', colours: ['#E6C24C'], isLight: true },
  { key: 'ink', colours: ['#26142E'], isLight: false },
  { key: 'lilac', colours: ['#E9DDF0'], isLight: true },
  { key: 'blush', colours: ['#F6D3DC'], isLight: true },
  { key: 'sky', colours: ['#D7E6F2'], isLight: true },
  { key: 'sage', colours: ['#C9D8BF'], isLight: true },
  { key: 'paper', colours: ['#FAF8F5'], isLight: true },
];

/** What goes on a card. */
export interface QuoteCardContent {
  passage: string;
  storyTitle: string;
  /** "by inkwolf", already in the reader's language. */
  writerLine: string;
  /** The chapter's link without "https://" (lib/shareLink.ts). */
  link: string;
  productName: string;
  background: QuoteCardBackground;
}

/** Measures a line of text in the font currently set. */
export type MeasureText = (text: string) => number;

/** The card's size and margins, in canvas pixels. */
export const cardSize = 1080;
export const margin = 96;
const textWidth = cardSize - margin * 2;

/** The fonts the card uses: the reading serif for the quote, the app's own for the rest. */
const quoteFontFamily = 'Georgia, "Times New Roman", serif';
const titleFontFamily = '"Bricolage Grotesque", Inter, sans-serif';
const bodyFontFamily = 'Inter, system-ui, sans-serif';

/**
 * Breaks text into lines no wider than maxWidth, on spaces; a word wider than a line is cut.
 *
 * @param text - the text, single-spaced
 * @param maxWidth - the widest a line may be
 * @param measure - measures a line in the font in use
 * @returns the lines, in order
 */
export function wrapLines(text: string, maxWidth: number, measure: MeasureText): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ').filter((part) => part !== '')) {
    // Step 1: the word fits on the current line.
    const tried = line === '' ? word : `${line} ${word}`;
    if (measure(tried) <= maxWidth) {
      line = tried;
      continue;
    }
    // Step 2: it doesn't: close the line, then cut the word itself if it is too wide alone.
    if (line !== '') lines.push(line);
    line = '';
    for (const character of Array.from(word)) {
      if (line !== '' && measure(line + character) > maxWidth) {
        lines.push(line);
        line = '';
      }
      line += character;
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

/**
 * The quote's font size: shorter passages get bigger words.
 *
 * @param passage - the quote
 * @returns the size in canvas pixels
 */
export function quoteFontSize(passage: string): number {
  const length = Array.from(passage).length;
  if (length <= 80) return 64;
  if (length <= 160) return 52;
  return 44;
}

/**
 * Fills the card with its background.
 *
 * @param context - the canvas's 2D context
 * @param background - the chosen background
 */
export function paintBackground(
  context: CanvasRenderingContext2D,
  background: QuoteCardBackground,
) {
  if (background.colours.length === 1) {
    context.fillStyle = background.colours[0] ?? '#481C5F';
  } else {
    // The board's 160° gradient, from the top left corner to the bottom right.
    const gradient = context.createLinearGradient(0, 0, cardSize * 0.35, cardSize);
    background.colours.forEach((colour, index) => {
      gradient.addColorStop(index / (background.colours.length - 1), colour);
    });
    context.fillStyle = gradient;
  }
  context.fillRect(0, 0, cardSize, cardSize);
}

/** The colours of the words on a background. */
export function inkFor(background: QuoteCardBackground) {
  if (background.isLight) return { text: '#2A0E33', soft: '#4A3A52', mark: '#672786' };
  return { text: '#FFFFFF', soft: '#E9DDF0', mark: '#E6C24C' };
}

/**
 * Draws the quote mark and the passage, centred in the space above the footer.
 *
 * @param context - the canvas's 2D context
 * @param passage - the quote
 * @param colours - the words' colours
 */
function drawPassage(
  context: CanvasRenderingContext2D,
  passage: string,
  colours: ReturnType<typeof inkFor>,
) {
  // Step 1: the big opening quote mark in the top corner.
  context.fillStyle = colours.mark;
  context.font = `bold 180px ${quoteFontFamily}`;
  context.fillText('”', margin - 8, margin + 130);
  // Step 2: the passage, wrapped and centred between the mark and the footer.
  const size = quoteFontSize(passage);
  const lineHeight = Math.round(size * 1.4);
  context.font = `${size}px ${quoteFontFamily}`;
  const lines = wrapLines(passage, textWidth, (text) => context.measureText(text).width);
  const top = 280;
  const bottom = 800;
  let y = top + (bottom - top - lines.length * lineHeight) / 2 + size;
  context.fillStyle = colours.text;
  for (const line of lines) {
    context.fillText(line, margin, y);
    y += lineHeight;
  }
}

/**
 * The largest size, from a list of sizes, at which a text fits in the given number of lines.
 *
 * @param context - the canvas's 2D context (its font is changed)
 * @param text - the text
 * @param fit - fontFor (the font for a size), sizes (to try, largest first) and maxLines
 * @returns the size and the lines at that size (the smallest size if none fits)
 */
function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  fit: { fontFor: (size: number) => string; sizes: readonly number[]; maxLines: number },
): { size: number; lines: string[] } {
  let fitted = { size: fit.sizes[fit.sizes.length - 1] ?? 24, lines: [text] };
  for (const size of fit.sizes) {
    context.font = fit.fontFor(size);
    const lines = wrapLines(text, footerWidth, (line) => context.measureText(line).width);
    fitted = { size, lines };
    if (lines.length <= fit.maxLines) break;
  }
  return fitted;
}

/** The footer's width: the whole text width (the product's name sits at the top). */
const footerWidth = textWidth;

/**
 * Draws the footer from the bottom up: the link, "by <pen name>" and the story's title, each
 * shrunk until it fits, so the full title and the full link always show.
 *
 * @param context - the canvas's 2D context
 * @param content - the card's content
 * @param colours - the words' colours
 */
export function drawFooter(
  context: CanvasRenderingContext2D,
  content: Pick<QuoteCardContent, 'storyTitle' | 'writerLine' | 'link'>,
  colours: ReturnType<typeof inkFor>,
) {
  // Step 1: the link on the last line, as small as 18 px to fit in one line.
  context.fillStyle = colours.soft;
  const link = fitText(context, content.link, {
    fontFor: (size) => `${size}px ${bodyFontFamily}`,
    sizes: [26, 22, 18],
    maxLines: 1,
  });
  link.lines.forEach((line, index) => context.fillText(line, margin, 1000 + index * 24));
  // Step 2: "by <pen name>" above it.
  context.font = `28px ${bodyFontFamily}`;
  context.fillText(content.writerLine, margin, 956);
  // Step 3: the title above that, up to two lines.
  context.fillStyle = colours.text;
  const title = fitText(context, content.storyTitle, {
    fontFor: (size) => `bold ${size}px ${titleFontFamily}`,
    sizes: [40, 34, 28],
    maxLines: 2,
  });
  const lineHeight = Math.round(title.size * 1.2);
  title.lines.forEach((line, index) => {
    context.fillText(line, margin, 908 - (title.lines.length - 1 - index) * lineHeight);
  });
}

/**
 * Draws the product's name in the top right corner, where the board has the logo.
 *
 * @param context - the canvas's 2D context
 * @param productName - from the brand config
 * @param colours - the words' colours
 */
export function drawProductName(
  context: CanvasRenderingContext2D,
  productName: string,
  colours: ReturnType<typeof inkFor>,
) {
  context.fillStyle = colours.mark;
  context.font = `bold 32px ${titleFontFamily}`;
  context.textAlign = 'right';
  context.fillText(productName, cardSize - margin, margin + 32);
  context.textAlign = 'left';
}

/**
 * Draws a whole card.
 *
 * @param context - a 1080 × 1080 canvas's 2D context
 * @param content - what goes on the card
 */
export function drawQuoteCard(context: CanvasRenderingContext2D, content: QuoteCardContent): void {
  const colours = inkFor(content.background);
  paintBackground(context, content.background);
  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
  drawPassage(context, content.passage, colours);
  drawFooter(context, content, colours);
  drawProductName(context, content.productName, colours);
}
