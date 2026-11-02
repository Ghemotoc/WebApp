/*
 * Migration: the enum values part c of spaces needs (bundle FORUMS-2, part c; stories S1-E8-06
 * and S1-E8-07). An enum value must be committed before a later migration can use it, so they
 * have their own file; the rest is in …_forums2_c_space_banners_and_notifications.sql.
 *
 * What it adds:
 * - picture_kind 'space_banner': a space's banner picture (S1-E8-06 criterion 1: "an optional
 *   banner"). Like every picture it goes through the picture check (CLAUDE.md rule 19).
 * - notification_kind 'space_join_request': someone asks to join a space the reader runs.
 * - notification_kind 'space_join_approved': the reader's request to join a space was approved
 *   (board 5.3: "You'll get a notification when you're in").
 */

alter type public.picture_kind add value if not exists 'space_banner';
alter type public.notification_kind add value if not exists 'space_join_request';
alter type public.notification_kind add value if not exists 'space_join_approved';
