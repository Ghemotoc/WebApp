-- Database test: what a signed-out visitor can read (story S1-E1-02 acceptance criterion
-- "Given a signed-out client, when it queries any table directly, then it receives only rows a
-- public-read policy allows").
-- Walks every table in public as the anon role and compares what comes back with the rows the
-- public-read policies allow. A new table that leaks rows to signed-out visitors fails here.
-- A table anon holds no select grant on counts as 0 rows: the Data API refuses it outright
-- (S1-E1-02 fix, 17 Oct 2026; 003-table-grants-match-policies checks the grants themselves).
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
    -- Without a select grant, the API refuses the whole table: nothing is visible.
    if not has_table_privilege('anon', format('public.%I', public_table.name), 'SELECT') then
      visible_rows := 0;
      return next;
      continue;
    end if;
    -- Run the count as the anon role, exactly as an API request would.
    set local role anon;
    execute format('select count(*) from public.%I', public_table.name) into visible_rows;
    reset role;
    return next;
  end loop;
end;
$$;

-- Expected: only the public flags and settings, and the published legal documents (S1-E14-01);
-- nothing from any other table. Each story that adds a table adds its line here.
select results_eq(
  $$ select table_name, visible_rows from pg_temp.rows_visible_to_anon() order by table_name $$,
  $$ select * from (values
       ('audit_log', 0::bigint),
       ('banned_email_hashes', 0::bigint),
       ('case_actions', 0::bigint),
       ('cases', 0::bigint),
       ('categories', (select count(*) from public.categories)),
       ('chapter_revisions', 0::bigint),
       ('chapters', 0::bigint),
       ('client_errors', 0::bigint),
       ('confusable_characters', 0::bigint),
       ('consents', 0::bigint),
       ('feature_flags', (select count(*) from public.feature_flags where is_public)),
       ('invites', 0::bigint),
       ('jobs', 0::bigint),
       ('legal_document_versions',
        (select count(*) from public.legal_document_versions where published_at <= now())),
       ('legal_documents', (select count(*) from public.legal_documents)),
       ('markets', (select count(*) from public.markets)),
       ('moderated_items', 0::bigint),
       ('profiles', 0::bigint),
       ('report_reason_tiers', 0::bigint),
       ('reports', 0::bigint),
       ('reserved_names', 0::bigint),
       ('safety_contact_gaps', 0::bigint),
       ('safety_contacts', (select count(*) from public.safety_contacts)),
       ('sanctions', 0::bigint),
       ('settings', (select count(*) from public.settings where is_public)),
       ('sign_in_failures', 0::bigint),
       ('staff_permissions', 0::bigint),
       ('staff_role_areas', 0::bigint),
       ('staff_roles', 0::bigint),
       ('stories', 0::bigint),
       ('story_tags', 0::bigint),
       ('tags', (select count(*) from public.tags)),
       ('username_approvals', 0::bigint),
       ('username_word_lists', 0::bigint)
     ) as expected (table_name, visible_rows) order by 1 $$,
  'a signed-out visitor sees only public flags, settings, markets, published legal documents, categories and tags, nothing else'
);

select * from finish();

rollback;
