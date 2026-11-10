-- Database tests for sharing a passage or a picture from a chapter (story S1-E4-11).
-- What it proves:
-- - chapter_blocks() cuts a body into numbered blocks between blank lines, empty ones left out;
-- (The "cover" part of share_options() is tested in 329-quote-card-backgrounds.test.sql, GAPS-7.)
-- - share_options() says what a reader may share: passages and pictures for a signed-in reader
--   while the writer's switches are on, nothing for a signed-out visitor, nothing for 16+ or 18+;
-- - get_shared_passage() gives anyone the passage a link points to: text while the passage
--   switch is on (at most 400 characters a block), a picture's alt text only while the picture
--   switch is on and its check has passed, never a music or video card, never a wrong range,
--   never anything from a 16+ or 18+ story;
-- - quote cards stop for 16+ and 18+ stories (criterion 4);
-- - update_my_story() saves the picture switch and keeps it when it is left out;
-- - the internal helpers can't be called by visitors or members.
-- Test data: a chapter on adult_writer's seed story statia-meteo-seed01 (All ages) with two
-- pictures, read by teacher; rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
-- The SQLSTATE a statement raises, or null.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end;
$$;
-- The passage for one range of the test chapter, as the caller sees it.
create function pg_temp.passage(first_block integer, last_block integer) returns jsonb language sql as $$
  select public.get_shared_passage('statia-meteo-seed01', 'pass0001', first_block, last_block);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The chapter: text, a passed picture, a picture still being checked, a music card and a long
-- paragraph, in that order.
insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('18800000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000001',
   '00000000-0000-4000-8000-000000000001', 'pass0001', 1, 'Unu', 'x', 3, 'published', 'Unu',
   E'Ploua peste oraș.\n\n![Un far în ceață](picture:18800000-0000-4000-8000-0000000000a1)\n\n'
   || E'![Încă la verificat](picture:18800000-0000-4000-8000-0000000000a2)\n  \n'
   || E'![Cântec](embed:spotify:track:4uLU6hMCjMI75M1A2tKUQC)\n\n\n'
   || repeat('lung ', 120),
   3, now() - interval '2 days');
-- A link preview needs a story published at least once.
update public.stories set first_published_at = now() - interval '2 days' where slug = 'statia-meteo-seed01';
insert into public.picture_checks (id, user_id, bucket, path, kind, story_id, chapter_id, status, rights_confirmed_at)
values
  ('18800000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'chapter-images',
   '18800000-0000-4000-8000-000000000001/a1.webp', 'chapter_picture', '00000000-0000-4000-9000-000000000001',
   '18800000-0000-4000-8000-000000000001', 'passed', now()),
  ('18800000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001', 'chapter-images',
   '18800000-0000-4000-8000-000000000001/a2.webp', 'chapter_picture', '00000000-0000-4000-9000-000000000001',
   '18800000-0000-4000-8000-000000000001', 'pending', now());

/* ---------- 1. Blocks ---------- */

select is((select count(*)::integer from public.chapter_blocks(
    (select published_body from public.chapters where code = 'pass0001'))), 5,
  'the chapter has five blocks: blank lines with spaces count as blank, and extra ones add nothing');
select is((select block_text from public.chapter_blocks(E'\n\nUnu\n\n\nDoi\n') where block_number = 2), 'Doi',
  'blocks are counted from 1 and trimmed of line breaks');

/* ---------- 2. What a reader may share ---------- */

select pg_temp.sign_out();
select is(public.share_options('statia-meteo-seed01', 'pass0001') - 'cover',
  '{"passages": false, "pictures": false, "card_colour": null}'::jsonb,
  'a signed-out visitor may share nothing but the address');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.share_options('statia-meteo-seed01', 'pass0001') - 'cover',
  '{"passages": true, "pictures": true, "card_colour": null}'::jsonb,
  'a signed-in reader may share passages and pictures while both switches are on');
select is(public.share_options('statia-meteo-seed01', 'nosuch01') - 'cover',
  '{"passages": false, "pictures": false, "card_colour": null}'::jsonb,
  'a chapter that doesn''t exist offers nothing');

