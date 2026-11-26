/**
 * MarketingSection: one section of the Marketing page between hairlines, with its heading (user
 * stories bundle 6, story 6.13, board E32's fgroup: "The pitch", "Getting it out", "Back cover"
 * and "QR code").
 *
 * The section is named by its heading, so a screen reader lists it as a region.
 * Who uses it: MarketingFields, BackCoverPreview and StoryQrCard. What it calls: nothing.
 */
import type { ReactNode } from 'react';

/** What a section needs. */
export interface MarketingSectionProps {
  /** The heading's id, which names the section. */
  id: string;
  heading: string;
  children: ReactNode;
}

/**
 * Renders the section.
 *
 * @returns the hairline, the heading and what goes under it, 16 px apart
 */
export function MarketingSection({ id, heading, children }: MarketingSectionProps) {
  return (
    <section
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-4 border-t border-hairline pt-6"
    >
      <h2 id={id} className="m-0 font-heading type-heading font-bold text-ink-heading">
        {heading}
      </h2>
      {children}
    </section>
  );
}
