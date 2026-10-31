/**
 * The passage a shared link points to, as a link preview shows it (story S1-E4-11, second
 * criterion: "the link preview shows the passage instead of the blurb").
 *
 * A link to a spot (/s/<story>/<chapter>/p3-5) asks get_shared_passage() what a visitor may see
 * of those blocks: text while the writer's passage switch is on, a picture's alt text while their
 * picture switch is on and its check has passed, nothing for 16+ and 18+ stories. This file turns
 * the answer into one plain line for og:description: Markdown marks taken out, pictures as
 * "Picture: <alt>", about 280 characters at most.
 * Who calls it: server/link-preview.ts (fetchLinkPreview), on Cloudflare and locally.
 * What it calls: the Supabase REST endpoint /rest/v1/rpc/get_shared_passage with the public anon
 * key. Never logged: the passage or the visitor (CLAUDE.md rule 12).
 */
import type { SpotRange } from '../src/lib/chapter-blocks.ts';

/** The longest passage a preview shows, in characters. */
export const LONGEST_PREVIEW_PASSAGE = 280;

/** One block as get_shared_passage() sends it. */
type SharedBlock = { kind: 'text'; markdown: string } | { kind: 'picture'; alt: string };

/** Where the database is, and the words for a picture in the story's language. */
export interface SharedPassageRequest {
  supabaseUrl: string;
  anonKey: string;
  storySlug: string;
  chapterCode: string;
  spot: SpotRange;
  /** "Picture: {{alt}}" in the story's language. */
  pictureWords: string;
}

/**
 * A block of Markdown as plain words: emphasis, headings, quotes, list marks and links' addresses
 * taken out.
 *
 * @param markdown - one block of chapter text
 * @returns its words on one line
 */
export function plainWords(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/gm, '')
    .replace(/[*_~`]+/g, '')
    .replace(/\\(.)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cuts a line to the preview's length, on a space where it can, with "…" at the end.
 *
 * @param line - the passage's words
 * @returns at most 280 characters
 */
export function shortenPassage(line: string): string {
  const characters = Array.from(line);
  if (characters.length <= LONGEST_PREVIEW_PASSAGE) return line;
  const cut = characters.slice(0, LONGEST_PREVIEW_PASSAGE - 1).join('');
  const lastSpace = cut.lastIndexOf(' ');
  const kept = lastSpace > LONGEST_PREVIEW_PASSAGE / 2 ? cut.slice(0, lastSpace) : cut;
  return `${kept.trimEnd()}…`;
}

/**
 * The blocks as one preview line.
 *
 * @param blocks - get_shared_passage()'s blocks
 * @param pictureWords - "Picture: {{alt}}"
 * @returns the line, or null when there are no words in it
 */
export function passageLine(blocks: SharedBlock[], pictureWords: string): string | null {
  const parts = blocks.map((block) =>
    block.kind === 'picture'
      ? pictureWords.replace('{{alt}}', block.alt)
      : plainWords(block.markdown),
  );
  const line = parts.filter((part) => part !== '').join(' ');
  return line === '' ? null : shortenPassage(line);
}

/**
 * Asks the database for the passage.
 *
 * @param request - where the database is, the chapter, the spot and the picture words
 * @returns the preview line, or null when nothing in the spot may be shown
 * Errors: throws when the database answers with an error or can't be reached.
 */
export async function fetchSharedPassage(request: SharedPassageRequest): Promise<string | null> {
  const response = await fetch(`${request.supabaseUrl}/rest/v1/rpc/get_shared_passage`, {
    method: 'POST',
    headers: {
      apikey: request.anonKey,
      Authorization: `Bearer ${request.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      story_slug: request.storySlug,
      chapter_code: request.chapterCode,
      first_block: request.spot.first,
      last_block: request.spot.last,
    }),
  });
  if (!response.ok) throw new Error(`get_shared_passage answered ${response.status}`);
  const row = (await response.json()) as { blocks?: SharedBlock[] } | null;
  if (row?.blocks === undefined) return null;
  return passageLine(row.blocks, request.pictureWords);
}
