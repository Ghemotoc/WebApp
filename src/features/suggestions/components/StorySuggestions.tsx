/**
 * StorySuggestions: "More by <writer>" and "Stories like this" beside a story (story S1-E15-06,
 * bundle ANALYTICS-1c; criterion 1).
 *
 * "More by" holds the writer's other stories the reader may see, most popular first. "Stories like
 * this" holds stories finished by at least 5 of the same readers (the nightly pairs). Each row
 * has "Why am I seeing this?" and draws nothing when it is empty, so a story with neither shows
 * nothing at all.
 * Who uses it: StoryPage (below the two columns) and ChapterEnd (after the latest chapter).
 * What it calls: useSuggestionRow → more_by_writer() and stories_like_this().
 */
import { useDiscoveryTranslation } from '@/features/discovery/registerDiscoveryTranslations';

import { useSuggestionRow } from '../hooks/useSuggestionRow';

import { SuggestionShelf } from './SuggestionShelf';

/**
 * Renders the two rows for one story.
 *
 * @param props.storySlug - the story the rows are shown beside
 * @returns the rows, or nothing while they load or when both are empty
 */
export function StorySuggestions({ storySlug }: { storySlug: string }) {
  const { t } = useDiscoveryTranslation();
  const moreByWriter = useSuggestionRow('more_by_writer', storySlug);
  const likeThis = useSuggestionRow('like_this', storySlug);
  // The writer's name comes from the row's own cards, which are all by the same writer.
  const writerName = moreByWriter?.stories[0]?.writer.displayName ?? '';
  return (
    <div className="flex min-w-0 flex-col gap-10">
      {moreByWriter !== null && (
        <SuggestionShelf
          anchorId="more-by-writer"
          title={t('suggestions.moreBy', { writer: writerName })}
          why={t('suggestions.whyMoreBy')}
          stories={moreByWriter.stories}
        />
      )}
      {likeThis !== null && (
        <SuggestionShelf
          anchorId="stories-like-this"
          title={t('suggestions.likeThis')}
          why={t('suggestions.whyLikeThis')}
          stories={likeThis.stories}
        />
      )}
    </div>
  );
}
