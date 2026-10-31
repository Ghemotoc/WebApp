/**
 * Unit tests for the return page's message (story S1-E2-08, part 08a).
 * Who runs it: `npm test`.
 */
import { describe, expect, it } from 'vitest';

import type { MyAgeCheck } from '../api/ageCheck';

import { returnOutcome } from './returnOutcome';

/** A check with no result yet, waiting for Yoti. */
const waiting: MyAgeCheck = {
  result: 'pending',
  checkedAt: null,
  method: null,
  threshold: 18,
  canStart: true,
  isChecking: true,
  needsCheck: true,
};

describe('the return page', () => {
  it('says "Checking your age" while the result is on its way', () => {
    expect(returnOutcome(waiting, false, false)).toBe('checking');
  });

  it('confirms an adult once "18 or over" is stored', () => {
    expect(
      returnOutcome({ ...waiting, result: '18_or_over', isChecking: false }, false, false),
    ).toBe('adult');
  });

  it('offers the ID document route to an adult year with only "13 or over"', () => {
    expect(
      returnOutcome({ ...waiting, result: '13_or_over', isChecking: false }, false, false),
    ).toBe('teen_with_adult_year');
    expect(
      returnOutcome(
        { ...waiting, result: '13_or_over', canStart: false, threshold: 13 },
        false,
        false,
      ),
    ).toBe('teen');
  });

  it('says a failure plainly', () => {
    expect(returnOutcome({ ...waiting, result: 'failed', isChecking: false }, false, false)).toBe(
      'failed',
    );
  });

  it('says nothing was saved after a cancel or a session that ended without a result', () => {
    expect(returnOutcome(waiting, true, false)).toBe('cancelled');
    expect(returnOutcome({ ...waiting, isChecking: false }, false, false)).toBe('not_finished');
    expect(returnOutcome(waiting, false, true)).toBe('not_finished');
  });
});
