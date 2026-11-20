-- Database tests for cover styles and the title's font (bundle CALM-4; the simplified design,
-- Robert, 20 Nov 2026; the design handover's Step 2, Covers).
-- What it proves:
-- - every story has a style and a font, Label and Literata (reading) by default;
-- - the writer changes their own drawn cover to Big title or Initial and its font through
--   set_my_story_cover_look() (allowed);
-- - another member and a signed-out visitor can't (denied), and nobody can write the columns
--   directly;
-- - a style that doesn't fit the cover is refused: an automatic cover is always a Label, a drawn
--   one never Picture or Custom, an upload never Label;
-- - when a cover turns automatic (a failed picture check, a staff hide), its style falls back to
--   Label; an upload turns Custom unless the writer picked Picture;
-- - the functions that hand a cover to the app carry style and title_font;
-- - a language edition takes the first edition's style and font, and follows its changes.
-- Personas: adult_writer (…01, owner of seed stories …01 and …02), teacher (…07).
-- Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
-- The hint of the error a statement raises, or null when it doesn't raise.
create function pg_temp.error_hint(statement text) returns text language plpgsql as $$
declare
  found_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics found_hint = pg_exception_hint;
  return found_hint;
end;
$$;
-- The SQLSTATE of the error a statement raises, or null when it doesn't raise.
create function pg_temp.error_state(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end;
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- 1 to 2: the defaults.
select is((select cover_style::text from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  'label', 'an existing drawn cover is a Label');
select is((select cover_title_font::text from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  'reading', 'the title font is Literata (reading) by default');

-- 3 to 5: the writer changes their own drawn cover (allowed).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_my_story_cover_look('statia-meteo-seed01', 'big_title', 'display') ->> 'outcome',
  'saved', 'the writer saves Big title in Funnel Display');
select results_eq(
  $$select cover_style::text, cover_title_font::text from public.stories where id = '00000000-0000-4000-9000-000000000001'$$,
  $$values ('big_title', 'display')$$,
  'the story now has the Big title style and the display font');
select is(public.set_my_story_cover_look('statia-meteo-seed01', 'initial', 'hand') ->> 'outcome',
  'saved', 'the writer can switch to Initial in Playwrite Cuba');

-- 6 to 8: styles that don't fit are refused.
select is(pg_temp.error_hint($$select public.set_my_story_cover_look('statia-meteo-seed01', 'custom', 'reading')$$),
  'style_does_not_fit', 'a drawn cover can''t be Custom');
select is(pg_temp.error_hint($$select public.set_my_story_cover_look('the-girl-who-fixed-radios-seed02', 'big_title', 'reading')$$),
  'style_does_not_fit', 'an automatic cover is always a Label');
select is(public.set_my_story_cover_look('the-girl-who-fixed-radios-seed02', 'label', 'sans') ->> 'outcome',
  'saved', 'an automatic cover may still pick its title font');

-- 9 to 11: nobody else may change it, and nobody writes the columns directly (denied).
select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select is(public.set_my_story_cover_look('statia-meteo-seed01', 'label', 'reading') ->> 'outcome',
  'not_found', 'another member can''t change someone else''s cover');
select is(pg_temp.error_state($$update public.stories set cover_style = 'label' where id = '00000000-0000-4000-9000-000000000001'$$),
  '42501', 'a member can''t write cover_style directly');
select pg_temp.sign_out();
select is(pg_temp.error_state($$select public.set_my_story_cover_look('statia-meteo-seed01', 'label', 'reading')$$),
  '42501', 'a signed-out visitor can''t call it');
reset role;

-- 12: the style still says Initial after the denied attempts.
select is((select cover_style::text from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  'initial', 'the denied attempts changed nothing');

-- 13 to 14: the constraint holds for anything that writes the table.
select lives_ok($$update public.stories set cover_kind = 'drawn', cover_design = 'stripes', cover_background = 'plum', cover_accent = 'gold', cover_style = 'picture' where id = '00000000-0000-4000-9000-000000000002'$$,
  'the trigger turns a misfit style into the kind''s plain style rather than storing it');
select is((select cover_style::text from public.stories where id = '00000000-0000-4000-9000-000000000002'),
  'label', 'a drawn cover given Picture is stored as a Label');

-- 15: a cover that turns automatic falls back to Label.
update public.stories set cover_kind = 'automatic', cover_design = null, cover_background = null, cover_accent = null
where id = '00000000-0000-4000-9000-000000000001';
select is((select cover_style::text from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  'label', 'an automatic cover is always a Label');

-- 16: an upload turns Custom unless the writer picked Picture.
update public.stories set cover_kind = 'upload', cover_tall_path = '00000000-0000-4000-9000-000000000001/tall.webp'
where id = '00000000-0000-4000-9000-000000000001';
select is((select cover_style::text from public.stories where id = '00000000-0000-4000-9000-000000000001'),
  'custom', 'an upload is Custom by default');

-- 17: the writer picks Picture for the upload.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is(public.set_my_story_cover_look('statia-meteo-seed01', 'picture', 'reading') ->> 'outcome',
  'saved', 'an upload can be a Picture under the label');
reset role;

-- 18: the card the app draws carries the style and the font.
select is(public.story_card_json('00000000-0000-4000-9000-000000000002') -> 'cover' ->> 'style',
  'label', 'story_card_json() carries the cover style');
select is(public.story_card_json('00000000-0000-4000-9000-000000000002') -> 'cover' ->> 'title_font',
  'sans', 'story_card_json() carries the title font');

-- 20: an edition follows its first edition's style and font.
select is(
  (select count(*)::int from public.stories as editions
   join public.stories as firsts on firsts.id = editions.edition_of_story_id
   where (editions.cover_style, editions.cover_title_font) is distinct from (firsts.cover_style, firsts.cover_title_font)),
  0, 'every language edition has its first edition''s cover style and font');

select * from finish();
rollback;
