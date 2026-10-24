/**
 * doodleFiles: the hand-drawn doodles from design/assets/, loaded as SVG text so /design can draw
 * them inline, where they take their colours from the --doodle-* tokens (Lane B, "Design: doodles
 * take their colours from the tokens", 23 Oct 2026).
 *
 * Why inline: an <img> can't see the page's CSS variables, so a doodle only follows night mode
 * when its SVG sits in the page. The files are our own artwork, rewritten by
 * scripts/doodle-tokens.ts, never user input, so drawing their text into the page is safe.
 * Who uses it: DoodleSection (the /design page) and its test. Vite bundles the files into the
 * lazily loaded /design chunk only, so readers never download them from here.
 * What it leaves out: the 16 drawn cover backgrounds that share the folder (viewBox 0 0 100 160);
 * covers keep their colours in night mode (src/lib/cover-colours.ts).
 */

/** One doodle, ready to draw. */
export interface DoodleFile {
  /** The canvas's file id, the file name without .svg. */
  id: string;
  /** The name the canvas gave it, from the SVG's <title>. */
  title: string;
  /** The SVG markup. */
  svg: string;
}

/** The drawn cover backgrounds' viewBox: the same rule scripts/doodle-tokens.ts uses. */
const coverViewBox = 'viewBox="0 0 100 160"';

// Every SVG in design/assets/ as text, keyed by its path, bundled at build time.
const svgFilesByPath = import.meta.glob<string>('/design/assets/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * Turns one bundled file into a DoodleFile.
 *
 * @param path - the file's path, as Vite lists it
 * @param svg - the file's text
 * @returns the doodle
 */
function toDoodleFile(path: string, svg: string): DoodleFile {
  const fileName = path.slice(path.lastIndexOf('/') + 1);
  const title = /<title>([^<]*)<\/title>/.exec(svg)?.[1] ?? fileName;
  return { id: fileName.replace(/\.svg$/, ''), title, svg };
}

/** All 98 doodles, by name, without the cover backgrounds. */
export const doodles: DoodleFile[] = Object.entries(svgFilesByPath)
  .filter(([, svg]) => !svg.includes(coverViewBox))
  .map(([path, svg]) => toDoodleFile(path, svg))
  .sort((first, second) => first.title.localeCompare(second.title, 'en'));

/** The three doodles /design shows side by side in light and night: the cat, the mug, the heart. */
const sampleDoodleIds = [
  '046fb8a00941dcf5a7051dd98d11bbef',
  'c96e4c6d379974d9168df6dc534ab327',
  'c7264d2c28197ec223c423400809ee92',
];

/** The three sample doodles, in that order. */
export const sampleDoodles: DoodleFile[] = sampleDoodleIds.flatMap((id) => {
  const doodle = doodles.find((candidate) => candidate.id === id);
  return doodle === undefined ? [] : [doodle];
});
