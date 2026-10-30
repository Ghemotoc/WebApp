/**
 * TagSuggestions: the recommended tags under the tag box, each a button that adds it (CMS-1e;
 * Robert, 30 Oct 2026: "Please add some recommended tags in advance").
 *
 * Shows the first twelve the story doesn't have yet, and "Show all suggestions" for the rest, so
 * a phone isn't filled with buttons. Each is an interactive chip (DoD pill system: white, the
 * #8E7B99 border, plum text, 36 px tall with a 44 px touch target).
 * Who shows it: TagInput. What it calls: nothing; TagInput passes the names and the add action.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { normaliseTag } from '../lib/tags';

/** How many suggestions show before "Show all suggestions". */
const FIRST_SUGGESTIONS = 12;

/** What the suggestions need. */
export interface TagSuggestionsProps {
  /** The recommended tags, in the interface language. */
  recommended: string[];
  /** The story's tags so far, in the interface language. */
  chosen: string[];
  /** Adds one. */
  onAdd: (tag: string) => void;
  /** No more tags fit. */
  isFull: boolean;
}

/**
 * Renders the suggestions.
 *
 * @returns the labelled list, or nothing when every suggestion is chosen
 */
export function TagSuggestions({ recommended, chosen, onAdd, isFull }: TagSuggestionsProps) {
  const { t } = useTranslation('writing');
  const [showsAll, setShowsAll] = useState(false);
  // Step 1: the suggestions the story doesn't have yet.
  const chosenForms = new Set(chosen.map(normaliseTag));
  const open = recommended.filter((tag) => !chosenForms.has(normaliseTag(tag)));
  if (open.length === 0 || isFull) return null;
  // Step 2: the first twelve, or all of them.
  const shown = showsAll ? open : open.slice(0, FIRST_SUGGESTIONS);
  return (
    <div className="flex flex-col gap-2">
      <p id="tag-suggestions-label" className="m-0 text-[13px] font-semibold text-ink">
        {t('newStory.suggestedTags')}
      </p>
      <ul
        aria-labelledby="tag-suggestions-label"
        className="m-0 flex list-none flex-wrap gap-2 p-0"
      >
        {shown.map((tag) => (
          <li key={tag}>
            <button
              type="button"
              aria-label={t('newStory.addSuggestedTag', { tag })}
              onClick={() => onAdd(tag)}
              className="relative inline-flex h-9 items-center gap-1.5 rounded-full border border-control-border bg-surface px-3.5 text-sm leading-none font-semibold text-heading after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[''] hover:bg-tint"
            >
              <span aria-hidden="true">+</span>
              {tag}
            </button>
          </li>
        ))}
      </ul>
      {open.length > FIRST_SUGGESTIONS && (
        <button
          type="button"
          aria-expanded={showsAll}
          onClick={() => setShowsAll(!showsAll)}
          className="inline-flex min-h-6 items-center self-start text-sm text-link underline"
        >
          {showsAll
            ? t('newStory.fewerSuggestions')
            : t('newStory.allSuggestions', { count: open.length })}
        </button>
      )}
    </div>
  );
}
