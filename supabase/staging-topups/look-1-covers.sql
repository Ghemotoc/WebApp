-- Staging top-up: the demo stories' drawn covers (bundle LOOK-1; Robert, 6 Nov 2026, D3). GENERATED FILE.
--
-- Made by `npm run demo:build` from content/demo-stories and content/classics/texts; edit those
-- files, not this one. What it does: sets each of the 32 drawn covers to what its file says,
-- so the demo stories that had a flat colour get a patterned design. Needs part 2a. Adds no
-- accounts and touches no story with an automatic cover.
-- Rules (supabase/staging-topups/README.md): safe to run twice; never production (step 1).
-- How to check it worked: the last query shows flat_drawn_covers 0.
begin;

-- 1. Never production: the 16 seed personas exist only on local and staging databases.
do $$
begin
  if (select count(*) from auth.users where email like '%@personas.test') < 16 then
    raise exception 'This top-up is for local and staging databases only: the 16 seed personas are missing.';
  end if;
end;
$$;

update public.stories
set cover_kind = 'drawn', cover_design = 'sparkles', cover_background = 'gold', cover_accent = 'plum'
where stories.id = '00000000-0000-4000-9100-000100000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'sparkles', 'gold', 'plum');
update public.stories
set cover_kind = 'drawn', cover_design = 'starry', cover_background = 'ink', cover_accent = 'gold'
where stories.id = '00000000-0000-4000-9100-000400000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'starry', 'ink', 'gold');
update public.stories
set cover_kind = 'drawn', cover_design = 'dots', cover_background = 'lilac', cover_accent = 'gold'
where stories.id = '00000000-0000-4000-9100-000600000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'dots', 'lilac', 'gold');
update public.stories
set cover_kind = 'drawn', cover_design = 'sparkles', cover_background = 'gold', cover_accent = 'plum'
where stories.id = '00000000-0000-4000-9100-000700000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'sparkles', 'gold', 'plum');
update public.stories
set cover_kind = 'drawn', cover_design = 'grid', cover_background = 'sage', cover_accent = 'violet'
where stories.id = '00000000-0000-4000-9100-000900000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'grid', 'sage', 'violet');
update public.stories
set cover_kind = 'drawn', cover_design = 'starry', cover_background = 'ink', cover_accent = 'gold'
where stories.id = '00000000-0000-4000-9100-001000000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'starry', 'ink', 'gold');
update public.stories
set cover_kind = 'drawn', cover_design = 'dots', cover_background = 'sky', cover_accent = 'plum'
where stories.id = '00000000-0000-4000-9100-001200000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'dots', 'sky', 'plum');
update public.stories
set cover_kind = 'drawn', cover_design = 'stripes', cover_background = 'gold', cover_accent = 'sage'
where stories.id = '00000000-0000-4000-9100-001400000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'stripes', 'gold', 'sage');
update public.stories
set cover_kind = 'drawn', cover_design = 'twotone', cover_background = 'plum', cover_accent = 'paper'
where stories.id = '00000000-0000-4000-9100-001700000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'twotone', 'plum', 'paper');
update public.stories
set cover_kind = 'drawn', cover_design = 'waves', cover_background = 'ink', cover_accent = 'sky'
where stories.id = '00000000-0000-4000-9100-001900000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'waves', 'ink', 'sky');
update public.stories
set cover_kind = 'drawn', cover_design = 'starry', cover_background = 'plum', cover_accent = 'gold'
where stories.id = '00000000-0000-4000-9100-002100000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'starry', 'plum', 'gold');
update public.stories
set cover_kind = 'drawn', cover_design = 'dots', cover_background = 'blush', cover_accent = 'plum'
where stories.id = '00000000-0000-4000-9100-002300000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'dots', 'blush', 'plum');
update public.stories
set cover_kind = 'drawn', cover_design = 'grid', cover_background = 'sky', cover_accent = 'ink'
where stories.id = '00000000-0000-4000-9100-002500000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'grid', 'sky', 'ink');
update public.stories
set cover_kind = 'drawn', cover_design = 'sparkles', cover_background = 'paper', cover_accent = 'sage'
where stories.id = '00000000-0000-4000-9100-002600000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'sparkles', 'paper', 'sage');
update public.stories
set cover_kind = 'drawn', cover_design = 'twotone', cover_background = 'plum', cover_accent = 'gold'
where stories.id = '00000000-0000-4000-9100-002800000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'twotone', 'plum', 'gold');
update public.stories
set cover_kind = 'drawn', cover_design = 'starry', cover_background = 'ink', cover_accent = 'sky'
where stories.id = '00000000-0000-4000-9100-003000000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'starry', 'ink', 'sky');
update public.stories
set cover_kind = 'drawn', cover_design = 'grid', cover_background = 'paper', cover_accent = 'plum'
where stories.id = '00000000-0000-4000-9100-003300000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'grid', 'paper', 'plum');
update public.stories
set cover_kind = 'drawn', cover_design = 'stripes', cover_background = 'ink', cover_accent = 'gold'
where stories.id = '00000000-0000-4000-9100-003600000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'stripes', 'ink', 'gold');
update public.stories
set cover_kind = 'drawn', cover_design = 'sparkles', cover_background = 'sage', cover_accent = 'plum'
where stories.id = '00000000-0000-4000-9300-000100000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'sparkles', 'sage', 'plum');
update public.stories
set cover_kind = 'drawn', cover_design = 'dots', cover_background = 'gold', cover_accent = 'ink'
where stories.id = '00000000-0000-4000-9300-000200000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'dots', 'gold', 'ink');
update public.stories
set cover_kind = 'drawn', cover_design = 'waves', cover_background = 'blush', cover_accent = 'plum'
where stories.id = '00000000-0000-4000-9300-000400000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'waves', 'blush', 'plum');
update public.stories
set cover_kind = 'drawn', cover_design = 'starry', cover_background = 'ink', cover_accent = 'gold'
where stories.id = '00000000-0000-4000-9300-000600000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'starry', 'ink', 'gold');
update public.stories
set cover_kind = 'drawn', cover_design = 'dots', cover_background = 'sky', cover_accent = 'plum'
where stories.id = '00000000-0000-4000-9300-000700000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'dots', 'sky', 'plum');
update public.stories
set cover_kind = 'drawn', cover_design = 'waves', cover_background = 'sky', cover_accent = 'ink'
where stories.id = '00000000-0000-4000-9300-000900000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'waves', 'sky', 'ink');
update public.stories
set cover_kind = 'drawn', cover_design = 'grid', cover_background = 'lilac', cover_accent = 'plum'
where stories.id = '00000000-0000-4000-9300-001100000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'grid', 'lilac', 'plum');
update public.stories
set cover_kind = 'drawn', cover_design = 'stripes', cover_background = 'sky', cover_accent = 'paper'
where stories.id = '00000000-0000-4000-9300-001200000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'stripes', 'sky', 'paper');
update public.stories
set cover_kind = 'drawn', cover_design = 'sparkles', cover_background = 'gold', cover_accent = 'sage'
where stories.id = '00000000-0000-4000-9300-001400000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'sparkles', 'gold', 'sage');
update public.stories
set cover_kind = 'drawn', cover_design = 'starry', cover_background = 'plum', cover_accent = 'gold'
where stories.id = '00000000-0000-4000-9300-001500000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'starry', 'plum', 'gold');
update public.stories
set cover_kind = 'drawn', cover_design = 'starry', cover_background = 'ink', cover_accent = 'lilac'
where stories.id = '00000000-0000-4000-9300-001600000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'starry', 'ink', 'lilac');
update public.stories
set cover_kind = 'drawn', cover_design = 'stripes', cover_background = 'gold', cover_accent = 'paper'
where stories.id = '00000000-0000-4000-9300-001800000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'stripes', 'gold', 'paper');
update public.stories
set cover_kind = 'drawn', cover_design = 'waves', cover_background = 'ink', cover_accent = 'sky'
where stories.id = '00000000-0000-4000-9300-001900000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'waves', 'ink', 'sky');
update public.stories
set cover_kind = 'drawn', cover_design = 'dots', cover_background = 'plum', cover_accent = 'gold'
where stories.id = '00000000-0000-4000-9300-002000000000'::uuid
  and (cover_kind, cover_design, cover_background, cover_accent)
    is distinct from ('drawn', 'dots', 'plum', 'gold');
commit;

select json_build_object(
  'flat_drawn_covers', (select count(*) from public.stories
    where cover_kind = 'drawn' and cover_design in ('plum', 'ink', 'violet', 'gold', 'lilac', 'blush', 'sky', 'sage', 'paper')
      and user_id in (select id from auth.users where email like '%@personas.test'))
)::text as after_look_1_covers;
