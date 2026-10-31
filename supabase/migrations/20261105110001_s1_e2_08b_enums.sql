/*
 * Migration: the two notification kinds of the manual age check and the 18 invitation (story
 * S1-E2-08, part 08b; bundle ACCOUNTS-2, part b).
 *
 * What it adds, on its own because Postgres can't use a new enum value in the transaction that
 * adds it:
 *   notification_kind  age_check_decided: the person hears that staff decided their manual age
 *                      check (criterion 8);
 *   notification_kind  age_check_18_invite: someone whose year of birth now says 18 or over, with
 *                      only a "13 or over" result, is invited to take an "18 or over" check
 *                      (criterion 10).
 * Who uses them: …_s1_e2_08b_manual_age_checks.sql and src/features/notifications/.
 */
alter type public.notification_kind add value if not exists 'age_check_decided';
alter type public.notification_kind add value if not exists 'age_check_18_invite';
