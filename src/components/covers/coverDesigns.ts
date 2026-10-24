/**
 * The drawn cover designs: the 16 approved backgrounds, the 9-colour palette and the pattern
 * artwork (story S1-E3-01; decided 16 Oct 2026: "Drawn covers use the 16 approved backgrounds:
 * 9 plain colours and 7 patterns", recolourable within the palette).
 *
 * Where the values come from: design/boards/NewStory.dc.html (4.2), its `designs`, `pal` and
 * `art` lists, copied, not guessed. The artwork is drawn on a 100 × 160 (5:8) canvas so tiles,
 * previews and cards match exactly. One board mismatch: Waves' default accent (#6E93BF) is not
 * in the palette, so it defaults to Violet here (docs/board-fixes.md).
 * Who uses it: DrawnCover (the drawing), DrawnCoverPicker and CoverColourSwatches (the choices,
 * src/features/writing/), the zod schema (src/schemas/story.ts) and the database constraints
 * (supabase/migrations/…_s1_e3_01_stories.sql), which list the same keys.
 * What it calls: src/lib/contrast.ts to pick dark or light title text.
 */
import { contrastRatio } from '@/lib/contrast';

/** The 9 palette colours a drawn cover may use, by key. */
export const coverPalette = {
  plum: '#481C5F',
  ink: '#26142E',
  violet: '#672786',
  gold: '#E6C24C',
  lilac: '#E9DDF0',
  blush: '#F6D3DC',
  sky: '#D7E6F2',
  sage: '#C9D8BF',
  paper: '#FAF8F5',
} as const;

/** One of the palette keys. */
export type CoverColourKey = keyof typeof coverPalette;

/** The palette keys in the order the swatches show them (the board's order). */
export const coverColourKeys = Object.keys(coverPalette) as CoverColourKey[];

/** The 16 design keys: 9 plain, then 7 patterns. */
export const coverDesignKeys = [
  'plum',
  'ink',
  'violet',
  'gold',
  'lilac',
  'blush',
  'sky',
  'sage',
  'paper',
  'stripes',
  'dots',
  'grid',
  'waves',
  'starry',
  'doodles',
  'twotone',
] as const;

/** One of the design keys. */
export type CoverDesignKey = (typeof coverDesignKeys)[number];

/** How a design is drawn: a plain colour, or one of the pattern kinds. */
export type CoverDesignKind =
  'plain' | 'stripes' | 'dots' | 'grid' | 'waves' | 'starry' | 'doodles' | 'twotone';

/** What the app knows about one design. */
export interface CoverDesign {
  key: CoverDesignKey;
  kind: CoverDesignKind;
  /** The default background and accent the board gives it. */
  background: CoverColourKey;
  accent: CoverColourKey;
}

/** The 16 designs with their board defaults. */
export const coverDesigns: readonly CoverDesign[] = [
  { key: 'plum', kind: 'plain', background: 'plum', accent: 'gold' },
  { key: 'ink', kind: 'plain', background: 'ink', accent: 'gold' },
  { key: 'violet', kind: 'plain', background: 'violet', accent: 'gold' },
  { key: 'gold', kind: 'plain', background: 'gold', accent: 'plum' },
  { key: 'lilac', kind: 'plain', background: 'lilac', accent: 'violet' },
  { key: 'blush', kind: 'plain', background: 'blush', accent: 'plum' },
  { key: 'sky', kind: 'plain', background: 'sky', accent: 'violet' },
  { key: 'sage', kind: 'plain', background: 'sage', accent: 'plum' },
  { key: 'paper', kind: 'plain', background: 'paper', accent: 'violet' },
  { key: 'stripes', kind: 'stripes', background: 'plum', accent: 'gold' },
  { key: 'dots', kind: 'dots', background: 'lilac', accent: 'violet' },
  { key: 'grid', kind: 'grid', background: 'paper', accent: 'lilac' },
  // The board's blue (#6E93BF) is outside the palette; Violet is the nearest palette accent.
  { key: 'waves', kind: 'waves', background: 'sky', accent: 'violet' },
  { key: 'starry', kind: 'starry', background: 'ink', accent: 'gold' },
  { key: 'doodles', kind: 'doodles', background: 'paper', accent: 'violet' },
  { key: 'twotone', kind: 'twotone', background: 'blush', accent: 'plum' },
];

/** A writer's drawn cover choice, as stored on the story. */
export interface DrawnCoverChoice {
  design: CoverDesignKey;
  background: CoverColourKey;
  accent: CoverColourKey;
}

/**
 * Finds a design by key.
 *
 * @param key - one of the 16 keys
 * @returns the design
 * Errors: throws when the key is unknown, which only a bug can cause (the schema and the database
 *   both check the key).
 */
export function coverDesignByKey(key: CoverDesignKey): CoverDesign {
  const design = coverDesigns.find((candidate) => candidate.key === key);
  if (design === undefined) throw new Error(`Unknown cover design "${key}".`);
  return design;
}

/**
 * The board default colours for a design, as a complete choice.
 *
 * @param key - the design key
 * @returns the design with its default background and accent
 */
export function defaultChoiceFor(key: CoverDesignKey): DrawnCoverChoice {
  const design = coverDesignByKey(key);
  return { design: key, background: design.background, accent: design.accent };
}

/** The two title colours; whichever contrasts more with the surface is used. */
const darkText = '#26142E';
const lightText = '#FAF8F5';

/**
 * Picks dark or light title text for a surface colour, so the title always reads at 4.5:1
 * (S1-E3-01 acceptance criterion; every palette colour clears 4.5:1 with one of the two).
 *
 * @param surfaceHex - the colour the title sits on
 * @returns '#26142E' or '#FAF8F5'
 */
export function titleColourOn(surfaceHex: string): string {
  return contrastRatio(surfaceHex, darkText) >= contrastRatio(surfaceHex, lightText)
    ? darkText
    : lightText;
}

/** What the accent colours on a design: the line under the title, the bottom band or the pattern. */
export type CoverAccentPart = 'line' | 'band' | 'pattern';

/**
 * Says what the accent colour paints on a design, so the form can explain it.
 *
 * @param kind - the design kind
 * @returns 'line' for plain designs, 'band' for two-tone, 'pattern' for the rest
 */
export function coverAccentPart(kind: CoverDesignKind): CoverAccentPart {
  if (kind === 'plain') return 'line';
  if (kind === 'twotone') return 'band';
  return 'pattern';
}

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
function doodlesArtwork(): CoverArtwork {
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
  doodles: doodlesArtwork(),
  twotone: twotoneArtwork(),
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

/**
 * Where the title sits on a design: on the background itself, on a paper box (busy patterns:
 * dots and waves), on a background-coloured box (stripes) or on the accent band (two-tone).
 * The board draws these boxes so the title never fights the pattern.
 *
 * @param choice - the design and colours
 * @returns the title box fill (null when the title sits straight on the background) and the
 *   colour the title is read against
 */
export function titleSurfaceFor(choice: DrawnCoverChoice): {
  boxFill: string | null;
  surface: string;
} {
  const { kind } = coverDesignByKey(choice.design);
  const background = coverPalette[choice.background];
  const accent = coverPalette[choice.accent];
  if (kind === 'stripes') return { boxFill: background, surface: background };
  if (kind === 'dots' || kind === 'waves') return { boxFill: lightText, surface: lightText };
  if (kind === 'twotone') return { boxFill: null, surface: accent };
  return { boxFill: null, surface: background };
}
