/**
 * StoryCard: one story in a shelf, with a drawn cover (story S1-E1-03; S1-E3-01 moved the
 * drawing into DrawnCover so every cover in the app is drawn by one component).
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

import { DrawnCover } from '@/components/covers/DrawnCover';
import type { DrawnCoverChoice } from '@/components/covers/coverDesigns';

/** What a StoryCard needs. */
export interface StoryCardProps {
  title: string;
  /** For example "Ana Pop · 3.4k reads"; the caller formats it in the reader's language. */
  metaLine: string;
  cover: DrawnCoverChoice;
  href: string;
  /** An optional InfoPill such as "Chapter 15". */
  pill?: ReactNode;
}

/**
 * Renders the card as one link to the story.
 *
 * @returns the card
 */
export function StoryCard({ title, metaLine, cover, href, pill }: StoryCardProps) {
  return (
    <a href={href} className="flex w-[196px] flex-col no-underline">
      {/* The drawn cover: decorative, because the title is repeated as text below. */}
      <DrawnCover title={title} choice={cover} size="shelf" isDecorative className="h-[264px]" />
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
