/**
 * NoticeCard: the one centred card a short page is made of, such as "We can't find that page",
 * "Account closing", "Delete account" or "Stop notification emails" (user stories bundle 10,
 * boards J18, J19, J28 and J29).
 *
 * The board draws each of these pages the same way: one box, about 600 px wide and centred under
 * the top bar, with the page's big heading (`type-title`, `type-display` from 1024 px) and then a
 * line or two of text and the buttons, all lined up on the left. The box is the one box surface
 * (rounded-card, bg-surface, border-border; DoD design rules), never a colour of its own.
 * Who shows it: NotFoundPage, ClosingAccountPage, DeleteAccountPage and UnsubscribePage.
 * What it calls: PageContainer.
 */
import type { ReactNode } from 'react';

import { PageContainer } from './PageContainer';

/** What the card needs. */
export interface NoticeCardProps {
  /** The page's heading, already translated; it becomes the page's one h1. */
  heading: string;
  /** The id that ties the card's region to its heading, unique on the page. */
  headingId: string;
  /** What sits under the heading: text, a list, notices, buttons. */
  children: ReactNode;
  /** The browser tab's title, already translated, when the page sets one here. */
  documentTitle?: string;
  /** Anything that sits under the card, at the same width (the closing page's data download). */
  below?: ReactNode;
}

/**
 * Renders the page around the card, then the card.
 *
 * @returns the page's content
 */
export function NoticeCard({
  heading,
  headingId,
  children,
  documentTitle,
  below,
}: NoticeCardProps) {
  return (
    <PageContainer className="tmc-rise flex flex-col items-center gap-8 pt-12 pb-8">
      {documentTitle !== undefined && <title>{documentTitle}</title>}
      <section
        aria-labelledby={headingId}
        className="flex w-full max-w-[600px] min-w-0 flex-col items-start gap-4 rounded-card border border-border bg-surface p-6 shadow-card lg:p-8"
      >
        {/* Step 1: the big heading, as drawn. */}
        <h1
          id={headingId}
          className="m-0 type-title wrap-anywhere text-ink-heading lg:type-display"
        >
          {heading}
        </h1>
        {/* Step 2: the page's own text, lists and buttons. */}
        {children}
      </section>
      {/* Step 3: what sits under the card, if anything. */}
      {below !== undefined && <div className="w-full max-w-[600px] min-w-0">{below}</div>}
    </PageContainer>
  );
}
