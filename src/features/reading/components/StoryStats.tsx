/**
 * StoryStats: the line of numbers under the writer's name on the story page (story S1-E5-03;
 * board Story 3.4, "Story numbers").
 *
 * Board values: a list with no bullets, gaps of 8 px by 20 px, 14 px meta text, each number after
 * a 20 px doodle-set icon (CLAUDE.md rule 16) that screen readers skip. It shows likes, comments,
 * published chapters and the last update. The board's reads are left out: read totals are the
 * writer's own (S1-E3-07; docs/board-fixes.md). Large numbers are shortened the reader's way
 * ("1.2K", "1,2 K"). Only on a story readers can see.
 * Who uses it: StoryHeader. Its numbers come from get_story_page() (story_like_total(),
 * story_comment_total()).
 */
import { useTranslation } from 'react-i18next';

import clockIcon from '@/assets/icons/clock.svg';
import commentIcon from '@/assets/icons/comment.svg';
import heartIcon from '@/assets/icons/heart.svg';
import openBookIcon from '@/assets/icons/open-book.svg';
import { formatRomaniaDate } from '@/lib/romania-time';

import type { StoryPageData } from '../api/storyPage';

/**
 * One number with its icon.
 *
 * @param props.icon - the SVG file
 * @param props.text - the words, with the number in them
 * @returns the list item
 */
function StatItem({ icon, text }: { icon: string; text: string }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <img src={icon} alt="" aria-hidden="true" width={20} height={20} className="block size-5" />
      {text}
    </li>
  );
}

/**
 * Renders the row.
 *
 * @param props.story - the story page
 * @returns the list, or nothing while no chapter is published
 */
export function StoryStats({ story }: { story: StoryPageData }) {
  const { t, i18n } = useTranslation('reading');
  if (!story.isPublic) return null;
  // Step 1: the counts, shortened when they grow ("1.2K").
  const shortNumber = new Intl.NumberFormat(i18n.language, { notation: 'compact' });
  const publishedChapters = story.chapters.filter((chapter) => chapter.status === 'published');
  const { likes, comments } = story.stats;
  // Step 2: the list; "Updated" only once a chapter has a date.
  return (
    <ul
      aria-label={t('storyPage.statsLabel')}
      className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm text-meta"
    >
      <StatItem
        icon={heartIcon}
        text={t('storyPage.likes', { count: likes, value: shortNumber.format(likes) })}
      />
      <StatItem
        icon={commentIcon}
        text={t('storyPage.comments', { count: comments, value: shortNumber.format(comments) })}
      />
      <StatItem
        icon={openBookIcon}
        text={t('storyPage.chapterCount', { count: publishedChapters.length })}
      />
      {story.lastChapterPublishedAt !== null && (
        <StatItem
          icon={clockIcon}
          text={t('storyPage.updated', {
            date: formatRomaniaDate(new Date(story.lastChapterPublishedAt), i18n.language),
          })}
        />
      )}
    </ul>
  );
}
