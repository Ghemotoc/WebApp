/*
 * Migration: comment lengths and the kind-words nudge (bundle ADMIN-2, part d3; Robert, 2 Nov
 * 2026, 22:09 to 22:11).
 *
 * - A comment on one paragraph (S1-E6-06), and every reply in its thread, is at most 500
 *   characters (setting paragraph_comment_max_characters); a comment on the whole chapter, and
 *   its replies, at most 3,000 (comment_max_characters, was 2,000).
 * - The gentle nudge: before a comment is sent, the reader's own browser checks it against a
 *   short list of hurtful words and phrases in Romanian and English, and if one is there asks
 *   "We're a supportive place. Still want to send this?" with Edit and Send anyway. Nothing is
 *   blocked, stored, logged or reported, and the server never sees whether the nudge showed, so
 *   CLAUDE.md rule 19 (no automated text moderation) holds. This migration only keeps the list
 *   (comment_nudge_words), which anyone signed in may read and only the owner and admins edit
 *   from Settings, logged like the username word lists (S1-E11-03).
 * Who calls it: post_comment() and post_paragraph_comment() (the lengths, through
 * check_comment_text() and a trigger), src/features/comments/ (the list) and
 * src/features/settings/ (editing the list). Tests: supabase/tests/database/246-comment-lengths-and-nudge.test.sql.
 */
/* ---------- The lengths ---------- */

-- A comment on the whole chapter (and its replies) may now be up to 3,000 characters (Robert,
-- 2 Nov 2026, 22:11; was 2,000). check_comment_text() reads this setting, so nothing else changes.
update public.settings
set value = '3000'::jsonb,
    description = 'The longest comment on a whole chapter, in characters (Robert, 2 Nov 2026: 3,000; S1-E6-01).'
where key = 'comment_max_characters';

-- A comment on one paragraph, and every reply in its thread, is shorter (Robert, 2 Nov 2026,
-- 22:09). Public, so the composer's counter shows the same number the database applies.
insert into public.settings (key, value, is_public, description) values
  ('paragraph_comment_max_characters', '500'::jsonb, true,
   'The longest comment on one paragraph, replies in its thread included, in characters (Robert, 2 Nov 2026; S1-E6-06).');

-- The table's own check is only a safety ceiling well above both settings, so staff raising a
-- setting on Staff › Settings never meets a hidden wall; the settings are the real limits.
alter table public.comments drop constraint comments_body_is_written;
alter table public.comments add constraint comments_body_is_written check (
  (btrim(body) <> '' or deleted_at is not null) and char_length(body) <= 10000);

/**
 * refuse_long_paragraph_comment: a comment on one paragraph is at most
 *   paragraph_comment_max_characters (500) long.
 * Trigger: before insert or update of body on comments. It is named so it runs after
 *   comments_take_parent_paragraph (triggers run in name order), so a reply already carries its
 *   comment's paragraph and counts as a paragraph comment too.
 * Errors: check_violation with the hint "paragraph_too_long:<limit>", so the screen can say the
 *   number.
 */
create function public.refuse_long_paragraph_comment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  longest integer := coalesce((public.setting_value('paragraph_comment_max_characters'))::integer, 500);
begin
  -- Only comments on a paragraph have this limit; the whole chapter's stay at comment_max_characters.
  if new.paragraph_key is not null and char_length(new.body) > longest then
    raise exception 'A comment on a paragraph can have at most % characters.', longest
      using errcode = 'check_violation', hint = 'paragraph_too_long:' || longest;
  end if;
  return new;
end;
$$;
comment on function public.refuse_long_paragraph_comment() is
  'Trigger: refuses a paragraph comment or reply over paragraph_comment_max_characters (Robert, 2 Nov 2026; S1-E6-06).';

create trigger comments_too_long_for_a_paragraph
  before insert or update of body on public.comments
  for each row execute function public.refuse_long_paragraph_comment();

/* ---------- The kind-words nudge list ---------- */

create table public.comment_nudge_words (
  id uuid primary key default gen_random_uuid(),
  language text not null,
  -- A word or a short phrase; the browser matches it as whole words, ignoring case and accents.
  phrase text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_nudge_words_language_is_known check (language in ('en', 'ro')),
  constraint comment_nudge_words_phrase_is_short check (
    btrim(phrase) <> '' and char_length(phrase) <= 60)
);

comment on table public.comment_nudge_words is
  'kind: platform
Hurtful words and phrases, per language, that make the comment box ask "Still want to send this?" in the reader''s own browser before sending (Robert, 2 Nov 2026). A nudge only: nothing is blocked, stored, logged or reported, so rule 19 holds. Owner and admin edit it on Staff › Settings.';

create unique index comment_nudge_words_one_row_per_phrase
  on public.comment_nudge_words (language, lower(phrase));

create trigger comment_nudge_words_set_updated_at
  before update on public.comment_nudge_words
  for each row execute function public.set_updated_at();

alter table public.comment_nudge_words enable row level security;

/**
 * Policy comment_nudge_words_select_signed_in: anyone signed in reads the list.
 * Why: the check runs in the commenter's own browser (so the server never learns whether the
 * nudge showed), and only signed-in members can comment. It is a setting, not personal data.
 */
