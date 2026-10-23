/**
 * Unit tests for the report schema (story S1-E10-01).
 */
import { describe, expect, it } from 'vitest';

import { findReportProblem, reportDetailsMaxLength, reportReasons } from './report';

describe('the report reasons', () => {
  it('are exactly the story’s eleven, in its order, from the database enum', () => {
    expect([...reportReasons]).toEqual([
      'illegal_content',
      'harassment',
      'self_harm',
      'child_sexual_content',
      'terrorism',
      'hate',
      'spam',
      'copyright',
      'copied_published_work',
      'undisclosed_ai',
      'other',
    ]);
  });
});

describe('findReportProblem', () => {
  it('needs a reason', () => {
    expect(findReportProblem({ reason: null, details: '' })).toBe('reason_missing');
  });

  it('accepts a reason with empty or short details', () => {
    expect(findReportProblem({ reason: 'spam', details: '' })).toBeNull();
    expect(findReportProblem({ reason: 'other', details: '  a note  ' })).toBeNull();
  });

  it('refuses details longer than the limit', () => {
    const tooLong = 'x'.repeat(reportDetailsMaxLength + 1);
    expect(findReportProblem({ reason: 'spam', details: tooLong })).toBe('details_too_long');
  });
});
