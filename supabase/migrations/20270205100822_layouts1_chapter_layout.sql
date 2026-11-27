/*
 * LAYOUTS-1: a Layout per chapter, Prose, Play or Poem (Robert, 27 Nov 2026, 17:34 UTC: "Yes, as
 * drawn"; boards D14-EditorPlay and D15-EditorPoem: "Layout" with three choices at the top of the
 * paper).
 *
 * How it works:
 * - chapters.layout says how a chapter is written and drawn: 'prose' (the default), 'play' (acts,
 *   scenes, speeches and directions, LAYOUTS-2 and 3) or 'poem' (lines and stanzas, LAYOUTS-4).
 *   The words stay the chapter's Markdown subset (CLAUDE.md rule 8); the layout only says how
 *   they are read.
 * - The story's form sets the layout of a new chapter: Poetry starts a poem, Plays a play
 *   (chapters_start_layout). The writer changes it per chapter, so one story can mix them.
 * - It replaces the Poem switch of MUST-2. chapters.is_poem stays, kept in step by a trigger
 *   (chapters_keep_layout_in_step), so get_chapter(), the translations and the exports that read
 *   it keep working until each moves to the layout.
 * - set_chapter_layout(code, layout): the writer changes their own chapter.
 * - story_chapter_progress() answers each chapter's layout, for the chapter list ("Play · Draft").
 * Who calls it: src/features/writing/ (the Layout choice on the paper) and src/features/atlas/
 *   (the chapter list). Tests: supabase/tests/database/423-chapter-layouts.test.sql.
 */

/* ---------- 1. The data ---------- */

alter table public.chapters
  add column layout text not null default 'prose'
  constraint chapters_layout_known check (layout in ('prose', 'play', 'poem'));
comment on column public.chapters.layout is
  'How the chapter is written and drawn: prose, play or poem (LAYOUTS-1). A new chapter takes it from the story''s form; the writer changes it with set_chapter_layout(). is_poem follows it.';

-- Every poem so far keeps its shape.
update public.chapters set layout = 'poem' where is_poem;

/* ---------- 2. A new chapter's layout ---------- */

/**
 * chapters_start_layout: a new chapter takes its layout from the story's form: Poetry starts a
 * poem, Plays a play, anything else prose. A chapter made already marked as a poem (a translation
 * of a poem copies is_poem) stays a poem, and a layout given on purpose is kept.
 * Inputs: the new chapter row. Returns it. Raises nothing. Replaces chapters_start_as_poem (MUST-2).
 */
create function public.chapters_start_layout()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  form text;
begin
  -- Step 1: a chapter made as a poem (MUST-2's column) or with a layout given keeps it.
  if new.is_poem then
    new.layout := 'poem';
  elsif new.layout = 'prose' then
    -- Step 2: otherwise the story's form decides (the fixed keys of S1-E3-01 and FORMS-1).
    select categories.slug into form
    from public.stories
    join public.categories on categories.id = stories.category_id
    where stories.id = new.story_id;
    new.layout := case form when 'poetry' then 'poem' when 'plays' then 'play' else 'prose' end;
  end if;
  -- Step 3: the old column follows.
  new.is_poem := new.layout = 'poem';
  return new;
end;
$$;
comment on function public.chapters_start_layout() is
  'Trigger: a new chapter''s layout comes from the story''s form, Poetry a poem and Plays a play (LAYOUTS-1).';
revoke all on function public.chapters_start_layout() from public, anon, authenticated;

drop trigger chapters_start_as_poem on public.chapters;
drop function public.chapters_start_as_poem();
create trigger chapters_start_layout
  before insert on public.chapters
  for each row execute function public.chapters_start_layout();

/**
 * chapters_keep_layout_in_step: keeps is_poem and layout saying the same thing. A layout change
 * sets is_poem; a change of is_poem alone (MUST-2's set_chapter_poem_mode()) sets the layout.
 * Inputs: the old and new rows. Returns the new row. Raises nothing.
 */
create function public.chapters_keep_layout_in_step()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.layout is distinct from old.layout then
    new.is_poem := new.layout = 'poem';
  elsif new.is_poem is distinct from old.is_poem then
    new.layout := case when new.is_poem then 'poem' else 'prose' end;
  end if;
  return new;
end;
$$;
comment on function public.chapters_keep_layout_in_step() is
  'Trigger: is_poem follows the layout, and the layout follows a change of is_poem alone (LAYOUTS-1).';
revoke all on function public.chapters_keep_layout_in_step() from public, anon, authenticated;

create trigger chapters_keep_layout_in_step
  before update of layout, is_poem on public.chapters
  for each row execute function public.chapters_keep_layout_in_step();

/* ---------- 3. Changing it ---------- */

/**
 * set_chapter_layout: the writer changes their own chapter's layout. The words aren't touched,
 * only how they are written and drawn.
 * Inputs: chapter_code (the chapter's 8-character code); chapter_layout ('prose', 'play' or 'poem').
 * Returns: 'ok', 'not_found' when the caller has no live chapter with that code (someone else's
 *   included, so nothing is given away), or 'unknown_layout'.
 * Errors: insufficient_privilege when signed out.
 * Flow: the Layout choice on the editor's paper (src/features/writing/hooks/useChapterLayout.ts).
 */
create function public.set_chapter_layout(chapter_code text, chapter_layout text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  -- Step 1: a signed-in writer, and one of the three layouts.
  if caller_id is null then
    raise exception 'Sign in to change a chapter.' using errcode = 'insufficient_privilege';
  end if;
  if chapter_layout is null or chapter_layout not in ('prose', 'play', 'poem') then
    return 'unknown_layout';
  end if;
  -- Step 2: only their own live chapter.
  update public.chapters set layout = chapter_layout, updated_at = now()
  where chapters.code = chapter_code
    and chapters.user_id = caller_id
    and chapters.deleted_at is null;
  if not found then
    return 'not_found';
  end if;
  return 'ok';
end;
$$;
comment on function public.set_chapter_layout(text, text) is
  'Changes the caller''s own chapter''s layout: prose, play or poem (LAYOUTS-1).';
revoke all on function public.set_chapter_layout(text, text) from public, anon;
grant execute on function public.set_chapter_layout(text, text) to authenticated;

/* ---------- 4. The chapter list ---------- */

-- story_chapter_progress(): unchanged except for 'layout', which the list shows ("Play · Draft").
CREATE OR REPLACE FUNCTION public.story_chapter_progress(story_slug text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
declare
  target_story_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to see your chapters.' using errcode = 'insufficient_privilege';
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- The writer's own titles and word counts (the draft), never readers' numbers.
  return jsonb_build_object('outcome', 'ok', 'chapters', coalesce((
    select jsonb_agg(jsonb_build_object(
        'code', chapters.code, 'position', chapters.position, 'title', chapters.draft_title,
        'status', chapters.status, 'kind', coalesce(plans.kind, 'chapter'),
        'layout', chapters.layout,
        'word_count', chapters.word_count, 'word_target', plans.word_target)
      order by chapters.position)
    from public.chapters
    left join public.chapter_plans as plans on plans.chapter_id = chapters.id
    where chapters.story_id = target_story_id and chapters.deleted_at is null), '[]'::jsonb));
end;
$$;
