/** timeAgo (story S1-E6-01): comment dates in Romanian and English. */
import { describe, expect, it } from 'vitest';

import { timeAgo } from './timeAgo';

const now = new Date('2026-10-24T12:00:00Z');

describe('timeAgo', () => {
  it('says how many days ago a comment was, in English', () => {
    expect(timeAgo('2026-10-22T11:00:00Z', 'en', now)).toBe('2 days ago');
  });

  it('says it in Romanian with Romanian words', () => {
    expect(timeAgo('2026-10-24T11:55:00Z', 'ro', now)).toBe('acum 5 minute');
  });

  it('calls anything under a minute “now”', () => {
    expect(timeAgo('2026-10-24T11:59:30Z', 'en', now)).toBe('now');
  });

  it('never goes into the future when a clock runs ahead', () => {
    expect(timeAgo('2026-10-24T12:00:30Z', 'en', now)).toBe('now');
  });
});
