/**
 * Tests for the sign-up age rules, with a fixed "today" (story S1-E2-02). The same examples are
 * checked in the database (supabase/tests/database/020 and 024).
 */
import { describe, expect, it } from 'vitest';

import {
  birthYearNeedsMonth,
  isUnderMarketAge,
  romanianToday,
  signUpAgeOutcome,
  youngestPossibleAge,
} from './age';

const midJune2027 = { year: 2027, month: 6 };

describe('the month question', () => {
  it('asks the month when 2014 could mean 12 or 13, and 2011 could mean 15 or 16 (Q16)', () => {
    expect(birthYearNeedsMonth(2014, midJune2027)).toBe(true);
    expect(birthYearNeedsMonth(2011, midJune2027)).toBe(true);
  });

  it('never asks it for any other year', () => {
    expect(birthYearNeedsMonth(2012, midJune2027)).toBe(false);
    expect(birthYearNeedsMonth(1990, midJune2027)).toBe(false);
  });
});

describe('the younger possible age', () => {
  it('counts someone born in May 2011 as 15 until 1 June 2027 (the story’s example)', () => {
    expect(youngestPossibleAge(2011, 5, { year: 2027, month: 5 })).toBe(15);
    expect(youngestPossibleAge(2011, 5, { year: 2027, month: 6 })).toBe(16);
  });

  it('with a year only, changes on 1 January of the year after the birthday by year', () => {
    expect(youngestPossibleAge(2009, null, { year: 2027, month: 12 })).toBe(17);
    expect(youngestPossibleAge(2009, null, { year: 2028, month: 1 })).toBe(18);
  });
});

describe('signUpAgeOutcome', () => {
  it('refuses under-13s', () => {
    expect(signUpAgeOutcome(2016, null, false, midJune2027)).toBe('under_13');
    expect(signUpAgeOutcome(2014, 11, false, midJune2027)).toBe('under_13');
  });

  it('lets a 13-year-old in once adults_only is off, but not while it is on', () => {
    expect(signUpAgeOutcome(2014, 3, false, midJune2027)).toBe('ok');
    expect(signUpAgeOutcome(2014, 3, true, midJune2027)).toBe('adults_only');
  });

  it('asks for the month before deciding, when the year needs it', () => {
    expect(signUpAgeOutcome(2011, null, true, midJune2027)).toBe('month_needed');
  });

  it('lets an adult in while adults_only is on', () => {
    expect(signUpAgeOutcome(1990, null, true, midJune2027)).toBe('ok');
  });
});

describe('romanianToday', () => {
  it('reads the date in Romanian time: 31 December 23:30 in London is already 1 January in Bucharest', () => {
    expect(romanianToday(new Date('2026-12-31T23:30:00Z'))).toEqual({ year: 2027, month: 1 });
  });
});

describe('the market minimum age (S1-E2-10)', () => {
  const autumn2027 = { year: 2027, month: 10 };

  it('refuses someone who could still be 15 where the market starts at 16 (Australia, Q19)', () => {
    expect(isUnderMarketAge(2011, 11, 16, autumn2027)).toBe(true);
  });

  it('lets in someone who is surely 16', () => {
    expect(isUnderMarketAge(2011, 5, 16, autumn2027)).toBe(false);
    expect(isUnderMarketAge(2010, null, 16, autumn2027)).toBe(false);
  });
});
