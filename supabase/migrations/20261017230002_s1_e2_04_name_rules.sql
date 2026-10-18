-- The rules every username and pen name is checked against (story S1-E2-04).
--
-- What it adds:
--   confusable_characters        Unicode's look-alike characters (filled by the next migration)
--   reserved_names               words that make a name look like staff or the platform
--   username_word_lists          the English and Romanian swearword lists (filled by a later,
--                                generated migration from content/username-word-lists/)
--   fold_look_alike_characters() swaps each non-ASCII look-alike for the character it imitates
--   name_slug()                  the web-address form of a username
--   username_skeleton()          the form two usernames are compared in: equal skeletons means
--                                the names look the same, so only one may exist
--   name_matching_words()        the forms a name is searched in for listed words
--   has_invisible_characters()   finds characters used to fake names
-- Rules (story S1-E2-04; decided 16 Oct 2026, Q21; board 2.5):
--   - any character in any script is allowed, except invisible and control characters;
--   - case, diacritics, look-alike letters (Unicode TR39) and digits such as 0 for o are folded
--     before comparing, so "Ștefan", "stefan" and "5tefan" match the same listed words;
--   - staff and brand words of 6 letters or more are refused anywhere in a name, shorter ones only
--     as a whole word ("lia.modern" is fine, "mod" and "lia.mod" aren't); staff words that hide in
--     ordinary words ("support" in "supporter") are refused only as a whole word, and the app's
--     own addresses ("settings") only as the entire name;
--   - swearwords of 4 letters or more are refused anywhere, shorter ones only as a whole word, and
--     a list entry can be limited to whole words when it hides inside ordinary words.
-- A moderator can approve a refused name that's a false hit (username_approvals, next migrations).

/* ---------- Tables ---------- */

create table public.confusable_characters (
  id uuid primary key default gen_random_uuid(),
  -- One character someone might type, and the prototype it looks like (one or more characters).
  source_text text not null unique,
  prototype_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint confusable_characters_source_is_one_character check (char_length(source_text) = 1)
);

comment on table public.confusable_characters is
  'kind: platform
Look-alike characters and their prototypes (Unicode UTS #39), used to fold names (S1-E2-04).';

create table public.reserved_names (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- Folded with name_matching_words() by the trigger below, so checks compare like with like.
  folded_name text not null default '',
  -- Why it's reserved: staff (looks like our team) or system (an address the app uses).
  reason text not null,
  -- anywhere: refused inside a longer name too (when 6 letters or more); whole_word: only as one
  -- of the name's words ("lia.support"); whole_name: only as the entire name (app addresses).
  match_rule text not null default 'anywhere',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reserved_names_reason_is_known check (reason in ('staff', 'system')),
  constraint reserved_names_match_rule_is_known
    check (match_rule in ('anywhere', 'whole_word', 'whole_name'))
);

comment on table public.reserved_names is
  'kind: platform
Words a username or pen name may not imitate: staff titles and app addresses (S1-E2-04). Brand names are in settings.';

create table public.username_word_lists (
  id uuid primary key default gen_random_uuid(),
  language text not null,
  word text not null,
  folded_word text not null default '',
  -- anywhere: refused inside a longer name too (when 4 letters or more); whole_word: only as a
  -- whole word, for entries that hide inside ordinary words ("cock" in "peacock").
  match_rule text not null default 'anywhere',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_word_lists_language_is_known check (language in ('en', 'ro')),
  constraint username_word_lists_match_rule_is_known check (match_rule in ('anywhere', 'whole_word')),
  constraint username_word_lists_one_row_per_word unique (language, word)
);

comment on table public.username_word_lists is
  'kind: platform
Swearwords refused in usernames and pen names, per language; drafts from content/username-word-lists/ (S1-E2-04).';

create trigger confusable_characters_set_updated_at
  before update on public.confusable_characters
  for each row execute function public.set_updated_at();
create trigger reserved_names_set_updated_at
  before update on public.reserved_names
  for each row execute function public.set_updated_at();
create trigger username_word_lists_set_updated_at
  before update on public.username_word_lists
  for each row execute function public.set_updated_at();

alter table public.confusable_characters enable row level security;
alter table public.reserved_names enable row level security;
alter table public.username_word_lists enable row level security;

/**
 * Policies *_select_admin: owner and admin read the name rules.
 * Why: the lists are settings ("Settings: reserved names", architecture 1.8.3: owner and admin);
 * nobody else needs them, because the checks run in the database (check_handle() and friends).
 * Changing them: a new migration until the settings screen (S1-E11-03).
 */
create policy confusable_characters_select_admin
  on public.confusable_characters
  for select
  to authenticated
  using ((select public.is_staff('owner')) or (select public.is_staff('admin')));

comment on policy confusable_characters_select_admin on public.confusable_characters is
  'Allows owner and admin to read the look-alike table; checks run in the database (S1-E2-04).';

create policy reserved_names_select_admin
  on public.reserved_names
  for select
  to authenticated
  using ((select public.is_staff('owner')) or (select public.is_staff('admin')));

comment on policy reserved_names_select_admin on public.reserved_names is
  'Allows owner and admin to read reserved names, a setting (architecture 1.8.3, S1-E2-04).';

create policy username_word_lists_select_admin
  on public.username_word_lists
  for select
  to authenticated
  using ((select public.is_staff('owner')) or (select public.is_staff('admin')));

comment on policy username_word_lists_select_admin on public.username_word_lists is
  'Allows owner and admin to read the swearword lists, a setting (architecture 1.8.3, S1-E2-04).';

-- Table privileges, exactly what the policies need (CLAUDE.md, Conventions): authenticated may
-- read, and the *_select_admin policies keep it to owner and admin. Lists change only through
-- migrations (and the S1-E11-03 settings screen later), so nobody gets a write privilege.
revoke all on public.confusable_characters, public.reserved_names, public.username_word_lists
  from anon, authenticated;
grant select on public.confusable_characters to authenticated;  -- confusable_characters_select_admin
grant select on public.reserved_names to authenticated;  -- reserved_names_select_admin
grant select on public.username_word_lists to authenticated;  -- username_word_lists_select_admin

/* ---------- Folding functions ---------- */

/**
 * strip_combining_marks: removes accents and other marks that sit on a letter.
 * Input: name. Returns: the name decomposed (NFD) without combining marks, so "ș" becomes "s".
 */
create or replace function public.strip_combining_marks(name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    normalize(coalesce(name, ''), nfd),
    '[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]',
    '',
    'g'
  );
$$;

comment on function public.strip_combining_marks(text) is
  'Removes accents and other combining marks, so ș becomes s (S1-E2-04).';

/**
 * fold_look_alike_characters: swaps each non-ASCII look-alike for the character it imitates.
 * Input: name (already lower case and without marks). Returns: the folded text, lower case.
 * Why not ASCII: Unicode also lists "m" as looking like "rn"; folding plain letters would turn
 *   "maria" into "rnaria" in web addresses. Plain-letter look-alikes are handled in
 *   username_skeleton() instead, where they belong.
 */
create or replace function public.fold_look_alike_characters(name text)
returns text
language sql
stable
-- Security definer: the table is readable only by owner and admin, but everyone's names are folded.
security definer
set search_path = ''
as $$
  select coalesce(
    lower(string_agg(coalesce(look_alikes.prototype_text, characters.character), '' order by characters.position)),
    ''
  )
  from regexp_split_to_table(coalesce(name, ''), '') with ordinality as characters (character, position)
  left join public.confusable_characters as look_alikes
    on look_alikes.source_text = characters.character
    and characters.character !~ '^[\u0001-\u007F]$';
$$;

comment on function public.fold_look_alike_characters(text) is
  'Swaps non-ASCII look-alike characters for what they imitate, in lower case (Unicode TR39, S1-E2-04).';

/**
 * name_slug: the form of a username used in its web address.
 * Input: name. Returns: Unicode NFKC, lower case, accents removed and non-ASCII look-alikes
 *   folded ("Ștefan" → "stefan", Cyrillic "а" → "a"). Anything else stays; the app
 *   percent-encodes it when building a link (S1-E2-04 criterion).
 */
create or replace function public.name_slug(name text)
returns text
language sql
stable
set search_path = ''
as $$
  select public.strip_combining_marks(
    public.fold_look_alike_characters(public.strip_combining_marks(lower(normalize(coalesce(name, ''), nfkc))))
  );
$$;

comment on function public.name_slug(text) is
  'The web-address form of a username: NFKC, lower case, accents and look-alikes folded (S1-E2-04).';

/**
 * username_skeleton: the form in which two usernames are compared.
 * Input: name. Returns: the slug with the plain-letter look-alikes folded too: 0 → o, 1, l and |
 *   → i, "rn" → m. Two names with the same skeleton look the same, so only one may exist
 *   ("lia" and "IIa", "maria" and "rnaria").
 */
create or replace function public.username_skeleton(name text)
returns text
language sql
stable
set search_path = ''
as $$
  select replace(translate(public.name_slug(name), '01l|', 'oiii'), 'rn', 'm');
$$;

comment on function public.username_skeleton(text) is
  'The look-alike form two usernames are compared in; equal skeletons can''t both exist (UTS #39, S1-E2-04).';

/**
 * name_matching_words: the forms a name is searched in for listed words.
 * Input: name. Returns: an array whose first item is the whole name with digits and symbols used
 *   as letters folded (3 → e, 4 → a, 5 → s, 7 → t, 8 → b, @ → a, $ → s, ! → i) and everything
 *   that isn't a letter or digit removed; the other items are its separate words (split at dots,
 *   dashes, spaces and the like). "Lia.M0d" gives {iiamod, iia, mod}.
 */
create or replace function public.name_matching_words(name text)
returns text[]
language sql
stable
set search_path = ''
as $$
  with folded as (
    select translate(public.username_skeleton(name), '34578@$!', 'eastbasi') as text
  )
  select array[regexp_replace(folded.text, '[^[:alnum:]]', '', 'g')]
    || coalesce(
      array(
        select word
        from regexp_split_to_table(folded.text, '[^[:alnum:]]+') as words (word)
        where word <> ''
      ),
      '{}'
    )
  from folded;
$$;

comment on function public.name_matching_words(text) is
  'The whole name and its words, folded for matching against reserved names and swearwords (S1-E2-04).';

/**
 * has_invisible_characters: true when a name holds a character used to fake names.
 * Input: name. Returns: true for control characters, zero-width characters, direction overrides,
 *   tag characters and other invisible fillers. The zero-width joiner and the emoji variation
 *   selector are allowed only inside emoji (between or after symbols), because emoji such as
 *   "👩‍💻" and "❤️" need them (story: emoji are allowed).
 */
create or replace function public.has_invisible_characters(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(name, '') ~ (
      '[\u0001-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F'
      || '\u200B\u200C\u200E\u200F\u2028-\u202E\u2060-\u206F\u3164\uFE00-\uFE0E\uFEFF\uFFA0'
      || '\uFFF0-\uFFFB\U000E0000-\U000E007F\U000E0100-\U000E01EF]'
    )
    -- A joiner at either end or touching a letter, digit or space hides between ordinary letters.
    or coalesce(name, '') ~ '(^|[[:alnum:][:space:]])\u200D|\u200D($|[[:alnum:][:space:]])'
    -- The emoji variation selector only ever follows a symbol.
    or coalesce(name, '') ~ '(^|[[:alnum:][:space:]])\uFE0F';
$$;

comment on function public.has_invisible_characters(text) is
  'True when a name holds invisible or control characters used to fake names (S1-E2-04).';

/**
 * fold_listed_name: trigger that keeps the folded form of a reserved name or listed word current.
 * Runs: before insert or update on reserved_names and username_word_lists.
 */
create or replace function public.fold_listed_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'reserved_names' then
    new.folded_name := (public.name_matching_words(new.name))[1];
  else
    new.folded_word := (public.name_matching_words(new.word))[1];
  end if;
  return new;
end;
$$;

comment on function public.fold_listed_name() is
  'Trigger: stores the folded form of a reserved name or listed word (S1-E2-04).';

create trigger reserved_names_fold
  before insert or update of name on public.reserved_names
  for each row execute function public.fold_listed_name();
create trigger username_word_lists_fold
  before insert or update of word on public.username_word_lists
  for each row execute function public.fold_listed_name();

revoke execute on function public.fold_listed_name() from public, anon, authenticated;

/* ---------- Reserved names ---------- */

-- Staff titles in English and Romanian (S1-E2-04: "imitates staff"), and the first words of the
-- app's own addresses, so nobody's profile address can clash with a page. Brand names live in the
-- settings row reserved_brand_words (…_s1_e2_04_brand_words.sql), the one place they may appear.
insert into public.reserved_names (name, reason, match_rule) values
  -- Refused anywhere: long staff titles nobody uses for anything else.
  ('administrator', 'staff', 'anywhere'), ('moderator', 'staff', 'anywhere'),
  ('helpdesk', 'staff', 'anywhere'), ('sysadmin', 'staff', 'anywhere'),
  ('official', 'staff', 'anywhere'), ('moderare', 'staff', 'anywhere'),
  ('administrare', 'staff', 'anywhere'),
  -- Refused as a word of the name: short titles, and ones inside ordinary words.
  ('admin', 'staff', 'whole_word'), ('staff', 'staff', 'whole_word'), ('mod', 'staff', 'whole_word'),
  ('mods', 'staff', 'whole_word'), ('support', 'staff', 'whole_word'), ('team', 'staff', 'whole_word'),
  ('owner', 'staff', 'whole_word'), ('editor', 'staff', 'whole_word'), ('safety', 'staff', 'whole_word'),
  ('trust', 'staff', 'whole_word'), ('system', 'staff', 'whole_word'), ('root', 'staff', 'whole_word'),
  ('security', 'staff', 'whole_word'), ('legal', 'staff', 'whole_word'), ('privacy', 'staff', 'whole_word'),
  ('echipa', 'staff', 'whole_word'), ('oficial', 'staff', 'whole_word'), ('suport', 'staff', 'whole_word'),
  ('asistenta', 'staff', 'whole_word'), ('siguranta', 'staff', 'whole_word'),
  -- Refused only as the entire name: the app's own addresses and words the code treats specially.
  ('api', 'system', 'whole_name'), ('auth', 'system', 'whole_name'), ('join', 'system', 'whole_name'),
  ('setup', 'system', 'whole_name'), ('settings', 'system', 'whole_name'),
  ('signup', 'system', 'whole_name'), ('signin', 'system', 'whole_name'),
  ('login', 'system', 'whole_name'), ('logout', 'system', 'whole_name'),
  ('design', 'system', 'whole_name'), ('help', 'system', 'whole_name'),
  ('about', 'system', 'whole_name'), ('contact', 'system', 'whole_name'),
  ('discover', 'system', 'whole_name'), ('library', 'system', 'whole_name'),
  ('forums', 'system', 'whole_name'), ('messages', 'system', 'whole_name'),
  ('notifications', 'system', 'whole_name'), ('write', 'system', 'whole_name'),
  ('search', 'system', 'whole_name'), ('anonymous', 'system', 'whole_name'),
  ('deleted', 'system', 'whole_name'), ('null', 'system', 'whole_name'),
  ('undefined', 'system', 'whole_name');
