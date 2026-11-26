/**
 * StoryResultRow: one story a search found, as a row (bundle CALM-7c; user story 1.8, board
 * A08-SearchResults): a small cover, the title, one meta line (the pen name, the reads, the
 * chapters, the category, when it last changed and "Ongoing" in bold while it is being written,
 * else "Completed"), then the blurb.
 *
 * The whole row is one link to the story page, so it is one stop for the keyboard. The cover is
 * decorative because the title sits right beside it as text (DoD covers).
 * Who uses it: SearchGroupRows. What it calls: StoryCoverArt and DrawnCover for the cover, and
 * timeAgo() for when it last changed.
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';
import { DrawnCover } from '@/components/covers/DrawnCover';
import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import type { ListedStory } from '@/features/discovery/api/storyLists';
import { timeAgo } from '@/features/comments/lib/timeAgo';
import { StoryCoverArt } from '@/features/pictures/components/StoryCoverArt';

import { useSearchTranslation } from '../registerSearchTranslations';

/** The row's own words, already worded for the reader's language. */
interface RowWords {
  /** "18K reads", or null when the list doesn't give the reads. */
  reads: string | null;
  /** "15 chapters". */
  chapters: string;
  /** "updated 2 days ago", or null before the first chapter is out. */
  updated: string | null;
}

/**
 * The meta line: the pen name, the reads, the chapters, the category, when it last changed, then
 * the state, "Ongoing" in bold (handover Step 3; board A08: "inkwolf · 18k reads · 15 chapters ·
 * completed today").
 *
 * @param story - the story
 * @param words - the reads, chapters and last change, already worded
 * @param tWriting - the writing namespace, where the category and state words live
 * @returns the facts, in reading order
 */
function storyFacts(story: ListedStory, words: RowWords, tWriting: TFunction<'writing'>) {
  // Step 1: who wrote it, how much it is read and how long it is.
  const facts: MetaFact[] = [{ text: story.writer.displayName }];
  if (words.reads !== null) facts.push({ text: words.reads });
  facts.push({ text: words.chapters });
  facts.push({
    text: tWriting(`categories.${story.categorySlug}`, { defaultValue: story.categorySlug }),
  });
  // Step 2: when it last changed, then its state.
  if (words.updated !== null) facts.push({ text: words.updated });
  if (story.completionStatus === 'ongoing') {
    facts.push({ text: tWriting('status.ongoing'), kind: 'state' });
  } else {
    facts.push({ text: tWriting('status.completed') });
  }
  return facts;
}

/**
 * Words the row's reads, chapters and last change for the reader's language.
 *
 * @param story - the story
 * @param t - the search translation
 * @param language - the interface language, for the short number and the relative time
 * @returns the three pieces, null where the story has none
 */
function rowWords(
  story: ListedStory,
  t: ReturnType<typeof useSearchTranslation>['t'],
  language: string,
): RowWords {
  // "18K" rather than "18,000", as the story page shows it.
  const shortNumber = new Intl.NumberFormat(language, { notation: 'compact' });
  const reads = story.reads ?? null;
  const lastOut = story.lastChapterPublishedAt;
  return {
    reads:
      reads === null
        ? null
        : t('results.reads', { count: reads, value: shortNumber.format(reads) }),
    chapters: t('results.chapters', { count: story.chapterCount }),
    updated: lastOut === null ? null : t('results.updated', { when: timeAgo(lastOut, language) }),
  };
}

/**
 * Renders the row.
 *
 * @param props.story - the story
 * @param props.cover - the automatic cover this list gives it
 * @returns one list item
 */
export function StoryResultRow({ story, cover }: { story: ListedStory; cover: DrawnCoverChoice }) {
  const { t, i18n } = useSearchTranslation();
  const { t: tWriting } = useTranslation('writing');
  return (
    <li className="border-t border-hairline first:border-t-0">
      <Link
        to={`/s/${story.slug}`}
        className="flex min-h-11 items-start gap-4 py-3 text-ink-muted no-underline hover:bg-tint"
      >
        <StoryCoverArt
          story={story}
          className="w-12 shrink-0"
          drawn={
            <DrawnCover
              title={story.title}
              choice={cover}
              size="tile"
              isDecorative
              className="w-12 shrink-0"
            />
          }
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="type-body leading-5 font-semibold break-words text-ink-heading">
            {story.title}
          </span>
          <MetaLine facts={storyFacts(story, rowWords(story, t, i18n.language), tWriting)} />
          {story.blurb !== '' && (
            <span className="line-clamp-2 type-body break-words text-ink">{story.blurb}</span>
          )}
        </span>
      </Link>
    </li>
  );
}
