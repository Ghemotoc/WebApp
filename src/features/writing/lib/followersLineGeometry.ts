/**
 * The geometry of the followers line graph (bundle CALM-7b; board New-Write, the "147 followers"
 * chart; design/simplified-system/components/LineChart/README.md).
 *
 * The drawing is one SVG with a 608 × 200 viewBox, as on the board: the plot runs from x 36 to
 * x 564 and from y 12 (the top gridline) to y 172 (zero). One y axis, starting at 0, with four
 * hairline gridlines at round numbers. A total of "fewer than 5" (null) is drawn at the height of
 * 2.5, so its real size never shows (S1-E3-07, criterion 2).
 * Who uses it: FollowersLinePlot. It calls nothing; every function here is pure.
 */
import type { ShownCount } from '../api/dashboard';

/** The board's viewBox and plot edges. */
export const chartBox = { width: 608, height: 200, left: 36, right: 564, top: 12, bottom: 172 };

/** Where "fewer than 5" is drawn, so its real size never shows. */
const fewerThanFiveHeight = 2.5;

/** The y axis never goes below 6, so a small line doesn't fill the whole height. */
const smallestTop = 6;

/** One point placed on the drawing. */
export interface PlacedPoint {
  x: number;
  y: number;
}

/** The y axis: its top value and the values of its four gridlines, from 0 up. */
export interface YAxis {
  top: number;
  gridValues: number[];
}

/**
 * The height a total is drawn at.
 *
 * @param total - the followers, or null for "fewer than 5"
 * @returns the value to plot
 */
export function plottedValue(total: ShownCount): number {
  return total === null ? fewerThanFiveHeight : total;
}

/**
 * Rounds a step up to 1, 2 or 5 times a power of ten (50, 100, 200), so gridlines sit on round
 * numbers.
 *
 * @param rough - the step before rounding
 * @returns the round step
 */
function roundStep(rough: number): number {
  const power = 10 ** Math.floor(Math.log10(rough));
  const scaled = rough / power;
  // Step 1: the smallest of 1, 2, 5 and 10 that is at least the rough step.
  let factor = 10;
  if (scaled <= 1) factor = 1;
  else if (scaled <= 2) factor = 2;
  else if (scaled <= 5) factor = 5;
  return factor * power;
}

/**
 * The y axis for a line: three equal steps above zero that reach the highest point.
 *
 * @param totals - every point's total
 * @returns the top and the four gridline values
 */
export function yAxisFor(totals: ShownCount[]): YAxis {
  const highest = Math.max(smallestTop, ...totals.map(plottedValue));
  const step = roundStep(highest / 3);
  return { top: step * 3, gridValues: [0, step, step * 2, step * 3] };
}

/**
 * The x of the point at an index; a single point sits at the right edge.
 *
 * @param index - the point's place, oldest first
 * @param count - how many points there are
 * @returns the x in viewBox units
 */
export function xOf(index: number, count: number): number {
  if (count <= 1) return chartBox.right;
  return chartBox.left + (index * (chartBox.right - chartBox.left)) / (count - 1);
}

/**
 * The y of a value on the axis.
 *
 * @param value - the value to plot
 * @param top - the axis's top value
 * @returns the y in viewBox units
 */
export function yOf(value: number, top: number): number {
  return chartBox.bottom - (value / top) * (chartBox.bottom - chartBox.top);
}

/**
 * Places every point on the drawing.
 *
 * @param totals - the totals, oldest first
 * @param top - the axis's top value
 * @returns the points' x and y
 */
export function placePoints(totals: ShownCount[], top: number): PlacedPoint[] {
  return totals.map((total, index) => ({
    x: xOf(index, totals.length),
    y: yOf(plottedValue(total), top),
  }));
}

/**
 * The SVG path of the line through the points.
 *
 * @param points - the placed points
 * @returns the path's d attribute, or an empty string with no points
 */
export function linePath(points: PlacedPoint[]): string {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ');
}

/**
 * The SVG path of the wash under the line, closed along the zero line.
 *
 * @param points - the placed points
 * @returns the path's d attribute, or an empty string with no points
 */
export function areaPath(points: PlacedPoint[]): string {
  const first = points.at(0);
  const last = points.at(-1);
  if (first === undefined || last === undefined) return '';
  const bottom = chartBox.bottom;
  return `M${first.x.toFixed(1)},${bottom} ${linePath(points).replace('M', 'L')} L${last.x.toFixed(1)},${bottom} Z`;
}

/**
 * Which points get a date under the axis: three or four, spread evenly, always the first and the
 * last (the board's 11 Aug, 8 Sep, 6 Oct, 3 Nov).
 *
 * @param count - how many points there are
 * @returns the indexes to label, oldest first
 */
export function labelIndexes(count: number): number[] {
  if (count <= 4) return Array.from({ length: count }, (_, index) => index);
  const last = count - 1;
  const spread = [0, Math.round(last / 3), Math.round((last * 2) / 3), last];
  return [...new Set(spread)];
}

/**
 * Which point sits nearest a viewBox x, so a hover or tap anywhere over the plot picks one.
 *
 * @param points - the placed points, oldest first
 * @param viewBoxX - the pointer's x in viewBox units
 * @returns the nearest point's index, or null when there are no points
 */
export function nearestPointIndex(points: PlacedPoint[], viewBoxX: number): number | null {
  let nearest: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  // Step 1: walk the points once and keep the closest (a year has at most 13 points).
  points.forEach((point, index) => {
    const distance = Math.abs(point.x - viewBoxX);
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  });
  return nearest;
}
