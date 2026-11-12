/**
 * useWebsitePlace: the country and language of the website page on screen, and links that keep
 * them (bundle LOCALISE-1: addresses like "/se/sv/help").
 *
 * Who calls it: useWebsiteContent (which page text to read), the website's own links (the help
 * centre, a help page's crumbs, the home page bands, CMS text) and the notice strip.
 * What it calls: the router's current address and src/lib/websitePlace.ts.
 */
import { useLocation } from 'react-router';

import { isWebsitePagePath, pathAtPlace, placeOfPath, type WebsitePlace } from '@/lib/websitePlace';

/**
 * Reads the place from the address on screen.
 *
 * @returns the country and language ("se", "sv"), or null on a page with no place in its address
 *   (every app page: Discover, a story, Settings)
 */
export function useWebsitePlace(): WebsitePlace | null {
  const { pathname } = useLocation();
  return placeOfPath(pathname);
}

/**
 * Gives a function that turns a website page's path into a link from the page on screen.
 *
 * @returns linkTo("/help/reporting") is "/se/sv/help/reporting" on a page at /se/sv, so a reader
 *   stays in their country and language. On an app page, and for any path that isn't a website
 *   page, the path comes back unchanged (the older address forwards to the reader's place).
 */
export function useWebsiteLink(): (path: string) => string {
  const place = useWebsitePlace();
  return (path) => (place !== null && isWebsitePagePath(path) ? pathAtPlace(place, path) : path);
}
