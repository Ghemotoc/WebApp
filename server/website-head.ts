/**
 * Search and share tags for the website's own pages: the home page at "/" and each help page at
 * "/help/<address>" (story S1-E11-37; bundle SEO-1b).
 *
 * Why it exists: search engines and share bots (WhatsApp, Facebook, LinkedIn) read a page's HTML
 * and many of them never run its JavaScript, so a single-page app alone shows them only the
 * product name. For these addresses this handler takes the app's index.html, asks
 * website_content() for the live page a visitor from this country sees (never a draft) and writes
 * into the page's <head>: the <title> ("<page title> · <site name>"), the description, a canonical
 * link, the Open Graph and Twitter tags with the site's large share picture
 * (public/link-previews/share.png, S1-E11-38) and the page's language on <html>. The home page
 * also carries the organisation and website data (schema.org) and the search engines'
 * verification codes staff entered in Staff › Settings (S1-E11-38). Staff may fill in a
 * search title and description for each page (src/schemas/websiteContent.ts, pageSearchSchema);
 * when they leave them empty the page's own words are used: the home page's headline and
 * introduction, or the help page's title and first lines. A page staff hid from search engines,
 * and an unknown help address, get noindex. If the database can't be reached, the page goes out
 * unchanged: the tags are a nicety, the page itself must always load.
 * The country comes from Cloudflare (CF-IPCountry), as for sign-up (S1-E2-10), so a visitor gets
 * the same market's page the app then shows; with no country, Romania's English page (decided
 * 17 Oct 2026, 19:16, inside website_content()).
 * Who calls it: functions/index.ts and functions/help/[[path]].ts on Cloudflare Pages, and
 * server/pages-functions-plugin.ts locally (npm run dev, npm run preview and the end-to-end tests).
 * What it calls: the Supabase REST endpoint /rest/v1/rpc/website_content with the public anon key,
 * and the shared helpers in server/link-preview.ts.
 * Never logged: the request, the visitor or any page text (CLAUDE.md rule 12).
 */
import { escapeHtml, injectIntoHead, siteNameOf, type DatabaseSettings } from './link-preview.ts';
import { countryOfConnection } from './signup-context.ts';

/** A website address this handler answers: the home page, or one help page by its address. */
export type WebsiteAddress = { kind: 'home_page' } | { kind: 'help_page'; entryKey: string };

/** What the head tags carry for one page. */
export interface WebsiteHead {
  /** The title share cards show, without the site's name. */
  title: string;
  /**
   * What goes before the site's name in <title>: the same words the app's own screen uses, so the
   * browser tab and search results agree (WebsiteHomePage, HelpPageView). Empty for the site's
   * name alone (a home page with no search title).
   */
  tabTitle: string;
  /** The description; empty when the page has no words to use. */
  description: string;
  /** The page's language ("ro", "en"), for <html lang>. */
  language: string;
  /** True when staff asked search engines not to list the page. */
  isHidden: boolean;
  /**
   * The home page only: the search engines' verification codes staff entered in Staff › Settings
   * (S1-E11-38); null on every other page, which carries neither the codes nor the organisation.
   */
  homeExtras: { googleCode: string; bingCode: string } | null;
}

/** What the handler needs from its host (Cloudflare or the local plugin). */
export interface WebsiteHeadHost {
  /** The app's index.html as the host would serve it. */
  fetchIndexHtml: () => Promise<Response>;
  /** The head for an address and a country, or null when there is no live page. */
  findHead: (address: WebsiteAddress, country: string | null) => Promise<WebsiteHead | null>;
  /** Cloudflare's own idea of the visitor's country (request.cf.country), when it has one. */
  cloudflareCountry?: string;
}

/** Help page addresses: the same pattern as every CMS entry key (entryKeySchema). */
const helpAddressPattern = /^[a-z0-9][a-z0-9-]{0,59}$/;

/** The longest description written from a page's own words; longer text is cut at a word. */
const DESCRIPTION_LONGEST = 160;

/** The site's large share picture, the emblem on plum (scripts/make-share-picture.ts, S1-E11-38). */
const SHARE_PICTURE = '/link-previews/share.png';

/** Its size: what share cards ask for, so they show it large (summary_large_image). */
const SHARE_PICTURE_WIDTH = 1200;
const SHARE_PICTURE_HEIGHT = 630;

/** The emblem the organisation data names as the site's logo (LOGO-1). */
const LOGO_PICTURE = '/brand/apple-touch-icon.png';

