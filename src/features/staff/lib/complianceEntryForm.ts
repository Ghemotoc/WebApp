/**
 * Checks the "Log a request" form and turns it into a new compliance log entry (story S1-E11-04).
 *
 * Who calls it: components/metrics/ComplianceEntryForm.tsx. The times are typed as Romania time
 * (date and time fields) and sent as moments, so a request logged from abroad still shows the time
 * it arrived in Bucharest (Q7). The database checks every rule again
 * (admin_log_compliance_entry()); this only catches mistakes before the round trip.
 * Pure, so it is unit-tested on its own.
 */
import { romaniaTimeToInstant } from '@/lib/romania-time';

import type { ComplianceEntryKind, NewComplianceEntry } from '../api/complianceLog';

/** What the form keeps while it is open. */
export interface ComplianceFormValues {
  kind: ComplianceEntryKind;
  authority: string;
  receivedDate: string;
  receivedTime: string;
  content: string;
  /** Whether it was already dealt with when it is logged. */
  isDone: boolean;
  actionTaken: string;
  doneDate: string;
  doneTime: string;
}

/** A plain reason the form shows, matching a key under metrics.compliance.problems. */
export type ComplianceFormProblem = 'empty' | 'badTime' | 'done_before_received';

/**
 * The form's starting values: a legal request that arrived now.
 *
 * @param today - "YYYY-MM-DD" and "HH:MM", Romania time
 * @returns the values
 */
export function emptyComplianceForm(today: { date: string; time: string }): ComplianceFormValues {
  return {
    kind: 'legal_request',
    authority: '',
    receivedDate: today.date,
    receivedTime: today.time,
    content: '',
    isDone: false,
    actionTaken: '',
    doneDate: today.date,
    doneTime: today.time,
  };
}

/**
 * The "done" part of the entry: the action and its moment, or nothing while it is open.
 *
 * @param values - what is typed
 * @returns the action and moment, null for an open entry, or a problem
 */
function donePart(
  values: ComplianceFormValues,
): { actionTaken: string; completedAt: Date } | null | ComplianceFormProblem {
  if (!values.isDone) return null;
  if (values.actionTaken.trim() === '') return 'empty';
  const completedAt = romaniaTimeToInstant(values.doneDate, values.doneTime);
  return completedAt === null ? 'badTime' : { actionTaken: values.actionTaken.trim(), completedAt };
}

/**
 * Checks the form and builds the entry.
 *
 * @param values - what is typed
 * @returns the entry to send, or the first problem to show
 */
export function complianceEntryFrom(
  values: ComplianceFormValues,
): NewComplianceEntry | ComplianceFormProblem {
  // Step 1: every entry names the authority and what was asked.
  if (values.authority.trim() === '' || values.content.trim() === '') return 'empty';
  // Step 2: the time it arrived, typed as Romania time.
  const receivedAt = romaniaTimeToInstant(values.receivedDate, values.receivedTime);
  if (receivedAt === null) return 'badTime';
  // Step 3: what was done, if it already was, and never before it arrived.
  const done = donePart(values);
  if (typeof done === 'string') return done;
  if (done !== null && done.completedAt < receivedAt) return 'done_before_received';
  return {
    kind: values.kind,
    authority: values.authority.trim(),
    receivedAt: receivedAt.toISOString(),
    content: values.content.trim(),
    actionTaken: done === null ? '' : done.actionTaken,
    completedAt: done === null ? null : done.completedAt.toISOString(),
  };
}
