/*
 * Migration: reactions on comments (story S1-E6-02; board 3.5, the chips under each comment).
 *
 * What it adds:
 * - reaction_kind: the fixed set of six from the Reader board: heart, fire, laugh, wow, sad and
 *   star (decided 17 Oct 2026, 12:44). The screen draws each as an SVG icon; the interface uses
 *   no emoji (the story's legal note).
 * - comment_reactions: one reaction per person per comment; picking another kind changes it,
 *   picking the same kind again (or none) takes it away (criterion 1).
 * - react_to_comment(comment_id, wanted_kind): the only write. It goes through the account gate,
 *   and only on a comment the caller may read (the chapter's reading rules, blocks, moderation).
 * - comment_reactions_json(): the counts per kind and the caller's own, which comment_json()
 *   now includes, so chapter_comments() answers them with every comment.
 * Not reportable: a reaction carries no words or picture; abuse through reactions is reported on
 * the comment or the account (CLAUDE.md rule 6 covers user content, and a reaction is a user
 * action, like a like).
 * Who calls it: src/features/comments/api/reactions.ts (CommentReactions).
 * Tests: supabase/tests/database/150-comment-reactions.test.sql.
 */

/* ---------- Table ---------- */

create type public.reaction_kind as enum ('heart', 'fire', 'laugh', 'wow', 'sad', 'star');
comment on type public.reaction_kind is
  'The six reactions on a comment, in the board''s order (S1-E6-02; decided 17 Oct 2026, 12:44).';

create table public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  -- The person reacting (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  comment_id uuid not null references public.comments (id) on delete cascade,
  kind public.reaction_kind not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_reactions_one_per_person unique (user_id, comment_id)
);
comment on table public.comment_reactions is
  'kind: user_action
One reaction per person per comment (S1-E6-02). The counts are public; who reacted isn''t shown.';
create index comment_reactions_comment_id on public.comment_reactions (comment_id);
create trigger comment_reactions_set_updated_at
  before update on public.comment_reactions
  for each row execute function public.set_updated_at();
create trigger comment_reactions_refuse_user_id_change
  before update on public.comment_reactions
  for each row execute function public.refuse_user_id_change('user_id');
alter table public.comment_reactions enable row level security;

-- Who: the person who reacted. Why: their own reactions; everyone else sees only the counts,
-- through chapter_comments(). Writes go only through react_to_comment().
create policy comment_reactions_select_own on public.comment_reactions
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.comment_reactions to authenticated;

/* ---------- Counts ---------- */

/**
 * comment_reactions_json: a comment's reactions as the chips draw them.
 * Input: target_comment_id. Returns: JSON {"counts": {"heart": 4, ...}, "mine": "heart" | null}:
 *   only kinds with at least one reaction, from live accounts; mine is the caller's own.
 * Internal: comment_json() and react_to_comment().
 */
create or replace function public.comment_reactions_json(target_comment_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'counts', coalesce((
      select jsonb_object_agg(kind_counts.kind, kind_counts.total)
      from (
        select comment_reactions.kind, count(*)::integer as total
        from public.comment_reactions
        join public.profiles on profiles.id = comment_reactions.user_id
        where comment_reactions.comment_id = target_comment_id and profiles.deleted_at is null
        group by comment_reactions.kind
      ) as kind_counts), '{}'::jsonb),
    'mine', (select comment_reactions.kind from public.comment_reactions
             where comment_reactions.comment_id = target_comment_id
               and comment_reactions.user_id = (select auth.uid())));
$$;
comment on function public.comment_reactions_json(uuid) is
  'Internal: a comment''s reaction counts per kind and the caller''s own (S1-E6-02).';
revoke execute on function public.comment_reactions_json(uuid) from public, anon, authenticated;

/* ---------- Reacting ---------- */

