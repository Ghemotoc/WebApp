/**
 * Doodle colours through the design tokens (Lane B, "Design: doodles take their colours from the
 * tokens", 23 Oct 2026).
 *
 * The hand-drawn doodles in design/assets/ arrived from the canvas with fixed hex colours. Drawn
 * inline in a page, a fixed colour ignores night mode (DoD design rules: doodles take their colours
 * from the design tokens so they work in light and night mode). This script rewrites each colour to
 * its token with the light value as a fallback, `style="fill:var(--doodle-ink, #2a0e33)"`, so:
 * - inline in the app the doodle follows the theme (src/styles/tokens.css);
 * - opened on its own (GitHub, Finder, an <img>) it still draws with today's colours;
 * - light mode stays pixel-identical, because every fallback is the token's light value.
 *
 * Who runs it: `npm run doodles:tokens` rewrites the files (once, after new doodles arrive);
 * `npm run doodles:check` only reports, and CI runs it on every pull request. Both exit with
 * code 1 when a doodle holds a colour that has no token or a fallback that no longer matches.
 * What it reads: design/assets/*.svg and the --doodle-* tokens in src/styles/tokens.css.
 * What it skips: the 16 drawn cover backgrounds in the same folder (viewBox 0 0 100 160). Covers
 * are artwork that keeps its colours in night mode (src/lib/cover-colours.ts, S1-E1-03).
 * Tests: scripts/doodle-tokens.test.ts.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Where the doodles live. */
export const doodleFolder = fileURLToPath(new URL('../design/assets', import.meta.url));

/** Where the tokens live. */
export const tokensCssPath = fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url));

/**
 * The nine colours the canvas drew the doodles with, and the token each one becomes.
 * Light values in tokens.css must equal these (readDoodleTokens checks), so the drawings don't
 * change in light mode.
 */
export const doodleColourTokens: Record<string, string> = {
  '#2a0e33': 'doodle-ink',
  '#fffdf8': 'doodle-paper',
  '#e6c24c': 'doodle-gold',
  '#f5e3a6': 'doodle-gold-soft',
  '#f2a7b8': 'doodle-blush',
  '#f6d3dc': 'doodle-blush-soft',
  '#e9ddf0': 'doodle-plum-soft',
  '#d7e6f2': 'doodle-sky-soft',
  '#c9d8bf': 'doodle-sage-soft',
};

/** The drawn cover backgrounds share the folder; this is their viewBox (5 wide by 8 high). */
const coverViewBox = 'viewBox="0 0 100 160"';

/** A problem with one file, written so a non-developer can act on it. */
export type DoodleProblem = string;

/**
 * Tells a drawn cover background apart from a doodle.
 *
 * @param svg - the file's contents
 * @returns true for a cover background (left alone), false for a doodle
 */
export function isCoverBackground(svg: string): boolean {
  return svg.includes(coverViewBox);
}

/**
 * Reads the --doodle-* tokens for one theme from tokens.css.
 *
 * @param tokensCss - the contents of src/styles/tokens.css
 * @param theme - 'light' or 'night'
 * @returns token name (without the leading --) → lower-case hex colour
 * Errors: throws when the file has no block for that theme or the block has no doodle tokens.
 */
