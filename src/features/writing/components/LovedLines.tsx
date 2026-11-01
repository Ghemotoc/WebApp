/**
 * LovedLines: "Most-loved lines", the five paragraphs of a chapter that readers shared and
 * commented on most (bundle IDEAS-1, part d; idea IDEA-20261031-1).
 *
 * Each line shows the paragraph's number, its first words and its counts, "fewer than 5" below
 * five (S1-E3-07's rule), and never who. It is a plain numbered list, so screen readers read the
 * order. Who uses it: ChapterInsights. What it calls: lib/dashboardNumbers.ts for the counts.
 */
import { useTranslation } from 'react-i18next';

import type { LovedLine } from '../api/insights';
import { formatShownCount } from '../lib/dashboardNumbers';

/**
 * Renders the list, or a line saying there is nothing yet.
 *
 * @param props.lines - the chapter's most-loved lines, most first
 * @returns the heading and the list
 */
export function LovedLines({ lines }: { lines: LovedLine[] }) {
  const { t, i18n } = useTranslation('writing');
  const fewer = t('dashboard.fewerThanFive');
  // Writes a count the reader's way, or "fewer than 5".
  const shown = (count: number | null) => formatShownCount(count, i18n.language, fewer);
  return (
    <div className="flex flex-col gap-3">
      <h3 className="m-0 text-lg font-bold text-heading">{t('insights.lovedHeading')}</h3>
      {lines.length === 0 ? (
        <p className="m-0 text-sm text-body">{t('insights.lovedEmpty')}</p>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {lines.map((line) => (
            <li
              key={line.number}
              className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0"
            >
              <span className="text-[13px] font-semibold text-meta">
                {t('insights.paragraph', { number: line.number })}
              </span>
              <span className="text-[15px] leading-normal text-ink">{line.excerpt}</span>
              <span className="text-sm text-body">
                {t('insights.lineCounts', {
                  shares: shown(line.shares),
                  comments: shown(line.comments),
                })}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
