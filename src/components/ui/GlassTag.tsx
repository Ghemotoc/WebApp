/**
 * GlassTag: a plain glass text pill with a small icon, for a person's writing rank and reading
 * level (bundle G7a; DESIGN thread, 8 Nov 2026, 05:19 UTC: "a rank is a plain glass text pill",
 * never "Rank: …"; the Profile board's `tag`).
 *
 * Board values: 28 px tall, 10 px side padding, a hairline border on the glass row tint, 12 px
 * semibold text, a 14 px line icon with a 6 px gap. It tells, never does, so it has no focus;
 * the `title` gives the hover explanation, and `hiddenPrefix` gives screen readers the same
 * meaning ("Writing rank:"), because a hover title alone is not read reliably.
 * Who uses it: RankChip (forums) and ReaderLevelPill (people). It calls nothing.
 */
import type { ReactNode } from 'react';

/** What a glass tag needs. */
export interface GlassTagProps {
  /** A decorative 14 px SVG icon, hidden from screen readers. */
  icon: ReactNode;
  /** The hover explanation. */
  title: string;
  /** Words read before the label by screen readers only, such as "Writing rank:". */
  hiddenPrefix: string;
  /** The visible label, such as "Storyteller". */
  children: ReactNode;
  /** For tests that need to find the tag. */
  testId?: string;
}

/**
 * Renders the pill. The wrapper is "relative" so the screen-reader-only words stay inside it,
 * even inside a sideways-scrolling shelf (bundle 17 CHECK).
 *
 * @returns the pill
 */
export function GlassTag({ icon, title, hiddenPrefix, children, testId }: GlassTagProps) {
  return (
    <span
      title={title}
      data-testid={testId}
      className="relative inline-flex h-7 items-center justify-center gap-1.5 rounded-full border border-hairline bg-surface px-2.5 text-xs leading-none font-semibold whitespace-nowrap text-heading"
    >
      <span aria-hidden="true" className="inline-flex size-3.5 flex-none">
        {icon}
      </span>
      <span className="sr-only">{hiddenPrefix} </span>
      {children}
    </span>
  );
}
