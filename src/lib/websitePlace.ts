/**
 * websitePlace: the country and language at the start of a website page's address, such as
 * "/se/sv/help" (bundle LOCALISE-1; Robert, 11 Nov 2026: "Country and language always").
 *
 * One page is translated into each language; the address says which country and language a visitor
 * is reading it in: /<country>/<language>, then the page ("/help", "/help/<name>", "/c/<name>").
 * The older addresses without the two parts still work and forward here.
 * Who calls it: the website routes and links (src/features/website/), the gates that keep some
 * pages open, and the server's head tags and sitemap (server/website-head.ts,
 * server/landing-preview.ts). It is plain text handling with no imports, so both sides share it.
 */

/** A country and language as the address writes them: lower-case, such as "se" and "sv". */
export interface WebsitePlace {
  country: string;
  language: string;
}

/** A market as the places list needs it: its country code ("SE") and the languages it offers. */
export interface WebsiteMarket {
  countryCode: string;
  languages: string[];
  isOpen: boolean;
}

/**
 * Where a visitor lands when their country has no market: Romania's pages in English (decided
 * 17 Oct 2026, 19:16).
 */
export const fallbackPlace: WebsitePlace = { country: 'ro', language: 'en' };

/** "/se/sv" at the start of a path: two letters, then a language code, then the end or a slash. */
const placePattern = /^\/([a-z]{2})\/([a-z]{2,3})(?=\/|$)/;

/**
 * Reads the country and language from the start of a path.
 *
 * @param pathname - for example "/se/sv/help"
 * @returns the place, or null when the path doesn't start with one. The place is only shaped
 *   like one: whether the country is a market is for isKnownPlace() to say.
 */
export function placeOfPath(pathname: string): WebsitePlace | null {
  const match = placePattern.exec(pathname);
  if (match === null) return null;
  return { country: match[1] ?? '', language: match[2] ?? '' };
}

/**
 * Takes the country and language off the start of a path.
 *
 * @param pathname - for example "/se/sv/help" or "/discover"
 * @returns the page's own path ("/help"; "/" for the home page); unchanged when there is no place
 */
export function pathWithoutPlace(pathname: string): string {
  const rest = pathname.replace(placePattern, '');
  if (rest === pathname) return pathname;
  return rest === '' ? '/' : rest;
}

/**
 * Puts a country and language at the start of a page's path.
 *
 * @param place - the country and language
 * @param path - the page's own path, starting with "/" ("/help", "/"); may end in "?…" or "#…"
 * @returns for example "/se/sv/help"; "/se/sv" for the home page
 */
export function pathAtPlace(place: WebsitePlace, path: string): string {
  const prefix = `/${place.country}/${place.language}`;
  return path === '/' ? prefix : `${prefix}${path.replace(/^\/(?=[?#])/, '')}`;
}

/** The pages that live at a place: the home page, the help centre and pages, landing pages. */
const websitePagePattern = /^\/($|[?#]|help(\/|$|[?#])|c\/)/;

/**
 * Says whether a path is one of the website's pages (the ones with a country and language).
 *
 * @param path - a path without a place, such as "/help/reporting" or "/discover"
 * @returns true for "/", "/help", "/help/<name>" and "/c/<name>"
 */
export function isWebsitePagePath(path: string): boolean {
  return websitePagePattern.test(path);
}

/**
 * Says whether a place is real: a market, in one of its languages.
 *
 * @param markets - the markets list
 * @param place - the country and language from an address
 * @returns true when the country is a market that offers the language
 */
export function isKnownPlace(markets: WebsiteMarket[], place: WebsitePlace): boolean {
  const market = markets.find((candidate) => candidate.countryCode.toLowerCase() === place.country);
  return market !== undefined && market.languages.includes(place.language);
}

/**
 * Picks the language a market shows a visitor in.
 *
 * @param market - the market
 * @param language - the language the visitor reads in, or null when unknown (the server)
 * @returns their language when the market offers it; with no language known, the market's first;
 *   else English when the market offers it, else its first language
 */
function languageAt(market: WebsiteMarket, language: string | null): string {
  const first = market.languages[0] ?? fallbackPlace.language;
  if (language === null) return first;
  if (market.languages.includes(language)) return language;
  return market.languages.includes('en') ? 'en' : first;
}

/**
 * Picks the place for a visitor who came without one in the address.
 *
 * @param markets - the markets list
 * @param countryCode - the visitor's country ("SE"), or null when unknown
 * @param language - the language the visitor reads in, or null when unknown (the server)
 * @returns their country's market in the language languageAt() picks; when their country has no
 *   market, the fallback market, in their language when it offers it
 */
export function placeForVisitor(
  markets: WebsiteMarket[],
  countryCode: string | null,
  language: string | null,
): WebsitePlace {
  // Step 1: the visitor's own market, when there is one.
  const market = markets.find((candidate) => candidate.countryCode === countryCode?.toUpperCase());
  if (market !== undefined) {
    return { country: market.countryCode.toLowerCase(), language: languageAt(market, language) };
  }
  // Step 2: otherwise the fallback market, in their language when it offers it.
  const wanted = { country: fallbackPlace.country, language: language ?? fallbackPlace.language };
  return isKnownPlace(markets, wanted) ? wanted : fallbackPlace;
}

/**
 * Says where an address should move so it matches the interface language, if anywhere.
 *
 * @param markets - the markets list
 * @param place - the place in the address
 * @param interfaceLanguage - the language the interface shows
 * @returns the same country in the interface language when the market offers it; null when the
 *   address already matches or the market doesn't offer that language
 */
export function placeInInterfaceLanguage(
  markets: WebsiteMarket[],
  place: WebsitePlace,
  interfaceLanguage: string,
): WebsitePlace | null {
  if (place.language === interfaceLanguage) return null;
  const wanted = { country: place.country, language: interfaceLanguage };
  return isKnownPlace(markets, wanted) ? wanted : null;
}
