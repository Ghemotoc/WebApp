/**
 * When staff may build a data request's copy, worked out the same way as the database does it in
 * admin_data_request_copy_target(), so the page says why before anyone presses a button (bundle
 * ADMIN-2, parts c2 and c3; story S1-E11-09 criteria 4 and 5). The database checks again; this is only
 * the explanation.
 *
 * Who calls it: DataRequestCopyPanel. What it calls: nothing.
 */
import type { DataRequest } from '../api/dataRequests';

/** Why the copy can't be built yet, or null when it can. */
export type CopyBlockedReason =
  'closed' | 'not_a_copy' | 'parent_needed' | 'identity_denied' | 'identity_not_checked';

/**
 * Says why the copy can't be built, in the database's order.
 *
 * @param request - the request
 * @returns the reason, or null when staff may build and send it
 */
export function copyBlockedReason(request: DataRequest): CopyBlockedReason | null {
  // Step 1: only an open request for a copy or to move the data gets a copy (GDPR art. 15, 20).
  if (!request.isOpen) return 'closed';
  if (request.requestType !== 'copy' && request.requestType !== 'move') return 'not_a_copy';
  // Step 2: an under-16's request from outside their own account goes through the parent (c3).
  if (request.isUnder16 && request.identity !== 'not_needed' && !request.goesToParent) {
    return 'parent_needed';
  }
  // Step 3: the identity check comes first (GDPR art. 12(6)).
  if (request.identity === 'denied') return 'identity_denied';
  if (request.identity !== 'not_needed' && request.identity !== 'confirmed') {
    return 'identity_not_checked';
  }
  return null;
}
