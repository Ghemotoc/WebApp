/**
 * coverArtwork: the pattern shapes drawn behind a drawn cover's label (story S1-E3-01, the designs
 * of design/boards/NewStory.dc.html; moved out of coverDesigns.ts in the classic covers change,
 * 26 Nov 2026).
 *
 * Why its own file: the shapes are built once when the module loads, and only screens that draw a
 * cover need them. The chapter reader reads cover keys and colours from coverDesigns.ts but draws
 * no pattern, so keeping the shapes here keeps them out of the reader's first load (the reader's
 * script budget in e2e/reader-performance.spec.ts).
 * Who calls it: DrawnCover (the cover itself), the certificate frame and its look picker, and the
 * EPUB cover in Download my data.
 * What it calls: nothing; it only needs the design kinds from coverDesigns.ts.
 */
import type { CoverDesignKind } from './coverDesigns';

/** The pattern artwork: a filled path, a stroked path and the stroke width, on 100 × 160. */
export interface CoverArtwork {
  fillPath: string;
  strokePath: string;
  strokeWidth: number;
}

/** Rounds to two decimals, so the paths stay short. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A filled circle as a path. */
function dot(x: number, y: number, radius: number): string {
  return `M${round(x - radius)} ${y}a${radius} ${radius} 0 1 0 ${round(2 * radius)} 0a${radius} ${radius} 0 1 0 ${round(-2 * radius)} 0Z`;
}

/** A four-point sparkle as a path. */
function spark(x: number, y: number, radius: number): string {
  return (
    `M${x} ${round(y - radius)}Q${x} ${y} ${round(x + radius)} ${y}` +
    `Q${x} ${y} ${x} ${round(y + radius)}Q${x} ${y} ${round(x - radius)} ${y}` +
    `Q${x} ${y} ${x} ${round(y - radius)}Z`
  );
}

/** A small heart outline as a path. */
function heart(x: number, y: number, size: number): string {
  return (
    `M${x} ${round(y + 0.9 * size)}` +
    `C${round(x - 1.5 * size)} ${round(y - 0.1 * size)} ${round(x - 0.8 * size)} ${round(y - 1.1 * size)} ${x} ${round(y - 0.3 * size)}` +
    `C${round(x + 0.8 * size)} ${round(y - 1.1 * size)} ${round(x + 1.5 * size)} ${round(y - 0.1 * size)} ${x} ${round(y + 0.9 * size)}Z`
  );
}

/** A circle outline as a path (two half arcs), for the arch and ring patterns. */
function circle(x: number, y: number, radius: number): string {
  return `M${round(x - radius)} ${y}a${radius} ${radius} 0 1 0 ${round(2 * radius)} 0a${radius} ${radius} 0 1 0 ${round(-2 * radius)} 0`;
}

/** Diagonal gold stripes every 18 units. */
function stripesArtwork(): CoverArtwork {
  let path = '';
  for (let offset = -160; offset <= 100; offset += 18) {
    path += `M${offset} 0L${offset + 160} 160`;
  }
  return { fillPath: '', strokePath: path, strokeWidth: 6 };
}

/** Polka dots in offset rows every 16 units. */
function dotsArtwork(): CoverArtwork {
  let path = '';
  let row = 0;
  for (let y = 8; y < 164; y += 16, row += 1) {
    for (let x = row % 2 === 1 ? 16 : 6; x < 104; x += 20) {
      path += dot(x, y, 3.4);
    }
  }
  return { fillPath: path, strokePath: '', strokeWidth: 0 };
}

/** Grid paper: a line every 10 units each way. */
function gridArtwork(): CoverArtwork {
  let path = '';
  for (let x = 10; x < 100; x += 10) path += `M${x} 0V160`;
  for (let y = 10; y < 160; y += 10) path += `M0 ${y}H100`;
  return { fillPath: '', strokePath: path, strokeWidth: 1.2 };
}

/** Gentle waves every 16 units. */
function wavesArtwork(): CoverArtwork {
  let path = '';
  for (let y = 10; y < 166; y += 16) {
    path += `M-10 ${y}Q-5 ${y - 8} 0 ${y}`;
    for (let x = 10; x <= 110; x += 10) path += `T${x} ${y}`;
  }
  return { fillPath: '', strokePath: path, strokeWidth: 2.4 };
}

/** Sparkles and small stars, kept to the top two thirds so the title area stays calm. */
function starryArtwork(): CoverArtwork {
  const sparks: [number, number, number][] = [
    [22, 22, 8],
    [72, 14, 5],
    [86, 44, 9],
    [46, 40, 4],
    [14, 62, 4],
    [64, 72, 6],
    [90, 92, 3.5],
    [36, 96, 3],
  ];
  const stars: [number, number, number][] = [
    [10, 10, 1],
    [54, 8, 1.2],
    [34, 64, 1],
    [80, 64, 1.1],
    [8, 100, 0.9],
    [94, 120, 1],
    [58, 108, 1],
  ];
  const path =
    sparks.map(([x, y, r]) => spark(x, y, r)).join('') +
    stars.map(([x, y, r]) => dot(x, y, r)).join('');
  return { fillPath: path, strokePath: '', strokeWidth: 0 };
}

