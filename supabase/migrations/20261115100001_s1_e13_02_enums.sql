/*
 * Migration: the notification kind of "Download my data" (story S1-E13-02; bundle PRIVACY,
 * part b).
 *
 * What it adds, on its own because Postgres can't use a new enum value in the transaction that
 * adds it:
 *   notification_kind  data_export_ready: the person hears that their copy of their data is ready
 *                      to download from Settings (criterion 3).
 * Who uses it: …_s1_e13_02_download_my_data.sql and src/features/notifications/.
 */
alter type public.notification_kind add value if not exists 'data_export_ready';
