/**
 * The third-party check: fails when the built app could load something from a web address we
 * haven't reviewed (story S1-E14-03, "no-cookie check"; CLAUDE.md rule 7: "no other third-party
 * scripts or cookies without an ADR").
 *
 * Who runs it: `npm run third-party:check`, after `npm run build` (scripts/run-all-checks.sh runs
 * both). What it reads: dist/index.html and every .js and .css file under dist/.
 * What it checks:
 *   1. index.html loads no script, stylesheet, font or image from another site: every src and href
 *      on <script> and <link> is a path on our own site.
 *   2. Every web address written anywhere in the bundle belongs to a reviewed host. Most of them
 *      are only words inside libraries (an SVG namespace, a link in an error message), never
 *      loaded, but listing them means a new one can't slip in unseen.
 * The Supabase project's own address comes from VITE_SUPABASE_URL at build time, so it is allowed
 * whatever it is.
 * To allow a new host: add it to reviewedHosts with the reason, and write an ADR if the app
 * really loads from it (rule 7).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Hosts that appear in the bundle, and why each is fine. */
const reviewedHosts: Record<string, string> = {
  'www.w3.org': 'XML and SVG namespaces inside React and the editor; never loaded',
  'react.dev': 'links in React error messages; never loaded',
  'reactrouter.com': 'a link in a React Router warning; never loaded',
  'react.i18next.com': 'a link in an i18next warning; never loaded',
  'github.com': 'links in library error messages; never loaded',
  'json-schema.org': 'the JSON Schema identifier inside zod; never loaded',
  'tailwindcss.com': 'the licence comment in the built stylesheet; never loaded',
  'prosemirror.net': 'a link in an editor warning; never loaded',
  // The Word builder (S1-E13-02, the docx library): XML namespaces written into every .docx file
  // and one help link in a comment; none is ever loaded.
  'schemas.openxmlformats.org': 'Word file XML namespaces (docx library); never loaded',
  'schemas.microsoft.com': 'Word file XML namespaces (docx library); never loaded',
  'purl.org': 'Dublin Core namespaces in a Word file’s properties (docx library); never loaded',
  // The EPUB of a completed story (S1-E13-05, PRIVACY part f) names its XML namespaces; the
  // book is built in the browser and none of them is ever loaded.
  'www.idpf.org': 'EPUB package and page namespaces (src/lib/epub); never loaded',
  'www.daisy.org':
    'the NCX table of contents namespace for older e-readers (src/lib/epub); never loaded',
  'answers.microsoft.com': 'a help link in the docx library; never loaded',
  'stuk.github.io':
    'a link in the ZIP library’s error message when a file isn’t a ZIP; never loaded',
  'rolldown.rs':
    'a link in the bundler’s error message for require() inside the Word and ZIP libraries; never loaded',
  // The PDF builder (ADMIN-2d, pdfmake and the PDFKit inside it): XML namespaces written into a
  // PDF's metadata and links in password-handling error messages; the library is set to load no
  // web address at all (src/lib/pdf/loadPdfMake.ts).
  'ns.adobe.com': 'PDF metadata (XMP) namespaces (pdfmake); never loaded',
  'www.aiim.org': 'PDF/A and PDF/UA metadata namespaces (pdfmake); never loaded',
  'tools.ietf.org': 'links in the PDF library’s password error messages; never loaded',
  // Music and video players (S1-E3-10; ADR 0008): loaded in an iframe only after the reader
  // presses play, never on page load. The source links are shown to moderators, never loaded.
  'www.youtube-nocookie.com': 'the YouTube player, privacy-enhanced; only after play (ADR 0008)',
  'www.youtube.com': 'a writer’s clean source link for moderators; never loaded',
  'player.vimeo.com': 'the Vimeo player with do-not-track; only after play (ADR 0008)',
  'vimeo.com': 'a writer’s clean source link for moderators; never loaded',
  'www.loom.com': 'the Loom player; only after play (ADR 0008)',
  'open.spotify.com': 'the Spotify player; only after play (ADR 0008)',
  'embed.music.apple.com': 'the Apple Music player; only after play (ADR 0008)',
  'music.apple.com': 'a writer’s clean source link for moderators; never loaded',
  // The avatar builder (ADMIN-2g; the Micah art since AVATAR-1, ADR 0016): DiceBear writes the
  // art's source and its CC BY 4.0 licence into each drawn SVG's metadata, and the editor links
  // to the licence under the credit; none is ever loaded by the app.
  'www.figma.com': 'the Micah art’s source in each avatar’s SVG metadata; never loaded',
  'dribbble.com': 'the Micah designer’s page in the art’s metadata; never loaded',
  'creativecommons.org': 'the CC BY 4.0 licence: SVG metadata and the credit’s link; never loaded',
  // Story Atlas (S1-E17): the writer's Markdown help shows a sample link; never loaded.
  'example.com': 'the sample link in the Atlas text help; never loaded',
  // The ad network (S1-E12-04; ADR 0014): Google AdSense's script, added only when a network ad's
  // slot comes into view and only while the ad_network flag is on (off until GO-LIVE).
  'pagead2.googlesyndication.com':
    'the AdSense script; only when a network slot is in view (ADR 0014)',
  localhost: 'a placeholder base address inside React Router and the local Supabase in development',
};

