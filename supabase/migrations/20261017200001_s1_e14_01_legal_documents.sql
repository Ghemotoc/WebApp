-- Legal documents, their versions and the record of who accepted which version (story S1-E14-01).
--
-- What it adds:
--   legal_documents          one row per document in the Legal centre (terms, privacy notice,
--                            community guidelines; S1-E14-02 adds the contact page)
--   legal_document_versions  every published version of every document, in each language
--   consents                 which version of the terms and the privacy notice each person accepted,
--                            and when (consent is the legal basis, decided 16 Oct 2026, Q15)
--   account_status value     legal_acceptance_required, used by account_state() in the next
--                            migrations (an enum value can't be used in the transaction that adds it)
-- Who reads it: the Legal centre (src/features/legal/), the sign-up trigger (S1-E2-01) and the
-- account gate (…_s1_e14_01_legal_gate.sql).
-- Architecture: B06 (section 1.7.3); rules from CLAUDE.md (RLS on every table, a comment on every
-- policy) and supabase/README.md (table kinds).

-- 1. The documents. Their text lives in legal_document_versions.
create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sort_order smallint not null,
  needs_acceptance boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_documents_slug_is_a_web_address check (slug ~ '^[a-z][a-z-]*$')
);

comment on table public.legal_documents is
  'kind: platform
One row per Legal centre document; slug is its web address (/legal/<slug>) (S1-E14-01).';
comment on column public.legal_documents.needs_acceptance is
  'True for the documents people accept at sign-up and again after an important change (terms, privacy).';

create trigger legal_documents_set_updated_at
  before update on public.legal_documents
  for each row execute function public.set_updated_at();

-- 2. Every version, in every language. A new version is a new migration made by
-- scripts/build-legal-migration.ts; rows are never edited, so the history stays true.
create table public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.legal_documents (id),
  version_label text not null,
  language text not null,
  title text not null,
  body_markdown text not null,
  change_summary text,
  is_material boolean not null default false,
  is_lawyer_reviewed boolean not null default false,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_document_versions_one_per_language unique (document_id, version_label, language),
  -- BCP 47 codes (ro, en, later en-GB), not a fixed list (decided 17 Oct 2026, 19:19).
  constraint legal_document_versions_language_is_a_locale_code
    check (language ~ '^[a-z]{2,3}(-[A-Z]{2})?$')
);

comment on table public.legal_document_versions is
  'kind: platform
Every version of every legal document, per language; brand values stored as {{tokens}} (S1-E14-01).';
comment on column public.legal_document_versions.is_material is
  'An important change: signed-in people accept it before posting again (S1-E14-01).';
comment on column public.legal_document_versions.is_lawyer_reviewed is
  'False while the text is a draft not yet checked by a lawyer; the Legal centre says so.';
comment on column public.legal_document_versions.published_at is
  'When the version goes live; every language of one version shares the same time.';

create index legal_document_versions_document_id_idx
  on public.legal_document_versions (document_id, published_at desc);

create trigger legal_document_versions_set_updated_at
  before update on public.legal_document_versions
  for each row execute function public.set_updated_at();

-- 3. Who accepted which version, and when. Written only by the sign-up trigger (S1-E2-01) and
-- accept_current_legal_versions(); nobody can change or delete a row through the API.
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  legal_document_version_id uuid not null references public.legal_document_versions (id),
  accepted_at timestamptz not null default now(),
  method text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consents_method_is_known check (method in ('sign_up', 're_accept'))
);

comment on table public.consents is
  'kind: user_action
Which legal document version each person accepted and when; consent is the legal basis (Q15, S1-E14-01).';
comment on column public.consents.method is
  'sign_up: accepted on the sign-up form (S1-E2-01); re_accept: accepted after an important change.';

create index consents_user_id_idx on public.consents (user_id);

create trigger consents_set_updated_at
  before update on public.consents
  for each row execute function public.set_updated_at();

create trigger consents_refuse_user_id_change
  before update on public.consents
  for each row execute function public.refuse_user_id_change('user_id');

-- 4. Row-level security: deny by default, then the policies below.
alter table public.legal_documents enable row level security;
alter table public.legal_document_versions enable row level security;
alter table public.consents enable row level security;

/**
 * Policy legal_documents_select_public: anyone, signed out included, reads the list of documents.
 * Why: the Legal centre and the footer links are public (S1-E14-01, DSA Art 14).
 */
create policy legal_documents_select_public
  on public.legal_documents
  for select
  to anon, authenticated
  using (true);

comment on policy legal_documents_select_public on public.legal_documents is
  'Allows anyone, signed out included, to read the list of legal documents; the Legal centre is public.';

/**
 * Policy legal_document_versions_select_published: anyone reads versions that have gone live.
 * Why: the rules must be readable before signing up; a version prepared for a later date stays
 * hidden until then.
 */
create policy legal_document_versions_select_published
  on public.legal_document_versions
  for select
  to anon, authenticated
  using (published_at <= now());

comment on policy legal_document_versions_select_published on public.legal_document_versions is
  'Allows anyone to read legal document versions once their go-live time has passed.';

/**
 * Policy legal_document_versions_select_admin: owner and admin also read versions not yet live.
 * Why: they prepare and check a new version before it goes live (architecture 1.8.3, "Settings
 * and flags" and "Website CMS": owner and admin).
 */
create policy legal_document_versions_select_admin
  on public.legal_document_versions
  for select
  to authenticated
  using ((select public.is_staff('owner')) or (select public.is_staff('admin')));

comment on policy legal_document_versions_select_admin on public.legal_document_versions is
  'Allows owner and admin to read legal document versions before they go live (architecture 1.8.3).';

/**
 * Policy consents_select_own: a signed-in person reads only their own acceptances.
 * Why: it is their own record (GDPR Art 15); nobody else's is any of their business. Staff read
 * consents through admin functions in later stories (S1-E11-09), never through this table.
 */
create policy consents_select_own
  on public.consents
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy consents_select_own on public.consents is
  'Allows a signed-in person to read only their own record of accepted legal versions (GDPR Art 15).';

-- 5. Nobody writes to these tables through the API. Versions come only from migrations, so the
-- history in the Legal centre stays true; an acceptance is proof of consent (GDPR Art 7(1)) and
-- is recorded only by the sign-up trigger and accept_current_legal_versions().
revoke insert, update, delete, truncate on public.legal_documents from anon, authenticated;
revoke insert, update, delete, truncate on public.legal_document_versions from anon, authenticated;
revoke insert, update, delete, truncate on public.consents from anon, authenticated;

-- 6. The documents themselves. Terms and privacy notice are accepted at sign-up; the guidelines
-- are part of the terms (terms, section 1), so accepting the terms covers them.
insert into public.legal_documents (slug, sort_order, needs_acceptance) values
  ('terms', 1, true),
  ('privacy', 2, true),
  ('guidelines', 3, false);

-- 7. The new reason the account gate can give (used from …_s1_e14_01_legal_gate.sql).
alter type public.account_status add value 'legal_acceptance_required';
