/**
 * Link previews for shared landing pages at /c/<name> (story S1-E11-14 criterion 13; bundle
 * CONTESTS-13a2c).
 *
 * Why it exists: a contest or campaign page is shared on WhatsApp, Instagram and in social posts,
 * and those apps read the page's HTML without running its JavaScript. For every /c/<name> address
 * this handler takes the app's index.html, asks landing_page() what a visitor who isn't logged in
 * sees (only the live version, never a draft) and writes into the page's <head> the title, the
 * description and the Open Graph and Twitter tags: the hero's title and introduction, in Romanian
 * (the interface opens in Romanian for everyone, decided 17 Oct 2026), and a plain picture in the
 * page's theme colour. Staff's search title and description (S1-E11-38) win over the hero's words,
 * and a canonical link names the page's one address. A live page is indexable unless staff hid it
 * from search engines; an unknown, archived or not yet live address gets noindex. If the database can't be reached, the page goes out unchanged.
 * Who calls it: functions/c/[[path]].ts on Cloudflare Pages, and server/pages-functions-plugin.ts
 * locally (npm run dev, npm run preview and the end-to-end tests).
 * What it calls: the Supabase REST endpoint /rest/v1/rpc/landing_page with the public anon key,
 * the shared helpers in server/link-preview.ts, and src/lib/searchWords.ts for the words (shared
 * with Staff › Website › Search and sharing, S1-E11-39).
 * Never logged: the request, the visitor or any page text (CLAUDE.md rule 12).
 */
import { escapeHtml, injectIntoHead, siteNameOf, type DatabaseSettings } from './link-preview.ts';
import { linkPreviewPalette } from './link-preview-palette.ts';
import { landingPageWords } from '../src/lib/searchWords';
import { pathWithoutPlace } from '../src/lib/websitePlace';

/** What a landing page's preview shows. */
export interface LandingPreview {
  title: string;
  description: string;
  /** One of the link preview colours: the page's theme. */
  colour: string;
  /** True when staff asked search engines not to list the page (S1-E11-38). */
  isHidden: boolean;
}

/** What the handler needs from its host (Cloudflare or the local plugin). */
export interface LandingLinkHost {
  /** The app's index.html as the host would serve it. */
  fetchIndexHtml: () => Promise<Response>;
  /** The preview for a page's name, or null when there is none. */
  findPreview: (slug: string) => Promise<LandingPreview | null>;
}

/** The size of the pictures in public/link-previews/ (scripts/make-link-preview-images.ts). */
const PREVIEW_IMAGE_SIDE = 400;

/** Landing page names: lower-case letters, digits and hyphens (landing_page_slug_problem()). */
const landingSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Reads a landing page's name from a path.
 *
 * @param pathname - the request's path, for example "/ro/ro/c/concursul-de-toamna" (with the
 *   country and language, LOCALISE-1) or the older "/c/concursul-de-toamna"
 * @returns the name, or null for any other path
 */
export function parseLandingAddress(pathname: string): string | null {
  const parts = pathWithoutPlace(pathname.replace(/\/+$/, '')).split('/');
  // parts[0] is the empty text before the first slash; parts[1] must be "c".
  if (parts[1] !== 'c' || parts.length !== 3) return null;
  const slug = parts[2] ?? '';
  return landingSlugPattern.test(slug) ? slug : null;
}

/** The parts of landing_page()'s answer the preview reads. */
interface LandingRow {
  content: {
    theme?: string;
    blocks?: Array<{ kind?: string; ro?: { title?: string; intro?: string } }>;
    /** The search fields (S1-E11-38); the preview reads the Romanian words, as it does the hero's. */
    search?: { hidden?: boolean; ro?: { title?: string; description?: string } };
  };
}

/**
 * Turns landing_page()'s answer into the preview: the hero's Romanian title and introduction,
 * and the theme's colour (plum when the theme isn't one of the pictures).
 *
 * @param row - the page as the database answered it
 * @returns the preview, or null when the page has no hero title
 */
export function landingPreviewFrom(row: LandingRow): LandingPreview | null {
  // Step 1: the words: staff's Romanian search fields win, an empty one keeps the hero's
  // (S1-E11-38; src/lib/searchWords.ts, shared with Staff › Website › Search and sharing).
  const heroTitle = landingPageWords({ blocks: row.content.blocks }).title;
  if (heroTitle === '') return null;
  const words = landingPageWords(row.content);
  // Step 2: the theme's colour, plum when the theme isn't one of the pictures.
  return {
    title: words.title,
    description: words.description,
    colour: landingPreviewColour(row.content.theme),
    isHidden: words.isHidden,
  };
}

