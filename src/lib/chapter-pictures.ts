/**
 * How a picture is written inside a chapter's stored text (story S1-E3-09; ADR 0005).
 *
 * A chapter picture is a Markdown image on its own line whose address is "picture:" and the
 * picture's ID: `![alt text](picture:3f2a…)`. The ID points at the picture's row in
 * picture_checks; the file itself is never in the text, so a reader gets it only through the
 * picture check (get_chapter() sends its state and, when allowed, its file).
 * The database reads the same form (chapter_picture_references() in
 * supabase/migrations/…_s1_e3_09_chapter_pictures.sql) and refuses a reference that isn't the
 * writer's own picture or has no alt text.
 *
 * Who uses it: the editor's converters (src/features/writing/lib/chapterMarkdown.ts), ChapterText
 * (src/features/reading/components/) and the writer's preview.
 */

/** The prefix of a picture's address in the text. */
export const PICTURE_ADDRESS_PREFIX = 'picture:';

/** The longest alt text the database keeps (check_chapter_pictures()). */
export const MAXIMUM_ALT_TEXT_LENGTH = 300;

/** A picture ID: a UUID in lower case, as the database writes it. */
const pictureIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The most pictures one chapter may hold (the setting chapter_max_pictures; proposal 30). */
export const MAXIMUM_PICTURES_PER_CHAPTER = 30;

/** Every picture reference in a text: the escaped alt text and the ID. */
const pictureReferencePattern =
  /!\[((?:[^\]\\]|\\.)*)\]\(picture:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/g;

/** One picture in a stored text. */
export interface PictureReference {
  pictureId: string;
  /** The alt text with Markdown's backslash escapes taken out. */
  alt: string;
}

/**
 * The picture ID inside a picture address.
 *
 * @param address - an image's address from the Markdown, for example "picture:3f2a…"
 * @returns the ID, or null when the address isn't a well-formed picture address
 */
export function pictureIdFromAddress(address: string | null | undefined): string | null {
  if (address === null || address === undefined) return null;
  if (!address.startsWith(PICTURE_ADDRESS_PREFIX)) return null;
  const pictureId = address.slice(PICTURE_ADDRESS_PREFIX.length);
  return pictureIdPattern.test(pictureId) ? pictureId : null;
}

/**
 * The address the text stores for a picture.
 *
 * @param pictureId - the picture's ID from register_chapter_picture()
 * @returns "picture:<ID>"
 */
export function pictureAddress(pictureId: string): string {
  return `${PICTURE_ADDRESS_PREFIX}${pictureId}`;
}

/**
 * Every picture in a stored text, in order, as the database reads them
 * (chapter_picture_references()).
 *
 * @param markdown - the chapter body
 * @returns each picture's ID and alt text
 */
export function pictureReferencesIn(markdown: string): PictureReference[] {
  const references: PictureReference[] = [];
  for (const match of markdown.matchAll(pictureReferencePattern)) {
    const [, escapedAlt = '', pictureId = ''] = match;
    references.push({ pictureId, alt: escapedAlt.replace(/\\(.)/g, '$1') });
  }
  return references;
}

/**
 * Every picture ID in a stored text, in order, each once.
 *
 * @param markdown - the chapter body
 * @returns the IDs
 */
export function pictureIdsIn(markdown: string): string[] {
  const found = new Set(pictureReferencesIn(markdown).map((reference) => reference.pictureId));
  return [...found];
}
