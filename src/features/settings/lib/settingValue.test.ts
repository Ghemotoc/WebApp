/**
 * Tests for reading a setting's field (story S1-E11-03).
 */
import { describe, expect, it } from 'vitest';

import { fieldTextOf, settingKindOf, valueFromField } from './settingValue';

describe('setting fields', () => {
  it('knows a number, a word and both kinds of list', () => {
    expect(settingKindOf(600)).toBe('number');
    expect(settingKindOf('clasice')).toBe('word');
    expect(settingKindOf([1, 7, 30])).toBe('list_of_numbers');
    expect(settingKindOf(['new', 'popular'])).toBe('list_of_words');
    expect(settingKindOf({ appeal: 1 })).toBeNull();
  });

  it('shows a list with commas and reads it back', () => {
    expect(fieldTextOf([1, 7, 30])).toBe('1, 7, 30');
    expect(valueFromField('list_of_numbers', '1, 7, 30')).toEqual([1, 7, 30]);
    expect(valueFromField('list_of_words', 'new; popular')).toEqual(['new', 'popular']);
  });

  it('reads a Romanian decimal comma as a decimal point', () => {
    expect(valueFromField('number', '0,5')).toBe(0.5);
  });

  it('refuses text that is not a number of zero or more', () => {
    expect(valueFromField('number', 'abc')).toBeNull();
    expect(valueFromField('number', '-3')).toBeNull();
    expect(valueFromField('number', '')).toBeNull();
    expect(valueFromField('list_of_numbers', '1, x')).toBeNull();
    expect(valueFromField('word', '   ')).toBeNull();
  });
});
