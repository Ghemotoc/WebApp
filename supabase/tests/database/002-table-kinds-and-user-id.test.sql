-- CI guard: every public table says what kind of table it is, user-owned tables point at the
-- user ID, and user-content tables are reportable (story S1-E1-02; CLAUDE.md rules 6 and 15).
--
-- The convention (supabase/README.md): the table comment starts with
--   kind: identity | user_content | user_action | staff | platform [; reportable: <value>]
-- Tables of kind user_content, user_action and staff must have `user_id uuid not null` with a
-- foreign key to profiles(id). Tables of kind user_content must name a reportable_type value that
-- exists. Tests 4 and 5 prove the check catches a table that breaks the rule.
-- One exception: audit_log's user_id is empty on system rows (S1-E11-17, CTO 24 Oct 2026: the
-- platform closing a used-up invite is nobody's action). Test 6 proves a check constraint allows
-- that only when actor = 'system', so a person's row can never lose its user ID.
begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

-- The public tables with their declared kind and reportable value, read from the table comment.
create function pg_temp.public_table_kinds()
returns table (table_name text, table_kind text, reportable_value text)
language sql
as $$
  select
    tables.relname::text,
    substring(obj_description(tables.oid, 'pg_class') from '^kind: ([a-z_]+)'),
    substring(obj_description(tables.oid, 'pg_class') from '^kind: [a-z_]+; reportable: ([a-z_]+)')
  from pg_class as tables
  join pg_namespace as schemas on schemas.oid = tables.relnamespace
  where schemas.nspname = 'public' and tables.relkind in ('r', 'p');
$$;

-- User-owned tables (by kind) whose user_id is missing, nullable or not a foreign key to profiles.
create function pg_temp.owned_tables_without_user_id()
returns setof text
language sql
as $$
  select kinds.table_name
  from pg_temp.public_table_kinds() as kinds
  where kinds.table_kind in ('user_content', 'user_action', 'staff')
    and (
      -- The column must exist as a not-null uuid ...
      not exists (
        select 1
        from information_schema.columns as table_columns
        where table_columns.table_schema = 'public'
          and table_columns.table_name = kinds.table_name
          and table_columns.column_name = 'user_id'
          and table_columns.data_type = 'uuid'
          and (table_columns.is_nullable = 'NO' or kinds.table_name = 'audit_log')
      )
      -- ... with a foreign key to profiles.
      or not exists (
        select 1
        from pg_constraint as constraints
        join pg_attribute as attributes
          on attributes.attrelid = constraints.conrelid
         and attributes.attnum = any (constraints.conkey)
        where constraints.contype = 'f'
          and constraints.conrelid = ('public.' || kinds.table_name)::regclass
          and constraints.confrelid = 'public.profiles'::regclass
          and attributes.attname = 'user_id'
      )
    );
$$;

-- 1. Every table declares a kind from the list.
select is_empty(
  $$ select table_name from pg_temp.public_table_kinds()
     where table_kind is null
        or table_kind not in ('identity', 'user_content', 'user_action', 'staff', 'platform') $$,
  'every public table declares its kind in its comment'
);

-- 2. Every user-owned table has a not-null user_id referencing profiles.
select is_empty(
  $$ select * from pg_temp.owned_tables_without_user_id() $$,
  'every user_content, user_action and staff table has a not-null user_id referencing profiles'
);

-- 3. Every user-content table names a reportable_type value that exists (rule 6).
select is_empty(
  $$ select table_name from pg_temp.public_table_kinds()
     where table_kind = 'user_content'
       and (reportable_value is null
            or reportable_value not in (select unnest(enum_range(null::public.reportable_type))::text)) $$,
  'every user_content table is registered as reportable'
);

-- 4. The check catches a user-content table with a nullable user_id (rolled back at the end).
create table public.example_bad_content (id uuid primary key, user_id uuid);
comment on table public.example_bad_content is 'kind: user_content; reportable: profile';
select set_has(
  $$ select * from pg_temp.owned_tables_without_user_id() $$,
  $$ values ('example_bad_content') $$,
  'a user-content table without a not-null user_id referencing profiles is caught'
);

-- 5. The check catches a table with no declared kind.
create table public.example_without_kind (id integer);
select set_has(
  $$ select table_name from pg_temp.public_table_kinds() where table_kind is null $$,
  $$ values ('example_without_kind') $$,
  'a table without a declared kind is caught'
);

-- 6. audit_log's empty user_id is for system rows only (the exception above).
select throws_ok(
  $$ insert into public.audit_log (user_id, actor, action, target_type) values (null, 'person', 'example.action', 'example') $$,
  '23514', null,
  'an audit row says who acted unless the system did: a person''s row without a user ID is refused'
);

select * from finish();

rollback;
