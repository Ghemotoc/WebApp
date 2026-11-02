/*
 * Migration: the enum values for forum signatures (bundle FORUMS-2, part d; story S1-E8-08).
 *
 * - picture_kind 'signature_picture': the one still picture a forum signature may carry.
 * - notification_kind 'customisation_change_requested': a moderator asked the person to change
 *   their signature or their space's banner picture within 24 hours (S1-E8-08 criterion 3, Q29).
 * New enum values can't be used in the transaction that adds them, so they come in their own
 * migration, before the one that uses them.
 */
alter type public.picture_kind add value if not exists 'signature_picture';
alter type public.notification_kind add value if not exists 'customisation_change_requested';
