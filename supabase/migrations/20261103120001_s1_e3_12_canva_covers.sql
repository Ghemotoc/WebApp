/*
 * Migration: design a cover in Canva (story S1-E3-12; board NewStory 4.2, "Design it in Canva";
 * ADR 0009).
 *
 * How a Canva cover travels:
 *   1. in Story settings the writer presses "Design it in Canva", which opens our /canva/start
 *      page in a new tab. If the writer hasn't connected Canva yet, that page sends them to
 *      Canva's own sign-in and consent screen (OAuth with PKCE); nothing is shared with Canva
 *      before they agree (criterion 4);
 *   2. our server (the /api/canva functions, server/canva.ts) swaps Canva's answer for the writer's Canva
 *      tokens, encrypts them with a key only the server holds, and stores the ciphertext here
 *      through save_canva_connection(), with the writer's own sign-in (no service key);
 *   3. the server asks Canva for a blank 1600 × 2560 design and the tab opens it (criterion 1);
 *   4. when the writer presses Return in Canva, Canva sends the tab back with a signed token;
 *      the server checks the signature and exports the design as a PNG (criterion 2);
 *   5. the tab sends the PNG through the normal cover upload: location data removed, private
 *      until the picture check passes (criterion 3, S1-E10-05), then saves it as the cover.
 * What it adds: the canva_covers flag (off until there is a Canva developer app; GO-LIVE),
 *   the canva_connections table, save_canva_connection() and disconnect_canva().
 * Personal data: a link between the account and the writer's Canva account (encrypted tokens and
 *   when they expire). Kept until the writer disconnects in Settings or deletes the account.
 */

/* ---------- The switch ---------- */

insert into public.feature_flags (key, is_enabled, is_public, description) values
  ('canva_covers', false, true,
   'Design a cover in Canva (S1-E3-12). Off until the Canva developer app exists and the privacy notice names Canva (GO-LIVE).')
on conflict (key) do nothing;

/* ---------- The table ---------- */

create table public.canva_connections (
  id uuid primary key default gen_random_uuid(),
  -- The writer who connected (CLAUDE.md rule 15); one connection per account.
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  -- Canva's tokens, encrypted by our server (AES-GCM, key CANVA_TOKEN_KEY in Cloudflare only).
  -- The database and the writer's browser only ever hold the ciphertext.
  access_token_ciphertext text not null,
  refresh_token_ciphertext text not null,
  access_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canva_connections_ciphertext_length check (
    char_length(access_token_ciphertext) <= 8000 and char_length(refresh_token_ciphertext) <= 8000
  )
);

comment on table public.canva_connections is
  'kind: user_action
One row per account that connected its own Canva account, for "Design it in Canva" (S1-E3-12; ADR 0009). The tokens are encrypted by our server.';
comment on column public.canva_connections.user_id is
  'The writer''s user ID; never shown publicly (rule 15).';
comment on column public.canva_connections.access_token_ciphertext is
  'Canva''s access token, encrypted with the server-only key CANVA_TOKEN_KEY (ADR 0009).';

create trigger canva_connections_set_updated_at
  before update on public.canva_connections
  for each row execute function public.set_updated_at();

create trigger canva_connections_refuse_user_id_change
  before update on public.canva_connections
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.canva_connections enable row level security;

-- The writer (and our server, acting as the writer) reads their own row; writes only go through
-- save_canva_connection() and disconnect_canva().
grant select on public.canva_connections to authenticated;

/**
 * canva_connections_select_own: the writer reads their own connection: Settings shows whether
 * Canva is connected, and our server reads the encrypted tokens with the writer's own sign-in.
 */
create policy canva_connections_select_own
  on public.canva_connections for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy canva_connections_select_own on public.canva_connections is
  'Allows a writer to read their own Canva connection (encrypted tokens only), for Settings and for /api/canva (S1-E3-12).';

/* ---------- Connecting and disconnecting ---------- */

/**
 * save_canva_connection: stores (or replaces) the caller's Canva connection.
 * Called by our server (/api/canva/connect and the token refresh) with the writer's own sign-in.
 * Inputs: the two encrypted tokens and when the access token expires.
 * Returns: nothing.
 * Errors: insufficient_privilege when signed out or the account may not write;
 *   feature_not_supported while canva_covers is off.
 */
create or replace function public.save_canva_connection(
  access_ciphertext text,
  refresh_ciphertext text,
  access_expires timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  -- Step 1: a member who may write, while Canva covers are on.
  if caller_id is null or not public.is_active_member() then
    raise exception 'Your account can''t connect Canva right now.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_feature_enabled('canva_covers') then
    raise exception 'Designing covers in Canva is switched off.' using errcode = 'feature_not_supported';
  end if;
  -- Step 2: one row per account; a new connection replaces the old one.
  insert into public.canva_connections (user_id, access_token_ciphertext, refresh_token_ciphertext, access_expires_at)
  values (caller_id, access_ciphertext, refresh_ciphertext, access_expires)
  on conflict (user_id) do update
    set access_token_ciphertext = excluded.access_token_ciphertext,
        refresh_token_ciphertext = excluded.refresh_token_ciphertext,
        access_expires_at = excluded.access_expires_at;
end;
$$;

comment on function public.save_canva_connection(text, text, timestamptz) is
  'Stores the caller''s encrypted Canva tokens; called by /api/canva (S1-E3-12).';
revoke execute on function public.save_canva_connection(text, text, timestamptz) from public, anon;
grant execute on function public.save_canva_connection(text, text, timestamptz) to authenticated;

/**
 * disconnect_canva: removes the caller's Canva connection (story criterion: "the writer can
 * disconnect in Settings"). Works whatever the flag says, so a writer can always leave.
 * Returns: true when there was a connection to remove.
 * Errors: insufficient_privilege when signed out.
 */
create or replace function public.disconnect_canva()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  removed_count integer;
begin
  if caller_id is null then
    raise exception 'Log in to disconnect Canva.' using errcode = 'insufficient_privilege';
  end if;
  delete from public.canva_connections where user_id = caller_id;
  get diagnostics removed_count = row_count;
  return removed_count > 0;
end;
$$;

comment on function public.disconnect_canva() is
  'Removes the caller''s Canva connection, from Settings (S1-E3-12).';
revoke execute on function public.disconnect_canva() from public, anon;
grant execute on function public.disconnect_canva() to authenticated;
