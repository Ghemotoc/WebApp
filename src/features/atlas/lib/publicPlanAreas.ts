/**
 * The readers' side of a story's plan: each public area's address and the [[Name]] link targets
 * readers may follow (stories S1-E17-32 and S1-E17-33; bundle ATLAS, part i).
 *
 * Pure functions, no React. Who calls it: PublicPlanPage, PlanPreviewPage, PublicPlanView and
 * StoryWorldLinks. What it calls: nothing.
 */
import type { LinkTarget } from '../api/links';
import type { PlanArea, PublicPlan } from '../api/publicPlan';

/** Each area's part of the address, after /s/<story>/atlas/ (or the preview's base). */
export const areaPaths: Record<PlanArea, string> = {
  characters: 'characters',
  relationship_map: 'map',
  family_tree: 'family-tree',
  bible: 'world',
  timeline: 'timeline',
};

/**
 * The area an address part names.
 *
 * @param path - the part after the base ("map")
 * @returns the area, or null when the part names none
 */
export function areaFromPath(path: string | undefined): PlanArea | null {
  const found = Object.entries(areaPaths).find(([, areaPath]) => areaPath === path);
  return found === undefined ? null : (found[0] as PlanArea);
}

/** The base address of a story's public plan for readers. */
export function readerPlanBase(slug: string): string {
  return `/s/${slug}/atlas`;
}

/**
 * The items a [[Name]] on a readers' page may point to: shown characters (by name, and by
 * their aliases only while Basics is open, so a closed group gives nothing away), public world
 * entries and readable chapters. Private items are simply not in the list, so a link to one
 * reads as plain words (S1-E17-32).
 *
 * @param plan - the public plan
 * @returns the targets
 */
export function publicLinkTargets(plan: PublicPlan): LinkTarget[] {
  const characters: LinkTarget[] = plan.cast.characters.map((character) => {
    const aliases = (character.sheet.also_known_as ?? '')
      .split(',')
      .map((alias) => alias.trim())
      .filter((alias) => alias !== '');
    return {
      kind: 'character',
      ref: character.id,
      title: character.name,
      names: [character.name, ...aliases],
    };
  });
  const entries: LinkTarget[] = plan.sections.flatMap((section) =>
    section.entries.map((entry) => ({
      kind: 'entry' as const,
      ref: entry.id,
      title: entry.title,
      names: [entry.title],
    })),
  );
  const chapters: LinkTarget[] = plan.chapters
    .filter((chapter) => chapter.title.trim() !== '')
    .map((chapter) => ({
      kind: 'chapter',
      ref: chapter.code,
      title: chapter.title,
      names: [chapter.title],
    }));
  return [...characters, ...entries, ...chapters];
}

/**
 * Where a link target opens on a readers' page.
 *
 * @param target - the character, entry or chapter
 * @param plan - the public plan (which areas are public)
 * @param base - the base address (the readers' or the preview's)
 * @returns the address, or null when there is no page for it (a character while Characters is off)
 */
export function publicTargetAddress(
  target: LinkTarget,
  plan: PublicPlan,
  base: string,
): string | null {
  if (target.kind === 'chapter') return `/s/${plan.storySlug}/${target.ref}`;
  // Each world entry has its own page (GAPS-4).
  if (target.kind === 'entry') return `${base}/world/${target.ref}`;
  if (!plan.areas.includes('characters')) return null;
  return `${base}/characters/${target.ref}`;
}
