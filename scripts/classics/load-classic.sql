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
-- A second run also repairs (book-by-book check, 27 Nov 2026): a chapter already loaded whose text
-- or title differs from the pack gets the pack's version (live at once, kept in its versions), a
-- changed blurb or form is saved, and chapters past the work's new last one are removed. Each repair is in
-- the audit log; a run with nothing to repair changes nothing.
-- Followers are not told (tell_followers false), so the load sends no notifications.
-- pg_temp.repair_classic_chapter(saved, new_title, new_body, owner): gives a loaded classic chapter
-- the pack's text and title. A live chapter changes at once and keeps the earlier text among its
-- versions (chapter_revisions), the way admin_fix_classic_typo() does; a draft changes in place.
-- Called by pg_temp.load_classic() below; the caller writes the audit row for the whole work.
create or replace function pg_temp.repair_classic_chapter(saved public.chapters, new_title text,
  new_body text, owner_id uuid) returns void
language plpgsql as $repair$
begin
  -- Step 1: the draft always takes the new text.
  update public.chapters set draft_title = new_title, draft_body = new_body, word_count = public.count_words(new_body)
  where chapters.id = saved.id;
  -- Step 2: a live chapter shows it straight away, and its versions keep it.
  if saved.status = 'published' then
    update public.chapters set published_title = new_title, published_body = new_body,
      published_word_count = public.count_words(new_body)
    where chapters.id = saved.id;
    insert into public.chapter_revisions (chapter_id, user_id, created_by_user_id, reason, title, body)
    values (saved.id, saved.user_id, owner_id, 'edited', new_title, new_body);
  end if;
end;
$repair$;

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
  saved_chapter public.chapters;
  clean_chapter_title text;
  repaired integer := 0;
  removed integer := 0;
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
  -- The work's form: Plays exists from FORMS-1 (27 Nov 2026); a database without it yet files a
  -- play under Fiction, and the next run moves it.
  if not exists (select 1 from public.categories where categories.slug = work ->> 'category') then
    work := jsonb_set(work, '{category}', '"fiction"');
  end if;
  details := jsonb_build_object('title', clean_title, 'blurb', coalesce(work ->> 'blurb', ''),
    'language_code', work ->> 'language', 'rating', work ->> 'rating', 'content_note', '',
    'author_id', author_id, 'category_slug', work ->> 'category');
  if saved_story_id is not null and exists (select 1 from public.stories where stories.id = saved_story_id
       and (stories.blurb is distinct from details ->> 'blurb'
            or stories.category_id is distinct from public.classic_story_category(details))) then
    -- Step 3a: a story already loaded keeps its settings; only a rewritten blurb and a new form
    -- (a play moved to Plays) are saved. The blurb is also the page's description for search
    -- engines and link previews (CALM-9s).
    update public.stories set blurb = details ->> 'blurb', category_id = public.classic_story_category(details)
    where stories.id = saved_story_id;
    insert into public.audit_log (user_id, action, target_type, target_id, target_user_id, reason, after_values)
    values (owner_id, 'classics.work_saved', 'stories', saved_story_id::text, classics_id,
      'Blurb or form updated after the book-by-book check (27 Nov 2026)', public.classic_work_json(saved_story_id));
  end if;
  if saved_story_id is null then
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
  -- Step 3b: a work still protected in some countries (Orwell in the United States, Peter Pan in
  -- the United Kingdom; Robert, 27 Nov 2026) is hidden there through COUNTRY-1's column, which
  -- also keeps it out of sitemaps and marks its pages noindex (CALM-9s). This runs on every part,
  -- before Step 5 publishes anything, so the work is never shown in those countries, not even for
  -- a moment. A work without the field is left as it is.
  if work ? 'hidden_in_countries' and exists (select 1 from public.stories where stories.id = saved_story_id
       and stories.hidden_in_countries is distinct from
           array(select jsonb_array_elements_text(work -> 'hidden_in_countries'))) then
    update public.stories
    set hidden_in_countries = array(select jsonb_array_elements_text(work -> 'hidden_in_countries'))
    where stories.id = saved_story_id;
    insert into public.audit_log (user_id, action, target_type, target_id, target_user_id, reason, after_values)
    values (owner_id, 'classics.work_saved', 'stories', saved_story_id::text, classics_id,
      'Hidden where still under copyright (Robert, 27 Nov 2026)',
      jsonb_build_object('hidden_in_countries', work -> 'hidden_in_countries'));
  end if;
  -- Step 4: the chapters this part carries, each checked like a writer's chapter.
  for chapter in select * from jsonb_array_elements(work -> 'chapters') loop
    clean_body := public.check_chapter_text(chapter ->> 'body');
    clean_chapter_title := left(public.normalise_romanian_letters(btrim(chapter ->> 'title')), 120);
    select chapters.* into saved_chapter from public.chapters where chapters.story_id = saved_story_id
      and chapters.position = (chapter ->> 'position')::integer and chapters.deleted_at is null;
    if saved_chapter.id is not null then
      -- Step 4a: a chapter already loaded. Same text and title: nothing to do. Otherwise the pack's
      -- version replaces it, as Staff › Classics' typo fix does (admin_fix_classic_typo).
      continue when saved_chapter.draft_body = clean_body and saved_chapter.draft_title = clean_chapter_title
        and (saved_chapter.status <> 'published'
             or (saved_chapter.published_body = clean_body and saved_chapter.published_title = clean_chapter_title));
      perform pg_temp.repair_classic_chapter(saved_chapter, clean_chapter_title, clean_body, owner_id);
      repaired := repaired + 1;
      continue;
    end if;
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      draft_saved_at, word_count, tell_followers)
    values (saved_story_id, classics_id, public.chapter_code(), (chapter ->> 'position')::integer,
      clean_chapter_title, clean_body, now(),
      public.count_words(clean_body), false);
    added := added + 1;
  end loop;
  -- Step 4b: a work that now has fewer chapters (a title page or a contents list dropped) loses the
  -- chapters past its last one. Only the part that carries the last chapter does this.
  if exists (select 1 from jsonb_array_elements(work -> 'chapters') as carried
             where (carried ->> 'position')::integer = total) then
    update public.chapters set deleted_at = now()
    where chapters.story_id = saved_story_id and chapters.position > total and chapters.deleted_at is null;
    get diagnostics removed = row_count;
    update public.chapters set is_last = (chapters.position = total)
    where chapters.story_id = saved_story_id and chapters.deleted_at is null
      and chapters.status = 'published' and chapters.is_last <> (chapters.position = total);
  end if;
  if repaired > 0 or removed > 0 then
    insert into public.audit_log (user_id, action, target_type, target_id, target_user_id, reason, after_values)
    values (owner_id, 'classics.text_set', 'stories', saved_story_id::text, classics_id,
      'Text repaired after the book-by-book check (27 Nov 2026)',
      jsonb_build_object('chapters_repaired', repaired, 'chapters_removed', removed));
  end if;
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
  return format('%s: %s chapters added, %s published, %s repaired, %s removed',
    clean_title, added, published, repaired, removed);
end;
$loader$;
