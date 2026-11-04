/**
 * Migration: the enum value for handing a space over (bundle 14d IDEAS-3, part e; idea
 * IDEA-20261102-7).
 *
 * - notification_kind 'space_handover_offered': a space's owner offered the space to the
 *   moderator who gets the notification; they accept or decline on the space's page.
 * On its own because Postgres can't use a new enum value in the transaction that adds it. The
 * rest is in …_ideas3_e_space_handover.sql.
 */
alter type public.notification_kind add value if not exists 'space_handover_offered';
