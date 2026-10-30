/**
 * Finds the problem the database named for one field of a refused publish (stories S1-E11-06,
 * S1-E11-10 and S1-E11-12).
 *
 * Who calls it: every website editor form, to show the problem under the right field.
 * Where the problems come from: websiteErrorFrom() in api/websiteContentStore.ts reads them from
 * the error's hint ("lede:empty,points.1:too_long").
 */
import type { WebsiteContentError } from '../api/websiteContentStore';

/**
 * The problem word for one field, or null when the field is fine.
 *
 * @param failure - the last failed action, or null
 * @param path - the field's path ("lede", "points.1", "texts.ro")
 * @returns the problem ("empty", "too_long", "broken_link") or null
 */
export function problemAt(failure: WebsiteContentError | null, path: string): string | null {
  const match = failure?.problems.find((problem) => problem.field === path);
  return match?.problem ?? null;
}
