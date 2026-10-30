/**
 * Reads and changes one field of CMS content by its path ("lede", "points.1",
 * "whyCards.2.title"), the same names the database uses in its list of fields to fix (story
 * S1-E11-06).
 *
 * Who calls it: the staff editors, for their fields and for naming a refused field.
 */
import type { Json } from '@/lib/database.types';

/**
 * Reads a text field.
 *
 * @param content - the content object
 * @param path - the field's path
 * @returns the text, or an empty string when the field is missing or isn't text
 */
export function textAt(content: Json, path: string): string {
  let current: Json | undefined = content;
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object') return '';
    current = Array.isArray(current) ? current[Number(part)] : current[part];
  }
  return typeof current === 'string' ? current : '';
}

/**
 * Copies the content with one text field changed.
 *
 * @param content - the content object (left unchanged)
 * @param path - the field's path; its parents must exist
 * @param value - the new text
 * @returns the changed copy
 */
export function withTextAt<Content extends Json>(
  content: Content,
  path: string,
  value: string,
): Content {
  const copy = structuredClone(content);
  const parts = path.split('.');
  const last = parts.pop() ?? '';
  let parent: Json = copy;
  for (const part of parts) {
    if (parent === null || typeof parent !== 'object') return copy;
    parent = (Array.isArray(parent) ? parent[Number(part)] : parent[part]) ?? null;
  }
  if (Array.isArray(parent)) parent[Number(last)] = value;
  else if (parent !== null && typeof parent === 'object') parent[last] = value;
  return copy;
}

/**
 * Splits a path into its label key and its 1-based number, for a field's label.
 *
 * @param path - for example "whyCards.2.title"
 * @returns { labelKey: "whyCards.title", number: 3 }, number null when the path has no index
 */
export function labelPartsOf(path: string): { labelKey: string; number: number | null } {
  const parts = path.split('.');
  const words = parts.filter((part) => !/^\d+$/.test(part));
  const index = parts.find((part) => /^\d+$/.test(part));
  return { labelKey: words.join('.'), number: index === undefined ? null : Number(index) + 1 };
}
