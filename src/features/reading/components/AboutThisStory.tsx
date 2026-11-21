/**
 * AboutThisStory: the short facts about the story beside the chapter (bundle CALM-5; design
 * handover Step 3, "Reader on wide screens", point 7; design system ReaderPage; board New-Reader).
 *
 * A subheading and a list split by hairlines: how many chapters are out and how many words they
 * hold so far, the number in bold ("15 chapters", "31.4k words so far"). From 1280 px it sits in
 * the side column, under any open panel and above the 300 × 250 advert; narrower, it follows the
 * chapter's comments. Two of the board's lines wait: reads stay the writer's own (S1-E3-07;
 * docs/board-fixes.md), and "Next chapter Thursday" comes with the last chapter's mark (CALM-6).
 * Who uses it: ChapterReaderPage (ReaderSideColumn and the narrow layout). What it reads: the
 * story page's chapters (get_story_page(), through useStoryPage), counted here.
 */
import { useTranslation } from 'react-i18next';

import type { StoryPageData } from '../api/storyPage';

/** What the facts need. */
export interface AboutThisStoryProps {
  /** The story page's facts, or null while they load (the chapters then come from the reader). */
  story: StoryPageData | null;
  /** How many chapters readers can open, from the chapter itself. */
  chapterTotal: number;
}

/**
 * The words in the published chapters, or null when none says how long it is.
 *
 * @param story - the story page, or null
 * @returns the total, or null
 */
function wordsSoFar(story: StoryPageData | null): number | null {
  if (story === null) return null;
  let total = 0;
  for (const chapter of story.chapters) {
    if (chapter.status === 'published' && chapter.wordCount !== null) total += chapter.wordCount;
  }
  return total > 0 ? total : null;
}

/**
 * Renders the facts.
 *
 * @returns the section
 */
export function AboutThisStory({ story, chapterTotal }: AboutThisStoryProps) {
  const { t, i18n } = useTranslation('reading');
  // Step 1: large numbers shortened the reader's way ("31.4K", "31,4 K").
  const shortNumber = new Intl.NumberFormat(i18n.language, { notation: 'compact' });
  const words = wordsSoFar(story);
  return (
    <section aria-labelledby="about-this-story" data-testid="about-this-story">
      <h2 id="about-this-story" className="m-0 mb-2 type-subheading text-heading">
        {t('reader.about.title')}
      </h2>
      {/* Step 2: one fact a row, split by hairlines (DoD: label rows have a fine line between). */}
      <ul className="m-0 list-none p-0 text-[15px] leading-5 text-body">
        <li className="border-t border-hairline py-2.5">
          <strong className="font-semibold text-heading">{shortNumber.format(chapterTotal)}</strong>{' '}
          {t('reader.about.chapters', { count: chapterTotal })}
        </li>
        {words !== null && (
          <li className="border-t border-hairline py-2.5">
            <strong className="font-semibold text-heading">{shortNumber.format(words)}</strong>{' '}
            {t('reader.about.words', { count: words })}
          </li>
        )}
      </ul>
    </section>
  );
}
