/**
 * The sitemap and the robots file (story S1-E11-38; bundle SEO-1c).
 *
 * Why it exists: search engines find a site's pages from /sitemap.xml and read /robots.txt first
 * to learn what they may crawl. Both are built on request, so a new story or help page is listed
 * the moment it goes live, and the site's own address is never written into a file (CLAUDE.md:
 * names and domains are settings): every address is the request's own origin plus a path.
 * - /sitemap.xml lists what sitemap_entries() answers: the home page, Discover, the help centre and
 *   its live help pages, live landing pages and public stories, never anything private, unlisted,
 *   class-only, app-only, hidden by a moderator or hidden from search engines by staff.
 * - /robots.txt points to the sitemap and keeps crawlers out of the staff site, the writing
 *   screens and every member's own screens. AI crawlers get a shorter list (GROWTH-4, Robert,
 *   26 Nov 2026, 19:45 to 19:48 UTC): story pages without their chapters, Discover and its lists,
 *   and the open forums, threads and public spaces, nothing else. A Cloudflare preview copy of the site
 *   (<preview>.<project>.pages.dev) tells every crawler to stay out, so a pull request's preview is
 *   never listed next to the real site.
 * Who calls it: functions/sitemap.xml.ts and functions/robots.txt.ts on Cloudflare Pages, and
 * server/pages-functions-plugin.ts locally.
 * What it calls: the Supabase REST endpoint /rest/v1/rpc/sitemap_entries with the public anon key.
 * Never logged: the request or the visitor (CLAUDE.md rule 12).
 */
import { escapeHtml, type DatabaseSettings } from './link-preview.ts';

/** One address in the sitemap, as sitemap_entries() answers it. */
export interface SitemapEntry {
  path: string;
  /** The day it last changed ("2026-11-11"), or null when that isn't known. */
  changed_on: string | null;
}

/**
 * Addresses crawlers are asked to stay out of: staff screens, writing and planning, and every
 * screen that belongs to one member (their settings, library, notifications, reports and so on).
 * Blocking them in robots.txt is a courtesy to crawlers, never the protection: every one of these
 * screens checks who is signed in, and the database checks again (architecture 1.1, principle 3).
 */
export const privatePathPrefixes = [
  '/api/',
  '/staff',
  '/write',
  '/plan',
  '/settings',
  '/library',
  '/notifications',
  '/messages',
  '/my-reports',
  '/moderator-mail',
  '/support',
  '/certificates',
  '/class',
  '/canva',
  '/design',
  '/search',
  '/delete-account',
  '/age-check',
  '/parent-consent',
  '/data-request',
  '/teacher-check',
  '/unsubscribe',
] as const;

/**
 * Addresses inside a private prefix that are still open to search engines: one public reading
 * list (GROWTH-3), which sits under /library like the member's own Library.
 */
export const publicPathsInsidePrivate = ['/library/lists/'] as const;

/**
 * Addresses under an open prefix that only a member can use: starting a space, and a space's
 * tools. A space's own page and its threads stay open; each one tells search engines whether it
 * may be listed (server/space-head.ts).
 */
export const memberOnlySpacePaths = [
  '/spaces/new',
  '/spaces/*/new',
  '/spaces/*/settings',
  '/spaces/*/stories',
  '/spaces/*/points',
  '/spaces/*/competition',
  '/spaces/*/certificates',
  '/spaces/*/members',
  '/spaces/*/log',
  '/forums/*/new',
  '/forums/search',
] as const;

/**
 * The crawlers that gather text for AI tools, by the name each one gives in robots.txt. They may
 * read only the pages in aiCrawlerOpenPaths (GROWTH-4; Robert, 26 Nov 2026, 19:45 to 19:48 UTC).
 * A crawler obeys the most specific group that names it, so their group repeats the private list.
 */
export const aiCrawlerNames = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
  'cohere-ai',
  'Diffbot',
  'DuckAssistBot',
  'MistralAI-User',
] as const;

/**
 * What AI crawlers may read: a story's own page but none of its chapters ("/s/<story>/" and
 * anything after it), Discover and its lists, and the forums, threads and spaces. Each forum
 * thread or space page still says noindex when it is not fully public (server/space-head.ts).
 */
export const aiCrawlerRules = [
  'Allow: /s/',
  'Disallow: /s/*/',
  'Allow: /discover',
  'Allow: /forums',
  'Allow: /spaces/',
] as const;

