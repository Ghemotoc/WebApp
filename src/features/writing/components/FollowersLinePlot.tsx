/**
 * FollowersLinePlot: the drawing of the followers line (bundle CALM-7b; design handover Step 4;
 * board New-Write, the "147 followers" chart; design/simplified-system/components/LineChart).
 *
 * Board values: one SVG with a 608 × 200 viewBox that scales to the card's width; a 2 px line in
 * the thread colour with round joins and a 10% wash of it underneath; a 4 px end dot ringed in the
 * card's colour with the latest total beside it (Inter 600, 13 px, heading colour); four hairline
 * gridlines with their values and three or four dates under the axis, in the body colour at
 * 12 px (only the first and the last on phones). One y axis, starting at 0.
 * Hover, tap and keyboard: a pointer picks the nearest point, so each point's hit area is as wide
 * as the gap between points. The plot
 * is one tab stop, named for its range ("Followers over time, last 90 days"); Left and Right move
 * the tooltip, Home and End jump to the ends and Escape hides it (usePointPicker). The drawing and
 * the tooltip are hidden from screen readers, because FollowersTable carries the same numbers.
 * Who uses it: FollowersChart. What it calls: lib/followersLineGeometry and lib/followersLabels.
 */
import type { PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import type { FollowersPoint, FollowersRange, FollowersStep } from '../api/followersLine';
import { usePointPicker } from '../hooks/usePointPicker';
import { formatShownCount } from '../lib/dashboardNumbers';
import {
  areaPath,
  chartBox,
  labelIndexes,
  linePath,
  nearestPointIndex,
  placePoints,
  yAxisFor,
  yOf,
  type PlacedPoint,
} from '../lib/followersLineGeometry';
import { axisDate, pointDate } from '../lib/followersLabels';

/** What the plot needs. */
export interface FollowersLinePlotProps {
  points: FollowersPoint[];
  step: FollowersStep;
  range: FollowersRange;
}

/** A viewBox x or y as a share of the box, for the hit areas and the tooltip. */
function percentOf(value: number, size: number): string {
  return `${((value / size) * 100).toFixed(3)}%`;
}

/**
 * The tooltip's words: "147 followers", then "week of 3 Nov · +21".
 *
 * @param point - the point
 * @param step - what one point stands for
 * @returns the two lines
 */
function useTipWords(point: FollowersPoint, step: FollowersStep) {
  const { t, i18n } = useTranslation('writing');
  // Step 1: the total, or "fewer than 5 followers".
  const total =
    point.total === null
      ? t('dashboard.followers.tipTotalFew')
      : t('dashboard.followers.tipTotal', {
          count: point.total,
          value: formatShownCount(point.total, i18n.language, ''),
        });
  // Step 2: when, and the gain ("+21", "fewer than 5 new", nothing at 0).
  const when = t(`dashboard.followers.tipWhen.${step}`, {
    date: pointDate(point.startsOn, step, i18n.language),
  });
  let gained = '';
  if (point.gained === null) gained = t('dashboard.followers.tipGainedFew');
  else if (point.gained > 0)
    gained = t('dashboard.followers.tipGained', {
      value: formatShownCount(point.gained, i18n.language, ''),
    });
  return { total, detail: gained === '' ? when : `${when} · ${gained}` };
}

/** The tooltip over the chosen point, with a hairline down to the axis. */
function PointTip({
  point,
  place,
  step,
}: {
  point: FollowersPoint;
  place: PlacedPoint;
  step: FollowersStep;
}) {
  const words = useTipWords(point, step);
  const left = percentOf(place.x, chartBox.width);
  const top = percentOf(place.y, chartBox.height);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span
        className="absolute bottom-0 border-l border-border"
        style={{ left, top: percentOf(chartBox.top, chartBox.height) }}
      />
      <span
        className="absolute -translate-x-1/2 rounded-lg bg-surface px-2.5 py-1.5 text-[13px] leading-[18px] whitespace-nowrap text-ink shadow-popover"
        style={{ left, top: `calc(${top} - 64px)` }}
      >
        <b className="font-semibold text-heading">{words.total}</b>
        <br />
        {words.detail}
      </span>
    </div>
  );
}

