-- CI guard: every table in the public schema has row-level security on and at least one policy
-- (story S1-E1-02; CLAUDE.md rule 1; architecture 1.9 "deny by default").
--
-- Who runs it: `npx supabase test db`, on your computer and in CI (job "database").
-- How it fails: a migration that adds a table without RLS, or with RLS but no policy, makes test 2
-- list that table. Test 3 proves the check really catches such a table.
begin;

create extension if not exists pgtap with schema extensions;

select plan(3);

-- A helper for this file only (pg_temp disappears when the test ends): the public tables that
-- break the rule.
create function pg_temp.tables_missing_rls_or_policy()
returns setof text
language sql
as $$
  select tables.relname::text
  from pg_class as tables
  join pg_namespace as schemas on schemas.oid = tables.relnamespace
  where schemas.nspname = 'public'
    and tables.relkind in ('r', 'p')
    and (
      not tables.relrowsecurity
      or not exists (
        select 1 from pg_policies
        where pg_policies.schemaname = 'public' and pg_policies.tablename = tables.relname
      )
    );
$$;

-- 1. The schema the app's tables live in exists.
select has_schema('public', 'the public schema exists');

-- 2. The rule holds for every table the migrations created.
select is_empty(
  $$ select * from pg_temp.tables_missing_rls_or_policy() $$,
  'every table in public has row-level security switched on and at least one policy'
);

-- 3. The check catches a table created without RLS (rolled back at the end).
create table public.example_without_rls (id integer);
select set_has(
  $$ select * from pg_temp.tables_missing_rls_or_policy() $$,
  $$ values ('example_without_rls') $$,
  'a new table without row-level security is caught by the check'
);

select * from finish();

rollback;
