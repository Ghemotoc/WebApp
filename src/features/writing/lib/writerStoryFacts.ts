/**
 * writerStoryFacts: the meta line under a story's title on Write (bundle CALM-7c; board D01, user
 * story 5.1, "Story by story"): "Ongoing · Fiction · No AI · 6 chapters published · last updated
 * 10 October 2026", or "Not published yet · Fiction · No AI · Only you" while nothing is published.
 *
 * It replaces the story card's pills (DoD pills: on the simplified pages information pills become
 * words in a meta line). The state comes first and in bold: "Not published yet" until the first
 * chapter is out (then "Only you" ends the line, as board D01 draws it), "Ongoing" while it is being
 * written, plain "Completed" after.
 * Staff's "AI-written, not disclosed" label wins over the writer's answer (Q24) and is bold too.
 * The story's language is left out, as on the board: a language name in another language needs its
 * own lang attribute, which a meta line can't give, and story settings show it.
 * Who calls it: WriterStoryCard. What it calls: nothing; the words come from the writing texts.
 */
import type { TFunction } from 'i18next';

import type { MetaFact } from '@/components/ui/MetaLine';

import type { MyStory } from '../api/stories';

/**
 * The story's state: not published yet, ongoing (bold) or completed.
 *
 * @param story - the writer's story
 * @param t - the writing translations
 * @returns one fact
 */
function stateFact(story: MyStory, t: TFunction<'writing'>): MetaFact {
  if (story.firstPublishedAt === null) {
    return { text: t('storyCard.notPublishedYet'), kind: 'state' };
  }
  if (story.completionStatus === 'ongoing') return { text: t('status.ongoing'), kind: 'state' };
  return { text: t('status.completed') };
}

/**
 * The labels the writer gave: the AI answer, the rating when it isn't All ages, fan fiction and
 * parody (S1-E3-06), as the story card's pills showed them.
 *
 * @param story - the writer's story
 * @param t - the writing translations
 * @returns the facts, possibly none
 */
function labelFacts(story: MyStory, t: TFunction<'writing'>): MetaFact[] {
  const facts: MetaFact[] = [];
  // Step 1: staff's AI label wins; otherwise the writer's own answer.
  if (story.aiUndisclosedLabelledAt !== null) {
    facts.push({ text: t('aiDisclosure.undisclosed'), kind: 'state' });
  } else {
    facts.push({ text: t(`aiDisclosure.${story.aiDisclosure}`) });
  }
  // Step 2: a rating only when it hides the story from someone.
  if (story.rating !== 'all_ages') facts.push({ text: t(`rating.${story.rating}`) });
  // Step 3: the writer's ticks.
  if (story.isFanFiction) facts.push({ text: t('pills.fanFiction') });
  if (story.isParody) facts.push({ text: t('pills.parody') });
  return facts;
}

/**
 * Builds the meta line.
 *
 * @param story - the writer's story
 * @param t - the writing translations
 * @param lastUpdated - when the story last changed for readers, already written out as a date
 *   ("10 October 2026"); null while nothing is published or the numbers are still loading
 * @returns the facts in reading order: state, category, labels, chapters published, last updated
 */
export function writerStoryFacts(
  story: MyStory,
  t: TFunction<'writing'>,
  lastUpdated: string | null = null,
): MetaFact[] {
  // Step 1: the state, the category and the labels, so a writer sees what they picked.
  const facts: MetaFact[] = [
    stateFact(story, t),
    { text: t(`categories.${story.categorySlug}`, { defaultValue: story.categorySlug }) },
    ...labelFacts(story, t),
  ];
  // Step 2: nothing published yet: who can see it closes the line (board D01 draws only the
  // state and "Only you"; the category and labels stay, docs/board-fixes.md).
  if (story.firstPublishedAt === null) return [...facts, { text: t('preview.onlyYou') }];
  // Step 3: chapters published and when it last changed, once there is one.
  const published = story.chapters.filter((chapter) => chapter.status === 'published').length;
  if (published > 0) facts.push({ text: t('storyCard.chaptersPublished', { count: published }) });
  if (lastUpdated !== null) facts.push({ text: t('storyCard.lastUpdated', { date: lastUpdated }) });
  return facts;
}
