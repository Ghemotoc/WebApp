/**
 * Drawing a picture card: a chapter picture with the story's title, "by <pen name>" and the link
 * to the picture's spot in the chapter (story S1-E4-11, first criterion; board 3.6 Share).
 *
 * The card is 1080 × 1080 on the paper colour. The picture sits in the top part, as large as
 * fits without cropping (a writer's picture is never cut), and the footer is the quote card's,
 * so both cards look like one family. The product's name is in the top right corner.
 * Who calls it: components/PictureCardCanvas.tsx. What it calls: lib/quoteCard.ts's footer and
 * corner name, and the canvas 2D API.
 */
import {
  cardSize,
  drawFooter,
  drawProductName,
  inkFor,
  margin,
  paintBackground,
  paletteBackgrounds,
  type QuoteCardBackground,
} from './quoteCard';

/** What goes on a picture card. */
export interface PictureCardContent {
  storyTitle: string;
  /** "by inkwolf", already in the reader's language. */
  writerLine: string;
  /** The picture's link without "https://". */
  link: string;
  productName: string;
}

/** The card's background: the board's paper colour. */
const paperBackground: QuoteCardBackground = paletteBackgrounds.find(
  (background) => background.key === 'paper',
) ?? { key: 'paper', colours: ['#FAF8F5'], isLight: true };

/** The space the picture may fill: under the product's name, above the title. */
const pictureBox = { left: margin, top: 168, width: cardSize - margin * 2, height: 640 };

/**
 * Where the picture goes so it fits the box without cropping, centred.
 *
 * @param width - the picture's width
 * @param height - its height
 * @returns its place and size on the card
 */
export function fitPicture(width: number, height: number) {
  if (width <= 0 || height <= 0)
    return { x: pictureBox.left, y: pictureBox.top, width: 0, height: 0 };
  const scale = Math.min(pictureBox.width / width, pictureBox.height / height);
  const drawnWidth = width * scale;
  const drawnHeight = height * scale;
  return {
    x: pictureBox.left + (pictureBox.width - drawnWidth) / 2,
    y: pictureBox.top + (pictureBox.height - drawnHeight) / 2,
    width: drawnWidth,
    height: drawnHeight,
  };
}

/**
 * Draws a whole picture card.
 *
 * @param context - a 1080 × 1080 canvas's 2D context
 * @param content - the words on the card
 * @param picture - the picture, already decoded (null while it loads: the card is drawn without it)
 */
export function drawPictureCard(
  context: CanvasRenderingContext2D,
  content: PictureCardContent,
  picture: ImageBitmap | null,
): void {
  const colours = inkFor(paperBackground);
  paintBackground(context, paperBackground);
  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
  if (picture !== null) {
    const place = fitPicture(picture.width, picture.height);
    context.drawImage(picture, place.x, place.y, place.width, place.height);
  }
  drawFooter(context, content, colours);
  drawProductName(context, content.productName, colours);
}
