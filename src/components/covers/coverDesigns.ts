/**
 * The drawn cover designs: the 19 approved backgrounds, the 9-colour palette and the pattern
 * artwork (story S1-E3-01; decided 16 Oct 2026: "Drawn covers use the 16 approved backgrounds:
 * 9 plain colours and 7 patterns", recolourable within the palette). Bundle G9 WRITING, part c,
 * adds the liquid glass New story board's three new patterns, Arches, Rings and Forest waves,
 * after the first 16, which stay as they were. The brand page's covers (Robert, 23 Nov 2026,
 * 20:26 UTC; design books covers part 2) add three more, Blush dots, Sky lines and Gold grid,
 * drawn in the writer's accent colour (Robert's decision card, 24 Nov 2026).
 * Classic covers (Robert, 26 Nov 2026, 18:20 UTC: "the classics make them all simple colours,
 * except for the raven, luceafărul and goblin market"; "Plain solid yes") add six more plain
 * colours and three artwork backdrops. They are for the classics account only: the writer's
 * picker and swatches never offer them (writerCoverDesigns, writerColourKeys) and the database
 * refuses them on anyone else's story (migration …_classic_plain_covers.sql).
 *
 * Where the values come from: design/boards/NewStory.dc.html (4.2), its `designs`, `pal` and
 * `art` lists, copied, not guessed. The artwork is drawn on a 100 × 160 (5:8) canvas, sliced to the 2:3 cover (CALM-4), so tiles,
 * previews and cards match exactly. One board mismatch: Waves' default accent (#6E93BF) is not
 * in the palette, so it defaults to Violet here, and the three G9c patterns' blues and greens are
 * mapped to the nearest palette colours the same way (docs/board-fixes.md).
 * Who uses it: DrawnCover (the drawing), DrawnCoverPicker and CoverColourSwatches (the choices,
 * src/features/writing/), the zod schema (src/schemas/story.ts) and the database constraints
 * (supabase/migrations/…_s1_e3_01_stories.sql), which list the same keys.
 * What it calls: src/lib/contrast.ts to pick dark or light title text.
 */
import goblinMarketBackdrop from '@/assets/classic-covers/goblin-market.svg';
import luceafarulBackdrop from '@/assets/classic-covers/luceafarul.svg';
import theRavenBackdrop from '@/assets/classic-covers/the-raven.svg';
import { contrastRatio } from '@/lib/contrast';

/**
 * The colours a drawn cover may use, by key: the writer's 9, then the 6 classic covers add
 * (Robert's ten classic colours are plum, violet, ink and gold from the 9 plus these six; the
 * values are the tokens' crimson, seaglass, peach, pistachio, candy and link blue).
 */
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
  crimson: '#9F1239',
  seaglass: '#0F766E',
  peach: '#C2412D',
  pistachio: '#4D7C0F',
  candy: '#C0266D',
  linkblue: '#3D4290',
} as const;

/** One of the palette keys. */
export type CoverColourKey = keyof typeof coverPalette;

/** Every palette key, the writer's 9 first; used to check a colour the database sends. */
export const coverColourKeys = Object.keys(coverPalette) as CoverColourKey[];

/** The 6 colours only classic covers use (the classics account; Robert, 26 Nov 2026). */
export const classicOnlyColourKeys: readonly CoverColourKey[] = [
  'crimson',
  'seaglass',
  'peach',
  'pistachio',
  'candy',
  'linkblue',
];

/** The 9 colours a writer can pick, in the order the swatches show them (the board's order). */
export const writerColourKeys: CoverColourKey[] = coverColourKeys.filter(
  (key) => !classicOnlyColourKeys.includes(key),
);

/**
 * The ten solid colours a classic's cover takes, in the order the database picks from
 * (classic_cover_colour() in the migration hashes the story's ID over this list).
 */
export const classicCoverColourKeys: readonly CoverColourKey[] = [
  'plum',
  'violet',
  'ink',
  'gold',
  'crimson',
  'seaglass',
  'peach',
  'pistachio',
  'candy',
  'linkblue',
];

