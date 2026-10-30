/**
 * rankPick: the rules of the writer's pick of rank badges, kept apart from the screen so they can
 * be tested on their own (CMS-1g).
 *
 * Who calls it: RankBadgePicker.
 */
import type { TagRank } from '../api/tagRanks';

/** The most badges a cover shows (Robert, 30 Oct 2026: "show top 3"). */
export const MAXIMUM_RANK_BADGES = 3;

/**
 * The pick after the writer switches one tag on or off.
 *
 * @param picked - the tags picked so far, in order
 * @param tagName - the tag switched
 * @param isOn - true to add it, false to take it off
 * @returns the new pick; unchanged when a fourth tag is switched on
 */
export function togglePick(picked: string[], tagName: string, isOn: boolean): string[] {
  if (!isOn) return picked.filter((name) => name !== tagName);
  if (picked.includes(tagName) || picked.length >= MAXIMUM_RANK_BADGES) return picked;
  return [...picked, tagName];
}

/**
 * The tags the writer picked, in the story's tag order.
 *
 * @param ranks - the story's ranks
 * @returns the picked tags' stored names
 */
export function pickedTags(ranks: TagRank[]): string[] {
  return ranks.filter((entry) => entry.isPicked).map((entry) => entry.tagName);
}
