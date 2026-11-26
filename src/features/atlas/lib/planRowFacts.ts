/**
 * planRowFacts: works out the words fact and the last fact of one row on /plan (board E20; user
 * stories bundle 6, story 6.1).
 *
 * The row's meta line reads "Drafting · Fiction · 31,640 of 40,000 words · edited 10 min ago".
 * The board draws the last fact three ways: "edited 10 min ago" for a story worked on today,
 * "6 chapters out" (or "3 essays out", "5 poems out") for one with published parts, and
 * "not published" for one with none. The board doesn't say when each shows, so this file holds
 * the builder's reading (noted in docs/board-fixes.md): an edit in the last 24 hours wins, then
 * the published count, then "not published". A finished story, or one with no target, shows its
 * words alone ("14,800 words"), as the board draws The Map in the Attic.
 * Who calls it: components/StoryPlanRow.tsx. What it calls: nothing (plain logic, unit-tested in
 * planRowFacts.test.ts).
 */
import type { StoryPlanSummary } from '../api/storyPlanList';

/** How long an edit counts as recent enough to be the row's last fact: one day. */
const recentEditMilliseconds = 24 * 60 * 60 * 1000;

/** The words fact: "X of Y words", or "X words" alone. */
export type PlanWordsFact =
  { kind: 'ofTarget'; written: number; target: number } | { kind: 'wordsOnly'; written: number };

/** The last fact on the row, before it is put into words. */
export type PlanProgressFact =
  | { kind: 'edited'; editedAt: string }
  | { kind: 'chaptersOut' | 'poemsOut' | 'essaysOut'; count: number }
  | { kind: 'notPublished' };

/**
 * Picks the words fact for a plan.
 *
 * @param plan - the plan's summary from my_story_plans()
 * @returns "of target" while the story has a target and isn't finished, otherwise the words alone
 */
export function planWordsFact(plan: StoryPlanSummary): PlanWordsFact {
  // Step: a finished story has reached its end, so the target no longer says anything (board E20).
  if (plan.writingStatus === 'finished' || plan.wordTarget <= 0) {
    return { kind: 'wordsOnly', written: plan.wordsWritten };
  }
  return { kind: 'ofTarget', written: plan.wordsWritten, target: plan.wordTarget };
}

/**
 * Names the published parts the way the story's category counts them.
 *
 * @param categorySlug - the story's category (fiction, poetry, nonfiction_essays)
 * @returns the kind of "out" fact: poems for poetry, essays for essays, chapters otherwise
 */
function publishedKind(categorySlug: string): 'chaptersOut' | 'poemsOut' | 'essaysOut' {
  if (categorySlug === 'poetry') return 'poemsOut';
  if (categorySlug === 'nonfiction_essays') return 'essaysOut';
  return 'chaptersOut';
}

/**
 * Picks the last fact on the row.
 *
 * @param plan - the plan's summary from my_story_plans()
 * @param categorySlug - the story's category, which names its parts
 * @param now - the time to measure "recent" from (a parameter so tests can fix it)
 * @returns an edit today, else the published parts, else "not published"
 */
export function planProgressFact(
  plan: StoryPlanSummary,
  categorySlug: string,
  now: Date = new Date(),
): PlanProgressFact {
  // Step 1: worked on in the last day? Then that is the most useful thing to say.
  const editedMillisecondsAgo = now.getTime() - new Date(plan.editedAt).getTime();
  if (editedMillisecondsAgo < recentEditMilliseconds) {
    return { kind: 'edited', editedAt: plan.editedAt };
  }
  // Step 2: otherwise how much readers already have, or that they have nothing yet.
  if (plan.publishedChapters > 0) {
    return { kind: publishedKind(categorySlug), count: plan.publishedChapters };
  }
  return { kind: 'notPublished' };
}
