/**
 * Unit tests for how a refused staff change becomes one plain reason (story S1-E11-01b).
 */
import { describe, expect, it } from 'vitest';

import { failureFromRefusal } from './staffRoles';

describe('failureFromRefusal', () => {
  it('names the problem the database hints at', () => {
    expect(failureFromRefusal({ code: '23514', hint: 'last_owner' })).toBe('last_owner');
    expect(failureFromRefusal({ code: '23514', hint: 'reason_missing' })).toBe('reason_missing');
    expect(failureFromRefusal({ code: '23514', hint: 'no_such_account' })).toBe('no_such_account');
    expect(failureFromRefusal({ code: '23514', hint: 'not_staff' })).toBe('not_staff');
    expect(failureFromRefusal({ code: '42501', hint: 'own_role' })).toBe('own_role');
    expect(failureFromRefusal({ code: '23514', hint: 'no_workspace_account' })).toBe(
      'no_workspace_account',
    );
  });

  it('falls back on the error code when there is no hint it knows', () => {
    expect(failureFromRefusal({ code: '42501' })).toBe('not_allowed');
    expect(failureFromRefusal({ code: '28000' })).toBe('sign_in_again');
    expect(failureFromRefusal({ code: '23514', hint: 'something new' })).toBe('refused');
    expect(failureFromRefusal({})).toBe('unreachable');
  });
});
