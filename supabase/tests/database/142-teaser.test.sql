-- Database tests for the web teaser and link previews (story S1-E4-04).
-- What it proves:
-- - teaser_length is a public setting of 600 words (decided 23 Oct 2026);
-- - teaser_of() keeps whole paragraphs up to the limit, cuts a too-long first paragraph at the
--   limit with "…", returns a short chapter whole and skips empty blocks;
-- - a signed-out visitor gets only the teaser from get_chapter() on All ages and 13+ stories,
--   never the rest of the text, and nothing on 16+ and 18+ (they count as under 16, Q6); a
--   signed-in reader still gets the whole chapter;
-- - get_link_preview() gives the title, blurb, pen name, cover and chapter title for All ages and
--   13+, only the title and rating for 16+ and 18+, never the user ID or chapter text, and null
--   for an unknown, unpublished, draft or deleted address;
-- - visitors may call get_chapter() and get_link_preview() but not the text helpers.
begin;

create extension if not exists pgtap with schema extensions;

select plan(40);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;

-- A long chapter in three paragraphs (300, 250 and 100 words; the last uses its own word so the
-- tests can see whether it was sent), a short one and a draft, on adult_writer's "Stația meteo",
-- which is All ages; and one chapter on teen_17's 13+ story.
-- Visitors may not call word_total() itself, so the checks made as a visitor count words here.
create function pg_temp.words(any_text text) returns integer language sql as $$
  select coalesce(array_length(regexp_split_to_array(btrim(any_text), '\s+'), 1), 0);
$$;
create function pg_temp.long_body() returns text language sql as $$
  select repeat('unu ', 299) || 'unu' || E'\n\n' || repeat('doi ', 249) || 'doi' || E'\n\n'
      || repeat('ultimul ', 99) || 'ultimul';
$$;
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'teasera1', 1, 'Lung',
   'x', 650, 'published', 'Capitolul lung', pg_temp.long_body(), 650, now()),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'teaserb2', 2, 'Scurt',
   'x', 3, 'published', 'Scurt', 'Un capitol scurt.', 3, now()),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'teaserc3', 3, 'Ciornă',
   'Ciornă.', 1, 'draft', null, null, null, null),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002', 'teaserd4', 1, 'Scrisoare',
   'x', 3, 'published', 'Scrisoarea', 'Dragă bunico, salut.', 3, now());
update public.stories set first_published_at = now(), blurb = 'O stație meteo pe munte.'
where id in ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-9000-000000000003');

-- 1. The setting.
select is((select value #>> '{}' from public.settings where key = 'teaser_length'), '600',
  'the teaser is 600 words (decided 23 Oct 2026)');
select ok((select is_public from public.settings where key = 'teaser_length'), 'and the setting is public');

-- 2. teaser_of() on its own.
select is(public.word_total(public.teaser_of(pg_temp.long_body(), 600)), 550,
  'whole paragraphs up to 600 words: 300 + 250, not the third');
select ok(public.teaser_of(pg_temp.long_body(), 600) not like '%ultimul%', 'the paragraph that doesn''t fit is left out');
select ok(public.teaser_of(pg_temp.long_body(), 600) like '%unu' || E'\n\n' || 'doi%',
  'the paragraphs keep their blank line between them');
select is(public.teaser_of(repeat('lung ', 700), 600), repeat('lung ', 599) || 'lung…',
  'a first paragraph longer than the limit is cut at 600 words with "…"');
select is(public.teaser_of('Un capitol scurt.', 600), 'Un capitol scurt.', 'a short chapter comes back whole');
select is(public.teaser_of(E'Unu.\n\n\n\nDoi.', 600), E'Unu.\n\nDoi.', 'empty blocks are skipped');
select is(public.teaser_of(null, 600), '', 'an empty chapter gives an empty teaser');

-- 3. A signed-out visitor on an All ages story.
select pg_temp.sign_out();
select is(public.get_chapter('statia-meteo-seed01', 'teasera1') ->> 'is_teaser', 'true', 'a visitor gets the teaser');
select is(pg_temp.words(public.get_chapter('statia-meteo-seed01', 'teasera1') ->> 'body'), 550,
  'of at most 600 words, in whole paragraphs');
select ok((public.get_chapter('statia-meteo-seed01', 'teasera1') ->> 'body') not like '%ultimul%',
  'the rest of the text never reaches a signed-out browser');
select is(public.get_chapter('statia-meteo-seed01', 'teasera1') ->> 'text_continues', 'true',
  'and the answer says the chapter goes on');
select is(public.get_chapter('statia-meteo-seed01', 'teasera1') ->> 'minutes_to_read', '4',
  'the minutes to read are for the whole chapter (650 words)');
select is(public.get_chapter('statia-meteo-seed01', 'teaserb2') ->> 'text_continues', 'false',
  'a chapter shorter than the teaser doesn''t go on');

-- 4. A signed-out visitor on a 13+ story: the teaser too (13+ is open to visitors, Q6).
select is(public.get_chapter('scrisori-din-cutia-postala-seed03', 'teaserd4') ->> 'body', 'Dragă bunico, salut.',
  'a visitor gets the teaser of a 13+ story');

-- 5. A signed-in reader still reads the whole chapter.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_chapter('statia-meteo-seed01', 'teasera1') ->> 'body', pg_temp.long_body(),
  'a signed-in reader gets the whole chapter (Q35)');
