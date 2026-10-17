/**
 * SearchInput: the big search field from the Discover and Search boards (story S1-E1-03).
 *
 * Board values: 52 px tall, pill-shaped, the magnifier 20 px from the left. The label is hidden
 * on screen (the field and icon make the purpose clear) but always present for screen readers.
 * Who uses it: Search (S1-E5-04) and the staff Users screen (S1-E11-02).
 */
import type { InputHTMLAttributes } from 'react';

import { SearchIcon } from '@/components/icons/SearchIcon';

/** A normal <input>'s attributes plus the hidden label. */
export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
}

/**
 * Renders a search field with its icon.
 *
 * @returns the field
 */
export function SearchInput({ id, label, ...inputProps }: SearchInputProps) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-meta" />
      <input
        id={id}
        type="search"
        className="h-13 w-full rounded-full border border-control-border bg-surface pr-5 pl-13 font-body text-base text-ink"
        {...inputProps}
      />
    </div>
  );
}
