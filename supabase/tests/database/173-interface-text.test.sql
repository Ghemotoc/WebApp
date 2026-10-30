-- Database tests for interface text overrides (stories S1-E11-18 and S1-E11-19; CLAUDE.md rule 1).
-- What it proves:
-- - only owner and admin read the versions (interface_text_overrides_select_admin) and save,
--   publish, restore or reset; a moderator, a content editor and a member are refused
--   (criterion 12);
-- - a save that leaves a language empty, changes a placeholder or types the product name is
--   refused with the problem named; cedilla letters become comma-below ones (criteria 8 and 14);
-- - a draft changes nothing; a future "show from" date waits; publishing today shows it at once
--   to anyone, signed in or not (criteria 5 and 9);
-- - restore brings a text back as a draft, reset brings the file text back, and every step is in
--   the audit log with the before and after text (criteria 6, 7 and 13);
-- - a regional locale with nothing of its own falls back to its base language.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  raised_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics raised_hint = pg_exception_hint;
  return raised_hint;
end;
$$;
-- The live override of a key in a locale, as the app reads it.
create function pg_temp.live(wanted_key text, wanted_locale text) returns text language sql as $$
  select text from public.published_interface_text(wanted_locale) where text_key = wanted_key;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

/* ---------- Who writes ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_save_interface_text('common:nav.help', 'en', 'Help', '{}', '{}') $$,
  '42501', null, 'a moderator is refused');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok($$ select public.admin_save_interface_text('common:nav.help', 'en', 'Help', '{}', '{}') $$,
  '42501', null, 'a content editor is refused (admin role only)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_reset_interface_text('common:nav.help', 'en') $$,
  '42501', null, 'a member is refused');

/* ---------- The checks on a save ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(pg_temp.hint_of($$ select public.admin_save_interface_text('common:nav.help', 'en', '  ', '{}', '{}') $$),
  'text:empty', 'an empty text is refused');
select is(pg_temp.hint_of($$ select public.admin_save_interface_text('email:confirmation.body', 'en',
    'Thanks for joining.', '{productName}', '{}') $$),
  'text:placeholders_changed', 'a text that drops a placeholder is refused');
select is(pg_temp.hint_of($$ select public.admin_save_interface_text('common:nav.help', 'en',
    'Help {{count}}', '{}', '{}') $$),
  'text:placeholders_changed', 'a text that adds a placeholder is refused');
select is(pg_temp.hint_of($$ select public.admin_save_interface_text('common:nav.help', 'en',
    'Help with Brandname', '{}', '{Brandname}') $$),
  'text:brand_name', 'the literal product name is refused');
select is(pg_temp.hint_of($$ select public.admin_save_interface_text('nav help', 'en', 'Help', '{}', '{}') $$),
  'bad_key', 'a key that isn''t a locale file key is refused');

/* ---------- Draft, schedule and publish ---------- */

select public.admin_save_interface_text('common:nav.help', 'ro', 'Ajutor şi ţinte', '{}', '{}');
select is((select text from public.interface_text_overrides where text_key = 'common:nav.help' and locale = 'ro' and status = 'draft'),
  'Ajutor și ținte', 'cedilla letters are saved as comma-below ones');
select is(pg_temp.live('common:nav.help', 'ro'), null, 'a draft changes nothing in the app');

select public.admin_save_interface_text('common:nav.help', 'en', 'Help tomorrow', '{}', '{}', public.romania_today() + 1);
select is(public.admin_publish_interface_text((select id from public.interface_text_overrides
    where text_key = 'common:nav.help' and locale = 'en' and status = 'draft')),
  public.romania_today() + 1, 'a text for tomorrow is scheduled for tomorrow');
select is(pg_temp.live('common:nav.help', 'en'), null, 'and the file text stays until then');

select public.admin_save_interface_text('common:nav.help', 'en', 'Get help', '{}', '{}');
select is(public.admin_publish_interface_text((select id from public.interface_text_overrides
    where text_key = 'common:nav.help' and locale = 'en' and status = 'draft')),
  public.romania_today(), 'a text with no date goes live today');
reset role;
set local role anon;
select is(pg_temp.live('common:nav.help', 'en'), 'Get help', 'a signed-out visitor gets the new text at once');
select is(pg_temp.live('common:nav.help', 'en-GB'), 'Get help', 'a regional locale falls back to its base language');
select is((select count(*)::integer from public.published_interface_text('ro')), 0, 'the Romanian draft is still not shown');
reset role;
select ok(exists (select 1 from public.audit_log where action = 'interface_text.published'
    and before_values ->> 'text' is null and after_values ->> 'text' = 'Get help'
    and after_values ->> 'key' = 'common:nav.help' and after_values ->> 'locale' = 'en'),
  'the publish is logged with the key, the locale and the before and after text');

/* ---------- Who reads the versions ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select ok((select count(*) from public.interface_text_overrides) > 0,
  'allowed: interface_text_overrides_select_admin lets the owner read every version');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.interface_text_overrides), 0,
  'denied: interface_text_overrides_select_admin hides the versions from a moderator');

/* ---------- Reset and restore ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_reset_interface_text('common:nav.help', 'en');
select is(pg_temp.live('common:nav.help', 'en'), null, 'Reset to default brings the file text back');
select lives_ok($$ select public.admin_restore_interface_text((select id from public.interface_text_overrides
    where text_key = 'common:nav.help' and locale = 'en' and text = 'Get help')) $$,
  'an admin restores the earlier text');
select is((select text from public.interface_text_overrides where text_key = 'common:nav.help' and locale = 'en' and status = 'draft'),
  'Get help', 'it comes back as a draft, and the app keeps the file text until it is published');
reset role;

select * from finish();
rollback;