/** Where the build writes its files. */
const distFolder = 'dist';

/**
 * Every file under a folder, at any depth.
 *
 * @param folder - the folder to walk
 * @returns the file paths
 */
function filesUnder(folder: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(folder)) {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) found.push(...filesUnder(path));
    else found.push(path);
  }
  return found;
}

/**
 * The host of the Supabase project this build talks to, if one was set.
 *
 * @returns the host name, or null
 */
function supabaseHost(): string | null {
  const address = process.env.VITE_SUPABASE_URL;
  if (address === undefined || address === '') return null;
  try {
    return new URL(address).hostname;
  } catch {
    return null;
  }
}

/**
 * Problems in index.html: a <script> or <link> that points at another site.
 *
 * @param html - the page's text
 * @returns one line per problem
 */
function indexPageProblems(html: string): string[] {
  const problems: string[] = [];
  const tagPattern = /<(script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(tagPattern)) {
    const address = match[2] ?? '';
    // A path on our own site starts with "/" or is relative; anything with "//" goes elsewhere.
    if (address.includes('//')) problems.push(`index.html <${match[1]}> loads ${address}`);
  }
  return problems;
}

/**
 * Problems in one built file: web addresses on hosts nobody reviewed.
 *
 * @param path - the file
 * @param allowed - the reviewed hosts plus the Supabase host
 * @returns one line per new host
 */
function bundleProblems(path: string, allowed: Set<string>): string[] {
  const text = readFileSync(path, 'utf8');
  const hosts = new Set<string>();
  for (const match of text.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) {
    const host = (match[1] ?? '').toLowerCase().replace(/\.$/, '');
    // "https://." at the end of a sentence in help text names no host at all.
    if (host === '') continue;
    if (!allowed.has(host)) hosts.add(host);
  }
  return [...hosts].map((host) => `${path} mentions ${host}, which isn't a reviewed host`);
}

/**
 * Runs the check and exits with 1 when anything is found.
 */
function main(): void {
  // Step 1: the build must exist; this check reads what users would download.
  let files: string[];
  try {
    files = filesUnder(distFolder);
  } catch {
    console.error(`No ${distFolder} folder. Run npm run build first.`);
    process.exit(1);
  }
  // Step 2: the allowed hosts are the reviewed ones plus this build's Supabase project.
  const allowed = new Set(Object.keys(reviewedHosts));
  const ownDatabase = supabaseHost();
  if (ownDatabase !== null) allowed.add(ownDatabase);
  // Step 3: check index.html's tags, then every script and stylesheet.
  const problems = indexPageProblems(readFileSync(join(distFolder, 'index.html'), 'utf8'));
  for (const path of files.filter((file) => /\.(js|css|html)$/.test(file))) {
    problems.push(...bundleProblems(path, allowed));
  }
  if (problems.length > 0) {
    console.error('Third-party check failed:');
    for (const problem of problems) console.error(`  ${problem}`);
    console.error(
      'Review each host, add it to reviewedHosts with the reason, and write an ADR if the app loads from it.',
    );
    process.exit(1);
  }
  console.log('Third-party check passed: nothing in the build points at an unreviewed site.');
}

main();
