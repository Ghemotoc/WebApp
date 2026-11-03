/**
 * A moderator approving waiting pictures, for specs whose pictures sit in an All ages or 13+
 * story (bundle ADMIN-2, part e1b: such pictures wait for a moderator before anyone else sees
 * them).
 *
 * Who calls it: the picture specs (chapter pictures and drawings, Canva covers, Story Atlas
 * portraits), after an upload, so they can go on testing what readers see. The review page itself
 * is tested in pictures-to-check.spec.ts.
 * What it calls: admin_approve_picture() as the moderator persona, through runSql(), exactly as
 * the Approve button does.
 */
import { runSql } from './database';

/** The moderator persona's user ID (supabase/seed.sql). */
const moderatorId = '00000000-0000-4000-8000-000000000010';

/**
 * Approves every picture that waits for a moderator and matches the condition.
 *
 * @param condition - SQL on picture_checks, for example "story_id = '…'"
 * @returns how many pictures were approved, as text
 * Errors: throws with psql's message when an approval fails.
 */
export function approveWaitingPictures(condition: string): string {
  return (
    runSql(`
    select set_config('request.jwt.claims', '{"sub": "${moderatorId}", "role": "authenticated"}', true);
    select count(public.admin_approve_picture(picture_checks.case_id, 'Approved in an end-to-end test.'))
    from public.picture_checks
    join public.cases on cases.id = picture_checks.case_id and cases.status = 'open'
    where picture_checks.status = 'held' and cases.source = 'picture_review' and (${condition});`)
      .split('\n')
      .pop() ?? '0'
  );
}
