/**
 * FoldingCard: a card of the character sheet that folds shut and opens on a click (CALM-9,
 * board E23 AtlasCharacter: "Basics stays open. Every other section folds shut and opens on
 * click, with a chevron and a short hint beside the title").
 *
 * The heading holds one button (aria-expanded, aria-controls) with the title, the hint and a
 * chevron that turns when the card is open; the button is at least 44 px tall. The card's
 * region keeps the title alone as its name (aria-labelledby on the title's span), so "Look and
 * voice" or "Relationships" name the card whatever the hint says. A closed card keeps its
 * contents mounted but hidden, so a field still saving while it folds shut is never lost.
 * Who uses it: SheetGroupSection, OwnDetailGroupSection, CustomValuesSection and the side
 * column's sections (relationships, appears in, mentioned in, what readers see).
 * What it calls: nothing outside React.
 */
import { useId, useState, type ReactNode } from 'react';

/** What the card needs. */
export interface FoldingCardProps {
  /** The card's title, which also names its region. */
  title: string;
  /** The short hint beside the title ("Wants, needs, fears and secrets", "3 relationships"). */
  hint?: string;
  /** The heading level: 2 for the main column and the side column's cards. */
  headingLevel?: 2 | 3;
  /** Open on first show; the character sheet keeps Basics open and folds the rest. */
  isOpenAtFirst?: boolean;
  /** Extra classes for the content's column (its gap). */
  contentClassName?: string;
  children: ReactNode;
}

/** The chevron, pointing down; it turns to point up while the card is open. */
function Chevron({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`flex-none transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Renders the card.
 *
 * @returns a region with a heading button and its (possibly hidden) contents
 */
export function FoldingCard({
  title,
  hint,
  headingLevel = 2,
  isOpenAtFirst = false,
  contentClassName = 'gap-4',
  children,
}: FoldingCardProps) {
  const [isOpen, setIsOpen] = useState(isOpenAtFirst);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const hintId = `${baseId}-hint`;
  const contentId = `${baseId}-content`;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col rounded-card border border-border bg-surface px-5 py-4 shadow-card md:px-7"
    >
      <Heading className="m-0">
        {/* One button opens and shuts the card; the hint is read after the title. */}
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={contentId}
          aria-describedby={hint === undefined ? undefined : hintId}
          onClick={() => setIsOpen((wasOpen) => !wasOpen)}
          className="flex min-h-11 w-full cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              id={titleId}
              className="font-heading text-[22px] leading-[1.15] font-bold wrap-anywhere"
            >
              {title}
            </span>
            {hint !== undefined && (
              <span id={hintId} className="text-sm font-normal text-meta wrap-anywhere">
                {hint}
              </span>
            )}
          </span>
          <Chevron isOpen={isOpen} />
        </button>
      </Heading>
      {/* Hidden, not removed, while shut: a field still waiting to save keeps its words. */}
      <div id={contentId} hidden={!isOpen} className={`flex-col pt-4 pb-2 ${contentClassName}`}>
        {children}
      </div>
    </section>
  );
}
