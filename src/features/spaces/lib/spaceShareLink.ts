/**
 * The link a person shares for a space (bundle GAPS-10; design/boards/Space.dc.html: "Share").
 *
 * The link is the space page's own address on the website, nothing added: no sharer ID and no
 * tracking parameter (rule 7). The website's domain comes from the brand config (CLAUDE.md: names
 * and domains are settings, not code). Whoever opens it sees only what the space lets their
 * account see; the link gives no extra access.
 * Who calls it: SpaceShareButton and SpaceShareDialog.
 */
import { brand } from '@/config/brand';

/**
 * Builds a space's share link.
 *
 * @param slug - the space's address
 * @param siteUrl - the website's address, "https://…" (the brand's, unless a test passes one)
 * @returns the full link, for example "https://example.com/spaces/fantasy-writers-circle"
 */
export function spaceShareLink(slug: string, siteUrl: string = brand.siteUrl): string {
  const base = siteUrl.replace(/\/+$/, '');
  return `${base}/spaces/${encodeURIComponent(slug)}`;
}
