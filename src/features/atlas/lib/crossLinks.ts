/**
 * crossLinks: [[Name]] cross-links in a writer's notes (story S1-E17-31: "Given [[text]], when it
 * is read, then it resolves by name, alias or title, ignoring capitals, within the open story").
 *
 * splitCrossLinks() cuts a text into plain pieces and links; buildLinkIndex() and
 * resolveCrossLink() find what a link points to. Plain functions, so the screen resolves links
 * as the writer types, with no wait for the database.
 * Who calls it: components/CrossLinkText.tsx, components/CrossLinkChips.tsx and
 * components/BibleMarkdown.tsx. What it calls: nothing.
 */
import type { LinkTarget } from '../api/links';

/** One piece of a text: plain words, or a [[link]] with the name inside the brackets. */
export type TextPiece = { kind: 'text'; text: string } | { kind: 'link'; name: string };

/**
 * A [[link]]: up to 200 characters with no bracket and no line break inside. The `g` flag is
 * set, so each use starts a fresh copy (see splitCrossLinks()).
 */
const linkPattern = /\[\[([^[\]\n]{1,200})\]\]/g;

/**
 * The key a name is matched by: trimmed and in lower case (S1-E17-31: "ignoring capitals").
 *
 * @param name - a name as typed, or as stored
 * @returns the key
 */
export function linkKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

/**
 * Cuts a text into plain pieces and [[links]], in order.
 *
 * @param text - any text the writer typed
 * @returns the pieces; a text with no links is one plain piece (or none when it is empty)
 */
export function splitCrossLinks(text: string): TextPiece[] {
  const pieces: TextPiece[] = [];
  let readUpTo = 0;
  // A fresh copy of the pattern, so a search never starts where an earlier one stopped.
  for (const match of text.matchAll(new RegExp(linkPattern))) {
    const name = match[1] ?? '';
    // "[[ ]]" holds no name: it stays as typed.
    if (name.trim() === '') continue;
    if (match.index > readUpTo)
      pieces.push({ kind: 'text', text: text.slice(readUpTo, match.index) });
    pieces.push({ kind: 'link', name: name.trim() });
    readUpTo = match.index + match[0].length;
  }
  if (readUpTo < text.length) pieces.push({ kind: 'text', text: text.slice(readUpTo) });
  return pieces;
}

/**
 * The different link names in a text, in the order they first appear (for the chips under an
 * editing field).
 *
 * @param text - any text
 * @returns each name once, as first written
 */
export function linkNamesIn(text: string): string[] {
  const seen = new Map<string, string>();
  for (const piece of splitCrossLinks(text)) {
    if (piece.kind === 'link' && !seen.has(linkKey(piece.name))) {
      seen.set(linkKey(piece.name), piece.name);
    }
  }
  return [...seen.values()];
}

/** What every name in a story points to, by its key. */
export type LinkIndex = Map<string, LinkTarget>;

/**
 * Indexes a story's link targets by every name they answer to. When two share a name, the first
 * wins: characters come before entries and chapters (story_link_targets() sorts them so).
 *
 * @param targets - the story's characters, entries and chapters with their names
 * @returns the index
 */
export function buildLinkIndex(targets: LinkTarget[]): LinkIndex {
  const index: LinkIndex = new Map();
  for (const target of targets) {
    for (const name of target.names) {
      const key = linkKey(name);
      if (key !== '' && !index.has(key)) index.set(key, target);
    }
  }
  return index;
}

/**
 * Finds what a link points to.
 *
 * @param name - the name inside the brackets
 * @param index - the story's index
 * @returns the target, or null when nothing has that name yet ("not found yet")
 */
export function resolveCrossLink(name: string, index: LinkIndex): LinkTarget | null {
  return index.get(linkKey(name)) ?? null;
}
