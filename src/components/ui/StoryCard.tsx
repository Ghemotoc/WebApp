/**
 * StoryCard: one story in a shelf, with a drawn cover (story S1-E1-03).
 *
 * Board values (Discover shelf card): 196 px wide, a 264 px cover with 18 px padding and 16 px
 * radius, the title drawn at the bottom of the cover, then an optional pill, the title in
 * Bricolage 16 px and a 13 px meta line.
 * Rules: the drawn title is always shown in full, wrapping on spaces and stepping down in size
 * (DoD covers; src/lib/cover-title.ts). The real title sits right under the cover as text, so the
 * drawn one is hidden from screen readers to avoid reading it twice.
 * Who uses it: shelves on Discover (S1-E5-01), Classics, Library and the website home page.
 */
import type { ReactNode } from 'react';

import { coverColours, type CoverTone } from '@/lib/cover-colours';
import { coverTitleSize } from '@/lib/cover-title';

/** What a StoryCard needs. */
export interface StoryCardProps {
  title: string;
  /** For example "Ana Pop · 3.4k reads"; the caller formats it in the reader's language. */
  metaLine: string;
  coverTone: CoverTone;
  href: string;
  /** An optional InfoPill such as "Chapter 15". */
  pill?: ReactNode;
}

/**
 * Renders the card as one link to the story.
 *
 * @returns the card
 */
export function StoryCard({ title, metaLine, coverTone, href, pill }: StoryCardProps) {
  const colours = coverColours[coverTone];

  return (
    <a href={href} className="flex w-[196px] flex-col no-underline">
      {/* The drawn cover: decorative, because the title is repeated as text below. */}
      <span
        aria-hidden="true"
        className="flex h-[264px] flex-col justify-end gap-2 rounded-cover p-[18px] outline outline-1 -outline-offset-1 outline-[rgba(38,20,46,0.14)]"
        style={{ backgroundColor: colours.background, color: colours.title }}
      >
        <span
          className="font-heading leading-[1.04] font-bold break-words"
          style={{ fontSize: `${coverTitleSize(title, 21)}px` }}
        >
          {title}
        </span>
        <span className="h-[3px] w-10 rounded-sm" style={{ backgroundColor: colours.title }} />
      </span>
      {pill !== undefined && <span className="mt-3">{pill}</span>}
      <span
        className={`${pill === undefined ? 'mt-3' : 'mt-2'} font-heading text-base font-semibold text-ink`}
      >
        {title}
      </span>
      <span className="mt-0.5 text-[13px] text-meta">{metaLine}</span>
    </a>
  );
}
