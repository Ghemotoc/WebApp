-- load-classic.sql: defines pg_temp.load_classic(work), used by the bulk load of public-domain
-- classics (scripts/classics/build-load-sql.py writes it at the top of every SQL part).
-- Who calls it: the "Load classics" GitHub workflow (.github/workflows/load-classics.yml), or a person
-- pasting a part into the Supabase SQL Editor. What it calls next: the classics helpers built in
-- S1-E11-16 (classic_upsert_story, classic_story_category, check_chapter_text, chapter_publish_now).
--
-- pg_temp.load_classic(work): adds one public-domain work, or more of its chapters, as a classic.
-- Runs as the database owner (the SQL Editor), so it can't use the staff functions, which need a
-- signed-in staff session (require_classics_staff()). It does the same steps they do:
--   admin_save_classic_work -> author, story (classic_upsert_story), classic_works row, audit log;
--   admin_set_classic_chapters -> draft chapters, checked by check_chapter_text(), audit log;
--   admin_publish_classic -> every chapter live through chapter_publish_now(), audit log.
-- Every audit row names the owner account as the person, so Staff › Audit log shows the load.
-- Safe to run twice: a work is found again by its title and author, and a chapter by its number.
-- Followers are not told (tell_followers false), so the load sends no notifications.
create or replace function pg_temp.load_classic(work jsonb) returns text
language plpgsql as $loader$
declare
  owner_id uuid;
  classics_id uuid := public.classics_account_id();
  author_id uuid;
  saved_story_id uuid;
  clean_title text := public.normalise_romanian_letters(btrim(work ->> 'title'));
  chapter jsonb;
  clean_body text;
  added integer := 0;
  total integer := (work ->> 'chapter_total')::integer;
  details jsonb;
  live_chapter public.chapters;
  published integer := 0;
begin
  -- Step 1: the owner account stands in as the staff member who adds the work.
  select staff_roles.user_id into owner_id from public.staff_roles
  where staff_roles.role = 'owner' order by staff_roles.created_at limit 1;
  if owner_id is null then
    raise exception 'No owner account was found in staff_roles; give your account the owner role first.';
  end if;
  -- Step 2: the author (one row per name).
  insert into public.classic_authors (name, died_year) values (work ->> 'author', (work ->> 'author_died')::integer)
  on conflict (name) do nothing;
  select classic_authors.id into author_id from public.classic_authors where classic_authors.name = work ->> 'author';
  -- Step 3: the story, found again by title and author when an earlier part already made it.
  select stories.id into saved_story_id from public.stories
  join public.classic_works on classic_works.story_id = stories.id
  where stories.classic_author_id = author_id and stories.title = clean_title
    and stories.deleted_at is null and stories.edition_of_story_id is null;
  if saved_story_id is null then
    details := jsonb_build_object('title', clean_title, 'blurb', coalesce(work ->> 'blurb', ''),
      'language_code', work ->> 'language', 'rating', work ->> 'rating', 'content_note', '',
      'author_id', author_id, 'category_slug', work ->> 'category');
    saved_story_id := public.classic_upsert_story(null, details, public.classic_story_category(details));
    -- A translation names its translator and why it may be shown (TRANSLATE-1);
    -- a work in its own language leaves the three translation fields empty.
    insert into public.classic_works (story_id, kind, original_language, source_title, source_url,
      first_published_year, added_by_user_id, details_checked,
      translator_name, translator_died_year, translation_rights)
    values (saved_story_id, (work ->> 'kind')::public.classic_kind,
      coalesce(work ->> 'original_language', work ->> 'language'),
      work ->> 'source_title', work ->> 'source_url', (work ->> 'first_published')::integer, owner_id, true,
      work ->> 'translator_name', (work ->> 'translator_died_year')::integer, work ->> 'translation_rights');
    insert into public.audit_log (user_id, action, target_type, target_id, target_user_id, reason, after_values)
    values (owner_id, 'classics.work_saved', 'stories', saved_story_id::text, classics_id,
      'Bulk load of public-domain classics (Robert, 26 Nov 2026)', public.classic_work_json(saved_story_id));
  end if;
  -- Step 4: the chapters this part carries, each checked like a writer's chapter.
  for chapter in select * from jsonb_array_elements(work -> 'chapters') loop
    continue when exists (select 1 from public.chapters where chapters.story_id = saved_story_id
      and chapters.position = (chapter ->> 'position')::integer and chapters.deleted_at is null);
    clean_body := public.check_chapter_text(chapter ->> 'body');
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      draft_saved_at, word_count, tell_followers)
    values (saved_story_id, classics_id, public.chapter_code(), (chapter ->> 'position')::integer,
      left(public.normalise_romanian_letters(btrim(chapter ->> 'title')), 120), clean_body, now(),
      public.count_words(clean_body), false);
    added := added + 1;
  end loop;
  if added > 0 then
    insert into public.audit_log (user_id, action, target_type, target_id, target_user_id, after_values)
    values (owner_id, 'classics.text_set', 'stories', saved_story_id::text, classics_id,
      jsonb_build_object('chapters_added', added));
  end if;
  -- Step 5: once every chapter is in, the last is marked and all go live in order.
  if (select count(*) from public.chapters where chapters.story_id = saved_story_id and chapters.deleted_at is null) = total
     and exists (select 1 from public.chapters where chapters.story_id = saved_story_id
                 and chapters.deleted_at is null and chapters.status <> 'published') then
    update public.chapters set is_last = (chapters.position = total)
    where chapters.story_id = saved_story_id and chapters.deleted_at is null and chapters.is_last <> (chapters.position = total);
    for live_chapter in select * from public.chapters
      where chapters.story_id = saved_story_id and chapters.deleted_at is null and chapters.status <> 'published'
      order by chapters.position
    loop
      perform public.chapter_publish_now(live_chapter);
      published := published + 1;
    end loop;
    insert into public.audit_log (user_id, action, target_type, target_id, target_user_id)
    values (owner_id, 'classics.published', 'stories', saved_story_id::text, classics_id);
  end if;
  return format('%s: %s chapters added, %s published', clean_title, added, published);
end;
$loader$;