/** What a verification code may hold: the letters, digits, "-" and "_" Google and Bing use. */
const verificationCodePattern = /^[A-Za-z0-9_-]{1,100}$/;

/**
 * Reads a website address from a path.
 *
 * @param pathname - the request's path, for example "/" or "/help/raportare"
 * @returns the address, or null for any other path (the help centre itself included)
 */
export function parseWebsiteAddress(pathname: string): WebsiteAddress | null {
  if (pathname === '/' || pathname === '') return { kind: 'home_page' };
  const parts = pathname.replace(/\/+$/, '').split('/');
  // parts[0] is the empty text before the first slash; then "help" and the page's address.
  if (parts.length !== 3 || parts[1] !== 'help') return null;
  const entryKey = parts[2] ?? '';
  return helpAddressPattern.test(entryKey) ? { kind: 'help_page', entryKey } : null;
}

/**
 * Shortens a text at a word, with an ellipsis, so search results and cards stay readable.
 *
 * @param text - the text
 * @returns at most DESCRIPTION_LONGEST characters
 */
function shortened(text: string): string {
  if (text.length <= DESCRIPTION_LONGEST) return text;
  const cut = text.slice(0, DESCRIPTION_LONGEST);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Turns a help page's safe Markdown into one line of plain words: links keep their text, and the
 * marks for headings, lists, bold, italics, quotes and code go.
 *
 * @param markdown - the help page's body
 * @returns the words, on one line
 */
export function plainWordsOf(markdown: string): string {
  // Step 1: a link keeps only its text ("[report a story](/help/report)" → "report a story").
  const withoutLinks = markdown.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Step 2: the formatting marks go; every run of spaces and line breaks becomes one space.
  return withoutLinks
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The parts of a page's search fields the head reads (any of them may be missing). */
interface SearchFields {
  title?: unknown;
  description?: unknown;
  hidden?: unknown;
}

/** One row of website_content() as the REST endpoint answers it. */
interface WebsiteContentRow {
  entry_key: string;
  language_code: string;
  content: Record<string, unknown> & { search?: SearchFields };
}

/**
 * A text from the content, trimmed, or an empty text when it isn't one.
 *
 * @param value - whatever the content holds there
 * @returns the text
 */
function textOf(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * The page's own words: the home page's headline and introduction, or the help page's title and
 * the start of its body.
 *
 * @param address - which kind of page it is
 * @param content - the live version's content
 * @returns the fallback title and description
 */
function ownWordsOf(
  address: WebsiteAddress,
  content: WebsiteContentRow['content'],
): { title: string; description: string } {
  if (address.kind === 'home_page') {
    const headline = `${textOf(content.headlineFirst)} ${textOf(content.headlineSecond)}`.trim();
    return { title: headline, description: shortened(textOf(content.lede)) };
  }
  return {
    title: textOf(content.title),
    description: shortened(plainWordsOf(textOf(content.body))),
  };
}

/**
 * Turns the live page into its head: staff's search fields first, the page's own words when a
 * field is empty.
 *
 * @param address - which page was asked for
 * @param row - the live version, as website_content() answered it
 * @returns the head
 */
export function websiteHeadFrom(address: WebsiteAddress, row: WebsiteContentRow): WebsiteHead {
  const search = row.content.search ?? {};
  const ownWords = ownWordsOf(address, row.content);
  const title = textOf(search.title) === '' ? ownWords.title : textOf(search.title);
  return {
    title,
    // The home page's tab shows the site's name alone unless staff gave it a search title; a help
    // page's tab shows its title (S1-E11-12), or its search title.
    tabTitle: address.kind === 'home_page' ? textOf(search.title) : title,
    description:
      textOf(search.description) === '' ? ownWords.description : textOf(search.description),
    language: row.language_code,
    isHidden: search.hidden === true,
    homeExtras: address.kind === 'home_page' ? { googleCode: '', bingCode: '' } : null,
  };
}

/**
 * Asks the database for a website page's head.
 *
 * @param settings - the Supabase address and public anon key
 * @param address - the home page or a help page
 * @param country - the visitor's country, or null when unknown
 * @returns the head, or null when there is no live page at that address
 * Errors: throws when the database answers with an error or can't be reached.
 */
export async function fetchWebsiteHead(
  settings: DatabaseSettings,
  address: WebsiteAddress,
  country: string | null,
): Promise<WebsiteHead | null> {
  // Step 1: the public read of live content, as a visitor (the anon key); the database picks the
  // market and the language with the usual fallbacks.
  const response = await fetch(`${settings.supabaseUrl}/rest/v1/rpc/website_content`, {
    method: 'POST',
    headers: {
      apikey: settings.anonKey,
      Authorization: `Bearer ${settings.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ wanted_kind: address.kind, visitor_country: country }),
  });
  if (!response.ok) throw new Error(`website_content answered ${response.status}`);
  // Step 2: the home page's one row, or the help page with this address.
  const rows = (await response.json()) as WebsiteContentRow[];
  const wantedKey = address.kind === 'home_page' ? 'home' : address.entryKey;
  const row = rows.find((candidate) => candidate.entry_key === wantedKey);
  if (row === undefined) return null;
  const head = websiteHeadFrom(address, row);
  // Step 3: the home page also carries the search engines' verification codes (S1-E11-38).
  if (head.homeExtras !== null) head.homeExtras = await fetchVerificationCodes(settings);
  return head;
}

/** One public setting as the REST endpoint answers it. */
interface SettingRow {
  key: string;
  value: unknown;
}

/**
 * Reads the verification codes from the public settings (S1-E11-38).
 *
 * @param settings - the Supabase address and public anon key
 * @returns the two codes; empty ones when a setting is empty or can't be read, because the page
 *   matters more than the codes
 */
export async function fetchVerificationCodes(
  settings: DatabaseSettings,
): Promise<{ googleCode: string; bingCode: string }> {
  const address = `${settings.supabaseUrl}/rest/v1/settings?select=key,value&is_public=eq.true&key=in.(search_verification_google,search_verification_bing)`;
  const response = await fetch(address, {
    headers: { apikey: settings.anonKey, Authorization: `Bearer ${settings.anonKey}` },
  });
  if (!response.ok) return { googleCode: '', bingCode: '' };
  const rows = (await response.json()) as SettingRow[];
  const codeOf = (key: string) => textOf(rows.find((row) => row.key === key)?.value);
  return {
    googleCode: codeOf('search_verification_google'),
    bingCode: codeOf('search_verification_bing'),
  };
}

/**
 * The home page's extra tags (S1-E11-38): the verification meta tags staff entered (meta tags
 * only, never a script: CLAUDE.md rule 7), and the organisation and website data search engines
 * use for the site's name and logo, with the name read from index.html (names are settings).
 *
 * @param extras - the verification codes
 * @param page - the site's name and origin
 * @returns the tags
 */
export function homeExtraTags(
  extras: { googleCode: string; bingCode: string },
  page: { siteName: string; origin: string },
): string[] {
  const tags: string[] = [];
  // Step 1: a code goes in only when it looks like one, so a typo can't break the page.
  if (verificationCodePattern.test(extras.googleCode)) {
    tags.push(`<meta name="google-site-verification" content="${extras.googleCode}">`);
  }
  if (verificationCodePattern.test(extras.bingCode)) {
    tags.push(`<meta name="msvalidate.01" content="${extras.bingCode}">`);
  }
  // Step 2: the organisation and the website (schema.org), in one block.
  const home = `${page.origin}/`;
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: page.siteName,
        url: home,
        logo: `${page.origin}${LOGO_PICTURE}`,
      },
      { '@type': 'WebSite', name: page.siteName, url: home },
    ],
  };
  // "<" is written as \u003c, so nothing in a name can close the script element.
  const json = JSON.stringify(data).replaceAll('<', '\\u003c');
  tags.push(`<script type="application/ld+json">${json}</script>`);
  return tags;
}

/**
 * Everything the head adds to the page's <head>.
 *
 * @param head - the page's head
 * @param page - the page's address, the site's name and the site's origin
 * @returns the tags as one HTML text
 */
export function websiteHeadTags(
  head: WebsiteHead,
  page: { url: string; siteName: string; origin: string },
): string {
  const picture = `${page.origin}${SHARE_PICTURE}`;
  const tags = [
    `<link rel="canonical" href="${escapeHtml(page.url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escapeHtml(page.siteName)}">`,
    `<meta property="og:title" content="${escapeHtml(head.title)}">`,
    `<meta property="og:url" content="${escapeHtml(page.url)}">`,
    `<meta property="og:image" content="${escapeHtml(picture)}">`,
    `<meta property="og:image:width" content="${SHARE_PICTURE_WIDTH}">`,
    `<meta property="og:image:height" content="${SHARE_PICTURE_HEIGHT}">`,
    `<meta property="og:image:alt" content="${escapeHtml(page.siteName)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(head.title)}">`,
  ];
  // Step 1: the description only when there are words for it.
  if (head.description !== '') {
    const description = escapeHtml(head.description);
    tags.push(
      `<meta name="description" content="${description}">`,
      `<meta property="og:description" content="${description}">`,
      `<meta name="twitter:description" content="${description}">`,
    );
  }
  // Step 2: a page staff hid from search engines says so (the header says it too).
  if (head.isHidden) tags.push('<meta name="robots" content="noindex">');
  // Step 3: the home page's verification codes and organisation data (S1-E11-38).
  if (head.homeExtras !== null) tags.push(...homeExtraTags(head.homeExtras, page));
  return tags.join('\n    ');
}

/**
 * The <title> text: the page's tab title, then the site's name after a separator (Google's
 * advice: the brand at the start or the end). The site's name alone when there is no tab title.
 *
 * @param head - the page's head
 * @param siteName - the site's name from index.html
 * @returns the text
 */
export function documentTitleOf(head: WebsiteHead, siteName: string): string {
  if (head.tabTitle === '' || siteName === '') {
    return head.tabTitle === '' ? siteName : head.tabTitle;
  }
  return `${head.tabTitle} · ${siteName}`;
}

/**
 * Writes the page's <title>, marked so the app puts the site's name back once the visitor moves
 * to another screen (src/app/shell/useServerHeadReset.ts).
 *
 * @param html - the app's index.html
 * @param title - the new <title> text
 * @param siteName - the site's name, kept on the element for the app
 * @returns the changed page
 */
function withMarkedTitle(html: string, title: string, siteName: string): string {
  const marked = `<title data-page-head data-site-name="${escapeHtml(siteName)}">${escapeHtml(title)}</title>`;
  return html.replace(/<title>[^<]*<\/title>/, marked);
}

/**
 * Sets <html lang> to the page's language, so search engines know which language the page is in.
 *
 * @param html - the app's index.html
 * @param language - a language code from the database ("ro", "en")
 * @returns the changed page; unchanged when the code isn't a plain language code
 */
function withLanguage(html: string, language: string): string {
  if (!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(language)) return html;
  return html.replace(/<html lang="[^"]*">/, `<html lang="${language}">`);
}

/**
 * Answers a request for "/" or "/help/<address>" with the app's page and its head tags.
 *
 * @param request - the incoming GET request
 * @param host - how to read index.html and the head
 * @returns the page with its tags; noindex for an unknown help address or a hidden page; unchanged
 *   for any other address or when the database can't be reached
 */
export async function handleWebsitePage(
  request: Request,
  host: WebsiteHeadHost,
): Promise<Response> {
  // Step 1: the page itself; anything but a website address goes out as it is.
  const page = await host.fetchIndexHtml();
  const url = new URL(request.url);
  const address = parseWebsiteAddress(url.pathname);
  if (address === null || !page.ok) return page;
  const html = await page.text();
  const headers = new Headers(page.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  // The page's text changes, so the static file's length and version tag no longer apply.
  headers.delete('Content-Length');
  headers.delete('ETag');
  // Step 2: the head; when the database can't be reached, the page still loads, unchanged.
  let head: WebsiteHead | null;
  try {
    head = await host.findHead(address, countryOfConnection(request, host.cloudflareCountry));
  } catch {
    console.warn('Website head: the database could not be reached; the page went out as it is.');
    return new Response(html, { status: page.status, headers });
  }
  // Step 3: no live page here (an unknown help address, or no home page yet): not indexable.
  if (head === null) {
    if (address.kind === 'home_page') return new Response(html, { status: page.status, headers });
    headers.set('X-Robots-Tag', 'noindex');
    return new Response(injectIntoHead(html, null, '<meta name="robots" content="noindex">'), {
      status: page.status,
      headers,
    });
  }
  // Step 4: the tags; the canonical address carries no query (no tracking codes, S1-E4-05).
  const siteName = siteNameOf(html);
  const tags = websiteHeadTags(head, {
    url: `${url.origin}${url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '')}`,
    siteName,
    origin: url.origin,
  });
  if (head.isHidden) headers.set('X-Robots-Tag', 'noindex');
  const titled = withMarkedTitle(
    withLanguage(html, head.language),
    documentTitleOf(head, siteName),
    siteName,
  );
  const changed = injectIntoHead(titled, null, tags);
  return new Response(changed, { status: page.status, headers });
}