create policy comment_nudge_words_select_signed_in
  on public.comment_nudge_words
  for select
  to authenticated
  using (true);

comment on policy comment_nudge_words_select_signed_in on public.comment_nudge_words is
  'Allows anyone signed in to read the nudge list, because the check runs in their own browser (Robert, 2 Nov 2026).';

-- Only reads: changes go through admin_add_nudge_word() and admin_remove_nudge_word().
grant select on public.comment_nudge_words to authenticated;  -- comment_nudge_words_select_signed_in

/**
 * admin_add_nudge_word: adds a word or phrase to one language's nudge list.
 * Inputs: word_language, 'ro' or 'en'; new_phrase. Returns: the new row's ID.
 * Errors: insufficient_privilege (require_settings_staff()); check_violation for an empty or
 *   over-long phrase or another language; unique_violation when the list already has it.
 *   Logged as settings.nudge_word_added (the phrase is a setting, not personal data).
 */
create function public.admin_add_nudge_word(word_language text, new_phrase text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_phrase text := btrim(coalesce(new_phrase, ''));
  added_id uuid;
begin
  perform public.require_settings_staff();
  -- Step 1: a phrase of 1 to 60 characters, in one of the two lists.
  if clean_phrase = '' or char_length(clean_phrase) > 60 or word_language not in ('ro', 'en') then
    raise exception 'Type a word or phrase of up to 60 characters and pick Română or English.'
      using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.comment_nudge_words
             where language = word_language and lower(phrase) = lower(clean_phrase)) then
    raise exception 'That phrase is already on the list.' using errcode = 'unique_violation';
  end if;
  -- Step 2: add it and log it in the same transaction.
  insert into public.comment_nudge_words (language, phrase)
  values (word_language, clean_phrase)
  returning id into added_id;
  perform public.log_staff_action('settings.nudge_word_added', 'comment_nudge_words', added_id::text, null, null,
    null, jsonb_build_object('language', word_language, 'phrase', clean_phrase));
  return added_id;
end;
$$;

comment on function public.admin_add_nudge_word(text, text) is
  'Adds a phrase to a comment nudge list; owner and admin only; logged (Robert, 2 Nov 2026).';
revoke execute on function public.admin_add_nudge_word(text, text) from public, anon;
grant execute on function public.admin_add_nudge_word(text, text) to authenticated;

/**
 * admin_remove_nudge_word: takes a phrase off a nudge list.
 * Input: target_word_id. Returns: true.
 * Errors: insufficient_privilege; no_data_found for an unknown ID. Logged as
 *   settings.nudge_word_removed.
 */
create function public.admin_remove_nudge_word(target_word_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed public.comment_nudge_words;
begin
  perform public.require_settings_staff();
  delete from public.comment_nudge_words where id = target_word_id returning * into removed;
  if removed.id is null then
    raise exception 'There is no such phrase on the lists.' using errcode = 'no_data_found';
  end if;
  perform public.log_staff_action('settings.nudge_word_removed', 'comment_nudge_words', removed.id::text, null, null,
    jsonb_build_object('language', removed.language, 'phrase', removed.phrase), null);
  return true;
end;
$$;

comment on function public.admin_remove_nudge_word(uuid) is
  'Takes a phrase off a comment nudge list; owner and admin only; logged (Robert, 2 Nov 2026).';
revoke execute on function public.admin_remove_nudge_word(uuid) from public, anon;
grant execute on function public.admin_remove_nudge_word(uuid) to authenticated;

/* ---------- The first lists (drafts for Robert to read; staff edit them from here on) ---------- */

insert into public.comment_nudge_words (language, phrase) values
  ('en', 'kys'), ('en', 'kill yourself'), ('en', 'go die'), ('en', 'die in a fire'),
  ('en', 'nobody likes you'), ('en', 'you are worthless'), ('en', 'you''re worthless'),
  ('en', 'you are pathetic'), ('en', 'you''re pathetic'), ('en', 'you suck'), ('en', 'stupid'),
  ('en', 'idiot'), ('en', 'loser'), ('en', 'moron'), ('en', 'retard'), ('en', 'shut up'),
  ('en', 'ugly'), ('en', 'i hate you'), ('en', 'trash'), ('en', 'garbage'), ('en', 'quit writing'),
  ('en', 'stop writing'), ('en', 'worst writer'),
  ('ro', 'omoară-te'), ('ro', 'sinucide-te'), ('ro', 'mori'), ('ro', 'du-te și mori'),
  ('ro', 'nimeni nu te place'), ('ro', 'nu valorezi nimic'), ('ro', 'ești jalnic'),
  ('ro', 'ești jalnică'), ('ro', 'prost'), ('ro', 'proastă'), ('ro', 'idiot'), ('ro', 'idioată'),
  ('ro', 'tâmpit'), ('ro', 'tâmpită'), ('ro', 'ratat'), ('ro', 'ratată'), ('ro', 'retardat'),
  ('ro', 'retardată'), ('ro', 'taci'), ('ro', 'urât'), ('ro', 'urâtă'), ('ro', 'te urăsc'),
  ('ro', 'gunoi'), ('ro', 'lasă scrisul'), ('ro', 'nu mai scrie'), ('ro', 'cel mai prost scriitor');
