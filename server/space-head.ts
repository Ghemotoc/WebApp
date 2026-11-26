/**
 * Tells search engines whether a space's pages may be listed (GROWTH-4).
 *
 * Why it exists: Robert asked for fully public spaces to be found by search engines and AI
 * crawlers, and for private spaces and classes to stay out (GROWTH thread, 26 Nov 2026, 19:48
 * UTC: "Private spaces and classes are not indexable and uncrawlable. But fully public spaces can
 * be crawlable and indexable"). A space has two kinds of address: its own page at /spaces/<slug>
 * (and its tools below it), and its threads at /forums/space-<slug>/<number> (every space's forum
 * has the slug "space-<slug>", the forums_space_slug constraint). For each one this handler takes
 * index.html, asks space_search_head() whether the space is fully public (space_is_searchable():
 * an open space for 16 and over, live and not hidden by moderators), and adds noindex, in the page
 * and in an X-Robots-Tag header, when it isn't. A class, a space for under-16s, an unknown name and
 * a space the database can't answer for all stay out. The forums staff run (/forums/<slug>/...)
 * pass through unchanged: they are open to everyone.
 * Who calls it: functions/spaces/[[path]].ts and functions/forums/[[path]].ts on Cloudflare
 * Pages, and server/pages-functions-plugin.ts locally.
 * What it calls: the Supabase REST endpoint /rest/v1/rpc/space_search_head with the public anon
 * key, and injectIntoHead() in server/link-preview.ts.
 * Never logged: the request, the visitor or any space's name (CLAUDE.md rule 12).
 */
import { injectIntoHead, type DatabaseSettings } from './link-preview.ts';

/** What the handler needs from its host (Cloudflare or the local plugin). */
export interface SpaceHeadHost {
  /** The app's index.html as the host would serve it. */
  fetchIndexHtml: () => Promise<Response>;
  /** Whether the space with this slug may be listed; throws when the database can't answer. */
  isSearchable: (spaceSlug: string) => Promise<boolean>;
}

/** A space's slug: lower-case letters and digits in words joined by hyphens, as in the database. */
const spaceSlugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The addresses under /spaces/ that are not a space (the list itself and "Start a space"). */
const notASpace = new Set(['', 'new']);

/**
 * Reads the space a path belongs to.
 *
 * @param pathname - the request's path, for example "/spaces/cercul" or "/forums/space-cercul/12"
 * @returns the space's slug, or null for any other path (a staff forum, the spaces list)
 */
export function parseSpaceAddress(pathname: string): string | null {
  const parts = pathname.replace(/\/+$/, '').split('/');
  // parts[0] is the empty text before the first slash.
  if (parts[1] === 'spaces') {
    const slug = parts[2] ?? '';
    if (notASpace.has(slug)) return null;
    return spaceSlugPattern.test(slug) ? slug : null;
  }
  if (parts[1] === 'forums') {
    const forumSlug = parts[2] ?? '';
    if (!forumSlug.startsWith('space-')) return null;
    const slug = forumSlug.slice('space-'.length);
    return spaceSlugPattern.test(slug) ? slug : null;
  }
  return null;
}

/** The shape space_search_head() answers with. */
interface SpaceHeadRow {
  indexable?: boolean;
}

/**
 * Asks the database whether a space may be listed.
 *
 * @param settings - the Supabase address and public anon key
 * @param spaceSlug - the space's slug
 * @returns true only for a fully public space
 * Errors: throws when the database answers with an error or can't be reached.
 */
export async function fetchSpaceSearchable(
  settings: DatabaseSettings,
  spaceSlug: string,
): Promise<boolean> {
  // Step 1: call the public read through Supabase's REST endpoint, as a visitor (the anon key).
  const response = await fetch(`${settings.supabaseUrl}/rest/v1/rpc/space_search_head`, {
    method: 'POST',
    headers: {
      apikey: settings.anonKey,
      Authorization: `Bearer ${settings.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ wanted_slug: spaceSlug }),
  });
  if (!response.ok) throw new Error(`space_search_head answered ${response.status}`);
  // Step 2: anything but a clear yes counts as no.
  const row = (await response.json()) as SpaceHeadRow | null;
  return row?.indexable === true;
}

/**
 * Answers a request for a space's page or thread with the app's page, and noindex when the space
 * may not be listed.
 *
 * @param request - the incoming GET request
 * @param host - how to read index.html and ask about the space
 * @returns the page; with noindex for a space that isn't fully public, or when the database can't
 *   answer (staying out is the safe side for a class or a space for under-16s)
 */
export async function handleSpacePage(request: Request, host: SpaceHeadHost): Promise<Response> {
  // Step 1: the page itself; a staff forum or any other address goes out as it is.
  const page = await host.fetchIndexHtml();
  const spaceSlug = parseSpaceAddress(new URL(request.url).pathname);
  if (spaceSlug === null || !page.ok) return page;
  // Step 2: ask about the space; an error counts as "not listed".
  let searchable = false;
  try {
    searchable = await host.isSearchable(spaceSlug);
  } catch {
    console.warn('Space head: the database could not be reached; the page went out as noindex.');
  }
  if (searchable) return page;
  // Step 3: noindex in the page and the header. The page's text changes, so the static file's
  // length and version tag no longer apply.
  const html = await page.text();
  const headers = new Headers(page.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.delete('Content-Length');
  headers.delete('ETag');
  headers.set('X-Robots-Tag', 'noindex');
  return new Response(injectIntoHead(html, null, '<meta name="robots" content="noindex">'), {
    status: page.status,
    headers,
  });
}
