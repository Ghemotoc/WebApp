/**
 * Migration: the enum value bundle 7 (Together and spaces, boards F01 to F12) needs before its
 * main migration can use it. A new enum value can't be used in the transaction that adds it, so it
 * sits in its own file.
 *
 * - notification_kind 'space_moderator_invited': the owner of a space asked a member to help run
 *   it; the member accepts or declines on the space's page (user stories 7.7 and 7.10: "they
 *   accept first").
 *
 * Called by: 20270205100542_books7_02_together_and_spaces.sql.
 */
alter type public.notification_kind add value if not exists 'space_moderator_invited';
