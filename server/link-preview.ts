/**
 * Link previews and search engine tags for shared story and chapter links (story S1-E4-04;
 * decided 16 Oct 2026, Q36; Q13 option B, see scripts/make-link-preview-images.ts).
 *
 * Why it exists: WhatsApp, Instagram, TikTok and search engines read a page's HTML without
 * running its JavaScript, so a single-page app alone shows them an empty page. For every address
 * under /s/ this handler takes the app's index.html, asks the database what a visitor who isn't
 * logged in may see (get_link_preview(), never the tables and never chapter text) and writes
 * into the page's <head>:
 * - <title>, the Open Graph tags (og:title, og:description, og:image, og:url, og:site_name) and
 *   the Twitter card, so every app shows the same card: title, pen name, blurb and a plain
 *   picture in the drawn cover's colour (plum otherwise);
 * - for story pages, JSON-LD (schema.org CreativeWork) with the title, blurb and pen name only;
 * - for chapter pages and unknown addresses, <meta name="robots" content="noindex"> and the same
 *   rule in an X-Robots-Tag header: only story pages are indexable (Q36).
 * 16+ and 18+ stories show the title and the rating only, never the blurb or pen name (signed-out
 * visitors count as under 16, Q6). Every value is HTML-escaped, so a title like "<script>" stays
 * text. If the database can't be reached, the page goes out unchanged: the preview is a nicety,
 * the page itself must always load.
 * Who calls it: functions/s/[[path]].ts on Cloudflare Pages, and server/pages-functions-plugin.ts
 * locally (npm run dev, npm run preview and the end-to-end tests).
 * What it calls: the Supabase REST endpoint /rest/v1/rpc/get_link_preview with the public anon key.
 * Never logged: the request, the visitor or any user text (CLAUDE.md rule 12).
 */
// The wording comes from the app's own locale files (CLAUDE.md rule 4). Nothing else from src/
// is imported: this file is also loaded with vite.config.ts, where the app's "@" paths don't exist.
import englishReading from '../src/locales/en/reading.json' with { type: 'json' };
import romanianReading from '../src/locales/ro/reading.json' with { type: 'json' };

import { linkPreviewPalette } from './link-preview-palette.ts';

/** A shared address: a story page (/s/<story>) or a chapter (/s/<story>/<chapter>). */
export interface SharedAddress {
  storySlug: string;
  chapterCode: string | null;
}

/** What get_link_preview() says a visitor who isn't logged in may see. */
export interface LinkPreview {
  slug: string;
  title: string;
  rating: 'all_ages' | '13_plus' | '16_plus' | '18_plus';
  languageCode: string;
  /** True for 16+ and 18+: only the title and the rating may be shown. */
  hidesText: boolean;
  blurb: string | null;
  writerName: string | null;
  cover: { kind: string; background: string | null } | null;
  chapterTitle: string | null;
  /** True when the address names a chapter. */
  isChapter: boolean;
}

/** Where the database is: the same public values the app is built with. */
export interface DatabaseSettings {
  supabaseUrl: string;
  anonKey: string;
}

/** What the handler needs from its host (Cloudflare or the local plugin). */
export interface SharedLinkHost {
  /** The app's index.html as the host would serve it. */
  fetchIndexHtml: () => Promise<Response>;
  /** The preview for an address, or null when there is none. */
  findPreview: (address: SharedAddress) => Promise<LinkPreview | null>;
}

/** The size of the pictures in public/link-previews/ (scripts/make-link-preview-images.ts). */
const PREVIEW_IMAGE_SIDE = 400;

/** Story addresses as the app makes them: lower-case letters, digits and hyphens. */
const storySlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Chapter codes: 8 lower-case letters or digits (S1-E3-02a). */
const chapterCodePattern = /^[a-z0-9]{8}$/;

/** The ratings' short labels, the same in both languages. */
const ratingLabels = { all_ages: 'All ages', '13_plus': '13+', '16_plus': '16+', '18_plus': '18+' };

/**
 * Reads a shared address from a path.
 *
 * @param pathname - the request's path, for example "/s/statia-meteo/ab12cd34"
 * @returns the story and chapter, or null for any other path
 */
