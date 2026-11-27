/**
 * Search and share tags for a member's profile at /u/<handle> (GROWTH-3).
 *
 * Why it exists: Robert asked for adult writers' profiles to be found by search engines (GROWTH
 * thread, 26 Nov 2026, 15:13 UTC: "Profile for adults, read lists, categories, writers, chapters.
 * Yes."). Search engines and link previews read the page's HTML before any JavaScript runs, and
 * the app's index.html only carries the site's name. For every /u/<handle> address this handler
 * takes index.html, asks profile_search_head() what a visitor who isn't logged in may know, and
 * writes the title, the bio as the description, the Open Graph tags and a canonical link into the
 * page's <head>. An adult's open profile also carries its name and bio inside the app's root, so
 * crawlers that never run JavaScript read the same words the page shows.
 * Under-18s are never indexed: their profile, an unknown name and a profile its owner keeps to
 * members or followers all get noindex (profile_is_searchable() in the GROWTH-3 migration).
 * The profile's sub-pages (/u/<handle>/stories and /u/<handle>/bookshelves) get the same answer,
 * with a canonical link to their own address. If the database can't be reached, the page goes out
 * unchanged.
 * Who calls it: functions/u/[[path]].ts on Cloudflare Pages, and server/pages-functions-plugin.ts
 * locally (npm run dev, npm run preview and the end-to-end tests).
 * What it calls: the Supabase REST endpoint /rest/v1/rpc/profile_search_head with the public anon
 * key, and the shared helpers in server/link-preview.ts.
 * Never logged: the request, the visitor or any profile text (CLAUDE.md rule 12).
 */
import {
  escapeHtml,
  injectIntoHead,
  injectIntoRoot,
  siteNameOf,
  type DatabaseSettings,
} from './link-preview.ts';

/** What a profile's head says. */
export interface ProfileHead {
  /** The pen name, or the username when there is none. */
  displayName: string;
  /** The bio, only when its owner shows the whole profile to everyone; otherwise empty. */
  bio: string;
  /** True only for an adult whose profile is open to everyone (profile_is_searchable()). */
  indexable: boolean;
}

/** What the handler needs from its host (Cloudflare or the local plugin). */
export interface ProfileHeadHost {
  /** The app's index.html as the host would serve it. */
  fetchIndexHtml: () => Promise<Response>;
  /** The head for a username, or null when there is no such profile. */
  findHead: (handle: string) => Promise<ProfileHead | null>;
}

/** A profile address: the username, and the sub-page when there is one. */
export interface ProfileAddress {
  handle: string;
  /** "stories" or "bookshelves" for a sub-page, null for the profile itself. */
  subPage: 'stories' | 'bookshelves' | null;
}

/**
 * A plausible username: 1 to 60 characters with no slash, space, quote or angle bracket. The
 * database decides whether it names someone (profile_for_handle() compares look-alike skeletons),
 * so this only turns away addresses that can't be one.
 */
