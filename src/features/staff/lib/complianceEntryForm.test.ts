/**
 * Unit tests for the "Log a request" form check (story S1-E11-04). Who runs it: `npm test`.
 * Authorities and requests are made-up examples.
 */
import { describe, expect, it } from 'vitest';

import { inTimeZone, pinViewerTimeZone } from '@/test/viewerTimeZone';

import { complianceEntryFrom, emptyComplianceForm } from './complianceEntryForm';

const filled = {
  ...emptyComplianceForm({ date: '2027-03-02', time: '09:14' }),
  authority: ' ANCOM ',
  content: 'Asked for our DSA contact point details',
};

describe('the Log a request form', () => {
  // The times are typed on the staff member's own clock (CALM-8b; Robert, 20 Nov 2026, 18:19 UTC).
  pinViewerTimeZone('Europe/Bucharest');

  it('builds an open entry with the typed time as a moment', () => {
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

  it('reads the typed time on the staff member’s own clock: 09:14 in Stockholm is 08:14 UTC', () => {
    inTimeZone('Europe/Stockholm', () => {
      const entry = complianceEntryFrom(filled);
      expect(typeof entry === 'object' && entry.receivedAt).toBe('2027-03-02T08:14:00.000Z');
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