/**
 * react_to_comment: sets, changes or takes away the caller's reaction on a comment.
 * Inputs: comment_id; wanted_kind (one of the six; null, or the kind the caller already has,
 *   takes it away).
 * Returns: the comment's reactions afterwards (comment_reactions_json()).
 * Rules: the comment must be one the caller may read: its chapter readable (readable_chapter():
 *   rating, blocks, moderation), the comment itself live (not deleted, hidden or removed, not by
 *   someone either side blocks). Taking a reaction away always works; adding or changing one
 *   goes through the account gate (architecture 1.7.8).
 * Errors: insufficient_privilege when signed out or the account may not write; no_data_found
 *   when the caller may not read the comment.
 */
create or replace function public.react_to_comment(comment_id uuid, wanted_kind public.reaction_kind)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target public.comments;
  address record;
  current_kind public.reaction_kind;
begin
  -- Step 1: signed in, and a live comment on a chapter this reader may open.
  if caller_id is null then
    raise exception 'Log in to react.' using errcode = 'insufficient_privilege';
  end if;
  select * into target from public.comments where comments.id = comment_id;
  select stories.slug, chapters.code into address
  from public.chapters join public.stories on stories.id = chapters.story_id
  where chapters.id = target.chapter_id;
  if target.id is null
     or not exists (select 1 from public.readable_chapter(address.slug, address.code))
     or public.comment_state_for_caller(target) is distinct from 'live' then
    raise exception 'That comment isn''t there any more.' using errcode = 'no_data_found';
  end if;
  -- Step 2: the same kind again, or none, takes the reaction away; always allowed.
  select comment_reactions.kind into current_kind from public.comment_reactions
  where comment_reactions.comment_id = target.id and comment_reactions.user_id = caller_id;
  if wanted_kind is null or wanted_kind = current_kind then
    delete from public.comment_reactions
    where comment_reactions.comment_id = target.id and comment_reactions.user_id = caller_id;
    return public.comment_reactions_json(target.id);
  end if;
  -- Step 3: adding or changing one is a write, so the account gate applies.
  if not public.is_active_member() then
    raise exception 'Your account can''t react right now.' using errcode = 'insufficient_privilege';
  end if;
  insert into public.comment_reactions (user_id, comment_id, kind) values (caller_id, target.id, wanted_kind)
  on conflict on constraint comment_reactions_one_per_person do update set kind = excluded.kind;
  return public.comment_reactions_json(target.id);
end;
$$;
comment on function public.react_to_comment(uuid, public.reaction_kind) is
  'Sets, changes or takes away the caller''s reaction on a comment they may read (S1-E6-02).';
revoke execute on function public.react_to_comment(uuid, public.reaction_kind) from public, anon;
grant execute on function public.react_to_comment(uuid, public.reaction_kind) to authenticated;

/* ---------- Each comment carries its reactions ---------- */

/**
 * comment_json: as in S1-E6-01, plus 'reactions' (comment_reactions_json()) on a live or the
 * author's own hidden comment; a marker has none.
 */
create or replace function public.comment_json(target public.comments, story_writer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  state text := public.comment_state_for_caller(target);
  author public.profiles;
begin
  select * into author from public.profiles where profiles.id = target.user_id;
  return jsonb_build_object(
    'id', target.id,
    'author', jsonb_build_object(
      'handle', author.handle,
      'display_name', public.display_name(author.handle, author.pen_name)),
    'is_writer', target.user_id = story_writer_id,
    'is_mine', target.user_id = caller_id,
    'created_at', target.created_at,
    'is_spoiler', target.is_spoiler,
    'state', state,
    'body', case when state in ('live', 'hidden') then target.body end,
    'can_delete', target.deleted_at is null and caller_id is not null
      and (target.user_id = caller_id or story_writer_id = caller_id),
    'reactions', case when state in ('live', 'hidden') then public.comment_reactions_json(target.id)
      else jsonb_build_object('counts', '{}'::jsonb, 'mine', null) end);
end;
$$;
comment on function public.comment_json(public.comments, uuid) is
  'Internal: one comment as the comments area draws it, with its reactions, never a user ID (S1-E6-01, S1-E6-02).';
revoke execute on function public.comment_json(public.comments, uuid) from public, anon, authenticated;