export function parseSharedAddress(pathname: string): SharedAddress | null {
  const parts = pathname.replace(/\/+$/, '').split('/');
  // parts[0] is the empty text before the first slash; parts[1] must be "s".
  if (parts[1] !== 's' || parts.length < 3 || parts.length > 4) return null;
  const storySlug = parts[2] ?? '';
  const chapterCode = parts[3] ?? null;
  if (!storySlugPattern.test(storySlug)) return null;
  if (chapterCode !== null && !chapterCodePattern.test(chapterCode)) return null;
  return { storySlug, chapterCode };
}

/** The JSON get_link_preview() answers. */
interface PreviewRow {
  slug: string;
  title: string;
  rating: LinkPreview['rating'];
  language_code: string;
  hides_text: boolean;
  blurb: string | null;
  writer: { display_name: string } | null;
  cover: { kind: string; background: string | null } | null;
  chapter: { code: string; title: string | null } | null;
}

/**
 * Asks the database for an address's preview.
 *
 * @param settings - the Supabase address and public anon key
 * @param address - the story and chapter
 * @returns the preview, or null when the story or chapter has none
 * Errors: throws when the database answers with an error or can't be reached.
 */
export async function fetchLinkPreview(
  settings: DatabaseSettings,
  address: SharedAddress,
): Promise<LinkPreview | null> {
  // Step 1: call the function through Supabase's REST endpoint, as a visitor (the anon key).
  const response = await fetch(`${settings.supabaseUrl}/rest/v1/rpc/get_link_preview`, {
    method: 'POST',
    headers: {
      apikey: settings.anonKey,
      Authorization: `Bearer ${settings.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ story_slug: address.storySlug, chapter_code: address.chapterCode }),
  });
  if (!response.ok) throw new Error(`get_link_preview answered ${response.status}`);
  // Step 2: turn the database's names into ours.
  const row = (await response.json()) as PreviewRow | null;
  if (row === null) return null;
  return {
    slug: row.slug,
    title: row.title,
    rating: row.rating,
    languageCode: row.language_code,
    hidesText: row.hides_text,
    blurb: row.blurb,
    writerName: row.writer?.display_name ?? null,
    cover: row.cover,
    chapterTitle: row.chapter?.title ?? null,
    isChapter: address.chapterCode !== null,
  };
}

/**
 * Makes text safe inside HTML text and attribute values.
 *
 * @param text - any text, for example a story title
 * @returns the text with &, <, >, " and ' escaped
 */
export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * The preview's wording in the story's language (Romanian unless the story is in English; the
 * interface opens in Romanian for everyone, decided 17 Oct 2026).
 *
 * @param languageCode - the story's language
 * @returns the reading namespace's linkPreview keys for that language
 */
function previewWords(languageCode: string) {
  return languageCode === 'en' ? englishReading.linkPreview : romanianReading.linkPreview;
}

/** The palette's colour names, one picture each in public/link-previews/. */
const previewColours: string[] = Object.keys(linkPreviewPalette);

/**
 * The colour of the story's preview picture: the writer's drawn cover's background, otherwise
 * plum (automatic covers, and 16+ and 18+ stories, whose picture must say nothing about them).
 *
 * @param preview - the story's preview
 * @returns one of the palette's colour names
 */
export function previewColour(preview: LinkPreview): string {
  const background = preview.cover?.background ?? '';
  if (preview.cover?.kind === 'drawn' && previewColours.includes(background)) return background;
  return 'plum';
}

/**
 * The preview card's title and description.
 *
 * @param preview - the story's preview
 * @returns { title, description } as plain text
 */
export function previewText(preview: LinkPreview): { title: string; description: string } {
  const words = previewWords(preview.languageCode);
  // A hidden story: its title, and a line saying why there is nothing more.
  if (preview.hidesText) {
    const rating = ratingLabels[preview.rating];
    return {
      title: preview.title,
      description: words.hiddenDescription.replace('{{rating}}', rating),
    };
  }
  // A chapter: "Story · Chapter"; a story page: its title.
  const title =
    preview.chapterTitle === null ? preview.title : `${preview.title} · ${preview.chapterTitle}`;
  const byLine = words.byWriter.replace('{{name}}', preview.writerName ?? '');
  const description =
    preview.blurb === null || preview.blurb === '' ? byLine : `${byLine} · ${preview.blurb}`;
  return { title, description };
}

/**
 * The schema.org description of a story page: its title, blurb and pen name, never its text (Q36).
 *
 * @param preview - the story's preview
 * @param pageUrl - the page's address
 * @returns a <script type="application/ld+json"> element
 */
function structuredData(preview: LinkPreview, pageUrl: string): string {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: preview.title,
    inLanguage: preview.languageCode,
    url: pageUrl,
  };
  if (preview.blurb !== null) data.description = preview.blurb;
  if (preview.writerName !== null) data.author = { '@type': 'Person', name: preview.writerName };
  // "<" is written as < so a title can never close the script element early.
  const json = JSON.stringify(data).replaceAll('<', '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

/**
 * Everything the preview adds to the page's <head>.
 *
 * @param preview - the story's preview
 * @param page - the page's address, the site's name and the site's origin
 * @returns the tags as one HTML text
 */
export function headTagsFor(
  preview: LinkPreview,
  page: { url: string; siteName: string; origin: string },
): string {
  const { title, description } = previewText(preview);
  const image = `${page.origin}/link-previews/${previewColour(preview)}.png`;
  const tags = [
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<meta property="og:type" content="${preview.isChapter ? 'article' : 'book'}">`,
    `<meta property="og:site_name" content="${escapeHtml(page.siteName)}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(page.url)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:image:width" content="${PREVIEW_IMAGE_SIDE}">`,
    `<meta property="og:image:height" content="${PREVIEW_IMAGE_SIDE}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
  ];
  // Only story pages are indexable; chapters carry noindex and no structured data (Q36).
  if (preview.isChapter) tags.push('<meta name="robots" content="noindex">');
  else tags.push(structuredData(preview, page.url));
  return tags.join('\n    ');
}

/**
 * Puts a title and tags into a page.
 *
 * @param html - the app's index.html
 * @param title - the new <title> text, or null to keep the page's own
 * @param tags - HTML to add at the end of <head>
 * @returns the changed page
 */
export function injectIntoHead(html: string, title: string | null, tags: string): string {
  const withTitle =
    title === null
      ? html
      : html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  return withTitle.replace('</head>', `    ${tags}\n  </head>`);
}

/**
 * The site's name: the <title> index.html is built with (from src/config/brand.ts), so the
 * product name is never written here (CLAUDE.md: names are settings, not code).
 *
 * @param html - the app's index.html
 * @returns the text of its <title>, or an empty text
 */
export function siteNameOf(html: string): string {
  return /<title>([^<]*)<\/title>/.exec(html)?.[1]?.trim() ?? '';
}

/**
 * Answers a request for a shared address with the app's page and its preview.
 *
 * @param request - the incoming GET request for /s/…
 * @param host - how to read index.html and the preview
 * @returns the page, with the preview tags when there is a preview, noindex when it is a chapter
 *   or unknown, and unchanged when the database can't be reached
 */
export async function handleSharedLink(request: Request, host: SharedLinkHost): Promise<Response> {
  // Step 1: the page itself; anything but a shared address goes out as it is.
  const page = await host.fetchIndexHtml();
  const url = new URL(request.url);
  const address = parseSharedAddress(url.pathname);
  if (address === null || !page.ok) return page;
  const html = await page.text();
  const headers = new Headers(page.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  // The page's text changes, so the static file's length and version tag no longer apply.
  headers.delete('Content-Length');
  headers.delete('ETag');
  // Step 2: the preview; when the database can't be reached, the page still loads, unchanged.
  let preview: LinkPreview | null;
  try {
    preview = await host.findPreview(address);
  } catch {
    console.warn(
      'Link preview: the database could not be reached; the page went out without tags.',
    );
    return new Response(html, { status: page.status, headers });
  }
  // Step 3: an unknown or hidden address: no preview, and not indexable.
  if (preview === null) {
    headers.set('X-Robots-Tag', 'noindex');
    return new Response(injectIntoHead(html, null, '<meta name="robots" content="noindex">'), {
      status: page.status,
      headers,
    });
  }
  // Step 4: the tags; the page's address carries no query (no tracking codes, S1-E4-05).
  const pageUrl = `${url.origin}${url.pathname}`;
  const tags = headTagsFor(preview, {
    url: pageUrl,
    siteName: siteNameOf(html),
    origin: url.origin,
  });
  if (preview.isChapter) headers.set('X-Robots-Tag', 'noindex');
  return new Response(injectIntoHead(html, previewText(preview).title, tags), {
    status: page.status,
    headers,
  });
}
