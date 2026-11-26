/**
 * AtlasFlatSection: one flat part of a Story Atlas page, under a fine line (user stories bundle 6,
 * boards E21 to E34: the boards' `.fgroup`, "Story details", "Characters", "Delete this story").
 *
 * A hairline across the top, 24 px of room, the heading (and a short muted note under it when
 * given), then the content 16 px apart. It replaces the glass cards the Atlas pages had before the
 * simplified design: a page never paints its own card (DoD, design rules).
 * Who uses it: the at-a-glance parts (StoryDetailsSection, LinkedProjectSection,
 * CharacterFieldsSection, CastAtAGlance, RecentChaptersList and Delete). What it calls: nothing.
 */
import type { ReactNode } from 'react';

/** What a flat section needs. */
export interface AtlasFlatSectionProps {
  /** The heading's id, which names the section for screen readers. */
  headingId: string;
  /** The heading's words. */
  heading: string;
  /** A short muted line under the heading ("Edited recently"); left out when not given. */
  note?: string;
  /** Something at the heading's right, such as a save note. */
  aside?: ReactNode;
  /** The section's content. */
  children: ReactNode;
}

/**
 * Renders the section.
 *
 * @returns a section with a hairline on top, its heading and its content
 */
export function AtlasFlatSection({
  headingId,
  heading,
  note,
  aside,
  children,
}: AtlasFlatSectionProps) {
  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-4 border-t border-hairline pt-6"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h2 id={headingId} className="m-0 type-heading break-words text-ink-heading">
            {heading}
          </h2>
          {aside}
        </div>
        {note !== undefined && <p className="m-0 type-meta">{note}</p>}
      </div>
      {children}
    </section>
  );
}
