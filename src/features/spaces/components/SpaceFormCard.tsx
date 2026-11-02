/**
 * SpaceFormCard: the card around the space form: the eyebrow, the heading and the intro (bundle
 * FORUMS-2, part a; S1-E8-06; the board's "New space" card, 28 px corners, up to 760 px wide).
 * Who uses it: NewSpacePage and SpaceSettingsPage (twice there: the settings form, then the
 * Moderators card of part b, S1-E8-07, which takes a second-level heading of its own).
 */
import type { ReactNode } from 'react';

import { Eyebrow } from '@/components/ui/Eyebrow';

/** What the card needs. */
interface SpaceFormCardProps {
  eyebrow: string;
  title: string;
  /** The line under the heading, or nothing. */
  intro?: string;
  /** The page's main card has the h1; a second card on the page passes 'h2' and its own ID. */
  headingLevel?: 'h1' | 'h2';
  headingId?: string;
  children: ReactNode;
}

/**
 * Renders the card.
 *
 * @returns the section with the heading and what goes inside
 */
export function SpaceFormCard({
  eyebrow,
  title,
  intro,
  headingLevel = 'h1',
  headingId = 'space-form-heading',
  children,
}: SpaceFormCardProps) {
  const Heading = headingLevel;
  return (
    <section
      aria-labelledby={headingId}
      className="flex max-w-[760px] flex-col gap-6 rounded-[28px] border border-border bg-surface p-5 shadow-card md:p-8"
    >
      <div className="flex flex-col gap-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading
          id={headingId}
          className="m-0 font-heading text-[32px] leading-tight font-extrabold text-heading"
        >
          {title}
        </Heading>
        {intro !== undefined && <p className="m-0 text-base text-body">{intro}</p>}
      </div>
      {children}
    </section>
  );
}
