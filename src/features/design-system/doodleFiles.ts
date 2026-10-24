/**
 * doodleFiles: the hand-drawn doodles from design/assets/, loaded as SVG text so /design can draw
 * them inline, where they take their colours from the --doodle-* tokens (Lane B, "Design: doodles
 * take their colours from the tokens", 23 Oct 2026).
 *
 * Why inline: an <img> can't see the page's CSS variables, so a doodle only follows night mode
 * when its SVG sits in the page. The files are our own artwork, rewritten by
 * scripts/doodle-tokens.ts, never user input, so drawing their text into the page is safe.
 * Who uses it: DoodleSection (the /design page) and its test. The three samples ride in the
 * lazily loaded /design chunk; the full sheet is a separate chunk fetched on request, so readers
 * never download any of it.
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

// The three samples are bundled with the /design page; the full sheet's 95 others are loaded
// only when someone asks for them. All 98 inline (about 2.3 MB of text) made the /design chunk so
// slow to load that its entrance animation could still be running when a test checked contrast.
const sampleFilesByPath = import.meta.glob<string>(
  [
    '/design/assets/046fb8a00941dcf5a7051dd98d11bbef.svg',
    '/design/assets/c96e4c6d379974d9168df6dc534ab327.svg',
    '/design/assets/c7264d2c28197ec223c423400809ee92.svg',
  ],
  { query: '?raw', import: 'default', eager: true },
);
const loadersByPath = import.meta.glob<string>('/design/assets/*.svg', {
  query: '?raw',
  import: 'default',
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

/** The three doodles /design shows side by side in light and night: the cat, the mug, the heart. */
export const sampleDoodles: DoodleFile[] = Object.entries(sampleFilesByPath).map(([path, svg]) =>
  toDoodleFile(path, svg),
);

/**
 * Loads all 98 doodles for the sign-off sheet, by name, without the cover backgrounds.
 *
 * @returns the doodles, sorted by title
 * Errors: rejects when a file can't be loaded (the section shows a plain message).
 */
export async function loadAllDoodles(): Promise<DoodleFile[]> {
  const files = await Promise.all(
    Object.entries(loadersByPath).map(async ([path, load]) => toDoodleFile(path, await load())),
  );
  return files
    .filter((file) => !file.svg.includes(coverViewBox))
    .sort((first, second) => first.title.localeCompare(second.title, 'en'));
}