/**
 * The link preview picture's colour for a landing page's theme.
 *
 * @param theme - the page's theme, as stored
 * @returns one of the colours in public/link-previews/, plum when the theme isn't one of them
 */
export function landingPreviewColour(theme: string | undefined): string {
  const wanted = theme ?? '';
  return Object.keys(linkPreviewPalette).includes(wanted) ? wanted : 'plum';
}

/**
 * Asks the database for a landing page's preview.
 *
 * @param settings - the Supabase address and public anon key
 * @param slug - the page's name
 * @returns the preview, or null when there is no live page
 * Errors: throws when the database answers with an error or can't be reached.
 */
export async function fetchLandingPreview(
  settings: DatabaseSettings,
  slug: string,
): Promise<LandingPreview | null> {
  // Step 1: call the public read through Supabase's REST endpoint, as a visitor (the anon key).
  const response = await fetch(`${settings.supabaseUrl}/rest/v1/rpc/landing_page`, {
    method: 'POST',
    headers: {
      apikey: settings.anonKey,
      Authorization: `Bearer ${settings.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_slug: slug }),
  });
  if (!response.ok) throw new Error(`landing_page answered ${response.status}`);
  // Step 2: no page, or a page without a title, has no preview.
  const row = (await response.json()) as LandingRow | null;
  return row === null ? null : landingPreviewFrom(row);
}

/**
 * Everything the preview adds to the page's <head>.
 *
 * @param preview - the page's preview
 * @param page - the page's address, the site's name and the site's origin
 * @returns the tags as one HTML text
 */
export function landingHeadTags(
  preview: LandingPreview,
  page: { url: string; siteName: string; origin: string },
): string {
  const image = `${page.origin}/link-previews/${preview.colour}.png`;
  const tags = [
    `<link rel="canonical" href="${escapeHtml(page.url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escapeHtml(page.siteName)}">`,
    `<meta property="og:title" content="${escapeHtml(preview.title)}">`,
    `<meta property="og:url" content="${escapeHtml(page.url)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:image:width" content="${PREVIEW_IMAGE_SIDE}">`,
    `<meta property="og:image:height" content="${PREVIEW_IMAGE_SIDE}">`,
    // S1-E11-39: the picture is a plain colour card, so its alt text names the page it stands for.
    `<meta property="og:image:alt" content="${escapeHtml(preview.title)}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${escapeHtml(preview.title)}">`,
  ];
  // The description only when the hero has an introduction.
  if (preview.description !== '') {
    const description = escapeHtml(preview.description);
    tags.push(
      `<meta name="description" content="${description}">`,
      `<meta property="og:description" content="${description}">`,
      `<meta name="twitter:description" content="${description}">`,
    );
  }
  // S1-E11-38: a page staff hid from search engines says so (the header says it too).
  if (preview.isHidden) tags.push('<meta name="robots" content="noindex">');
  return tags.join('\n    ');
}

/**
 * Answers a request for /c/<name> with the app's page and its preview.
 *
 * @param request - the incoming GET request
 * @param host - how to read index.html and the preview
 * @returns the page with the preview tags, noindex when there is no live page, and unchanged when
 *   the database can't be reached
 */
export async function handleLandingLink(
  request: Request,
  host: LandingLinkHost,
): Promise<Response> {
  // Step 1: the page itself; anything but a landing page address goes out as it is.
  const page = await host.fetchIndexHtml();
  const url = new URL(request.url);
  const slug = parseLandingAddress(url.pathname);
  if (slug === null || !page.ok) return page;
  const html = await page.text();
  const headers = new Headers(page.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  // The page's text changes, so the static file's length and version tag no longer apply.
  headers.delete('Content-Length');
  headers.delete('ETag');
  // Step 2: the preview; when the database can't be reached, the page still loads, unchanged.
  let preview: LandingPreview | null;
  try {
    preview = await host.findPreview(slug);
  } catch {
    console.warn(
      'Landing preview: the database could not be reached; the page went out without tags.',
    );
    return new Response(html, { status: page.status, headers });
  }
  // Step 3: no live page: no preview, and not indexable.
  if (preview === null) {
    headers.set('X-Robots-Tag', 'noindex');
    return new Response(injectIntoHead(html, null, '<meta name="robots" content="noindex">'), {
      status: page.status,
      headers,
    });
  }
  // Step 4: the tags; the page's address carries no query (no tracking codes, S1-E4-05).
  if (preview.isHidden) headers.set('X-Robots-Tag', 'noindex');
  const tags = landingHeadTags(preview, {
    url: `${url.origin}${url.pathname}`,
    siteName: siteNameOf(html),
    origin: url.origin,
  });
  return new Response(injectIntoHead(html, preview.title, tags), { status: page.status, headers });
}
