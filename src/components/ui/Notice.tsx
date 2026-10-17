/**
 * Notice: a coloured message box for success, information, warnings and errors (story S1-E1-03).
 *
 * Board values: 16 px radius, 14 by 16 px padding, 14 px text, each tone's tint and dark text
 * (src/styles/tokens.css). Errors use role="alert" so screen readers announce them at once; the
 * others use role="status", which waits politely. Colour is never the only signal: write the
 * message so it makes sense in plain text.
 * Who uses it: form results, saved states, errors from every feature.
 */
import type { ReactNode } from 'react';

/** The four notice tones. */
export type NoticeTone = 'success' | 'info' | 'warning' | 'error';

/** The classes for each tone, written out in full so Tailwind can find them. */
const toneClasses: Record<NoticeTone, string> = {
  success: 'border-(--success-border) bg-(--success-bg) text-(--success-text)',
  info: 'border-(--info-border) bg-(--info-bg) text-(--info-text)',
  warning: 'border-(--warning-border) bg-(--warning-bg) text-(--warning-text)',
  error: 'border-(--error-border) bg-(--error-bg) text-(--error-text)',
};

/** What a Notice needs. */
export interface NoticeProps {
  tone: NoticeTone;
  /** A short bold lead such as "Saved." (optional). */
  title?: string;
  children: ReactNode;
}

/**
 * Renders the notice.
 *
 * @returns the message box
 */
export function Notice({ tone, title, children }: NoticeProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl border px-4 py-3.5 text-sm leading-normal ${toneClasses[tone]}`}
    >
      {title !== undefined && <strong className="font-bold">{title} </strong>}
      {children}
    </div>
  );
}
