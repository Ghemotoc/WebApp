/**
 * Story links inside the website: which addresses count as "a link to a story, a chapter or a
 * passage", and how a shared one travels into Messages (bundle GAPS-7, part a; board 3.6 Share,
 * "Send in Messages").
 *
 * Why one strict shape: a link sent into a chat is the only thing in a message that can be
 * pressed (messages are plain text, S1-E9-01), so it must never be free text or another website.
 * Only "/s/<story>", "/s/<story>/<chapter code>" and "/s/<story>/<chapter code>/p<n>[-<m>]" pass,
 * the same shapes the database allows (stories_slug_shape, chapters_code_shape) and
 * lib/chapter-blocks.ts makes (spotFor).
 * Who calls it: the share dialogs (the "Send in Messages" link), the Messages page (reading the
 * link back) and ChatMessages (drawing a story link inside a message). What it calls: the brand
 * config for the website's address (CLAUDE.md: names and domains are settings, not code).
 */
import { brand } from '@/config/brand';

/** The name of the address parameter that carries the shared path into Messages. */
export const shareParameter = 'share';

/** A story, a chapter or a passage address, and nothing else. */
const storyPathPattern =
  /^\/s\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]{8}(?:\/p\d{1,4}(?:-\d{1,4})?)?)?$/;

/** The longest path that can be real: "/s/" + an 80-character story address + chapter + spot. */
const longestStoryPath = 110;

/**
 * Says whether a path is a story, chapter or passage address.
 *
 * @param path - a path such as "/s/my-story/abcd1234"
 * @returns true when it has exactly one of the three shapes
 */
export function isStoryPath(path: string): boolean {
  return path.length <= longestStoryPath && storyPathPattern.test(path);
}

/**
 * Reads the shared path from the Messages address, refusing anything that isn't a story link.
 *
 * @param value - the "share" parameter's value, or null when there is none
 * @returns the path, or null when it is missing or not a story address
 */
export function sharedPathFrom(value: string | null): string | null {
  if (value === null) return null;
  return isStoryPath(value) ? value : null;
}

/**
 * Builds the full link for a story path.
 *
 * @param path - a path that passed isStoryPath()
 * @param siteUrl - the website's address (the brand's, unless a test passes one)
 * @returns the full link, for example "https://example.com/s/my-story"
 */
export function linkForStoryPath(path: string, siteUrl: string = brand.siteUrl): string {
  return `${siteUrl.replace(/\/+$/, '')}${path}`;
}

/**
 * Takes the path out of a full share link, when the link is one of this website's story links.
 *
 * @param link - a full link, as lib/shareLink.ts builds it
 * @param siteUrl - the website's address (the brand's, unless a test passes one)
 * @returns the path, or null when the link is another website's or not a story address
 */
export function storyPathOfLink(link: string, siteUrl: string = brand.siteUrl): string | null {
  const base = siteUrl.replace(/\/+$/, '');
  if (!link.startsWith(`${base}/`)) return null;
  const path = link.slice(base.length);
  return isStoryPath(path) ? path : null;
}

/**
 * Builds the Messages address that carries a share link: "/messages?share=<path>".
 *
 * @param link - the full share link
 * @param siteUrl - the website's address (the brand's, unless a test passes one)
 * @returns the address, or null when the link isn't one of this website's story links
 */
export function messagesAddressForLink(
  link: string,
  siteUrl: string = brand.siteUrl,
): string | null {
  const path = storyPathOfLink(link, siteUrl);
  if (path === null) return null;
  return `/messages?${shareParameter}=${encodeURIComponent(path)}`;
}

/** One piece of a message: plain words, or a story link with the path it opens. */
export type MessagePiece =
  { kind: 'text'; text: string } | { kind: 'storyLink'; text: string; path: string };

/** What can't be part of a link: spaces, and the brackets and quotes people wrap links in. */
const wordBoundary = /(\s+)/;

/** Full stops, commas and closing brackets at the end of a link belong to the sentence. */
const trailingPunctuation = /[.,;:!?)\]]+$/;

/**
 * Splits a message into plain words and this website's story links, so only those links can be
 * pressed. Everything else, other websites included, stays plain text.
 *
 * @param body - the message as written
 * @param siteUrl - the website's address (the brand's, unless a test passes one)
 * @returns the pieces in order; joined, their texts give the message back unchanged
 */
export function splitStoryLinks(body: string, siteUrl: string = brand.siteUrl): MessagePiece[] {
  const pieces: MessagePiece[] = [];
  /** Adds plain words, joined to the plain words before them. */
  function addText(text: string) {
    if (text === '') return;
    const last = pieces.at(-1);
    if (last?.kind === 'text') last.text += text;
    else pieces.push({ kind: 'text', text });
  }
  // Step through the words and the spaces between them, keeping every character.
  for (const word of body.split(wordBoundary)) {
    // A link may end a sentence: try it without the punctuation after it.
    const link = word.replace(trailingPunctuation, '');
    const path = storyPathOfLink(link, siteUrl);
    if (path === null) {
      addText(word);
      continue;
    }
    pieces.push({ kind: 'storyLink', text: link, path });
    addText(word.slice(link.length));
  }
  return pieces;
}
