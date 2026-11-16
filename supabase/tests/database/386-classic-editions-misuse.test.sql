-- Break test for a classic in several languages (bundle TRANSLATE-1d; Robert, 16 Nov 2026):
-- what staff, members and visitors must not be able to do with a classic's editions.
-- What it proves:
-- - made-up translation rights are refused, and a member can't write the rights straight into
--   the table (denied);
-- - an edition can't be hung on a member's own story, moved to another classic on a later save,
--   or given the language of another edition by changing the first edition's language;
-- - a "public domain" translation whose translator died less than 70 years ago is not published
--   (Law 8/1996 art. 28(1));
-- - a member can't rename or remove a classic's edition with the writer's own functions;
-- - once the original is unpublished, a visitor can no longer read its translation.
-- Test data: the seed persona "teacher" stands in for the classics account (the setting is
-- pointed at it inside this transaction, which is rolled back).
begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'postgres', true);
$$;
create function pg_temp.visitor() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- A Romanian classic by an author who died in 1889.
create function pg_temp.classic(title text) returns jsonb language sql as $$
  select jsonb_build_object('title', title, 'author_id', public.admin_add_classic_author('Autor ' || title, 1889),
    'kind', 'novel', 'original_language', 'ro', 'language_code', 'ro', 'category_slug', 'fiction',
    'rating', 'all_ages', 'source_title', 'Ediția 1892', 'source_url', 'https://example.com/sursa');
$$;
-- An edition of a classic in a language.
create function pg_temp.edition(first_edition uuid, language text, extra jsonb) returns jsonb language sql as $$
  select jsonb_build_object('edition_of_story_id', first_edition, 'language_code', language,
    'title', 'Edition in ' || language, 'translator_name', 'Ana Vlad') || extra;
$$;
grant execute on all functions in schema pg_temp to authenticated, anon;

update public.settings set value = '"teacher"'::jsonb where key = 'classics_account_handle';
create temporary table saved (first_id uuid, second_id uuid, english_id uuid, swedish_id uuid, member_story uuid);
grant all on saved to authenticated, anon;
insert into saved (member_story)
  select id from public.stories
  where user_id = '00000000-0000-4000-8000-000000000001' and edition_of_story_id is null and deleted_at is null
  limit 1;

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
update saved set
  first_id = (public.admin_save_classic_work(pg_temp.classic('Prima operă')) ->> 'story_id')::uuid,
  second_id = (public.admin_save_classic_work(pg_temp.classic('A doua operă')) ->> 'story_id')::uuid;
select public.admin_set_classic_chapters((select first_id from saved), '[{"title": "I", "body": "A fost odată."}]'::jsonb);

/* ---------- 1. Made-up rights and forged links ---------- */

select throws_ok($$ select public.admin_save_classic_work(pg_temp.edition((select first_id from saved), 'en',
    '{"translation_rights": "free_for_everyone"}')) $$,
  '23514', null, 'made-up translation rights are refused');
select throws_ok($$ select public.admin_save_classic_work(pg_temp.edition((select member_story from saved), 'en', '{}')) $$,
  'P0002', 'That isn''t a classic.', 'an edition can''t be hung on a member''s own story');

update saved set
  english_id = (public.admin_save_classic_work(pg_temp.edition((select first_id from saved), 'en', '{}')) ->> 'story_id')::uuid,
  swedish_id = (public.admin_save_classic_work(pg_temp.edition((select first_id from saved), 'sv',
    '{"translation_rights": "public_domain", "translator_died_year": 1990}')) ->> 'story_id')::uuid;

-- A later save names another classic: the edition stays where it is.
select public.admin_save_classic_work(pg_temp.edition((select second_id from saved), 'en',
  '{"translation_rights": "signed_licence"}'), (select english_id from saved));
select pg_temp.sign_out();
select is((select edition_of_story_id from public.stories where id = (select english_id from saved)),
  (select first_id from saved), 'a later save can''t move an edition to another classic');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok($$ select public.admin_save_classic_work(pg_temp.classic('Prima operă') || '{"language_code": "en"}',
    (select first_id from saved)) $$,
  '23514', null, 'the first edition can''t take the language of one of its editions');

/* ---------- 2. A translator who died less than 70 years ago ---------- */

select public.admin_publish_classic((select first_id from saved));
select public.admin_set_classic_chapters((select swedish_id from saved), '[{"title": "I", "body": "Det var en gång."}]'::jsonb);
select throws_ok($$ select public.admin_publish_classic((select swedish_id from saved)) $$,
  '23514', null, 'a "public domain" translation by a translator who died in 1990 is not published');

/* ---------- 3. What a member can't do ---------- */

select public.admin_set_classic_chapters((select english_id from saved), '[{"title": "I", "body": "Once upon a time."}]'::jsonb);
select public.admin_publish_classic((select english_id from saved));
select pg_temp.sign_out();
create temporary table slugs as
  select (select slug from public.stories where id = (select english_id from saved)) as english_slug,
         (select code from public.chapters where story_id = (select english_id from saved) and deleted_at is null) as english_chapter;
grant select on slugs to authenticated, anon;

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ update public.classic_works set translation_rights = 'made_for_platform'
    where story_id = (select swedish_id from saved) $$,
  '42501', null, 'denied: a member can''t write the translation rights into the table');
select isnt(public.update_story_language((select english_slug from slugs), 'Mine now', '') ->> 'outcome', 'saved',
  'denied: a member can''t rename a classic''s edition');
select isnt(public.delete_my_story((select english_slug from slugs)) ->> 'outcome', 'deleted',
  'denied: nor remove it');
select pg_temp.sign_out();
select is((select title from public.stories where id = (select english_id from saved) and deleted_at is null),
  'Edition in en', 'the edition is still there, with its title');

/* ---------- 4. The translation follows its original off the site ---------- */

select pg_temp.visitor();
select is(public.get_chapter((select english_slug from slugs), (select english_chapter from slugs)) ->> 'number',
  '1', 'allowed: a visitor reads the published translation');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select public.admin_unpublish_classic((select first_id from saved), 'Break test: the original comes off the site.');
select pg_temp.visitor();
select is(public.get_chapter((select english_slug from slugs), (select english_chapter from slugs)) ->> 'number',
  null, 'denied: once the original is unpublished, its translation can''t be read either');

select * from finish();
rollback;