/**
 * The 31 design keys: 9 plain, the 7 first patterns, the 3 added in G9c, the brand page's 3,
 * then the classic covers' 6 plain colours and 3 artwork backdrops.
 */
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
  'sparkles',
  'twotone',
  'arches',
  'rings',
  'forestwaves',
  'blushdots',
  'skylines',
  'goldgrid',
  'crimson',
  'seaglass',
  'peach',
  'pistachio',
  'candy',
  'linkblue',
  'classic_luceafarul',
  'classic_the_raven',
  'classic_goblin_market',
] as const;

/** One of the design keys. */
export type CoverDesignKey = (typeof coverDesignKeys)[number];

/** How a design is drawn: a plain colour, or one of the pattern kinds. */
export type CoverDesignKind =
  | 'plain'
  | 'stripes'
  | 'dots'
  | 'grid'
  | 'waves'
  | 'starry'
  | 'sparkles'
  | 'twotone'
  | 'arches'
  | 'rings'
  | 'forestwaves'
  | 'blushdots'
  | 'skylines'
  | 'goldgrid'
  | 'artwork';

/** What the app knows about one design. */
export interface CoverDesign {
  key: CoverDesignKey;
  kind: CoverDesignKind;
  /** The default background and accent the board gives it. */
  background: CoverColourKey;
  accent: CoverColourKey;
  /**
   * True for the designs added after the first 16 (G9c's three and the brand page's three), so the
   * picker can say so; automatic covers never pick them, so existing covers keep their look.
   */
  isNew?: boolean;
  /** True for the classic covers' designs: never offered to writers, never picked automatically. */
  classicOnly?: boolean;
  /** For an artwork design, the backdrop picture drawn behind the label (a file in src/assets). */
  artworkUrl?: string;
}

/** The 31 designs with their board defaults. */
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
  { key: 'sparkles', kind: 'sparkles', background: 'paper', accent: 'violet' },
  { key: 'twotone', kind: 'twotone', background: 'blush', accent: 'plum' },
  // G9c. The board draws these in blues and greens outside the palette (Arches #3B2A78 and
  // #4B4FA8, Rings #672786 and #9A5BB8, Forest waves #005C42 and #1A8164); each takes the
  // nearest palette pair, so every colour row and the 4.5:1 title check still hold.
  { key: 'arches', kind: 'arches', background: 'ink', accent: 'violet', isNew: true },
  { key: 'rings', kind: 'rings', background: 'violet', accent: 'lilac', isNew: true },
  { key: 'forestwaves', kind: 'forestwaves', background: 'sage', accent: 'ink', isNew: true },
  // The brand page (23 Nov 2026) draws these tonal, a darker shade of the background (#EBBCC8,
  // #C0D4E6, #D4AE35), which is outside the palette and would be the same key as the
  // background. Robert chose the writer's accent colour for patterns (24 Nov 2026), so each
  // takes a palette accent that reads on its background (docs/board-fixes.md).
  { key: 'blushdots', kind: 'blushdots', background: 'blush', accent: 'plum', isNew: true },
  { key: 'skylines', kind: 'skylines', background: 'sky', accent: 'violet', isNew: true },
  { key: 'goldgrid', kind: 'goldgrid', background: 'gold', accent: 'paper', isNew: true },
  // Classic covers (Robert, 26 Nov 2026): a paper label on one solid colour. The accent is never
  // drawn on a label cover; paper is stored so every row still has one.
  { key: 'crimson', kind: 'plain', background: 'crimson', accent: 'paper', classicOnly: true },
  { key: 'seaglass', kind: 'plain', background: 'seaglass', accent: 'paper', classicOnly: true },
  { key: 'peach', kind: 'plain', background: 'peach', accent: 'paper', classicOnly: true },
  { key: 'pistachio', kind: 'plain', background: 'pistachio', accent: 'paper', classicOnly: true },
  { key: 'candy', kind: 'plain', background: 'candy', accent: 'paper', classicOnly: true },
  { key: 'linkblue', kind: 'plain', background: 'linkblue', accent: 'paper', classicOnly: true },
  // The three classics Robert kept as artwork (DESIGN covers thread, approved backdrops of
  // 26 Nov 2026). Each backdrop is plum underneath, so plum is the colour a place that can't
  // draw the picture (a link preview, an e-book cover) falls back to.
  {
    key: 'classic_luceafarul',
    kind: 'artwork',
    background: 'plum',
    accent: 'paper',
    classicOnly: true,
    artworkUrl: luceafarulBackdrop,
  },
  {
    key: 'classic_the_raven',
    kind: 'artwork',
    background: 'plum',
    accent: 'paper',
    classicOnly: true,
    artworkUrl: theRavenBackdrop,
  },
  {
    key: 'classic_goblin_market',
    kind: 'artwork',
    background: 'plum',
    accent: 'paper',
    classicOnly: true,
    artworkUrl: goblinMarketBackdrop,
  },
];

