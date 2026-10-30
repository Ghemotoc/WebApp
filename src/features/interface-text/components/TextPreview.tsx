/**
 * TextPreview: a text as it will show, with its {{placeholders}} drawn as chips (story S1-E11-18
 * criterion 2: "a preview of the text as it will show (placeholders visible)"; S1-E11-19: locked
 * placeholders shown as chips).
 * Who uses it: LocaleTextPanel.
 */
import { Fragment } from 'react';

import { previewParts } from '../lib/previewParts';

/** What the preview needs. */
interface TextPreviewProps {
  text: string;
  /** The language of the text, so a screen reader reads it right (WCAG 2.2, 3.1.2). */
  language: string;
  label: string;
}

/**
 * Renders the preview.
 *
 * @returns the figure
 */
export function TextPreview({ text, language, label }: TextPreviewProps) {
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-1">
      <figcaption className="text-sm font-semibold text-ink">{label}</figcaption>
      <p
        lang={language}
        className="m-0 rounded-2xl border border-border bg-paper p-3 break-words text-body"
      >
        {previewParts(text).map((part, index) => (
          <Fragment key={index}>
            {part.kind === 'text' ? (
              part.value
            ) : (
              <span className="mx-0.5 inline-flex h-6 items-center rounded-full border border-(--pill-plum-border) bg-(--pill-plum-bg) px-2 align-baseline font-mono text-xs leading-none text-(--pill-plum-text)">
                {part.value}
              </span>
            )}
          </Fragment>
        ))}
      </p>
    </figure>
  );
}
