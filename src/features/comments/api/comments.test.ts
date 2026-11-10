/**
 * Unit tests for commentErrorFrom (story S1-E6-01; MUST-1a, who can comment).
 * Who runs it: `npm test`. What it proves: each database refusal becomes the failure the composer
 * explains, and a followers-only refusal is told apart from an account that can't comment yet.
 */
import { describe, expect, it } from 'vitest';

import { commentErrorFrom } from './comments';

describe('commentErrorFrom', () => {
  it('a followers-only story refusing someone who does not follow the writer', () => {
    expect(commentErrorFrom({ code: '42501', hint: 'followers_only' }).failure).toBe(
      'followers_only',
    );
  });

  it('an account that cannot comment yet', () => {
    expect(commentErrorFrom({ code: '42501', hint: null }).failure).toBe('read_only');
  });

  it('comments switched off', () => {
    expect(commentErrorFrom({ code: '55000' }).failure).toBe('comments_off');
  });

  it('the comment limit, with the minutes to wait', () => {
    const error = commentErrorFrom({ code: '54000', hint: 'wait_minutes:7' });
    expect(error.failure).toBe('too_many');
    expect(error.waitMinutes).toBe(7);
  });

  it('anything else is a connection problem', () => {
    expect(commentErrorFrom({ code: '08006' }).failure).toBe('unreachable');
  });
});
