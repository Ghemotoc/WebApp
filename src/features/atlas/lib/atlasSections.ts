/**
 * The Story Atlas sections and their addresses (stories S1-E17-06 onwards), in one place so the
 * menu, the "come back to the last section" step and the links into the Atlas agree.
 *
 * Who uses it: components/AtlasSectionNav.tsx (the menu), hooks/useLastAtlasSection.ts (design
 * books item 17) and every link into a story's Atlas from outside it (atlasEntryAddress).
 */

/** The sections there are so far. */
export type AtlasSection =
  | 'glance'
  | 'characters'
  | 'connections'
  | 'bible'
  | 'storyline'
  | 'ideas'
  | 'marketing'
  | 'readers';

/** Each section's address after /plan/s/<slug>. */
export const atlasSectionPaths: Record<AtlasSection, string> = {
  glance: '',
  characters: '/characters',
  connections: '/connections',
  // The story's world (once the bible; renamed 2 Nov 2026, ADMIN-2a2).
  bible: '/world',
  storyline: '/storyline',
  ideas: '/ideas',
  marketing: '/marketing',
  readers: '/readers',
};

/**
 * True when a stored value is one of the sections (a remembered place can be old or changed).
 *
 * @param value - anything read back from storage
 * @returns whether it names a section
 */
export function isAtlasSection(value: unknown): value is AtlasSection {
  return typeof value === 'string' && Object.hasOwn(atlasSectionPaths, value);
}

/** The search word that asks the Atlas to open the section the writer had open last. */
export const RESUME_SEARCH = 'resume';

/**
 * Where a link from outside the Atlas (Write, the editor, the story list) sends the writer: the
 * story's Atlas, which then opens the section they had open last (design books item 17, "Don't
 * start from zero").
 *
 * @param slug - the story's address
 * @returns the address, such as /plan/s/my-story?resume
 */
export function atlasEntryAddress(slug: string): string {
  return `/plan/s/${slug}?${RESUME_SEARCH}`;
}
