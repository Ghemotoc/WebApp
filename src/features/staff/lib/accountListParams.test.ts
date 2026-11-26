/**
 * Unit tests for the Members list's address helpers and the Status filter's choices (S1-E11-02
 * follow-up; Robert, 26 Nov 2026). Who runs them: Vitest (npm test).
 */
import { describe, expect, it } from 'vitest';

import { accountStatusFilters } from '../api/accountList';

import { accountListChoicesFrom, accountListParamsWith } from './accountListParams';

describe('the Members list in the address', () => {
  it('an empty address means any status but deleted, 5 a page, page 1', () => {
    expect(accountListChoicesFrom(new URLSearchParams(''))).toEqual({
      status: null,
      pageSize: 5,
      pageNumber: 1,
    });
  });

  it('reads a status, a page size and a page from the address', () => {
    expect(accountListChoicesFrom(new URLSearchParams('status=banned&perPage=25&page=3'))).toEqual({
      status: 'banned',
      pageSize: 25,
      pageNumber: 3,
    });
  });

  it('an unknown status, an odd page size or a silly page fall back to the defaults', () => {
    expect(accountListChoicesFrom(new URLSearchParams('status=nope&perPage=7&page=-2'))).toEqual({
      status: null,
      pageSize: 5,
      pageNumber: 1,
    });
  });

  it('writing the choices keeps the search text and leaves the defaults out', () => {
    const params = new URLSearchParams('q=inkwolf&page=4');
    const next = accountListParamsWith(params, { status: null, pageSize: 5, pageNumber: 1 });
    expect(next.toString()).toBe('q=inkwolf');
  });

  it('writing a filter puts it in the address', () => {
    const next = accountListParamsWith(new URLSearchParams(''), {
      status: 'deleted',
      pageSize: 10,
      pageNumber: 2,
    });
    expect(next.toString()).toBe('status=deleted&perPage=10&page=2');
  });
});

describe('the Status filter', () => {
  it('lists active, suspended and banned first and deleted last, each state once', () => {
    expect(accountStatusFilters.slice(0, 3)).toEqual(['active', 'suspended', 'banned']);
    expect(accountStatusFilters.at(-1)).toBe('deleted');
    expect(new Set(accountStatusFilters).size).toBe(accountStatusFilters.length);
    expect(accountStatusFilters).toContain('email_unconfirmed');
  });
});
