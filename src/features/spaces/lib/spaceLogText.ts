/**
 * The words for one line of a space's log (bundle FORUMS-2, part b; story S1-E8-07 criterion 2).
 *
 * Who calls it: SpaceLogLine. It only picks the translation key; the screen says it in the
 * reader's language. An action this version doesn't know yet reads as "made a change".
 */

/** The actions the database writes (log_space_action() and log_thread_moderation()). */
const knownActions = [
  'moderator_appointed',
  'moderator_changed',
  'moderator_removed',
  'request_approved',
  'request_declined',
  'request_age_changed',
  'member_removed',
  'settings_changed',
  'banner_picture_changed',
  'thread_made_sticky',
  'thread_sticky_removed',
  'thread_locked',
  'thread_unlocked',
];

/**
 * The translation key for an action.
 *
 * @param action - the log's action ("moderator_appointed"…)
 * @returns the key under "log.actions"
 */
export function logActionKey(action: string): string {
  return knownActions.includes(action) ? `log.actions.${action}` : 'log.actions.other';
}
