/**
 * Every foreground and background token pair the interface uses, with the contrast it must
 * reach (story S1-E1-03; WCAG 2.2 AA).
 *
 * Who reads it: scripts/token-contrast.test.ts checks each pair by day and at night, for members
 * and for the staff area, and the
 * /design page shows each pair with its ratio. When a component starts using a new pair of
 * tokens, add it here so CI checks it.
 * Minimums: 4.5 for text (WCAG 1.4.3), 3 for interface parts such as field borders, chip borders
 * and the focus ring (WCAG 1.4.11).
 */

/** One pair of tokens (CSS variable names without the leading "--"). */
export interface ContrastPair {
  foreground: string;
  background: string;
  minimumRatio: 4.5 | 3;
  /** Where the pair appears, so a failure is easy to trace. */
  usedFor: string;
}

/** Text on the page and on cards. */
const textPairs: ContrastPair[] = [
  { foreground: 'ink', background: 'paper', minimumRatio: 4.5, usedFor: 'body text' },
  { foreground: 'ink', background: 'surface', minimumRatio: 4.5, usedFor: 'text on cards' },
  { foreground: 'ink', background: 'tint', minimumRatio: 4.5, usedFor: 'chip hover' },
  { foreground: 'ink', background: 'panel', minimumRatio: 4.5, usedFor: 'text on warm panels' },
  { foreground: 'heading', background: 'paper', minimumRatio: 4.5, usedFor: 'headings' },
  { foreground: 'heading', background: 'surface', minimumRatio: 4.5, usedFor: 'card headings' },
  { foreground: 'heading', background: 'tint', minimumRatio: 4.5, usedFor: 'chip text on hover' },
  { foreground: 'body', background: 'paper', minimumRatio: 4.5, usedFor: 'secondary text' },
  { foreground: 'body', background: 'surface', minimumRatio: 4.5, usedFor: 'card blurbs' },
  { foreground: 'meta', background: 'paper', minimumRatio: 4.5, usedFor: 'dates and captions' },
  { foreground: 'meta', background: 'surface', minimumRatio: 4.5, usedFor: 'card meta lines' },
  { foreground: 'meta', background: 'panel', minimumRatio: 4.5, usedFor: 'ad slot text' },
  { foreground: 'eyebrow', background: 'paper', minimumRatio: 4.5, usedFor: 'eyebrow labels' },
  { foreground: 'eyebrow', background: 'surface', minimumRatio: 4.5, usedFor: 'eyebrows on cards' },
  { foreground: 'link', background: 'paper', minimumRatio: 4.5, usedFor: 'links' },
  {
    foreground: 'on-plum',
    background: 'plum-from',
    minimumRatio: 4.5,
    usedFor: 'main button text, top',
  },
  {
    foreground: 'on-plum',
    background: 'plum-to',
    minimumRatio: 4.5,
    usedFor: 'main button text, bottom',
  },
  { foreground: 'link', background: 'surface', minimumRatio: 4.5, usedFor: 'links on cards' },
  { foreground: 'link-hover', background: 'paper', minimumRatio: 4.5, usedFor: 'links on hover' },
  { foreground: 'destructive', background: 'paper', minimumRatio: 4.5, usedFor: 'delete actions' },
  {
    foreground: 'destructive',
    background: 'surface',
    minimumRatio: 4.5,
    usedFor: 'delete buttons',
  },
  {
    foreground: 'on-primary',
    background: 'primary',
    minimumRatio: 4.5,
    usedFor: 'primary buttons',
  },
  {
    foreground: 'chip-on-text',
    background: 'chip-on',
    minimumRatio: 4.5,
    usedFor: 'selected chips',
  },
  // Story text on its paper, in the reader and the editor (bundle G1).
  {
    foreground: 'story-ink',
    background: 'story-paper',
    minimumRatio: 4.5,
    usedFor: 'story text',
  },
  { foreground: 'on-gold', background: 'gold', minimumRatio: 4.5, usedFor: 'count badges' },
];

/** Text inside notices and information pills: each hue's text on its own tint. */
const tintedPairs: ContrastPair[] = [
  'success',
  'info',
  'warning',
  'error',
  'pill-plum',
  'pill-sage',
  'pill-gold',
  'pill-sky',
  'pill-neutral',
  'pill-blush',
].map((hue) => ({
  foreground: `${hue}-text`,
  background: `${hue}-bg`,
  minimumRatio: 4.5,
  usedFor: `${hue} notice or pill`,
}));

/** Interface parts that must stand out from what's around them. */
const interfacePairs: ContrastPair[] = [
  { foreground: 'control-border', background: 'paper', minimumRatio: 3, usedFor: 'field borders' },
  { foreground: 'control-border', background: 'surface', minimumRatio: 3, usedFor: 'chip borders' },
  { foreground: 'focus-ring', background: 'paper', minimumRatio: 3, usedFor: 'focus ring' },
  {
    foreground: 'focus-ring',
    background: 'surface',
    minimumRatio: 3,
    usedFor: 'focus ring on cards',
  },
  { foreground: 'primary', background: 'paper', minimumRatio: 3, usedFor: 'primary button shape' },
  // Story Atlas relationship lines on the map's card (S1-E17-15).
  ...['family', 'love', 'lineage', 'allies', 'conflict', 'other'].map((category): ContrastPair => ({
    foreground: `atlas-line-${category}`,
    background: 'surface',
    minimumRatio: 3,
    usedFor: `${category} lines on the relationship map`,
  })),
];

/** All pairs, checked in both themes. */
export const contrastPairs: ContrastPair[] = [...textPairs, ...tintedPairs, ...interfacePairs];
