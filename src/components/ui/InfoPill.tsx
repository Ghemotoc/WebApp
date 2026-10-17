/**
 * InfoPill: a small label that tells, never does (story S1-E1-03; DoD pill system).
 *
 * The rule: a pastel tint, a soft border and dark text of the same hue (text at least 7:1 in light
 * mode), content centred with equal padding, 24 px tall, 12 px bold text. Six tones from the
 * boards: plum, sage, gold, sky, neutral, blush. Night mode swaps in dark tints with light text
 * (src/styles/tokens.css). Interactive choices are Chips, not pills.
 * Who uses it: story labels, statuses, "Staff", ratings and so on.
 */
import type { ReactNode } from 'react';

/** The six information pill tones. */
export type PillTone = 'plum' | 'sage' | 'gold' | 'sky' | 'neutral' | 'blush';

/** The classes for each tone, written out in full so Tailwind can find them. */
const toneClasses: Record<PillTone, string> = {
  plum: 'border-(--pill-plum-border) bg-(--pill-plum-bg) text-(--pill-plum-text)',
  sage: 'border-(--pill-sage-border) bg-(--pill-sage-bg) text-(--pill-sage-text)',
  gold: 'border-(--pill-gold-border) bg-(--pill-gold-bg) text-(--pill-gold-text)',
  sky: 'border-(--pill-sky-border) bg-(--pill-sky-bg) text-(--pill-sky-text)',
  neutral: 'border-(--pill-neutral-border) bg-(--pill-neutral-bg) text-(--pill-neutral-text)',
  blush: 'border-(--pill-blush-border) bg-(--pill-blush-bg) text-(--pill-blush-text)',
};

/** What an InfoPill needs. */
export interface InfoPillProps {
  tone: PillTone;
  children: ReactNode;
}

/**
 * Renders one information pill.
 *
 * @returns the pill
 */
export function InfoPill({ tone, children }: InfoPillProps) {
  return (
    <span
      className={`inline-flex h-6 items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs leading-none font-bold whitespace-nowrap ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
