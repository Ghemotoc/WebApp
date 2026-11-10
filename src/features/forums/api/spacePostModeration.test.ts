/**
 * Tests for reading the database's refusals of a space moderator's change (bundle GAPS-10).
 */
import { describe, expect, it } from 'vitest';

import { spacePostErrorFrom } from './spacePostModeration';

describe('spacePostErrorFrom', () => {
  it('names the refusal the hint gives', () => {
    expect(spacePostErrorFrom({ code: '23514', hint: 'post:first' }).failure).toBe('first');
    expect(spacePostErrorFrom({ code: 'P0002', hint: 'target:missing' }).failure).toBe(
      'target_missing',
    );
  });

  it('reads the hint before the code, so a moderator learns the post is the owner’s', () => {
    expect(spacePostErrorFrom({ code: '42501', hint: 'post:owner' }).failure).toBe('owner');
  });

  it('says not allowed when the server refuses without a hint', () => {
    expect(spacePostErrorFrom({ code: '42501', hint: null }).failure).toBe('not_allowed');
  });

  it('reads anything else as a failed save', () => {
    expect(spacePostErrorFrom({}).failure).toBe('unreachable');
  });
});
