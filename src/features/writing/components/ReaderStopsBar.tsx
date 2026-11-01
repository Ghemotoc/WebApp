/**
 * ReaderStopsBar: "Where readers stop", a simple bar of where readers' saved places sit in a
 * chapter, in tenths (bundle IDEAS-1, part d; idea IDEA-20261031-5).
 *
 * Ten rows, one per tenth of the chapter, each with its share of readers as words and as a bar,
 * so the numbers never depend on colour or on seeing the bar. Below five readers there is no bar,
 * only "Fewer than 5 readers…" (the idea's second criterion). Never who.
 * Who uses it: ChapterInsights. What it calls: lib/dashboardNumbers.ts for the reader count.
 */
import { useTranslation } from 'react-i18next';

import type { ReaderStops } from '../api/insights';
import { formatShownCount } from '../lib/dashboardNumbers';

/**
 * One tenth: its range, its share of readers and a bar as long as that share.
 *
 * @returns the row
 */
function TenthRow({ index, percent }: { index: number; percent: number }) {
  const { t } = useTranslation('writing');
  return (
    <li className="grid grid-cols-[88px_1fr_96px] items-center gap-3 text-sm">
      <span className="text-body">
        {t('insights.tenth', { from: index * 10, to: index * 10 + 10 })}
      </span>
      <span aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-tint">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </span>
      <span className="text-right text-ink">{t('insights.tenthValue', { percent })}</span>
    </li>
  );
}

/**
 * Renders the heading, the note and the bar (or why there is none).
 *
 * @param props.stops - where readers' places sit
 * @returns the block
 */
export function ReaderStopsBar({ stops }: { stops: ReaderStops }) {
  const { t, i18n } = useTranslation('writing');
  const readers = formatShownCount(stops.readers, i18n.language, t('dashboard.fewerThanFive'));
  return (
    <div className="flex flex-col gap-3">
      <h3 className="m-0 text-lg font-bold text-heading">{t('insights.stopsHeading')}</h3>
      <p className="m-0 text-sm text-body">{t('insights.stopsIntro')}</p>
      {stops.tenths === null ? (
        <p className="m-0 text-sm text-body">{t('insights.stopsFewer')}</p>
      ) : (
        <>
          <p className="m-0 text-sm font-semibold text-ink">{t('insights.readers', { readers })}</p>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {stops.tenths.map((percent, index) => (
              <TenthRow key={index} index={index} percent={percent} />
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
