/**
 * The first meta line of the story page's hero, made from the story's labels (bundle CALM-7c;
 * board New-Story: "Fiction · Ongoing · No AI · 13+"; handover Step 3: StoryLabelPills become this
 * meta line).
 *
 * Order (board B01, bundle 2): "Ongoing" or "Completed" first, in bold (a story is Completed once
 * its last chapter is marked, CALM-6; Robert pressed "As drawn on the canvas", 24 Nov 2026,
 * replacing FIX-1's "no Completed pill"), then the category, the AI answer, the
 * rating, "Fan fiction" and "Parody" when ticked, "AI-written, not disclosed" in bold when staff
 * added that label (Q24), and where to read: "Web and app", or "In the app only" when that
 * applies (S1-E3-08; board B01, bundle 2).
 * Who uses it: StoryHeader. It calls nothing; it is pure.
 */
import type { TFunction } from 'i18next';

import type { MetaFact } from '@/components/ui/MetaLine';

import type { StoryPageData } from '../api/storyPage';

/**
 * The facts for the hero's first meta line.
 *
 * @param story - the story page's data
 * @param t - the reading namespace's translate function
 * @returns the facts, in reading order
 */
export function storyLabelFacts(story: StoryPageData, t: TFunction<'reading'>): MetaFact[] {
  const { labels } = story;
  // Step 1: the state in bold, Ongoing or Completed, then the category.
  const facts: MetaFact[] = [
    { text: t(`status.${story.completionStatus}`, { ns: 'writing' }), kind: 'state' },
    {
      text: t(`categories.${story.categorySlug}`, {
        ns: 'writing',
        defaultValue: story.categorySlug,
      }),
    },
  ];
  // Step 2: the AI answer (staff's label wins, Q24) and the rating.
  if (labels.aiUndisclosedLabelled) {
    facts.push({ text: t('aiDisclosure.undisclosed', { ns: 'writing' }), kind: 'state' });
  } else {
    facts.push({ text: t(`aiDisclosure.${labels.aiDisclosure}`, { ns: 'writing' }) });
  }
  facts.push({ text: t(`rating.${labels.rating}`, { ns: 'writing' }) });
  // Step 3: the writer's ticks and where it can be read.
  if (labels.isFanFiction) facts.push({ text: t('pills.fanFiction', { ns: 'writing' }) });
  if (labels.isParody) facts.push({ text: t('pills.parody', { ns: 'writing' }) });
  // Board B01 ends the line with where to read: "Web and app", or "In the app only" (S1-E3-08).
  facts.push({ text: story.appOnly ? t('storyPage.appOnlyPill') : t('storyPage.webAndApp') });
  return facts;
}
