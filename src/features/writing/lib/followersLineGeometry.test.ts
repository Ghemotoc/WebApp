/**
 * Tests for the followers line's geometry (bundle CALM-7b; board New-Write).
 */
import { describe, expect, it } from 'vitest';

import {
  chartBox,
  labelIndexes,
  nearestPointIndex,
  placePoints,
  yAxisFor,
} from './followersLineGeometry';

describe('yAxisFor', () => {
  it('starts at 0 and climbs in three round steps that reach the highest point', () => {
    expect(yAxisFor([12, 80, 147])).toEqual({ top: 150, gridValues: [0, 50, 100, 150] });
  });

  it('never goes below 6, so a handful of followers does not fill the whole height', () => {
    expect(yAxisFor([0, 1, 2]).top).toBe(6);
  });

  it('draws "fewer than 5" low, without showing its real size', () => {
    const axis = yAxisFor([null, null]);
    const [point] = placePoints([null], axis.top);
    expect(axis.top).toBe(6);
    expect(point?.y).toBeGreaterThan(chartBox.top);
    expect(point?.y).toBeLessThan(chartBox.bottom);
  });
});

describe('labelIndexes', () => {
  it('labels every point when there are four or fewer', () => {
    expect(labelIndexes(3)).toEqual([0, 1, 2]);
  });

  it('labels four points spread evenly, always the first and the last', () => {
    expect(labelIndexes(13)).toEqual([0, 4, 8, 12]);
  });
});

describe('nearestPointIndex', () => {
  const places = placePoints([1, 2, 3], 6);

  it('picks the point closest to the pointer', () => {
    expect(nearestPointIndex(places, chartBox.left + 10)).toBe(0);
    expect(nearestPointIndex(places, 300)).toBe(1);
    expect(nearestPointIndex(places, chartBox.width)).toBe(2);
  });

  it('picks nothing on an empty line', () => {
    expect(nearestPointIndex([], 300)).toBeNull();
  });
});