export function readDoodleTokens(tokensCss: string, theme: 'light' | 'night'): Map<string, string> {
  // Find the theme's block, the same way scripts/token-contrast.test.ts does.
  const blockOpening = new RegExp(`\\[data-theme=['"]${theme}['"]\\]\\s*\\{`);
  const startIndex = tokensCss.search(blockOpening);
  if (startIndex === -1) throw new Error(`tokens.css has no [data-theme="${theme}"] block.`);
  const block = tokensCss.slice(startIndex, tokensCss.indexOf('\n}', startIndex));

  // Keep only the doodle family.
  const tokens = new Map<string, string>();
  for (const match of block.matchAll(/--(doodle-[a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    if (match[1] !== undefined && match[2] !== undefined) {
      tokens.set(match[1], match[2].toLowerCase());
    }
  }
  if (tokens.size === 0) throw new Error(`tokens.css has no --doodle-* tokens for ${theme}.`);
  return tokens;
}

/**
 * Checks the colour map against the tokens: every token exists in both themes and its light value
 * is the colour the canvas drew, so light mode can't drift.
 *
 * @param lightTokens - from readDoodleTokens(…, 'light')
 * @param nightTokens - from readDoodleTokens(…, 'night')
 * @returns the problems found (empty when all is well)
 */
export function checkColourMap(
  lightTokens: Map<string, string>,
  nightTokens: Map<string, string>,
): DoodleProblem[] {
  const problems: DoodleProblem[] = [];
  for (const [hex, token] of Object.entries(doodleColourTokens)) {
    const lightValue = lightTokens.get(token);
    if (lightValue === undefined) problems.push(`tokens.css: --${token} is missing in light mode`);
    else if (lightValue !== hex) {
      problems.push(
        `tokens.css: --${token} is ${lightValue} in light mode, the doodles use ${hex}`,
      );
    }
    if (!nightTokens.has(token)) problems.push(`tokens.css: --${token} is missing in night mode`);
  }
  return problems;
}

/**
 * Rewrites one element's fixed fill and stroke colours into token references in its style
 * attribute: fill="#2a0e33" becomes style="fill:var(--doodle-ink, #2a0e33)".
 *
 * @param tag - one start tag, for example <path fill="#2A0E33" d="…">
 * @param unknownColours - filled with any colour that has no token
 * @returns the rewritten tag
 */
function tokeniseTag(tag: string, unknownColours: Set<string>): string {
  const declarations: string[] = [];
  // Lift each fixed colour out of its attribute; the canvas wrote some in upper case.
  const withoutColours = tag.replace(
    /\s(fill|stroke)="(#[0-9a-f]{6})"/gi,
    (_whole, property: string, hex: string) => {
      const token = doodleColourTokens[hex.toLowerCase()];
      if (token === undefined) {
        unknownColours.add(hex.toLowerCase());
        return ` ${property}="${hex}"`;
      }
      declarations.push(`${property}:var(--${token}, ${hex.toLowerCase()})`);
      return '';
    },
  );
  if (declarations.length === 0) return withoutColours;
  // Put the colours back as a style attribute just before the tag closes.
  const closing = withoutColours.endsWith('/>') ? '/>' : '>';
  const body = withoutColours.slice(0, -closing.length).trimEnd();
  return `${body} style="${declarations.join(';')}"${closing}`;
}

/**
 * Rewrites every fixed colour in one doodle to its token. Running it on an already rewritten
 * doodle changes nothing.
 *
 * @param svg - the file's contents
 * @returns the rewritten contents and the colours that had no token (the file is still returned
 *   with those colours untouched, so the caller can refuse to write it)
 */
export function tokeniseDoodle(svg: string): { svg: string; unknownColours: string[] } {
  const unknownColours = new Set<string>();
  const rewritten = svg.replace(/<[a-zA-Z][^>]*>/g, (tag) => tokeniseTag(tag, unknownColours));
  return { svg: rewritten, unknownColours: [...unknownColours].sort() };
}

/**
 * Lists every raw hex colour in a doodle that isn't an allowed fallback. Allowed means written as
 * var(--doodle-name, #hex) where #hex is that token's light value.
 *
 * @param svg - the file's contents
 * @param lightTokens - from readDoodleTokens(…, 'light')
 * @returns one line per problem (empty when the file is clean)
 */
export function findRawColours(svg: string, lightTokens: Map<string, string>): DoodleProblem[] {
  const problems: DoodleProblem[] = [];
  // Take out every well-formed fallback, noting any whose value drifted from the token.
  const withoutFallbacks = svg.replace(
    /var\(--(doodle-[a-z-]+),\s*(#[0-9a-f]{6})\)/gi,
    (_whole, token: string, hex: string) => {
      const lightValue = lightTokens.get(token);
      if (lightValue === undefined) problems.push(`uses --${token}, which is not in tokens.css`);
      else if (lightValue !== hex.toLowerCase()) {
        problems.push(`fallback ${hex} for --${token} should be its light value ${lightValue}`);
      }
      return '';
    },
  );
  // Whatever hex colour is left is raw: it would ignore night mode.
  for (const match of withoutFallbacks.matchAll(/#[0-9a-f]{3,8}\b/gi)) {
    problems.push(`raw colour ${match[0].toLowerCase()} has no token`);
  }
  return [...new Set(problems)];
}

/** What one run did. */
export interface DoodleTokensResult {
  /** Files rewritten (rewrite mode only). */
  changed: string[];
  /** Files left alone because they are cover backgrounds. */
  skippedCovers: string[];
  /** Problems, each starting with the file name. */
  problems: DoodleProblem[];
}

/**
 * Runs the rewrite or the check over every SVG in a folder.
 *
 * @param mode - 'rewrite' changes files; 'check' only reports
 * @param folder - the folder of SVGs (design/assets by default)
 * @param tokensCss - the contents of tokens.css (read from disk by default)
 * @returns what happened; problems is empty when every doodle is clean
 */
export function runDoodleTokens(
  mode: 'rewrite' | 'check',
  folder = doodleFolder,
  tokensCss = readFileSync(tokensCssPath, 'utf8'),
): DoodleTokensResult {
  const lightTokens = readDoodleTokens(tokensCss, 'light');
  const nightTokens = readDoodleTokens(tokensCss, 'night');
  const result: DoodleTokensResult = {
    changed: [],
    skippedCovers: [],
    problems: checkColourMap(lightTokens, nightTokens),
  };
  // A wrong map would write wrong fallbacks, so stop before touching any file.
  if (result.problems.length > 0) return result;

  for (const fileName of readdirSync(folder)
    .filter((name) => name.endsWith('.svg'))
    .sort()) {
    const filePath = join(folder, fileName);
    const svg = readFileSync(filePath, 'utf8');
    if (isCoverBackground(svg)) {
      result.skippedCovers.push(fileName);
      continue;
    }
    runOneDoodle(mode, { fileName, filePath, svg }, lightTokens, result);
  }
  return result;
}

/**
 * Rewrites or checks one doodle and records the outcome.
 *
 * @param mode - 'rewrite' or 'check'
 * @param file - the file's name, path and contents
 * @param lightTokens - from readDoodleTokens(…, 'light')
 * @param result - where to record what happened
 */
function runOneDoodle(
  mode: 'rewrite' | 'check',
  file: { fileName: string; filePath: string; svg: string },
  lightTokens: Map<string, string>,
  result: DoodleTokensResult,
): void {
  let svg = file.svg;
  if (mode === 'rewrite') {
    const rewritten = tokeniseDoodle(svg);
    // A colour with no token stops the rewrite of that file: nothing half-done is written.
    if (rewritten.unknownColours.length > 0) {
      for (const hex of rewritten.unknownColours) {
        result.problems.push(`${file.fileName}: colour ${hex} has no token; add it to tokens.css`);
      }
      return;
    }
    if (rewritten.svg !== svg) {
      writeFileSync(file.filePath, rewritten.svg);
      result.changed.push(file.fileName);
    }
    svg = rewritten.svg;
  }
  for (const problem of findRawColours(svg, lightTokens)) {
    result.problems.push(`${file.fileName}: ${problem}`);
  }
}

/**
 * Command-line entry: `tsx scripts/doodle-tokens.ts` rewrites, `--check` only reports.
 * Exits with 1 when there are problems, so CI fails.
 */
function main(): void {
  const mode = process.argv.includes('--check') ? 'check' : 'rewrite';
  const result = runDoodleTokens(mode);

  for (const problem of result.problems) console.error(problem);
  const doodleCount = readdirSync(doodleFolder).filter((name) => name.endsWith('.svg')).length;
  console.log(
    `${mode === 'rewrite' ? 'Rewrote' : 'Checked'} ${doodleCount - result.skippedCovers.length} ` +
      `doodles (${result.changed.length} changed, ${result.skippedCovers.length} cover ` +
      `backgrounds left alone): ${result.problems.length} problem(s).`,
  );
  process.exitCode = result.problems.length === 0 ? 0 : 1;
}

// Run only when started from the command line, not when a test imports the functions.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
