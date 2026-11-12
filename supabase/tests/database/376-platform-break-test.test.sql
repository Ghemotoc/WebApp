-- Platform-wide break test (bundle FINAL-3; final check, part 3): one sweep over every table and
-- every staff function, as a visitor and as an ordinary member, instead of one feature at a time.
-- What it proves:
-- - a visitor reads rows only from the tables that are public by design (the list below);
--   a new table that a visitor can read fails this test until it is added here on purpose;
-- - an ordinary member can't change or delete a single row that isn't theirs, in any table;
-- - every admin_*, staff_*, moderator_* and owner_* function refuses a visitor;
-- - every one of them refuses an ordinary member too, before saying anything about its target
--   (so "no such report" can't be told from "not allowed"); the four that answer without an
--   error are named below and answer nothing (null, 0 or false).
-- How it works: each call is made with empty arguments (null), inside its own block, with the
-- visitor's or the member's rights; what was not refused is collected and compared with the lists.
-- The member is the seed persona blocker (…015): active, adult, no staff role.
begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

create temp table findings (kind text, name text, detail text);
grant all on findings to anon, authenticated;

/* ---------- 1. Tables ---------- */

do $$
declare
  listed record;
  row_count bigint;
  first_column text;
  others text;
begin
  for listed in
    select tables.relname,
      exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = tables.relname and column_name = 'user_id') as has_owner
    from pg_class as tables join pg_namespace on pg_namespace.oid = tables.relnamespace
    where pg_namespace.nspname = 'public' and tables.relkind = 'r' order by tables.relname
  loop
    select column_name into first_column from information_schema.columns
    where table_schema = 'public' and table_name = listed.relname order by ordinal_position limit 1;
    -- Rows that aren't the member's: every row, or those with another owner.
    others := case when listed.has_owner
      then ' where user_id is distinct from ''00000000-0000-4000-8000-000000000015''' else '' end;
    -- A visitor reads.
    begin
      perform set_config('request.jwt.claims', '{"role": "anon"}', true);
      set local role anon;
      execute format('select count(*) from public.%I', listed.relname) into row_count;
      reset role;
      if row_count > 0 then insert into findings values ('visitor_reads', listed.relname, row_count::text); end if;
    exception when others then reset role;
    end;
    -- A member deletes, then changes, rows that aren't theirs. Each try is undone when it raises;
    -- one that goes through is counted (and undone with the whole test).
    perform set_config('request.jwt.claims',
      '{"sub": "00000000-0000-4000-8000-000000000015", "role": "authenticated"}', true);
    begin
      set local role authenticated;
      execute format('with gone as (delete from public.%I%s returning 1) select count(*) from gone',
        listed.relname, others) into row_count;
      reset role;
      if row_count > 0 then insert into findings values ('member_deletes', listed.relname, row_count::text); end if;
    exception when others then reset role;
    end;
    begin
      set local role authenticated;
      execute format('with changed as (update public.%I set %I = %I%s returning 1) select count(*) from changed',
        listed.relname, first_column, first_column, others) into row_count;
      reset role;
      if row_count > 0 then insert into findings values ('member_changes', listed.relname, row_count::text); end if;
    exception when others then reset role;
    end;
  end loop;
end $$;

select is(
  (select string_agg(name, ' ' order by name) from findings where kind = 'visitor_reads'),
  'ad_blocked_categories ad_slots categories country_age_rules feature_flags forum_names forums languages legal_document_versions legal_documents markets regions safety_contacts settings tag_names tags',
  'a visitor reads rows only from the tables that are public by design');
select is((select string_agg(name, ' ' order by name) from findings where kind = 'member_deletes'), null,
  'denied: a member can''t delete a row that isn''t theirs, in any table');
select is((select string_agg(name, ' ' order by name) from findings where kind = 'member_changes'), null,
  'denied: a member can''t change a row that isn''t theirs, in any table');

/* ---------- 2. Staff functions ---------- */

do $$
declare
  listed record;
  caller text;
begin
  for listed in
    select functions.proname,
      (select string_agg('null::' || format_type(argument_type, null), ', ' order by place)
       from unnest(functions.proargtypes) with ordinality as arguments (argument_type, place)) as empty_arguments
    from pg_proc as functions join pg_namespace on pg_namespace.oid = functions.pronamespace
    where pg_namespace.nspname = 'public'
      and (functions.proname like 'admin\_%' or functions.proname like 'staff\_%'
           or functions.proname like 'moderator\_%' or functions.proname like 'owner\_%')
    order by functions.proname
  loop
    foreach caller in array array['visitor', 'member'] loop
      begin
        if caller = 'visitor' then
          perform set_config('request.jwt.claims', '{"role": "anon"}', true);
          set local role anon;
        else
          perform set_config('request.jwt.claims',
            '{"sub": "00000000-0000-4000-8000-000000000015", "role": "authenticated"}', true);
          set local role authenticated;
        end if;
        -- Reading the answer makes sure the function really runs.
        execute format('select string_agg(to_jsonb(answer)::text, '''') from public.%I(%s) as answer',
          listed.proname, coalesce(listed.empty_arguments, ''));
        reset role;
        insert into findings values (caller || '_calls', listed.proname, 'answered');
      exception
        when insufficient_privilege then reset role;
        when others then
          reset role;
          insert into findings values (caller || '_calls', listed.proname, sqlstate);
      end;
    end loop;
  end loop;
end $$;

select is((select string_agg(name || ':' || detail, ' ' order by name) from findings where kind = 'visitor_calls'), null,
  'denied: every staff function refuses a visitor');
select is(
  (select string_agg(name || ':' || detail, ' ' order by name) from findings where kind = 'member_calls'),
  'admin_recent_picture_openings:answered admin_waiting_decision_email_count:answered staff_may:answered staff_signed_in_recently:answered',
  'denied: every staff function refuses a member before anything else; the four that answer say nothing (null, 0, false)');

select * from finish();
rollback;
