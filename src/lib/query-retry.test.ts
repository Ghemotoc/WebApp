/**
 * Tests for the data cache's retry rule (story S1-E2-QA; Robert's staging check, 17 Oct 2026).
 */
import { describe, expect, it } from 'vitest';

import { isRefusal, refusalCause, shouldRetryQuery } from './query-retry';

/** An error as an api/ function throws it after a failed Supabase response. */
function apiError(status: number, code?: string): Error {
  return new Error('Could not read the legal document.', { cause: refusalCause(status, { code }) });
}

describe('shouldRetryQuery', () => {
  it('does not retry a 401 or a 403, because asking again gets the same refusal', () => {
    expect(shouldRetryQuery(0, apiError(401, '42501'))).toBe(false);
    expect(shouldRetryQuery(0, apiError(403))).toBe(false);
  });

  it('does not retry a refusal known only by its database code', () => {
    expect(shouldRetryQuery(0, apiError(0, '42501'))).toBe(false);
    expect(shouldRetryQuery(0, apiError(0, 'PGRST301'))).toBe(false);
  });

  it('retries other failures, such as a dropped connection, up to three times', () => {
    const networkError = new Error('Failed to fetch');
    expect(shouldRetryQuery(0, networkError)).toBe(true);
    expect(shouldRetryQuery(2, apiError(500))).toBe(true);
    expect(shouldRetryQuery(3, networkError)).toBe(false);
  });
});

describe('isRefusal', () => {
  it('is false for errors without a cause, or with something else as the cause', () => {
    expect(isRefusal(new Error('plain'))).toBe(false);
    expect(isRefusal(new Error('text cause', { cause: 'no' }))).toBe(false);
    expect(isRefusal('not an error')).toBe(false);
  });
});
