/**
 * Tests for competitionDates (bundle CLASS-POINTS, part 2): the dates a new competition's form
 * starts with.
 */
import { describe, expect, it } from 'vitest';

import { defaultDates } from './competitionDates';

describe('competitionDates', () => {
  it('starts a new competition on the database’s today and ends it two weeks later', () => {
    expect(defaultDates('2027-01-25')).toEqual({ startsOn: '2027-01-25', endsOn: '2027-02-08' });
  });

  it('crosses a year end', () => {
    expect(defaultDates('2026-12-20').endsOn).toBe('2027-01-03');
  });

  it('leaves both days empty when today is not a date', () => {
    expect(defaultDates('')).toEqual({ startsOn: '', endsOn: '' });
    expect(defaultDates('soon')).toEqual({ startsOn: '', endsOn: '' });
  });
});
