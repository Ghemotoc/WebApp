/*
 * Migration: the notification kind for a story picked for Featured this week (bundle LOOK-4a;
 * story S1-E5-10).
 *
 * notification_kind gains 'story_featured': the quiet in-app notification a writer gets when
 * staff pick their story for the Discover band. Postgres can't use a new enum value in the
 * transaction that adds it, so the value has a migration of its own;
 * 20270203100002_look4a_02_featured_picks.sql uses it.
 * Who reads it: admin_set_featured_picks() and the notifications page.
 */

alter type public.notification_kind add value if not exists 'story_featured';
