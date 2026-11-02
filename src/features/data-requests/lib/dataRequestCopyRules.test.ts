/**
 * Tests for when staff may build a data request's copy (bundle ADMIN-2, parts c2 and c3; S1-E11-09).
 */
import { describe, expect, it } from 'vitest';

import type { DataRequest } from '../api/dataRequests';

import { copyBlockedReason } from './dataRequestCopyRules';

/** A confirmed request by email for a copy, about an adult. */
const confirmed = {
  isOpen: true,
  requestType: 'copy',
  identity: 'confirmed',
  isUnder16: false,
  goesToParent: false,
} as DataRequest;

describe('copyBlockedReason', () => {
  it('lets staff send a copy once the person confirmed the request', () => {
    expect(copyBlockedReason(confirmed)).toBeNull();
  });
  it('lets staff send a copy of a request made in the app, even for a 14-year-old', () => {
    expect(copyBlockedReason({ ...confirmed, identity: 'not_needed', isUnder16: true })).toBeNull();
  });
  it('sends nothing before the identity check', () => {
    expect(copyBlockedReason({ ...confirmed, identity: 'asked' })).toBe('identity_not_checked');
  });
  it('sends nothing when the person said it wasn’t them', () => {
    expect(copyBlockedReason({ ...confirmed, identity: 'denied' })).toBe('identity_denied');
  });
  it('sends an under-16’s copy through the parent when the request came from outside the account', () => {
    expect(copyBlockedReason({ ...confirmed, isUnder16: true })).toBe('parent_needed');
  });
  it('sends an under-16’s copy once their parent confirmed it', () => {
    expect(copyBlockedReason({ ...confirmed, isUnder16: true, goesToParent: true })).toBeNull();
  });
  it('waits for the parent, and stops when the parent says nobody asked', () => {
    const parents = { ...confirmed, isUnder16: true, goesToParent: true };
    expect(copyBlockedReason({ ...parents, identity: 'asked' })).toBe('identity_not_checked');
    expect(copyBlockedReason({ ...parents, identity: 'denied' })).toBe('identity_denied');
  });
  it('builds no copy for a request to delete, or a closed one', () => {
    expect(copyBlockedReason({ ...confirmed, requestType: 'delete' })).toBe('not_a_copy');
    expect(copyBlockedReason({ ...confirmed, isOpen: false })).toBe('closed');
  });
});
