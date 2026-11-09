/**
 * SpaceFormCard: a space form's card with its eyebrow, heading and intro (bundle FORUMS-2, part a,
 * redrawn in G8b; S1-E8-06; boards SpaceNew and SpaceSettings).
 *
 * The page's main card (headingLevel 'h1') follows the boards' page header: the eyebrow, the page
 * title in Bricolage Grotesque at up to 72 px and the lead line sit above a glass card with 28 px
 * corners, up to 760 px wide, that holds the form. Every other card on the page (headingLevel
 * 'h2') carries its own eyebrow and heading inside it.
 * Who uses it: NewSpacePage and SpaceSettingsPage (the settings form, then the welcome note,
 * logo, banner picture and Moderators cards, each with a second-level heading of its own).
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

/** The glass card's own classes. */
const cardClasses =
  'flex max-w-[760px] flex-col gap-6 rounded-[28px] border border-border bg-surface p-5 shadow-card md:p-8';

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
  // The page's title sits above its card, as on the boards.
  if (headingLevel === 'h1') {
    return (
      <section aria-labelledby={headingId} className="flex flex-col gap-6">
        <header className="flex max-w-[760px] flex-col gap-2">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 id={headingId} className="page-title">
            {title}
          </h1>
          {intro !== undefined && <p className="m-0 text-lg leading-relaxed text-body">{intro}</p>}
        </header>
        <div className={cardClasses}>{children}</div>
      </section>
    );
  }
  return (
    <section aria-labelledby={headingId} className={cardClasses}>
      <div className="flex flex-col gap-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2
          id={headingId}
          className="m-0 font-heading text-[28px] leading-tight font-bold text-heading"
        >
          {title}
        </h2>
        {intro !== undefined && <p className="m-0 text-base text-body">{intro}</p>}
      </div>
      {children}
    </section>
  );
}
