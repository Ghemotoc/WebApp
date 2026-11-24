/**
 * StoryStats: the line of numbers under the writer's name on the story page (story S1-E5-03;
 * since bundle 2, board B01: "18k reads · 418 likes · 640 comments · 15 chapters · 31.4k words ·
 * Updated 16 Oct 2026").
 *
 * It is a MetaLine (facts joined by middots, no icons) named "Story numbers" for screen readers.
 * It shows reads, likes, comments, published chapters, the words in them and the last update.
 * Reads are public since Robert pressed "As drawn on the canvas" for board B01 (24 Nov 2026;
 * replaces S1-E5-03's private reads, docs/board-fixes.md); likes are the story's own Likes, not
 * its chapters' (story_likes).
 * Large numbers are shortened the reader's way ("1.2K", "1,2 K"). Only on a story readers can see.
 * Who uses it: StoryHeader. Its numbers come from get_story_page() (story_read_total(),
 * story_like_total(), story_comment_total(), each chapter's word_count).
 */
import { useTranslation } from 'react-i18next';

import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { formatLocalDate } from '@/lib/local-time';

import type { StoryPageData } from '../api/storyPage';
import { publishedWordTotal } from '../lib/storyPageNumbers';

/**
 * Renders the line.
 *
 * @param props.story - the story page
 * @returns the line, or nothing while no chapter is published
 */
export function StoryStats({ story }: { story: StoryPageData }) {
  const { t, i18n } = useTranslation('reading');
  if (!story.isPublic) return null;
  // Step 1: the counts, shortened when they grow ("1.2K").
  const shortNumber = new Intl.NumberFormat(i18n.language, { notation: 'compact' });
  const publishedChapters = story.chapters.filter((chapter) => chapter.status === 'published');
  const { reads, likes, comments } = story.stats;
  const words = publishedWordTotal(story);
  // Step 2: the facts; words only when every chapter has a count, "Updated" once one has a date.
  const facts: MetaFact[] = [
    { text: t('storyPage.reads', { count: reads, value: shortNumber.format(reads) }) },
    { text: t('storyPage.likes', { count: likes, value: shortNumber.format(likes) }) },
    { text: t('storyPage.comments', { count: comments, value: shortNumber.format(comments) }) },
    { text: t('storyPage.chapterCount', { count: publishedChapters.length }) },
  ];
  if (words !== null && words > 0) {
    facts.push({ text: t('storyPage.words', { count: words, value: shortNumber.format(words) }) });
  }
  if (story.lastChapterPublishedAt !== null) {
    const date = formatLocalDate(new Date(story.lastChapterPublishedAt), i18n.language);
    facts.push({ text: t('storyPage.updated', { date }) });
  }
  return <MetaLine label={t('storyPage.statsLabel')} facts={facts} />;
}