/** The gridlines with their values at the left. */
function GridLines({ values, top }: { values: number[]; top: number }) {
  const { i18n } = useTranslation('writing');
  return (
    <g>
      {values.map((value) => {
        const y = yOf(value, top);
        return (
          <g key={value}>
            <line
              x1={chartBox.left}
              x2={chartBox.right}
              y1={y}
              y2={y}
              className="stroke-(--hairline)"
            />
            <text x={28} y={y + 4} textAnchor="end" className="fill-body text-[12px]">
              {formatShownCount(value, i18n.language, '')}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** The dates under the axis: three or four, and only the first and the last on phones. */
function AxisDates({
  points,
  places,
  step,
}: {
  points: FollowersPoint[];
  places: PlacedPoint[];
  step: FollowersStep;
}) {
  const { i18n } = useTranslation('writing');
  const indexes = labelIndexes(points.length);
  return (
    <g>
      {indexes.map((index, order) => {
        const isEnd = order === 0 || order === indexes.length - 1;
        return (
          <text
            key={index}
            x={places[index]?.x ?? 0}
            y={194}
            textAnchor="middle"
            className={cn('fill-body text-[12px]', !isEnd && 'max-sm:hidden')}
          >
            {axisDate(points[index]?.startsOn ?? '', step, i18n.language)}
          </text>
        );
      })}
    </g>
  );
}

/** The line, its wash and the end dot with the latest total. */
function LineMarks({ places, latest }: { places: PlacedPoint[]; latest: string }) {
  const end = places.at(-1);
  return (
    <g>
      <path d={areaPath(places)} className="fill-(--thread) opacity-10" />
      <path
        d={linePath(places)}
        fill="none"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="stroke-(--thread)"
      />
      {end !== undefined && (
        <>
          <circle
            cx={end.x}
            cy={end.y}
            r={4}
            strokeWidth={2}
            className="fill-(--thread) stroke-(--surface)"
          />
          <text x={end.x + 10} y={end.y + 4} className="fill-heading text-[13px] font-semibold">
            {latest}
          </text>
        </>
      )}
    </g>
  );
}

/**
 * Renders the plot.
 *
 * @param props.points - the points, oldest first
 * @param props.step - what one point stands for
 * @param props.range - the chosen time range, for the plot's name
 * @returns the plot
 */
export function FollowersLinePlot({ points, step, range }: FollowersLinePlotProps) {
  const { t, i18n } = useTranslation('writing');
  const picker = usePointPicker(points.length);
  // Step 1: the axis and where each point sits.
  const axis = yAxisFor(points.map((point) => point.total));
  const places = placePoints(
    points.map((point) => point.total),
    axis.top,
  );
  const latest = formatShownCount(
    points.at(-1)?.total ?? 0,
    i18n.language,
    t('dashboard.fewerShort'),
  );
  const chosenPoint = picker.chosen === null ? undefined : points[picker.chosen];
  const chosenPlace = picker.chosen === null ? undefined : places[picker.chosen];
  // Step 2: a pointer over the plot (hover or tap) picks the nearest point, so each point's hit
  // area is as wide as the gap between points.
  const pickNearest = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;
    const viewBoxX = ((event.clientX - bounds.left) / bounds.width) * chartBox.width;
    picker.choose(nearestPointIndex(places, viewBoxX));
  };
  // Step 3: the drawing and the tooltip, in one focusable, named plot.
  return (
    // The plot is a picture with a name (role="img") that also takes focus, because the arrow
    // keys move the tooltip (board New-Write, handover Step 4). The lint rule counts "img" as
    // non-interactive, so it is switched off here for that reason only; FollowersTable gives a
    // screen reader the same numbers.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      role="img"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      aria-label={t('dashboard.followers.plotName', {
        range: t(`dashboard.followers.rangesInSentence.${range}`),
      })}
      onKeyDown={picker.onKeyDown}
      onPointerMove={pickNearest}
      onPointerDown={pickNearest}
      onBlur={() => picker.choose(null)}
      onPointerLeave={() => picker.choose(null)}
      className="relative rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
    >
      <svg
        viewBox={`0 0 ${chartBox.width} ${chartBox.height}`}
        aria-hidden="true"
        focusable="false"
        className="block h-auto w-full overflow-visible"
      >
        <GridLines values={axis.gridValues} top={axis.top} />
        <AxisDates points={points} places={places} step={step} />
        <LineMarks places={places} latest={latest} />
      </svg>
      {chosenPoint !== undefined && chosenPlace !== undefined && (
        <PointTip point={chosenPoint} place={chosenPlace} step={step} />
      )}
    </div>
  );
}
