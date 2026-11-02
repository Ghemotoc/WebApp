/**
 * Unit tests for the dates and deadlines of data requests (bundle ADMIN-2, part c1; story
 * S1-E11-09 criterion 2).
 */
import { describe, expect, it } from 'vitest';

import { daysLeft, extensionChoices, formatCalendarDate, urgencyTone } from './dataRequestDates';

describe('data request dates', () => {
  it('shows a deadline as a date in the interface language', () => {
    expect(formatCalendarDate('2027-02-28', 'en')).toBe('28 February 2027');
    expect(formatCalendarDate('2027-02-28', 'ro')).toBe('28 februarie 2027');
  });

  it('keeps the same day in summer and winter', () => {
    expect(formatCalendarDate('2027-07-01', 'en')).toBe('1 July 2027');
    expect(formatCalendarDate('2027-01-01', 'en')).toBe('1 January 2027');
  });

  it('counts the days left to a deadline, zero on the day and negative after it', () => {
    expect(daysLeft('2027-03-10', '2027-03-03')).toBe(7);
    expect(daysLeft('2027-03-10', '2027-03-10')).toBe(0);
    expect(daysLeft('2027-03-10', '2027-03-12')).toBe(-2);
  });

  it('counts across the change to summer time without losing a day', () => {
    expect(daysLeft('2027-04-01', '2027-03-25')).toBe(7);
  });

  it('colours overdue and the two-day alert alike, the 7-day reminder gold and closed neutral', () => {
    expect(urgencyTone('overdue')).toBe('blush');
    expect(urgencyTone('alert')).toBe('blush');
    expect(urgencyTone('reminder')).toBe('gold');
    expect(urgencyTone('on_time')).toBe('sage');
    expect(urgencyTone('closed')).toBe('neutral');
  });

  it('offers one or two more months, then only two, then none', () => {
    expect(extensionChoices('2027-02-28', null)).toEqual([1, 2]);
    expect(extensionChoices('2027-02-28', '2027-03-28')).toEqual([2]);
    expect(extensionChoices('2027-02-28', '2027-04-28')).toEqual([]);
  });
});
