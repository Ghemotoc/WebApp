/**
 * Tests for the error reporter (story S1-E1-05): what it sends, the per-page-load limit, repeats
 * and failures. The database side is tested in supabase/tests/database/029-client-errors.test.sql.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSupabaseClient } from '@/lib/supabase';

import { reportClientError } from '../api/clientErrors';
import { setCurrentRoutePattern } from './currentRoute';
import {
  errorCodeFromId,
  maximumReportsPerPageLoad,
  reportError,
  resetReportedErrorsForTests,
} from './errorReporter';

vi.mock('@/lib/supabase', () => ({ getSupabaseClient: vi.fn(async () => ({})) }));
vi.mock('../api/clientErrors', () => ({ reportClientError: vi.fn() }));

const rowId = '4f7a2c9e-1111-4222-8333-444455556666';

beforeEach(() => {
  resetReportedErrorsForTests();
  vi.mocked(reportClientError).mockReset().mockResolvedValue(rowId);
  vi.mocked(getSupabaseClient).mockResolvedValue(
    {} as Awaited<ReturnType<typeof getSupabaseClient>>,
  );
  setCurrentRoutePattern('/join/:code');
});

describe('reportError', () => {
  it('sends only the scrubbed fields and answers with a short error code', async () => {
    const code = await reportError(new TypeError('No account for ana.pop@example.com'));

    expect(code).toBe('E-4F7A2C');
    const sentReport = vi.mocked(reportClientError).mock.calls[0]?.[1];
    expect(sentReport).toEqual({
      errorName: 'TypeError',
      errorMessage: 'No account for [email]',
      routePath: '/join/:code',
      appVersion: 'local',
      browserFamily: expect.any(String),
    });
    expect(JSON.stringify(sentReport)).not.toContain('@');
  });

  it('sends the same error once and gives a repeat the same code', async () => {
    const first = await reportError(new Error('Boom'));
    const second = await reportError(new Error('Boom'));

    expect(second).toBe(first);
    expect(reportClientError).toHaveBeenCalledTimes(1);
  });

  it('sends at most five reports per page load', async () => {
    for (let index = 0; index < maximumReportsPerPageLoad + 2; index += 1) {
      await reportError(new Error(`Problem number ${index}`));
    }

    expect(reportClientError).toHaveBeenCalledTimes(maximumReportsPerPageLoad);
  });

  it('answers null without throwing when the report fails', async () => {
    vi.mocked(reportClientError).mockRejectedValue(new Error('offline'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(reportError(new Error('Lost'))).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith('Could not send an error report to the error log.');
    warn.mockRestore();
  });

  it('answers null when the database dropped the report over its limit', async () => {
    vi.mocked(reportClientError).mockResolvedValue(null);

    await expect(reportError(new Error('Busy'))).resolves.toBeNull();
  });
});

describe('errorCodeFromId', () => {
  it('uses the first six characters of the ID in capitals', () => {
    expect(errorCodeFromId(rowId)).toBe('E-4F7A2C');
  });
});
