/**
 * The link a person shares for a profile (bundle 3 of "Build: the full design as user stories",
 * board C04: "Share").
 *
 * The link is the profile's own address on the website, /u/<username>, never the user ID
 * (architecture 1.6), with no sharer ID or tracking parameter (rule 7). The website's domain comes
 * from the brand config (CLAUDE.md: names and domains are settings, not code).
 * Who calls it: ProfileShareButton.
 */
import { brand } from '@/config/brand';

/**
 * The link a person shares for a profile.
 *
 * @param handle - the username
 * @param siteUrl - the website's address (the brand's, unless a test passes one)
 * @returns the full link, for example "https://example.com/u/inkwolf"
 */
export function profileShareLink(handle: string, siteUrl: string = brand.siteUrl): string {
  const base = siteUrl.replace(/\/+$/, '');
  return `${base}/u/${encodeURIComponent(handle)}`;
}
