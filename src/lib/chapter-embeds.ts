/**
 * How a music or video card is written inside a chapter's stored text (story S1-E3-10; ADR 0005).
 *
 * A card is a Markdown image on its own line whose address is "embed:" and the card's ID:
 * `![How a weather forecast is made](embed:3f2a…)`. The ID points at the card's row in
 * chapter_embeds, which holds the service and what to play; the words in the brackets are the
 * title, there only so the plain text still says what the card is. Nothing from the other
 * service is ever in the text (S1-E3-10 criterion 2).
 * The database reads the same form (chapter_embed_references() in
 * supabase/migrations/…_s1_e3_10_music_and_video.sql) and refuses a card that isn't the writer's.
 *
 * Who uses it: the editor's converters (src/features/writing/lib/chapterMarkdown.ts), ChapterText
 * (src/features/reading/components/) and the writer's preview.
 */

/** The prefix of a card's address in the text. */
export const EMBED_ADDRESS_PREFIX = 'embed:';

/** The most cards one chapter may hold (the setting chapter_max_embeds; proposal 10). */
export const MAXIMUM_EMBEDS_PER_CHAPTER = 10;

/** A card ID: a UUID in lower case, as the database writes it. */
const embedIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Every card reference in a text: the ID only (the title is decoration). */
const embedReferencePattern =
  /!\[(?:[^\]\\]|\\.)*\]\(embed:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/g;

/**
 * The card ID inside a card address.
 *
 * @param address - an image's address from the Markdown, for example "embed:3f2a…"
 * @returns the ID, or null when the address isn't a well-formed card address
 */
export function embedIdFromAddress(address: string | null | undefined): string | null {
  if (address === null || address === undefined) return null;
  if (!address.startsWith(EMBED_ADDRESS_PREFIX)) return null;
  const embedId = address.slice(EMBED_ADDRESS_PREFIX.length);
  return embedIdPattern.test(embedId) ? embedId : null;
}

/**
 * The address the text stores for a card.
 *
 * @param embedId - the card's ID from /api/embed
 * @returns "embed:<ID>"
 */
export function embedAddress(embedId: string): string {
  return `${EMBED_ADDRESS_PREFIX}${embedId}`;
}

/**
 * Every card ID in a stored text, in order, each once.
 *
 * @param markdown - the chapter body
 * @returns the IDs
 */
export function embedIdsIn(markdown: string): string[] {
  const found = new Set<string>();
  for (const match of markdown.matchAll(embedReferencePattern)) {
    if (match[1] !== undefined) found.add(match[1]);
  }
  return [...found];
}

/**
 * How many cards a stored text holds, counting a card twice if it appears twice, as the database
 * does (check_chapter_embeds()).
 *
 * @param markdown - the chapter body
 * @returns the count
 */
export function embedReferenceCount(markdown: string): number {
  return [...markdown.matchAll(embedReferencePattern)].length;
}
