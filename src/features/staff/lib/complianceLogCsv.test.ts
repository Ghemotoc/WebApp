/**
 * Unit tests for the compliance log CSV export (story S1-E11-04).
 * Who runs it: `npm test`. Authorities and requests are made-up examples.
 */
import { describe, expect, it } from 'vitest';

import { complianceLogFromAnswer, type ComplianceEntry } from '../api/complianceLog';

import { complianceLogToCsv } from './complianceLogCsv';

/** A done legal request. */
const request: ComplianceEntry = {
  reference: 'LR-001',
  source: 'log',
  kind: 'legal_request',
  authority: 'Poliția, județul Prahova',
  receivedAt: '2027-02-27T14:02:00+00:00',
  content: 'Asked for sign-up data of "one" account',
  actionTaken: 'Checked with our lawyer, then sent it',
  decision: null,
  completedAt: '2027-03-01T08:15:00+00:00',
};

describe('the compliance log CSV', () => {
  it('has the authority, date, content, action and times, quoted where needed', () => {
    const lines = complianceLogToCsv([request]).split('\r\n');
    expect(lines[0]).toBe(
      '\uFEFFreference,kind,authority,received_at,content,action_taken,completed_at',
    );
    expect(lines[1]).toBe(
      'LR-001,legal_request,"Poliția, județul Prahova",2027-02-27T14:02:00+00:00,' +
        '"Asked for sign-up data of ""one"" account",' +
        '"Checked with our lawyer, then sent it",2027-03-01T08:15:00+00:00',
    );
  });

  it('writes a removal order’s decision as its action and leaves open times empty', () => {
    const order: ComplianceEntry = {
      ...request,
      reference: 'TCO-0001',
      source: 'removal_order',
      kind: 'authority_order',
      actionTaken: null,
      decision: 'remove',
    };
    const open: ComplianceEntry = { ...request, actionTaken: null, completedAt: null };
    const lines = complianceLogToCsv([order, open]).split('\r\n');
    expect(lines[1]).toContain(',remove,');
    expect(lines[2]?.endsWith(',,')).toBe(true);
  });
});

describe('reading the log', () => {
  it('turns the answer into rows and the launch task, dropping unknown words', () => {
    const log = complianceLogFromAnswer({
      entries: [{ reference: 'LR-002', source: 'log', kind: 'surprise', authority: 'ANCOM' }],
      launch: { launch_date: '2027-03-01', due_on: '2027-04-15', notice_reference: null },
    });
    expect(log.entries[0]?.kind).toBe('legal_request');
    expect(log.entries[0]?.decision).toBeNull();
    expect(log.launch).toEqual({
      launchDate: '2027-03-01',
      dueOn: '2027-04-15',
      noticeReference: null,
      noticeDoneAt: null,
    });
  });
});
