-- Database test: what a signed-out visitor can read (story S1-E1-02 acceptance criterion
-- "Given a signed-out client, when it queries any table directly, then it receives only rows a
-- public-read policy allows").
-- Walks every table in public as the anon role and compares what comes back with the rows the
-- public-read policies allow. A new table that leaks rows to signed-out visitors fails here.
begin;

create extension if not exists pgtap with schema extensions;

select plan(1);

-- Count, for every public table, the rows a signed-out visitor can see.
create function pg_temp.rows_visible_to_anon()
returns table (table_name text, visible_rows bigint)
language plpgsql
as $$
declare
  public_table record;
begin
  for public_table in
    select tables.relname::text as name
    from pg_class as tables
    join pg_namespace as schemas on schemas.oid = tables.relnamespace
    where schemas.nspname = 'public' and tables.relkind in ('r', 'p')
    order by 1
  loop
    table_name := public_table.name;
    -- Run the count as the anon role, exactly as an API request would.
    set local role anon;
    execute format('select count(*) from public.%I', public_table.name) into visible_rows;
    reset role;
    return next;
  end loop;
end;
$$;

-- Expected: only the public flags and the public settings; nothing from any other table.
select results_eq(
  $$ select table_name, visible_rows from pg_temp.rows_visible_to_anon() order by table_name $$,
  $$ select * from (values
       ('audit_log', 0::bigint),
       ('feature_flags', (select count(*) from public.feature_flags where is_public)),
       ('profiles', 0::bigint),
       ('settings', (select count(*) from public.settings where is_public)),
       ('staff_roles', 0::bigint)
     ) as expected (table_name, visible_rows) order by 1 $$,
  'a signed-out visitor sees only public flags and settings, and nothing from any other table'
);

select * from finish();

rollback;
