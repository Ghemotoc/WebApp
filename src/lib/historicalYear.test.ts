/**
 * Tests for years before Christ (BC-YEARS): how a year reads and what a staff year field keeps.
 */
import { describe, expect, it } from 'vitest';
import { historicalYear, yearFieldText, yearFromField } from './historicalYear';

/** A stand-in for i18next's t with the English words. */
const english = (_key: string, options: { year: number }) => `${options.year} BC`;

describe('years before Christ', () => {
  it('writes a year after Christ as it is', () => {
    expect(historicalYear(1892, english)).toBe('1892');
  });

  it('writes a negative year as a year before Christ', () => {
    expect(historicalYear(-428, english)).toBe('428 BC');
  });

  it('keeps digits and a leading minus in a staff year field', () => {
    expect(yearFieldText('-428')).toBe('-428');
    expect(yearFieldText('19a2')).toBe('192');
    expect(yearFieldText('4-28')).toBe('428');
  });

  it('reads a field with no digits as no year', () => {
    expect(yearFromField('')).toBeNull();
    expect(yearFromField('-')).toBeNull();
    expect(yearFromField('-428')).toBe(-428);
  });
});
