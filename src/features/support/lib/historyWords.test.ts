/**
 * Unit tests for the history words and the under-16 check (story S1-E11-13 criteria 4 and 12;
 * bundle ADMIN-2h1).
 */
import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import { valueWords } from './historyWords';
import { isUnder16 } from './requester';

/** A stand-in for i18next that echoes the key, so the test sees which text was asked for. */
const echo = ((key: string) => key) as unknown as TFunction;

describe('a support ticket history line', () => {
  it('names a status, priority or category through the translations', () => {
    expect(valueWords('status', 'pending_on_user', echo)).toBe('statuses.pending_on_user');
    expect(valueWords('priority', 'urgent', echo)).toBe('staff.priorities.urgent');
    expect(valueWords('category', 'bug', echo)).toBe('categories.bug');
  });

  it('names an assignee by username, and nobody when there is none', () => {
    expect(valueWords('assignee', 'support', echo)).toBe('@support');
    expect(valueWords('assignee', null, echo)).toBe('staff.history.nobody');
  });

  it('lists tags, and says none for an empty list', () => {
    expect(valueWords('tags', ['drafts', 'login'], echo)).toBe('drafts, login');
    expect(valueWords('tags', [], echo)).toBe('staff.history.none');
  });
});

describe('the under-16 banner', () => {
  const someone = { handle: 'a', userId: 'x', emailOnly: false, maskedEmail: null };

  it('shows for the 13 to 15 group', () => {
    expect(isUnder16({ ...someone, ageGroup: '13_to_15' })).toBe(true);
  });

  it('doesn’t show for 16 and over, or an email-only ticket', () => {
    expect(isUnder16({ ...someone, ageGroup: '16_to_17' })).toBe(false);
    expect(isUnder16({ ...someone, ageGroup: null })).toBe(false);
  });
});