const handlePattern = /^[^/\s<>"']{1,60}$/u;

/** The sub-pages that share the profile's head; the library has its own rules (S1-E13-01). */
const profileSubPages = ['stories', 'bookshelves'] as const;

/**
 * Reads a profile address from a path.
 *
 * @param pathname - the request's path, for example "/u/lia" or "/u/lia/stories"
 * @returns the username and sub-page, or null for any other path (the library included)
 */
export function parseProfileAddress(pathname: string): ProfileAddress | null {
  const parts = pathname.replace(/\/+$/, '').split('/');
  // parts[0] is the empty text before the first slash; parts[1] must be "u".
  if (parts[1] !== 'u' || parts.length < 3 || parts.length > 4) return null;
  // Step 1: the username, as the address spells it (decoded, so "%40lia" reads as "@lia").
  let handle: string;
  try {
    handle = decodeURIComponent(parts[2] ?? '').replace(/^@/, '');
  } catch {
    return null;
  }
  if (!handlePattern.test(handle)) return null;
  // Step 2: the profile itself, or one of its two public sub-pages.
  if (parts.length === 3) return { handle, subPage: null };
  const subPage = profileSubPages.find((name) => name === parts[3]);
  return subPage === undefined ? null : { handle, subPage };
}

/** The shape profile_search_head() answers with. */
interface ProfileHeadRow {
  display_name?: string;
  bio?: string;
  indexable?: boolean;
}

/**
 * Asks the database what a profile's head may say.
 *
 * @param settings - the Supabase address and public anon key
 * @param handle - the username
 * @returns the head, or null when there is no live profile by that name
 * Errors: throws when the database answers with an error or can't be reached.
 */
export async function fetchProfileHead(
  settings: DatabaseSettings,
  handle: string,
): Promise<ProfileHead | null> {
  // Step 1: call the public read through Supabase's REST endpoint, as a visitor (the anon key).
  const response = await fetch(`${settings.supabaseUrl}/rest/v1/rpc/profile_search_head`, {
    method: 'POST',
    headers: {
      apikey: settings.anonKey,
      Authorization: `Bearer ${settings.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ wanted_handle: handle }),
  });
  if (!response.ok) throw new Error(`profile_search_head answered ${response.status}`);
  // Step 2: no profile, or one without a name, has no head.
  const row = (await response.json()) as ProfileHeadRow | null;
  if (row === null || typeof row.display_name !== 'string' || row.display_name === '') return null;
  return { displayName: row.display_name, bio: row.bio ?? '', indexable: row.indexable === true };
}

/**
 * The page's <title>: the name, then the site's name, with no words to translate.
 *
 * @param head - the profile's head
 * @param siteName - the product's name, from index.html
 * @returns the title
 */
export function profileTitle(head: ProfileHead, siteName: string): string {
  return siteName === '' ? head.displayName : `${head.displayName} · ${siteName}`;
}

/**
 * Everything the head adds to the page's <head>.
 *
 * @param head - the profile's head
 * @param page - the page's address and the site's name
 * @returns the tags as one HTML text
 */
export function profileHeadTags(
  head: ProfileHead,
  page: { url: string; siteName: string },
): string {
  const title = escapeHtml(profileTitle(head, page.siteName));
  const tags = [
    `<link rel="canonical" href="${escapeHtml(page.url)}">`,
    `<meta property="og:type" content="profile">`,
    `<meta property="og:site_name" content="${escapeHtml(page.siteName)}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:url" content="${escapeHtml(page.url)}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${title}">`,
  ];
  // The bio is the description, only when its owner shows it to everyone.
  if (head.bio !== '') {
    const description = escapeHtml(head.bio);
    tags.push(
      `<meta name="description" content="${description}">`,
      `<meta property="og:description" content="${description}">`,
      `<meta name="twitter:description" content="${description}">`,
    );
  }
  // GROWTH-3: under-18s and closed profiles stay out of search.
  if (!head.indexable) tags.push('<meta name="robots" content="noindex">');
  return tags.join('\n    ');
}

/**
 * The name and bio as visible HTML inside the app's root, for crawlers that don't run
 * JavaScript; the app replaces it when it starts, with the same words. Only for an indexable
 * profile, so a closed or under-18 profile adds nothing to the first HTML.
 *
 * @param head - the profile's head
 * @returns the HTML, or an empty text
 */
export function visibleProfileWords(head: ProfileHead): string {
  if (!head.indexable) return '';
  const bio = head.bio === '' ? '' : `<p>${escapeHtml(head.bio)}</p>`;
  return `<main><h1>${escapeHtml(head.displayName)}</h1>${bio}</main>`;
}

/**
 * Answers a request for /u/<handle> with the app's page and its head.
 *
 * @param request - the incoming GET request
 * @param host - how to read index.html and the head
 * @returns the page with the tags, noindex when the profile may not be indexed or doesn't exist,
 *   and unchanged when the database can't be reached
 */
export async function handleProfilePage(
  request: Request,
  host: ProfileHeadHost,
): Promise<Response> {
  // Step 1: the page itself; anything but a profile address goes out as it is.
  const page = await host.fetchIndexHtml();
  const url = new URL(request.url);
  const address = parseProfileAddress(url.pathname);
  if (address === null || !page.ok) return page;
  const html = await page.text();
  const headers = new Headers(page.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  // The page's text changes, so the static file's length and version tag no longer apply.
  headers.delete('Content-Length');
  headers.delete('ETag');
  // Step 2: the head; when the database can't be reached, the page still loads, unchanged.
  let head: ProfileHead | null;
  try {
    head = await host.findHead(address.handle);
  } catch {
    console.warn(
      'Profile head: the database could not be reached; the page went out without tags.',
    );
    return new Response(html, { status: page.status, headers });
  }
  // Step 3: no such profile: not indexable.
  if (head === null) {
    headers.set('X-Robots-Tag', 'noindex');
    return new Response(injectIntoHead(html, null, '<meta name="robots" content="noindex">'), {
      status: page.status,
      headers,
    });
  }
  // Step 4: the tags and the visible words; the address carries no query (no tracking codes).
  if (!head.indexable) headers.set('X-Robots-Tag', 'noindex');
  const siteName = siteNameOf(html);
  const tags = profileHeadTags(head, { url: `${url.origin}${url.pathname}`, siteName });
  const withHead = injectIntoHead(html, profileTitle(head, siteName), tags);
  return new Response(injectIntoRoot(withHead, visibleProfileWords(head)), {
    status: page.status,
    headers,
  });
}
