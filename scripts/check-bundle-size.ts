/**
 * The bundle-size budget behind `npm run bundle:check` (QA-6, finding S4).
 *
 * Who runs it: `npm run checks` and CI's "checks" job, after `npm run build`.
 * What it reads: dist/index.html (the scripts every page loads first) and the JavaScript files
 * under dist/assets/, following each file's static imports.
 * What it checks: the gzip size of
 *   - the first download every page needs (the entry script and the files index.html preloads);
 *   - the chapter reader's first download (that, plus the reader's own code and what it imports),
 *     which e2e/reader-performance.spec.ts expects to show the first paragraph within 2 seconds
 *     on a throttled phone (S1-E4-01b).
 * Why: before QA-6 the website, help, landing pages, the Legal centre and the sign-up and log-in
 * pages sat in the first download of every page: 54 files, 360 KB compressed. A page imported
 * eagerly in src/app/router.tsx quietly brings it back; this fails the build instead.
 * Raising a budget is a decision: say why in the pull request.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

/**
 * The budgets in kilobytes after gzip. QA-6, 5 Nov 2026: main measured 362 and 387; after QA-6,
 * 259 and 324. The budgets leave about 20 KB of room for new features.
 */
export const budgetsInKilobytes = { firstLoad: 280, chapterReader: 345 };

/** A static import inside a built chunk: `import…from"./name.js"` or `import"./name.js"`. */
const staticImport = /\bimport(?:[^"'()]*?from)?\s*["']\.\/([^"']+\.js)["']/g;

/**
 * Lists the files one chunk imports statically (not `import()`, which loads later).
 *
 * @param chunkText - the built chunk
 * @returns the file names, relative to dist/assets/
 */
export function staticImportsOf(chunkText: string): string[] {
  return [...chunkText.matchAll(staticImport)].map((match) => match[1] ?? '');
}

/**
 * Follows static imports from some starting files.
 *
 * @param assetsFolder - dist/assets
 * @param startFiles - file names in that folder
 * @returns every file the start files need before they run, the start files included
 */
export function staticClosure(assetsFolder: string, startFiles: string[]): Set<string> {
  const needed = new Set<string>();
  const waiting = [...startFiles];
  // Step 1: a simple walk; each file is read once.
  while (waiting.length > 0) {
    const fileName = waiting.pop() ?? '';
    if (needed.has(fileName) || !existsSync(join(assetsFolder, fileName))) continue;
    needed.add(fileName);
    waiting.push(...staticImportsOf(readFileSync(join(assetsFolder, fileName), 'utf8')));
  }
  return needed;
}

/** The gzip size of some files in kilobytes. */
function gzipKilobytes(assetsFolder: string, fileNames: Iterable<string>): number {
  let bytes = 0;
  for (const fileName of fileNames)
    bytes += gzipSync(readFileSync(join(assetsFolder, fileName))).length;
  return Math.round(bytes / 1024);
}

/**
 * Finds the chapter reader's files in the built entry.
 *
 * @param entryText - the entry chunk
 * @returns the reader's chunk and every file Vite preloads with it (names in dist/assets/)
 * @throws when the reader's import or Vite's table of file names isn't there
 */
export function readerFiles(entryText: string): string[] {
  // Step 1: Vite's table of every lazily loaded file, `m.f=["assets/…js", …]`.
  const table = /m\.f=\[([^\]]*)\]/.exec(entryText)?.[1];
  // Step 2: the reader's import() and the positions in that table it preloads.
  const readerImport =
    /import\(["'`]\.\/ChapterReaderPage-[^"'`]+\.js["'`]\)[^]*?__vite__mapDeps\(\[([\d,]+)\]\)/.exec(
      entryText,
    )?.[1];
  if (table === undefined || readerImport === undefined) {
    throw new Error('The chapter reader chunk was not found in the entry.');
  }
  const fileNames = [...table.matchAll(/["']assets\/([^"']+)["']/g)].map((match) => match[1] ?? '');
  return readerImport.split(',').map((position) => fileNames[Number(position)] ?? '');
}

/**
 * Measures the two downloads.
 *
 * @param distFolder - the build output
 * @returns their gzip sizes in kilobytes
 * @throws when the build or the reader's chunk is missing
 */
export function measureDownloads(distFolder: string): { firstLoad: number; chapterReader: number } {
  // Step 1: the scripts index.html loads or preloads.
  const indexHtml = readFileSync(join(distFolder, 'index.html'), 'utf8');
  const assetsFolder = join(distFolder, 'assets');
  const firstFiles = [...indexHtml.matchAll(/(?:src|href)="\/assets\/([^"]+\.js)"/g)].map(
    (match) => match[1] ?? '',
  );
  const firstLoad = staticClosure(assetsFolder, firstFiles);
  // Step 2: the reader's chunk and the files Vite fetches with it: the entry lists them, by
  // position in its __vite__mapDeps table, next to the reader's import().
  const entryText = firstFiles
    .map((fileName) => readFileSync(join(assetsFolder, fileName), 'utf8'))
    .join('\n');
  const readerLoad = new Set([...firstLoad, ...readerFiles(entryText)]);
  return {
    firstLoad: gzipKilobytes(assetsFolder, firstLoad),
    chapterReader: gzipKilobytes(assetsFolder, readerLoad),
  };
}

/** Runs the check from the command line and sets the exit code CI reads. */
function main(): void {
  const distFolder = fileURLToPath(new URL('../dist', import.meta.url));
  if (!existsSync(join(distFolder, 'index.html'))) {
    console.error('bundle:check needs a build first: npm run build');
    process.exitCode = 1;
    return;
  }
  const sizes = measureDownloads(distFolder);
  let failed = false;
  for (const [name, kilobytes] of Object.entries(sizes) as [keyof typeof sizes, number][]) {
    const budget = budgetsInKilobytes[name];
    const verdict = kilobytes <= budget ? 'within' : 'OVER';
    console.log(`${name}: ${kilobytes} KB gzip, ${verdict} the ${budget} KB budget`);
    failed ||= kilobytes > budget;
  }
  if (failed) {
    console.error(
      'bundle:check failed: a page probably imports something eagerly; see src/app/router.tsx.',
    );
    process.exitCode = 1;
  }
}

// Run main() only when this file is started directly, not when a test imports it.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
