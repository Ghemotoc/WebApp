/**
 * The first meta line of the story page's hero, made from the story's labels (bundle CALM-7c;
 * board New-Story: "Fiction · Ongoing · No AI · 13+"; handover Step 3: StoryLabelPills become this
 * meta line).
 *
 * Order: the category, "Ongoing" in bold while the story is still being written (a finished story
 * shows no state here, Robert, 6 Nov 2026; the labels list still says it), the AI answer, the
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
  // Step 1: the category, then the state while the story is still being written.
  const facts: MetaFact[] = [
    {
      text: t(`categories.${story.categorySlug}`, {
        ns: 'writing',
        defaultValue: story.categorySlug,
      }),
    },
  ];
  if (story.completionStatus === 'ongoing') {
    facts.push({ text: t('status.ongoing', { ns: 'writing' }), kind: 'state' });
  }
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