select is(public.get_chapter('statia-meteo-seed01', 'teasera1') ->> 'is_teaser', 'false', 'not the teaser');

-- 6. Link previews for an All ages story.
select pg_temp.sign_out();
select is(public.get_link_preview('statia-meteo-seed01') ->> 'title', 'Stația meteo', 'the preview has the title');
select is(public.get_link_preview('statia-meteo-seed01') ->> 'blurb', 'O stație meteo pe munte.', 'the blurb');
select is(public.get_link_preview('statia-meteo-seed01') -> 'writer' ->> 'display_name', 'Lia Scrie', 'the pen name');
select isnt(public.get_link_preview('statia-meteo-seed01') -> 'cover', null, 'and the cover');
select is(public.get_link_preview('statia-meteo-seed01', 'teasera1') -> 'chapter' ->> 'title', 'Capitolul lung',
  'a chapter address adds the chapter title');
select ok(public.get_link_preview('statia-meteo-seed01', 'teasera1')::text not like '%00000000-0000-4000-8000-000000000001%'
  and public.get_link_preview('statia-meteo-seed01', 'teasera1')::text not like '%unu unu%',
  'never the user ID and never chapter text');

-- 7. What has no preview.
select is(public.get_link_preview('statia-meteo-seed01', 'teaserc3'), null, 'a draft chapter has none');
select is(public.get_link_preview('statia-meteo-seed01', 'nimicnim'), null, 'an unknown chapter has none');
select is(public.get_link_preview('nu-exista'), null, 'an unknown story has none');

-- 8. 16+ and 18+: the same details as any story, but never the text (Q6; S1-E11-36).
reset role;
update public.stories set rating = '16_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_out();
select is(public.get_chapter('statia-meteo-seed01', 'teasera1'), null, 'a visitor gets no teaser of a 16+ story');
select is(public.get_link_preview('statia-meteo-seed01', 'teasera1') ->> 'hides_text', 'true',
  'its preview says the text is hidden');
select ok(public.get_link_preview('statia-meteo-seed01', 'teasera1') ->> 'blurb' is not null
  and public.get_link_preview('statia-meteo-seed01', 'teasera1') -> 'writer' ->> 'display_name' is not null
  and public.get_link_preview('statia-meteo-seed01', 'teasera1') -> 'cover' <> 'null'::jsonb
  and public.get_link_preview('statia-meteo-seed01', 'teasera1') -> 'chapter' ->> 'title' is not null
  and public.get_link_preview('statia-meteo-seed01', 'teasera1') ->> 'category_slug' is not null
  and jsonb_typeof(public.get_link_preview('statia-meteo-seed01', 'teasera1') -> 'tags') = 'array',
  'with the blurb, pen name, cover, chapter title, category and tags, like any story (S1-E11-36)');
select ok(public.get_link_preview('statia-meteo-seed01', 'teasera1')::text not like '%unu unu%',
  'but still never chapter text');
reset role;
update public.stories set rating = '18_plus' where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.get_link_preview('statia-meteo-seed01') ->> 'hides_text', 'true',
  'an 18+ preview hides the text whoever asks: it is the public preview');

-- 9. Who the story is for: an unlisted story previews but isn't listed; a private or class-only
-- story has no preview at all (S1-E11-36).
reset role;
select is(public.get_link_preview('statia-meteo-seed01') ->> 'is_listed', 'true',
  'a public story is listed for search engines');
update public.stories set visibility = 'unlisted' where id = '00000000-0000-4000-9000-000000000001';
select is(public.get_link_preview('statia-meteo-seed01') ->> 'is_listed', 'false',
  'an unlisted story previews from its link but is not listed');
update public.stories set visibility = 'private' where id = '00000000-0000-4000-9000-000000000001';
select is(public.get_link_preview('statia-meteo-seed01'), null,
  'a private story has no preview: it is the writer''s alone');
update public.stories set visibility = 'public', class_only = true where id = '00000000-0000-4000-9000-000000000001';
select is(public.get_link_preview('statia-meteo-seed01'), null,
  'a story shared only with a class has no public preview');
update public.stories set class_only = false where id = '00000000-0000-4000-9000-000000000001';

-- 10. A deleted story, and who may call what.
reset role;
update public.stories set deleted_at = now() where id = '00000000-0000-4000-9000-000000000001';
select pg_temp.sign_out();
select is(public.get_link_preview('statia-meteo-seed01'), null, 'a deleted story has no preview');
reset role;
select ok(has_function_privilege('anon', 'public.get_link_preview(text, text)', 'execute')
  and has_function_privilege('anon', 'public.get_chapter(text, text)', 'execute'),
  'visitors may ask for a chapter and a preview');
select ok(not has_function_privilege('anon', 'public.teaser_of(text, integer)', 'execute')
  and not has_function_privilege('authenticated', 'public.word_total(text)', 'execute'),
  'but not call the text helpers themselves');
select ok(not has_function_privilege('anon', 'public.story_search_tags(uuid, text)', 'execute')
  and not has_function_privilege('authenticated', 'public.story_search_tags(uuid, text)', 'execute'),
  'nor the tags helper, which only the preview calls (S1-E11-36)');

select * from finish();
rollback;