/* ---------- 3. The shared passage, as a link preview asks for it ---------- */

select pg_temp.sign_out();
select is(pg_temp.passage(1, 1), '{"blocks": [{"kind": "text", "markdown": "Ploua peste oraș."}]}'::jsonb,
  'anyone gets a text block of an All ages story');
select is(pg_temp.passage(2, 2), '{"blocks": [{"kind": "picture", "alt": "Un far în ceață"}]}'::jsonb,
  'a passed picture comes as its alt text');
select is(pg_temp.passage(3, 3), null, 'a picture still being checked is never shared');
select is(pg_temp.passage(4, 4), null, 'a music or video card is never shared');
select is(jsonb_array_length(pg_temp.passage(1, 4) -> 'blocks'), 2,
  'a range keeps only the blocks that may be shared');
select is(length(pg_temp.passage(5, 5) -> 'blocks' -> 0 ->> 'markdown'), 400,
  'a long block is cut to 400 characters');
select is(pg_temp.passage(1, 6), null, 'more than five blocks is refused');
select is(pg_temp.passage(0, 1), null, 'a range starting before block 1 is refused');
select is(pg_temp.passage(3, 2), null, 'a range ending before it starts is refused');
select is(public.get_shared_passage('statia-meteo-seed01', 'nosuch01', 1, 1), null,
  'a chapter that doesn''t exist gives nothing');

/* ---------- 4. The writer's switches ---------- */

select pg_temp.as_postgres();
update public.stories set picture_sharing_enabled = false where slug = 'statia-meteo-seed01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.share_options('statia-meteo-seed01', 'pass0001') ->> 'pictures', 'false',
  'with the picture switch off, pictures may not be shared');
select pg_temp.sign_out();
select is(pg_temp.passage(2, 2), null, 'and the picture isn''t in a shared passage');
select is(pg_temp.passage(1, 1) -> 'blocks' -> 0 ->> 'kind', 'text', 'while text still is');

select pg_temp.as_postgres();
update public.stories set picture_sharing_enabled = true, quote_cards_enabled = false
where slug = 'statia-meteo-seed01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.share_options('statia-meteo-seed01', 'pass0001') - 'cover',
  '{"passages": false, "pictures": true, "card_colour": null}'::jsonb,
  'with the passage switch off, only pictures may be shared');
select pg_temp.sign_out();
select is(pg_temp.passage(1, 1), null, 'and text isn''t in a shared passage');

/* ---------- 5. 16+ and 18+ share only a plain link (criterion 4) ---------- */

select pg_temp.as_postgres();
update public.stories set quote_cards_enabled = true, rating = '16_plus' where slug = 'statia-meteo-seed01';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.share_options('statia-meteo-seed01', 'pass0001') - 'cover',
  '{"passages": false, "pictures": false, "card_colour": null}'::jsonb,
  'an adult reading a 16+ story may share nothing but the link');
select is(public.quote_card_state('statia-meteo-seed01', 'pass0001') ->> 'allowed', 'false',
  'and no quote card is offered for it');
select pg_temp.sign_out();
select is(pg_temp.passage(1, 1), null, 'a 16+ story''s passage never reaches a link preview');
select pg_temp.as_postgres();
update public.stories set rating = 'all_ages' where slug = 'statia-meteo-seed01';

/* ---------- 6. The picture switch in the story's settings ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.update_my_story('statia-meteo-seed01', '{"picture_sharing_enabled": false}') ->> 'outcome', 'ok',
  'the writer turns picture sharing off');
select is(public.update_my_story('statia-meteo-seed01', '{"title": "Stația meteo"}') ->> 'outcome', 'ok',
  'and later changes only the title');
select is((select picture_sharing_enabled from public.stories where slug = 'statia-meteo-seed01'), false,
  'the switch stays off when a change leaves it out');

/* ---------- 7. Internal helpers ---------- */

select pg_temp.sign_out();
select is(pg_temp.refusal($$ select * from public.chapter_blocks('a') $$), '42501',
  'a visitor can''t call the internal block cutter');

select * from finish();
rollback;
