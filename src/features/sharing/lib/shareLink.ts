/**
 * The link a reader shares for a chapter (story S1-E4-05, second criterion: "it carries no
 * identifier of the person who shared it"; legal note: no tracking parameters).
 *
 * The link is the chapter's own public address on the website, nothing added: no sharer ID, no
 * "utm_" or other tracking parameter, no query string at all. The website's domain comes from the
 * brand config (CLAUDE.md: names and domains are settings, not code). A visitor who opens it sees
 * the teaser (S1-E4-04), and chat apps get the link preview from functions/s/[[path]].ts.
 * Who calls it: ShareButton, ShareDialog, the quote card, the share bar's passage link and the
 * picture card (S1-E4-11).
 */
import { brand } from '@/config/brand';
import { spotFor, type SpotRange } from '@/lib/chapter-blocks';

import type { ChapterAddress } from '../api/sharing';

/**
 * Builds a chapter's share link.
 *
 * @param address - the chapter
 * @param siteUrl - the website's address, "https://…" (the brand's, unless a test passes one)
 * @returns the full link, for example "https://example.com/s/my-story/abcd1234"
 */
export function chapterShareLink(address: ChapterAddress, siteUrl: string = brand.siteUrl): string {
  const base = siteUrl.replace(/\/+$/, '');
  return `${base}/s/${encodeURIComponent(address.storySlug)}/${encodeURIComponent(address.chapterCode)}`;
}

/**
 * Builds the link to a spot in a chapter: a passage or a picture (story S1-E4-11). Still nothing
 * about the person who shared it: only which blocks.
 *
 * @param address - the chapter
 * @param range - the blocks the passage or picture covers
 * @param siteUrl - the website's address (the brand's, unless a test passes one)
 * @returns the full link, for example "https://example.com/s/my-story/abcd1234/p3-5"
 */
export function passageShareLink(
  address: ChapterAddress,
  range: SpotRange,
  siteUrl: string = brand.siteUrl,
): string {
  return `${chapterShareLink(address, siteUrl)}/${spotFor(range)}`;
}

/**
 * The link as the card prints it: no "https://", so it reads like an address.
 *
 * @param link - a full link
 * @returns the link without its scheme
 */
export function printedLink(link: string): string {
  return link.replace(/^https?:\/\//, '');
}
