/**
 * Badge: a small earned or identity mark beside a person's name, such as a writer's rank
 * ("Storyteller") or a reading level ("Bookworm") (bundle CALM-7a; replaces GlassTag, G7a).
 *
 * Why a badge and not a pill: on the simplified pages facts become words in a meta line
 * (MetaLine.tsx), and only things a person earned or is stay small marks (DESIGN thread, 21 Nov
 * 2026, 14:12 UTC: Teacher badge, Founding member, writer rank, reader level, contest finalist and
 * the like). Robert, 21 Nov 2026, 15:58 UTC: the glass tag goes; rank and reading level are plain
 * badges.
 * Look (canvas v47; no 3D bevel, shine or blur): a 28 px pill, 10 px side padding, the one box
 * surface (--surface-box) with its 0.5 px --line-box edge, 12 px semibold ink text, and an
 * optional 14 px line icon 6 px before the words. It tells, never does, so it has no focus; the
 * `title` gives the hover explanation, and `hiddenPrefix` gives screen readers the same meaning
 * ("Writing rank:"), because a hover title alone is not read reliably.
 * Who uses it: RankChip (forums) and ReaderLevelPill (people). It calls nothing.
 */
import type { ReactNode } from 'react';

/** What a badge needs. */
export interface BadgeProps {
  /** A decorative 14 px SVG icon, hidden from screen readers; leave it out for words alone. */
  icon?: ReactNode;
  /** The hover explanation. */
  title: string;
  /** Words read before the label by screen readers only, such as "Writing rank:". */
  hiddenPrefix: string;
  /** The visible label, such as "Storyteller". */
  children: ReactNode;
  /** For tests that need to find the badge. */
  testId?: string;
}

/**
 * Renders the badge. The wrapper is "relative" so the screen-reader-only words stay inside it,
 * even inside a sideways-scrolling shelf (bundle 17 CHECK).
 *
 * @returns the badge
 */
export function Badge({ icon, title, hiddenPrefix, children, testId }: BadgeProps) {
  return (
    <span
      title={title}
      data-testid={testId}
      data-badge=""
      className="relative inline-flex h-7 items-center justify-center gap-2 rounded-full border-[0.5px] border-(--line-box) bg-(--surface-box) px-3 type-meta leading-none font-semibold whitespace-nowrap text-ink"
    >
      {/* Step 1: the icon, if any, is decoration: the words carry the meaning. */}
      {icon === undefined ? null : (
        <span aria-hidden="true" className="inline-flex size-3.5 flex-none">
          {icon}
        </span>
      )}
      {/* Step 2: the screen-reader prefix, then the visible words. */}
      <span className="sr-only">{hiddenPrefix} </span>
      {children}
    </span>
  );
}
