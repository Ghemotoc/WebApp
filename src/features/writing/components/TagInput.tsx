/**
 * TagInput: the tag box: chips for the tags so far, a field to add one, and the counter
 * (story S1-E3-01).
 *
 * Board values (NewStory 4.2): a 28 px-radius box; each tag a 40 px chip in the plum tint with a
 * 36 px remove button ("Remove tag <tag>"); the field says "Add a tag"; the hint reads
 * "3 of 10 tags. Capital letters and diacritics don’t matter…". Enter or a comma adds the typed
 * tag; Backspace in an empty field removes the last one. Look-alikes are merged by
 * src/features/writing/lib/tags.ts, the same rule as the database's normalise_tag().
 * Who uses it: CategoryTagsSection.
 */
import { useId, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { normaliseTypedText } from '@/lib/romanian-text';

import { addTag, MAXIMUM_TAG_LENGTH, MAXIMUM_TAGS } from '../lib/tags';

/** What a TagInput needs. */
export interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  errorMessage?: string;
}

/** One tag with its remove button. */
function TagChip({ tag, onRemove }: { tag: string; onRemove: () => void }) {
  const { t } = useTranslation('writing');
  return (
    <span className="inline-flex h-10 items-center gap-0.5 rounded-full border border-(--pill-plum-border) bg-(--pill-plum-bg) pl-3.5 text-sm leading-none font-semibold text-(--pill-plum-text)">
      {tag}
      <button
        type="button"
        aria-label={t('newStory.removeTag', { tag })}
        onClick={onRemove}
        className="inline-flex size-9 items-center justify-center rounded-full text-(--pill-plum-text) hover:bg-tint"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </span>
  );
}

/**
 * How typing turns into tags: Enter or a comma adds the typed tag, Backspace on an empty field
 * removes the last one.
 *
 * @returns addTyped (also used on blur) and the key handler
 */
function useTagTyping(
  tags: string[],
  typed: string,
  setTyped: (value: string) => void,
  onChange: (tags: string[]) => void,
) {
  /** Adds what was typed, if it is a new tag, and clears the field. */
  function addTyped() {
    const next = addTag(tags, typed);
    if (next !== tags) onChange(next);
    setTyped('');
  }

  /** Enter or a comma adds; Backspace on an empty field removes the last tag. */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTyped();
    } else if (event.key === 'Backspace' && typed === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return { addTyped, handleKeyDown };
}

/**
 * Renders the box.
 *
 * @returns the labelled tag field
 */
export function TagInput({ tags, onChange, errorMessage }: TagInputProps) {
  const { t } = useTranslation('writing');
  const id = useId();
  const [typed, setTyped] = useState('');
  const isFull = tags.length >= MAXIMUM_TAGS;

  const { addTyped, handleKeyDown } = useTagTyping(tags, typed, setTyped, onChange);

  const hint = isFull
    ? t('newStory.tagsFull', { max: MAXIMUM_TAGS })
    : t('newStory.tagsHint', { count: tags.length, max: MAXIMUM_TAGS });
  const describedBy = `${id}-hint${errorMessage === undefined ? '' : ` ${id}-error`}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {t('newStory.tags')}
      </label>
      <div className="flex flex-wrap items-center gap-2 rounded-[28px] border border-control-border bg-surface p-2">
        {tags.map((tag) => (
          <TagChip
            key={tag}
            tag={tag}
            onRemove={() => onChange(tags.filter((existing) => existing !== tag))}
          />
        ))}
        <input
          id={id}
          type="text"
          value={typed}
          disabled={isFull}
          placeholder={t('newStory.tagPlaceholder')}
          aria-describedby={describedBy}
          aria-invalid={errorMessage === undefined ? undefined : true}
          maxLength={MAXIMUM_TAG_LENGTH}
          onChange={(event) => {
            normaliseTypedText(event.target);
            setTyped(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={addTyped}
          className="h-10 min-w-[160px] flex-1 border-0 bg-transparent px-3 font-body text-[15px] text-ink outline-none placeholder:text-meta"
        />
      </div>
      <p id={`${id}-hint`} className="m-0 text-[13px] text-meta">
        {hint}
      </p>
      {errorMessage !== undefined && (
        <p id={`${id}-error`} className="m-0 text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
