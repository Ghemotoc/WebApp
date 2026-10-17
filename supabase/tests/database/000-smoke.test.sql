-- Smoke test for the database test suite (story S1-E1-01).
--
-- Who runs it: `npx supabase test db`, on your computer and in CI (the "database" job).
-- Why it exists: it proves pgTAP runs against a fresh local database built from the migrations,
-- so later stories only add files next to it. S1-E1-02 adds the real row-level security tests:
-- one allowed and one denied test for every policy (CLAUDE.md rule 1).
begin;

-- pgTAP's functions live in the "extensions" schema in Supabase.
create extension if not exists pgtap with schema extensions;

select plan(2);

-- 1. The schema the app's tables will live in exists.
select has_schema('public', 'the public schema exists');

-- 2. The migrations ran without leaving a table that has row-level security switched off.
--    (S1-E1-02 turns this into a CI check that also needs at least one policy per table.)
select is_empty(
  $$ select c.relname
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and not c.relrowsecurity $$,
  'every table in public has row-level security switched on'
);

select * from finish();

rollback;