/** Hearts and sparkles as fine outlines. */
function sparklesArtwork(): CoverArtwork {
  const hearts: [number, number, number][] = [
    [20, 24, 7],
    [76, 44, 6],
    [32, 78, 5],
    [88, 92, 4],
  ];
  const sparks: [number, number, number][] = [
    [60, 18, 7],
    [14, 54, 5],
    [62, 70, 6],
    [90, 16, 4],
    [50, 100, 3.5],
  ];
  const path =
    hearts.map(([x, y, s]) => heart(x, y, s)).join('') +
    sparks.map(([x, y, r]) => spark(x, y, r)).join('');
  return { fillPath: '', strokePath: path, strokeWidth: 1.6 };
}

/** A solid band across the bottom (from y = 98), where the title sits. */
function twotoneArtwork(): CoverArtwork {
  return { fillPath: 'M0 98H100V160H0Z', strokePath: '', strokeWidth: 0 };
}

/**
 * Arches (G9c): rainbow arcs rising from below the bottom edge, every 14 units, as the board's
 * repeating radial gradient at 50% 120% draws them.
 */
function archesArtwork(): CoverArtwork {
  let path = '';
  for (let radius = 10; radius <= 200; radius += 14) path += circle(50, 192, radius);
  return { fillPath: '', strokePath: path, strokeWidth: 5 };
}

/** Rings (G9c): circles spreading from the top left, every 12 units (board: 30% 30%). */
function ringsArtwork(): CoverArtwork {
  let path = '';
  for (let radius = 6; radius <= 190; radius += 12) path += circle(30, 48, radius);
  return { fillPath: '', strokePath: path, strokeWidth: 4.5 };
}

/** Forest waves (G9c): broad, slow waves every 22 units, wider and bolder than Waves. */
function forestWavesArtwork(): CoverArtwork {
  let path = '';
  for (let y = 6; y < 180; y += 22) {
    path += `M-20 ${y}Q-10 ${y - 10} 0 ${y}`;
    for (let x = 20; x <= 120; x += 20) path += `T${x} ${y}`;
  }
  return { fillPath: '', strokePath: path, strokeWidth: 6 };
}

/**
 * Blush dots (brand page, 23 Nov 2026): big dots on a straight grid, one per 16 × 17 cell, as the
 * page's radial gradient at 16% by 10.67% with a 22% dot draws them.
 */
function blushDotsArtwork(): CoverArtwork {
  let path = '';
  for (let y = 8.5; y < 164; y += 17) {
    for (let x = 8; x < 104; x += 16) path += dot(x, y, 3.6);
  }
  return { fillPath: path, strokePath: '', strokeWidth: 0 };
}

/** Sky lines (brand page): flat horizontal lines every 11.2 units, 3.2 units thick (2% of 7%). */
function skyLinesArtwork(): CoverArtwork {
  let path = '';
  for (let y = 1.6; y < 162; y += 11.2) path += `M0 ${round(y)}H100`;
  return { fillPath: '', strokePath: path, strokeWidth: 3.2 };
}

/** Gold grid (brand page): a bold grid, 5 cells across and 7.5 down, lines 2 units thick. */
function goldGridArtwork(): CoverArtwork {
  let path = '';
  for (let x = 1; x < 100; x += 20) path += `M${x} 0V160`;
  for (let y = 1; y < 160; y += 21.33) path += `M0 ${round(y)}H100`;
  return { fillPath: '', strokePath: path, strokeWidth: 2 };
}

/** No artwork at all: plain covers draw only their colour and the accent bar. */
const noArtwork: CoverArtwork = { fillPath: '', strokePath: '', strokeWidth: 0 };

/** The artwork for each kind, built once. */
const artworkByKind: Record<CoverDesignKind, CoverArtwork> = {
  plain: noArtwork,
  stripes: stripesArtwork(),
  dots: dotsArtwork(),
  grid: gridArtwork(),
  waves: wavesArtwork(),
  starry: starryArtwork(),
  sparkles: sparklesArtwork(),
  twotone: twotoneArtwork(),
  arches: archesArtwork(),
  rings: ringsArtwork(),
  forestwaves: forestWavesArtwork(),
  blushdots: blushDotsArtwork(),
  skylines: skyLinesArtwork(),
  goldgrid: goldGridArtwork(),
  // An artwork design draws its backdrop picture instead (DrawnCover's ArtworkBackdrop).
  artwork: noArtwork,
};

/**
 * The artwork for a design kind.
 *
 * @param kind - the design kind
 * @returns the paths and stroke width
 */
export function coverArtwork(kind: CoverDesignKind): CoverArtwork {
  return artworkByKind[kind];
}