/** The 22 designs a writer can pick: everything but the classic covers' own. */
export const writerCoverDesigns: readonly CoverDesign[] = coverDesigns.filter(
  (design) => design.classicOnly !== true,
);

/** The writer's 22 design keys, for the story form's schema. */
export const writerCoverDesignKeys = writerCoverDesigns.map((design) => design.key) as [
  CoverDesignKey,
  ...CoverDesignKey[],
];

/**
 * The three looks a drawn cover can have (bundle CALM-4, the simplified design's cover kinds):
 * Label (the pattern with a paper label near the top), Big title (the title large on a plain
 * colour) and Initial (one big letter in the accent, cropped by the edge). The two other kinds,
 * Picture and Custom, are uploads, drawn by StoryCoverArt. The database column is
 * stories.cover_style (migration …_calm4_cover_styles.sql).
 */
export type DrawnCoverStyle = 'label' | 'big_title' | 'initial';

/**
 * The fonts a writer can pick for the title on a cover (CALM-4): Literata (reading, the default),
 * Funnel Display (display), Inter (sans) or Playwrite Cuba (hand). stories.cover_title_font.
 */
export type CoverTitleFont = 'reading' | 'display' | 'sans' | 'hand';

/** A writer's drawn cover choice, as stored on the story. */
export interface DrawnCoverChoice {
  design: CoverDesignKey;
  background: CoverColourKey;
  accent: CoverColourKey;
  /** The look (CALM-4); Label when left out, which is how every cover looked before. */
  style?: DrawnCoverStyle;
  /** The title's font (CALM-4); Literata when left out. */
  titleFont?: CoverTitleFont;
}

/**
 * Finds a design by key.
 *
 * @param key - one of the 31 keys
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

/**
 * The two title colours; whichever contrasts more with the surface is used. cover-ink and
 * on-action-main from the one colour set for text (Robert, 23 Nov 2026, 14:46 UTC).
 */
const darkText = '#2A0E33';
const lightText = '#FBF7EC';

/**
 * Picks dark or light title text for a surface colour, so the title always reads at 4.5:1
 * (S1-E3-01 acceptance criterion; every palette colour clears 4.5:1 with one of the two).
 *
 * @param surfaceHex - the colour the title sits on
 * @returns '#2A0E33' or '#FBF7EC'
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

/**
 * Where the title sits on a design: on the background itself (plain designs only), or on a solid
 * box that hides the pattern behind the words. Busy patterns (dots and waves) use a paper box, as
 * the board draws them; two-tone uses its accent band's colour; the other patterns (stripes,
 * grid, starry, sparkles, G9c's arches, rings and forest waves, and the brand page's blush dots,
 * sky lines and gold grid) use the background colour.
 * Why every pattern has a box (bundle FIXES-1b; Robert, 5 Nov 2026): on the grid design the lines
 * ran straight through the title, and when they were the title's colour the title couldn't be
 * read; on two-tone a long title grew above the band onto a background it wasn't coloured for.
 * With a solid box, the title is always read against one colour, at 4.5:1 or more.
 *
 * @param choice - the design and colours
 * @returns the title box fill (null when the title sits straight on a plain background) and the
 *   colour the title is read against
 */
export function titleSurfaceFor(choice: DrawnCoverChoice): {
  boxFill: string | null;
  surface: string;
} {
  const { kind } = coverDesignByKey(choice.design);
  const background = coverPalette[choice.background];
  const accent = coverPalette[choice.accent];
  if (kind === 'plain') return { boxFill: null, surface: background };
  if (kind === 'dots' || kind === 'waves') return { boxFill: lightText, surface: lightText };
  if (kind === 'twotone') return { boxFill: accent, surface: accent };
  return { boxFill: background, surface: background };
}
