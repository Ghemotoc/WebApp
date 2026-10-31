/**
 * Unit tests for the "Log a request" form check (story S1-E11-04). Who runs it: `npm test`.
 * Authorities and requests are made-up examples.
 */
import { describe, expect, it } from 'vitest';

import { complianceEntryFrom, emptyComplianceForm } from './complianceEntryForm';

const filled = {
  ...emptyComplianceForm({ date: '2027-03-02', time: '09:14' }),
  authority: ' ANCOM ',
  content: 'Asked for our DSA contact point details',
};

describe('the Log a request form', () => {
  it('builds an open entry with the Romania time as a moment', () => {
    expect(complianceEntryFrom(filled)).toEqual({
      kind: 'legal_request',
      authority: 'ANCOM',
      // 09:14 in Bucharest in March, before the clocks change, is 07:14 UTC.
      receivedAt: '2027-03-02T07:14:00.000Z',
      content: 'Asked for our DSA contact point details',
      actionTaken: '',
      completedAt: null,
    });
  });

  it('asks for the authority, the content and an action when it is already done', () => {
    expect(complianceEntryFrom({ ...filled, authority: '  ' })).toBe('empty');
    expect(complianceEntryFrom({ ...filled, isDone: true })).toBe('empty');
  });

  it('refuses a missing time and an action done before the request arrived', () => {
    expect(complianceEntryFrom({ ...filled, receivedTime: '' })).toBe('badTime');
    expect(
      complianceEntryFrom({
        ...filled,
        isDone: true,
        actionTaken: 'Sent the contact point details',
        doneTime: '08:00',
      }),
    ).toBe('done_before_received');
  });
});
