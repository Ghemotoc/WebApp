-- Database tests for safety contacts (story S1-E10-13a; CLAUDE.md rule 1).
-- What it proves:
-- - the seed holds every country of content/safety-contacts.json with its check date and source
--   link, Romania's 112, Telefonul Copilului and Ora de Net as the research has them, no
--   adult-only line; the international fallback rows (ZZ) are the two directories the CTO
--   checked on 24 Oct 2026 (Child Helpline International and INHOPE, Q9c);
-- - policy safety_contacts_select_public: a visitor and a member read them (allowed); nobody
--   writes from the app (denied: no insert, update or delete grant);
-- - note_safety_contact_gap(): a visitor counts a gap, the count grows, rubbish is refused;
-- - policy safety_contact_gaps_select_moderation: a moderator reads the gaps (allowed); a member
--   and a visitor don't (denied).
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

/* ---------- 1. The seed ---------- */

select set_eq(
  $$ select distinct country_code from public.safety_contacts where country_code <> 'ZZ' $$,
  $$ values ('RO'), ('GB'), ('IE'), ('US'), ('CA'), ('AU'), ('NZ'), ('SG'), ('ZA'), ('IN') $$,
  'every country of the research file is seeded');
select results_eq(
  $$ select kind::text, link, last_checked_on::text from public.safety_contacts where country_code = 'ZZ' order by kind $$,
  $$ values ('child_helpline', 'https://childhelplineinternational.org/helplines/', '2026-10-24'),
            ('csam_hotline', 'https://inhope.org', '2026-10-24') $$,
  'the international fallback is the two directories the CTO checked on 24 Oct 2026 (Q9c)');
select is((select min(last_checked_on)::text from public.safety_contacts where country_code <> 'ZZ'), '2026-10-17',
  'every seeded row carries the research''s check date');
select is_empty($$ select 1 from public.safety_contacts where link is null and phone_number is null $$,
  'every row has a number or a link');
select results_eq(
  $$ select phone_number, link from public.safety_contacts where country_code = 'RO' and kind = 'child_helpline' $$,
  $$ values ('116 111', 'https://www.telefonulcopilului.ro') $$,
  'Romania''s children''s helpline is Telefonul Copilului 116 111, with its official link');
select is((select phone_number from public.safety_contacts where country_code = 'RO' and kind = 'emergency' and position = 1), '112',
  'Romania''s emergency number is 112');
select is((select link from public.safety_contacts where country_code = 'RO' and kind = 'csam_hotline'), 'https://oradenet.ro/esc-abuz',
  'Romania''s child abuse reporting line is Ora de Net');
select is_empty($$ select 1 from public.safety_contacts where label ilike '%adult-focused%' $$,
  'no adult-only line is seeded (decided 23 Oct 2026, Q9a)');

/* ---------- 2. Everyone reads, nobody writes ---------- */

set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select isnt_empty($$ select id from public.safety_contacts where country_code = 'RO' $$,
  'allowed: safety_contacts_select_public: a visitor reads Romania''s contacts');
select throws_ok($$ update public.safety_contacts set phone_number = '000' where country_code = 'RO' $$, '42501', null,
  'denied: safety_contacts_select_public: a visitor can''t change a contact (reads only)');
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select isnt_empty($$ select id from public.safety_contacts where country_code = 'GB' $$,
  'allowed: safety_contacts_select_public: a member reads another country''s contacts');
select throws_ok($$ delete from public.safety_contacts $$, '42501', null,
  'denied: safety_contacts_select_public: a member can''t delete contacts (changes come by migration until S1-E10-13b)');

/* ---------- 3. Gaps ---------- */

set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select lives_ok($$ select public.note_safety_contact_gap('fr') $$, 'a visitor notes a gap for France');
select lives_ok($$ select public.note_safety_contact_gap('FR') $$, 'and again');
select throws_ok($$ select public.note_safety_contact_gap('France') $$, '23514', null,
  'anything but a two-letter code is refused');
select throws_ok($$ select id from public.safety_contact_gaps $$, '42501', null,
  'denied: safety_contact_gaps_select_moderation: a visitor has no read on the gaps at all');
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select is_empty($$ select id from public.safety_contact_gaps $$,
  'denied: safety_contact_gaps_select_moderation: a member reads no gaps');
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000010", "role": "authenticated"}';
select results_eq(
  $$ select country_code, times_seen from public.safety_contact_gaps where country_code = 'FR' $$,
  $$ values ('FR', 2) $$,
  'allowed: safety_contact_gaps_select_moderation: a moderator sees France was asked for twice');

select * from finish();

rollback;
