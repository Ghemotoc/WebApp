/**
 * Unit tests for the rules of the Archived stories form (bundle ARCHIVE-1).
 */
import { describe, expect, it } from 'vitest';

import { claimFieldProblems, isClaimLocked } from './archiveClaimForm';

describe('claimFieldProblems', () => {
  it('accepts a four-digit year and any name', () => {
    expect(claimFieldProblems(' 1997 ', 'Ana')).toEqual({ year: undefined, name: undefined });
  });

  it('refuses a year that isn’t four digits from 1900 on', () => {
    expect(claimFieldProblems('97', 'Ana').year).toBe('yearInvalid');
    expect(claimFieldProblems('1897', 'Ana').year).toBe('yearInvalid');
    expect(claimFieldProblems('', 'Ana').year).toBe('yearInvalid');
  });

  it('refuses an empty name', () => {
    expect(claimFieldProblems('1997', '   ').name).toBe('nameMissing');
  });
});

describe('isClaimLocked', () => {
  it('is locked when the page opened locked', () => {
    expect(isClaimLocked(true, undefined)).toBe(true);
  });

  it('is locked after the last wrong try and after a "locked" answer', () => {
    expect(isClaimLocked(false, { outcome: 'no_match', triesLeft: 0 })).toBe(true);
    expect(isClaimLocked(false, { outcome: 'locked' })).toBe(true);
  });

  it('stays open after a wrong try with tries left, and before any try', () => {
    expect(isClaimLocked(false, { outcome: 'no_match', triesLeft: 2 })).toBe(false);
    expect(isClaimLocked(false, undefined)).toBe(false);
  });
});
