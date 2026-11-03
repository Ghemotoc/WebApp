/**
 * Unit tests for the ticket fields helpers (story S1-E11-13 criterion 4; bundle ADMIN-2h1).
 */
import { describe, expect, it } from 'vitest';

import { changedFields, tagsFromText, type TicketFieldValues } from './ticketFields';

/** A ticket as loaded. */
const loaded: TicketFieldValues = {
  status: 'new',
  priority: 'normal',
  category: 'other',
  assignee: '',
  tags: 'drafts',
};

describe('the ticket fields panel', () => {
  it('turns typed tags into a clean list in lower case', () => {
    expect(tagsFromText(' Drafts, login,, drafts ,LOGIN ')).toEqual(['drafts', 'login']);
  });

  it('sends nothing when nothing changed', () => {
    expect(changedFields(loaded, { ...loaded, tags: ' Drafts ' })).toEqual({});
  });

  it('sends only the fields that changed', () => {
    expect(changedFields(loaded, { ...loaded, status: 'open', assignee: '@support' })).toEqual({
      status: 'open',
      assignee: 'support',
    });
  });

  it('sends an empty assignee to unassign, and the new tag list', () => {
    const assigned = { ...loaded, assignee: 'support' };
    expect(
      changedFields(assigned, { ...assigned, assignee: '', tags: 'drafts, lost-work' }),
    ).toEqual({
      assignee: '',
      tags: ['drafts', 'lost-work'],
    });
  });
});
