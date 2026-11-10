/**
 * Unit tests for the home page comment's small readers (bundle GAPS-13): the answer and the
 * reason a staff call failed.
 */
import { describe, expect, it } from 'vitest';

import { homeCommentAnswerFrom, homeCommentStaffFailureFrom } from './homeComment';

describe('homeCommentAnswerFrom', () => {
  it('keeps the two answers a reader can give', () => {
    expect(homeCommentAnswerFrom('agreed')).toBe('agreed');
    expect(homeCommentAnswerFrom('declined')).toBe('declined');
  });

  it('treats a word it does not know as still waiting, never as agreement', () => {
    expect(homeCommentAnswerFrom('yes')).toBe('waiting');
    expect(homeCommentAnswerFrom('')).toBe('waiting');
  });
});

describe('homeCommentStaffFailureFrom', () => {
  it('says not allowed when the database refuses the staff member', () => {
    expect(homeCommentStaffFailureFrom('42501')).toBe('not_allowed');
  });

  it('says the comment cannot be shown when it no longer fits or is already picked', () => {
    expect(homeCommentStaffFailureFrom('23514')).toBe('cannot_show');
    expect(homeCommentStaffFailureFrom('23505')).toBe('cannot_show');
  });

  it('falls back to a plain failure for anything else', () => {
    expect(homeCommentStaffFailureFrom(undefined)).toBe('failed');
    expect(homeCommentStaffFailureFrom('P0002')).toBe('failed');
  });
});
