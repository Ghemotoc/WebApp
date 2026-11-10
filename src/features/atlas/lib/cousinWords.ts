/**
 * Which cousin, in words: "second cousin once removed" (bundle G10 ATLAS, part b; handoff A4
 * and the family tree: "relations cousin, second, third, removed").
 *
 * A cousin relationship stores its degree (1 to 3) and how many generations apart (0 to 3), and
 * the database refuses anything else (…_g10b_relationships.sql). The words come from the
 * "connections.cousin" texts, so Romanian can say it its own way ("veri de-al doilea, cu o
 * generație între ei"). Who calls it: useRelationshipWords and the plan's Word file
 * (data-export/lib/planForWord.ts). What it calls: the translate function it is given.
 */

/** Looks up one text by key; i18next's t, or the Word file's own lookup. */
export type CousinTranslate = (key: string) => string;

/**
 * The cousin phrase for one relationship.
 *
 * @param translate - looks up a "connections.cousin" text
 * @param degree - 1 (cousin), 2 (second cousin) or 3 (third cousin); null reads as 1
 * @param removed - generations apart, 0 to 3; null reads as 0
 * @returns the phrase, for example "second cousin once removed"
 */
export function cousinPhrase(
  translate: CousinTranslate,
  degree: number | null,
  removed: number | null,
): string {
  // Step 1: the degree, kept inside the range the database allows.
  const safeDegree = Math.min(Math.max(degree ?? 1, 1), 3);
  const degreeWords = translate(`connections.cousin.degree${safeDegree}`);
  // Step 2: "removed" only when they are a generation or more apart.
  const safeRemoved = Math.min(Math.max(removed ?? 0, 0), 3);
  if (safeRemoved === 0) return degreeWords;
  return `${degreeWords}${translate(`connections.cousin.removed${safeRemoved}`)}`;
}
