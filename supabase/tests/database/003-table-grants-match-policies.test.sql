-- Table privileges match the RLS policies (story S1-E1-02 fix; Robert, 17 Oct 2026).
-- Why: a policy only filters rows. Without a table privilege (GRANT) the Data API refuses the
-- table outright, which is what broke /legal/terms on staging; with too many privileges, RLS
-- doesn't cover TRUNCATE, REFERENCES, TRIGGER or MAINTAIN at all. So for anon and authenticated:
--   - every role and command a policy names has the matching grant;
--   - every grant has a policy that uses it (exactly what the policies need, nothing more);
--   - nobody holds TRUNCATE, REFERENCES, TRIGGER or MAINTAIN;
--   - a new table starts with no privileges, so each migration must grant explicitly;
--   - no privileges on sequences (every table uses uuid keys).
-- Views are not covered here: a view has no policies of its own; the story that adds one tests it.
begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

-- Each policy expanded to one row per Data API role and per table privilege it needs.
-- A policy "to public" applies to both roles; "for all" needs all four commands.
create temp view policy_needs as
select distinct policies.tablename, roles.role_name, commands.privilege
from pg_policies as policies
cross join lateral (
  select unnest(case when 'public' = any(policies.roles) then array['anon', 'authenticated']
    else policies.roles::text[] end) as role_name
) as roles
cross join lateral (
  select unnest(case policies.cmd when 'ALL' then array['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    else array[policies.cmd] end) as privilege
) as commands
where policies.schemaname = 'public' and roles.role_name in ('anon', 'authenticated');

-- Every table privilege anon or authenticated holds on a public table.
create temp view role_holds as
select tables.relname as tablename, roles.role_name, privileges.privilege
from pg_class as tables
join pg_namespace as schemas on schemas.oid = tables.relnamespace
cross join (values ('anon'), ('authenticated')) as roles (role_name)
cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'),
  ('TRIGGER'), ('MAINTAIN')) as privileges (privilege)
where schemas.nspname = 'public' and tables.relkind in ('r', 'p')
  and has_table_privilege(roles.role_name, tables.oid, privileges.privilege);

select is_empty(
  $$ select * from policy_needs except select * from role_holds $$,
  'every role and command a policy names has the matching table grant'
);

select is_empty(
  $$ select * from role_holds where privilege in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
     except select * from policy_needs $$,
  'anon and authenticated hold no table grant that no policy uses'
);

select is_empty(
  $$ select * from role_holds where privilege in ('TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN') $$,
  'anon and authenticated hold no TRUNCATE, REFERENCES, TRIGGER or MAINTAIN on any public table'
);

-- A new table, created the way a migration creates one, starts with no privileges.
create table public.grant_probe (id uuid primary key default gen_random_uuid());
select is_empty(
  $$ select * from role_holds where tablename = 'grant_probe' $$,
  'a new table gives anon and authenticated nothing until its migration grants it'
);

select is_empty(
  $$ select sequences.relname, roles.role_name
     from pg_class as sequences
     join pg_namespace as schemas on schemas.oid = sequences.relnamespace
     cross join (values ('anon'), ('authenticated')) as roles (role_name)
     where schemas.nspname = 'public' and sequences.relkind = 'S'
       and has_sequence_privilege(roles.role_name, sequences.oid, 'USAGE, SELECT, UPDATE') $$,
  'anon and authenticated hold no privileges on public sequences'
);

select * from finish();

rollback;
