/**
 * SpaceFormCard: the card around the space form: the eyebrow, the heading and the intro (bundle
 * FORUMS-2, part a; S1-E8-06; the board's "New space" card, 28 px corners, up to 760 px wide).
 * Who uses it: NewSpacePage and SpaceSettingsPage.
 */
import type { ReactNode } from 'react';

import { Eyebrow } from '@/components/ui/Eyebrow';

/** What the card needs. */
interface SpaceFormCardProps {
  eyebrow: string;
  title: string;
  /** The line under the heading, or nothing. */
  intro?: string;
  children: ReactNode;
}

/**
 * Renders the card.
 *
 * @returns the section with the heading and what goes inside
 */
export function SpaceFormCard({ eyebrow, title, intro, children }: SpaceFormCardProps) {
  return (
    <section
      aria-labelledby="space-form-heading"
      className="flex max-w-[760px] flex-col gap-6 rounded-[28px] border border-border bg-surface p-5 shadow-card md:p-8"
    >
      <div className="flex flex-col gap-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1
          id="space-form-heading"
          className="m-0 font-heading text-[32px] leading-tight font-extrabold text-heading"
        >
          {title}
        </h1>
        {intro !== undefined && <p className="m-0 text-base text-body">{intro}</p>}
      </div>
      {children}
    </section>
  );
}
