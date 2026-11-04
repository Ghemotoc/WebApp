/*
 * Migration: the notification kind for a writer's new rank (bundle IDEAS-3, part a; idea
 * IDEA-20261102-1, approved by Robert on 2 Nov 2026, 22:01).
 *
 * notification_kind gains 'rank_reached': the one quiet in-app notification a writer gets when
 * their rank goes up for the first time. Postgres can't use a new enum value in the transaction
 * that adds it, so the value has a migration of its own; 20270122100002_ideas3_a_ranks.sql uses it.
 * Who reads it: refresh_writer_rank() and the notifications page.
 */

alter type public.notification_kind add value if not exists 'rank_reached';
