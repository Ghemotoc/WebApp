/*
 * Migration: the new enum values of "Download my stories" (story S1-E13-05; bundle PRIVACY,
 * part e).
 *
 * What it adds, on its own because Postgres can't use a new enum value in the transaction that
 * adds it:
 *   export_kind        my_stories: one story, or all of them, as Word files (criterion 1);
 *   notification_kind  stories_export_ready: the writer hears that their Word files are ready
 *                      to download from Settings (criterion 2).
 * Who uses it: …_s1_e13_05_download_my_stories.sql and src/features/data-export/.
 */
alter type public.export_kind add value if not exists 'my_stories';
alter type public.notification_kind add value if not exists 'stories_export_ready';