/**
 * Asks the database for the sitemap's addresses.
 *
 * @param settings - the Supabase address and public anon key
 * @returns the addresses
 * Errors: throws when the database answers with an error or can't be reached.
 */
export async function fetchSitemapEntries(settings: DatabaseSettings): Promise<SitemapEntry[]> {
  const response = await fetch(`${settings.supabaseUrl}/rest/v1/rpc/sitemap_entries`, {
    method: 'POST',
    headers: {
      apikey: settings.anonKey,
      Authorization: `Bearer ${settings.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!response.ok) throw new Error(`sitemap_entries answered ${response.status}`);
  return (await response.json()) as SitemapEntry[];
}

/**
 * Writes the sitemap file (the sitemaps.org format search engines read).
 *
 * @param entries - the addresses
 * @param origin - the site's origin, for example "https://example.com"
 * @returns the XML text
 */
export function sitemapXml(entries: readonly SitemapEntry[], origin: string): string {
  const urls = entries.map((entry) => {
    // Every address is escaped: a path is checked by the database, but an "&" must still be
    // written "&amp;" in XML.
    const lastModified =
      entry.changed_on === null ? '' : `<lastmod>${escapeHtml(entry.changed_on)}</lastmod>`;
    return `  <url><loc>${escapeHtml(`${origin}${entry.path}`)}</loc>${lastModified}</url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/**
 * Whether an address is a Cloudflare preview of the site (one pull request's copy), which must
 * never be listed: "<preview>.<project>.pages.dev" has four parts, the real "<project>.pages.dev"
 * three.
 *
 * @param hostname - the request's host name
 * @returns true for a preview copy
 */
export function isPreviewHost(hostname: string): boolean {
  return hostname.endsWith('.pages.dev') && hostname.split('.').length > 3;
}

/**
 * Writes the robots file.
 *
 * @param origin - the site's origin
 * @param hostname - the request's host name, to spot a preview copy
 * @returns the text of robots.txt
 */
export function robotsTxt(origin: string, hostname: string): string {
  // Step 1: a preview copy keeps every crawler out, and points nowhere.
  if (isPreviewHost(hostname)) return 'User-agent: *\nDisallow: /\n';
  // Step 2: the rules every crawler shares: the open exceptions first (the longest rule wins, so
  // their order is for the reader), then the private screens and a space's member-only tools.
  const allowed = publicPathsInsidePrivate.map((path) => `Allow: ${path}`);
  const disallowed = [...privatePathPrefixes, ...memberOnlySpacePaths].map(
    (prefix) => `Disallow: ${prefix}`,
  );
  // Step 3: AI crawlers: the same private rules, the few pages they may read, and nothing else.
  const aiGroup = [
    ...aiCrawlerNames.map((name) => `User-agent: ${name}`),
    ...aiCrawlerRules,
    ...disallowed,
    'Disallow: /',
  ];
  // Step 4: every other crawler (Google, Bing and the rest): everything but the private screens,
  // and where the sitemap is.
  return [
    ...aiGroup,
    '',
    'User-agent: *',
    ...allowed,
    ...disallowed,
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

/** What the handler needs from its host (Cloudflare or the local plugin). */
export interface SitemapHost {
  findEntries: () => Promise<SitemapEntry[]>;
}

/**
 * Answers GET /sitemap.xml or GET /robots.txt.
 *
 * @param request - the incoming GET request
 * @param host - how to read the sitemap's addresses
 * @returns the file; for the sitemap, 503 when the database can't be reached, so crawlers come
 *   back later instead of reading an empty list; null for any other address
 */
export async function handleSitemapFiles(
  request: Request,
  host: SitemapHost,
): Promise<Response | null> {
  const url = new URL(request.url);
  // Step 1: the robots file needs no database.
  if (url.pathname === '/robots.txt') {
    return new Response(robotsTxt(url.origin, url.hostname), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
  if (url.pathname !== '/sitemap.xml') return null;
  // Step 2: the sitemap; a preview copy lists nothing.
  if (isPreviewHost(url.hostname)) {
    return new Response(sitemapXml([], url.origin), {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
  let entries: SitemapEntry[];
  try {
    entries = await host.findEntries();
  } catch {
    console.warn('Sitemap: the database could not be reached; crawlers were asked to come back.');
    return new Response('', { status: 503, headers: { 'Retry-After': '3600' } });
  }
  // Step 3: the file, kept for an hour by caches: a new page waits at most that long.
  return new Response(sitemapXml(entries, url.origin), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
