/*
 * Migration: the enum values for who may review pictures and the alert when staff open one
 * (bundle ADMIN-2, part e2a; Robert's brief of 2 Nov 2026, 08:39, section 5, from his 08:29
 * message).
 *
 * - staff_permission gains 'picture_review': ticked by an owner or admin, never for an account
 *   under 18 or one marked as an intern. Only holders see and decide pictures.
 * - notification_kind gains 'picture_opened_by_staff': the alert to the owner (CEO) and the people
 *   in the setting picture_open_alert_handles when a staff member opens an uploaded picture's
 *   original file.
 * Postgres can't use a new enum value in the transaction that adds it, so the values have a
 * migration of their own; 20261221100002_admin2_e2a_picture_reviewers.sql uses them.
 */

alter type public.staff_permission add value if not exists 'picture_review';
alter type public.notification_kind add value if not exists 'picture_opened_by_staff';
