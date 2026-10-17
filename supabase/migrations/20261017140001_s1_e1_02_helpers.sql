-- Migration: shared trigger helpers (story S1-E1-02, database baseline).
--
-- What it adds: two trigger functions every later table can reuse.
--   set_updated_at()        keeps a table's updated_at column current on every change.
--   refuse_user_id_change() stops anyone changing a user ID or an owner column.
-- Who uses them: the tables created in the next S1-E1-02 migrations, and every later table that
-- has updated_at or a user_id column (CLAUDE.md conventions).
-- Rule: the user ID never changes and is never reused (architecture 1.6, "The user ID",
-- decided 16 Oct 2026, late evening).

/**
 * Trigger function: sets updated_at to the current time before a row is changed.
 * Inputs: the row being updated (NEW). Returns: the same row with updated_at refreshed.
 * Errors: none. Where it fits: attached as a BEFORE UPDATE trigger on tables with updated_at.
 */
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Stamp the change time, so nobody has to remember to set it by hand.
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger: keeps updated_at current on every update (S1-E1-02).';

/**
 * Trigger function: refuses an update that changes the column named in the trigger's argument.
 * Inputs: TG_ARGV[0] is the column to protect, for example 'id' on profiles or 'user_id' on
 *   content tables. Returns: the row unchanged when the column is the same.
 * Errors: raises check_violation when the column's value would change.
 * Where it fits: a BEFORE UPDATE trigger on profiles (id) and on every table with an owner column.
 */
create or replace function public.refuse_user_id_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  protected_column text := tg_argv[0];
begin
  -- Compare the protected column before and after the update, as JSON so any column name works.
  if to_jsonb(new) -> protected_column is distinct from to_jsonb(old) -> protected_column then
    raise exception 'The % column of % can never change: user IDs are permanent (architecture 1.6).',
      protected_column, tg_table_name
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

comment on function public.refuse_user_id_change() is
  'Trigger: refuses any change to a user ID or owner column; argument = column name (S1-E1-02).';

-- Trigger functions are never called directly, so no client role may execute them.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.refuse_user_id_change() from public, anon, authenticated;
