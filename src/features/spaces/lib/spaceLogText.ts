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
  // A space's logo (bundle G8b).
  'logo_picture_changed',
  'thread_made_sticky',
  'thread_sticky_removed',
  'thread_locked',
  'thread_unlocked',
  // The rules thread and a locked thread's pointer (bundle GAPS-9).
  'thread_rules_set',
  'thread_rules_removed',
  'thread_next_set',
  'thread_next_removed',
  // A space's moderators hide, show again and move replies (bundle GAPS-10).
  'post_hidden',
  'post_shown',
  'post_moved',
  // A class space's invite code and joins (bundle CLASSES, part a; S1-E8-11).
  'invite_made',
  'invite_ended',
  'member_joined',
  // A class space's lock at the end of the school year (bundle CLASSES, part b; S1-E8-11).
  'class_locked',
  'class_unlocked',
  'lock_date_changed',
  // Archiving a class (CLASSES-d) and its certificates (CLASSES-e; S1-E8-12).
  'class_archived',
  'certificates_issued',
  // The school's crest for the class's certificates (bundle G13b).
  'certificate_crest_changed',
  // The welcome note new members see once (bundle 14d IDEAS-3, part d).
  'welcome_note_changed',
  // Handing the space over to a moderator (bundle 14d IDEAS-3, part e).
  'handover_offered',
  'handover_cancelled',
  'handover_declined',
  'handover_accepted',
  // Class points (bundle CLASS-POINTS; S1-E8-13, 14 and 16).
  'class_points_on',
  'class_points_off',
  'teacher_points_saved',
  'teacher_points_removed',
  'class_points_reported',
  'class_points_removed',
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
