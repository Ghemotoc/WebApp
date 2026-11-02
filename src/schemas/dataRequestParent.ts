/**
 * The contract of a data request's parent path: what Staff › Data requests sends to
 * /api/data-request-parent/… and the failures that come back (bundle ADMIN-2, part c3; story
 * S1-E11-09 criterion 5). Shared by the staff page (src/features/data-requests/) and the server
 * (server/data-request-parent.ts), so both check the same rules. Imported with a relative path
 * because Cloudflare's functions build doesn't know the "@/" alias.
 */
import { z } from 'zod';

/** Staff name the request; the server finds the parent's address in the database, never here. */
export const parentLinkRequestSchema = z.object({ requestId: z.string().uuid() });

/** A checked request. */
export type ParentLinkRequest = z.infer<typeof parentLinkRequestSchema>;

/** Why asking or sending failed: the database's hints, then our server's own. */
export const parentLinkFailures = [
  'signed_out',
  'invalid',
  'not_allowed',
  'request_closed',
  'no_check_needed',
  'already_answered',
  'not_under_16',
  'no_parent_on_record',
  'identity_not_checked',
  'not_found',
  'unavailable',
] as const;
export type ParentLinkFailure = (typeof parentLinkFailures)[number];
