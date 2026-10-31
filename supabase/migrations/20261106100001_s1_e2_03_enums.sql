/*
 * Migration: the notification kinds of parental consent (story S1-E2-03; bundle ACCOUNTS-2,
 * part c).
 *
 * What it adds, on its own because Postgres can't use a new enum value in the transaction that
 * adds it:
 *   notification_kind  parental_consent_agreed: the writer hears that a parent or guardian said
 *                      yes, so the account is now fully active (criterion 2);
 *   notification_kind  parental_consent_withdrawn: the writer hears that consent was withdrawn,
 *                      so the account is read-only again (criterion 5).
 * Who uses them: …_s1_e2_03_parental_consent.sql and src/features/notifications/.
 */
alter type public.notification_kind add value if not exists 'parental_consent_agreed';
alter type public.notification_kind add value if not exists 'parental_consent_withdrawn';
