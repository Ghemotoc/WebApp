-- Database tests for bans that close an account for good (bundle ADMIN-2, part f1; Robert's
-- brief of 2 Nov 2026, section 6).
-- What it proves:
-- - emails are normalised before they are hashed for the banned list (lower case, no +tag, no
--   Gmail dots, googlemail.com is gmail.com), so a banned person can't sign up again with a
--   variant of the address;
-- - a throwaway email domain (or one of its subdomains) can't sign up, unless the team lets it
--   through in disposable_email_allow; anyone may ask email_domain_allowed();
-- - who may read the list of throwaway domains (allowed and denied);
-- - a ban hides the account's profile, stories, forum posts and its own-only threads from
--   everyone, keeps a thread other people replied in, and keeps an item a moderator hid on its
--   own; the nightly purge never deletes a banned account; lifting the ban brings back exactly
--   what it hid.
begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

-- A fresh password sign-in, as Supabase's tokens carry it in "amr": staff changes need one.
create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object(
           'sub', persona_id, 'role', 'authenticated',
           'amr', json_build_array(json_build_object('method', 'password',
                                                     'timestamp', extract(epoch from now())::bigint)))::text, true);
$$;
-- A sign-up straight into auth.users, as Supabase Auth makes it; returns the SQLSTATE and hint
-- of the refusal, or 'ok'.
create function pg_temp.sign_up(email text) returns text language plpgsql as $$
declare
  found_hint text;
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data,
       raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       email, 'x', '{"provider": "email", "providers": ["email"]}',
       '{"birth_year": "1990", "invite_code": "PERSONAS-TEST-INVITE"}', now(), now(), '', '', '', '');
  return 'ok';
exception when others then
  get stacked diagnostics found_hint = pg_exception_hint;
  return sqlstate || coalesce(' ' || nullif(found_hint, ''), '');
end;
$$;

/* ---------- 1. Normalised emails ---------- */

select is(public.normalised_email('  Ana.Pop+second@GoogleMail.com '), 'anapop@gmail.com',
  'a Gmail address loses its capitals, +tag and dots, and googlemail.com becomes gmail.com');
select is(public.normalised_email('Ana.Pop+2@Yahoo.com'), 'ana.pop@yahoo.com',
  'another provider keeps its dots but loses the +tag');
select is(public.banned_email_hash('a.n.a.pop+x@gmail.com'), public.banned_email_hash('anapop@googlemail.com'),
  'two ways of writing the same Gmail address have the same banned hash');
-- banned_user's email was banned by the seed: a variant of it can't sign up.
select is(pg_temp.sign_up('Banned_User+again@Personas.test'), '23514',
  'a banned person can''t sign up again with a +tag');

/* ---------- 2. Throwaway email domains ---------- */

select ok((select count(*) from public.disposable_email_domains) > 10000, 'the public list is loaded');
select ok(not public.email_domain_allowed('someone@mailinator.com'), 'a throwaway domain is refused');
select ok(not public.email_domain_allowed('someone@inbox.mailinator.com'), 'and so is its subdomain');
select ok(public.email_domain_allowed('someone@gmail.com'), 'an ordinary domain is allowed');
select ok(public.email_domain_allowed('not an address'), 'something that isn''t an address is left to the form');
select is(pg_temp.sign_up('new-person@mailinator.com'), '23514 disposable_email',
  'a sign-up with a throwaway address is refused, and says why');
update public.settings set value = '["mailinator.com"]'::jsonb where key = 'disposable_email_allow';
select ok(public.email_domain_allowed('someone@mailinator.com'), 'a domain the team let through is allowed');
update public.settings set value = '[]'::jsonb where key = 'disposable_email_allow';
set local role anon;
select ok(not public.email_domain_allowed('someone@mailinator.com'), 'the sign-up form may ask before it sends');
reset role;

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select ok((select count(*) from public.disposable_email_domains) > 10000,
  'allowed: disposable_email_domains_select_settings lets an admin read the list');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.disposable_email_domains), 0,
  'denied: disposable_email_domains_select_settings shows a member nothing');
reset role;

/* ---------- 3. Closed for good ---------- */

-- adult_writer gets two forum threads: one only they posted in, and one teen_17 replied in. A
-- moderator already hid their second story on its own.
create temp table forum as select id from public.forums order by created_at limit 1;
insert into public.forum_threads (id, user_id, forum_id, title) values
  ('f1000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', (select id from forum), 'Only mine'),
  ('f1000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', (select id from forum), 'With a reply');
insert into public.forum_posts (id, user_id, thread_id, post_number, body) values
  ('f2000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 1, 'Hello'),
  ('f2000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000002', 1, 'Hello again'),
  ('f2000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000002', 2, 'A reply');
create temp table second_story as
  select id from public.stories
  where user_id = '00000000-0000-4000-8000-000000000001' and id <> '00000000-0000-4000-9000-000000000001' limit 1;
insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
  select '00000000-0000-4000-8000-000000000001', 'story', id, 'hidden', '00000000-0000-4000-8000-000000000010', 'Spam'
  from second_story;
-- The writer had asked to delete the account 15 days ago.
insert into public.account_deletions (user_id, requested_at, delete_after)
  values ('00000000-0000-4000-8000-000000000001', now() - interval '15 days', now() - interval '1 day');

-- The moderator bans adult_writer.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
create temp table ban as
  select public.admin_apply_sanction('00000000-0000-4000-8000-000000000001', 'ban', null, null,
    'Repeated threats.', 'We closed your account for good.') as id;
reset role;

select ok(public.is_moderated_away('profile', '00000000-0000-4000-8000-000000000001'), 'the banned profile is hidden');
select ok(public.is_moderated_away('story', '00000000-0000-4000-9000-000000000001'), 'and its story');
select ok(public.is_moderated_away('forum_post', 'f2000000-0000-4000-8000-000000000002'), 'and its forum posts');
select ok(public.is_moderated_away('forum_thread', 'f1000000-0000-4000-8000-000000000001'), 'and a thread only it posted in');
select ok(not public.is_moderated_away('forum_thread', 'f1000000-0000-4000-8000-000000000002'),
  'a thread other people replied in stays');
select is((select count(*)::integer from public.moderated_items
           where sanction_id = (select id from ban) and item_id = (select id from second_story)), 0,
  'a story a moderator already hid keeps its own row');
set local role anon;
select is(public.get_writer_profile('adult_writer'), null, 'nobody can open the closed profile');
reset role;

select is(public.purge_closed_accounts(), 0, 'the nightly purge skips the banned account');
select ok(exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-000000000001')
          and exists (select 1 from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  'the nightly purge never deletes a banned account: closed, never deleted');

-- The ban is lifted on appeal.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select ok(public.admin_lift_sanction((select id from ban), 'Appeal upheld.'), 'a moderator lifts the ban');
reset role;
select ok(not public.is_moderated_away('story', '00000000-0000-4000-9000-000000000001'), 'lifting the ban brings the story back');
select ok(not public.is_moderated_away('forum_thread', 'f1000000-0000-4000-8000-000000000001'), 'and the thread');
select ok(public.is_moderated_away('story', (select id from second_story)), 'but not what a moderator hid on its own');
select is((select distinct restore_reason from public.moderated_items where sanction_id = (select id from ban)),
  'Appeal upheld.', 'the restore carries the reason for lifting the ban');

select * from finish();
rollback;
