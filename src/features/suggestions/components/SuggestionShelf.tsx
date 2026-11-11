/**
 * SuggestionShelf: one suggestion row with "Why am I seeing this?" (story S1-E15-06, bundle
 * ANALYTICS-1c; criterion 4).
 *
 * The row is the shared Shelf (one scrolling line, at most 20 stories, CLAUDE.md rule 20; the
 * database sends at most 20, so there is never a "View more" card), with the story cards every
 * shelf uses. Above the row, "Why am I seeing this?" opens one sentence in place saying where the
 * row comes from, like "Why this ad?" (S1-E12-01). An empty row draws nothing.
 * Who uses it: StorySuggestions and BecauseYouReadShelf. What it calls: Shelf, ListedStoryCard.
 */
import { useId, useState } from 'react';

import { designsForRow, resolveCoverChoice } from '@/components/covers/automaticCover';
import { Shelf } from '@/components/ui/Shelf';
import type { ListedStory } from '@/features/discovery/api/storyLists';
import { ListedStoryCard } from '@/features/discovery/components/ListedStoryCard';
import { useDiscoveryTranslation } from '@/features/discovery/registerDiscoveryTranslations';

/** What a row needs. */
export interface SuggestionShelfProps {
  title: string;
  /** The one sentence behind "Why am I seeing this?". */
  why: string;
  stories: ListedStory[];
  /** The section's id, for tests and links ("more-by-writer"). */
  anchorId: string;
}

/**
 * "Why am I seeing this?" and its sentence, which opens and closes in place.
 *
 * @param props.why - the sentence
 * @returns the button and, when open, the sentence
 */
function WhyThisRow({ why }: { why: string }) {
  const { t } = useDiscoveryTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const sentenceId = useId();
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={sentenceId}
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex min-h-11 items-center self-start border-0 bg-transparent p-0 text-sm font-semibold text-link"
      >
        {t('suggestions.why')}
      </button>
      <p
        id={sentenceId}
        hidden={!isOpen}
        className="m-0 max-w-[60ch] rounded-xl border border-border bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink"
      >
        {why}
      </p>
    </div>
  );
}

/**
 * Renders the row, or nothing when it has no stories.
 *
 * @returns the shelf section or null
 */
export function SuggestionShelf({ title, why, stories, anchorId }: SuggestionShelfProps) {
  // Step 1: an empty row isn't drawn, so a page never shows a row with nothing in it.
  if (stories.length === 0) return null;
  // Step 2: the cards, with the cover designs spread along the row as on every shelf.
  const covers = designsForRow(stories);
  return (
    <Shelf
      title={title}
      anchorId={anchorId}
      toolbar={<WhyThisRow why={why} />}
      items={stories.map((story, index) => ({
        key: story.slug,
        content: (
          <ListedStoryCard story={story} cover={covers[index] ?? resolveCoverChoice(story)} />
        ),
      }))}
    />
  );
}
