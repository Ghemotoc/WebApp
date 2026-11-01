/**
 * Tests for the reading streak form's checks (bundle IDEAS-1, part b).
 */
import { describe, expect, it } from 'vitest';

import { checkHabitForm, isInQuietHours } from './habitChoices';

const form = { target: '15', remindersOn: false, reminderTime: '' };

describe('checkHabitForm', () => {
  it('keeps any target from 1 to 600 minutes the reader picks', () => {
    expect(checkHabitForm({ ...form, target: '15' }, false)).toEqual({
      choices: { target: 15, remindersOn: false, reminderTime: null },
    });
    expect(checkHabitForm({ ...form, target: '600' }, false)).toHaveProperty('choices');
  });

  it('takes an empty target as no target', () => {
    expect(checkHabitForm({ ...form, target: '' }, false)).toEqual({
      choices: { target: null, remindersOn: false, reminderTime: null },
    });
  });

  it('refuses 0, 601 and anything that isn’t a whole number', () => {
    for (const target of ['0', '601', '1.5', 'ten']) {
      expect(checkHabitForm({ ...form, target }, false)).toEqual({ problem: 'targetOutOfRange' });
    }
  });

  it('asks for a target and a time before a reminder', () => {
    expect(checkHabitForm({ target: '', remindersOn: true, reminderTime: '20:00' }, false)).toEqual(
      {
        problem: 'needsTarget',
      },
    );
    expect(checkHabitForm({ target: '15', remindersOn: true, reminderTime: '' }, false)).toEqual({
      problem: 'needsTime',
    });
  });

  it('lets an adult pick 23:00 but not an under-18 (quiet hours, Q50)', () => {
    const late = { target: '15', remindersOn: true, reminderTime: '23:00' };
    expect(checkHabitForm(late, false)).toHaveProperty('choices');
    expect(checkHabitForm(late, true)).toEqual({ problem: 'quietHoursError' });
  });
});

describe('isInQuietHours', () => {
  it('covers 22:00 to 06:59 and leaves 07:00 to 21:59 free', () => {
    expect(isInQuietHours('22:00')).toBe(true);
    expect(isInQuietHours('06:59')).toBe(true);
    expect(isInQuietHours('07:00')).toBe(false);
    expect(isInQuietHours('21:59')).toBe(false);
  });
});
