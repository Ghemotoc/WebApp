-- Database tests for usernames and pen names (story S1-E2-04).
-- What it proves:
-- - a username is 3 to 30 characters in any script, emoji included, but never invisible or
--   control characters or spaces;
-- - names that imitate staff or the brand, the app's own addresses and listed swearwords are
--   refused after folding case, diacritics, look-alike letters and digits such as 0 for o, with
--   short words matched only as whole words;
-- - two usernames that look the same can't both exist, and the web-address form is folded;
-- - a username or pen name changes at most once every 30 days after the first choice, and the old
--   one goes to the audit log; until a username is chosen the account can't write;
-- - a moderator can approve one exact name refused by mistake, and it's logged; support can't;
-- - the name rules are readable by owner and admin only, approvals by moderators (allowed and
--   denied for every policy).
begin;

create extension if not exists pgtap with schema extensions;

select plan(50);

-- The brand name, read from settings (private, so read before signing in as a member).
create temp table brand_word as
  select lower(value ->> 0) as word from public.settings where key = 'reserved_brand_words';
grant select on brand_word to authenticated;

-- Signed in as adult_writer (handle adult_writer, pen name Lia Scrie).
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';

-- 1. Length and characters.
select is(public.check_handle('lia.writes'), 'ok', 'a username with a dot is allowed');
select is(public.check_handle('Ștefan_Ionescu'), 'ok', 'letters with diacritics are allowed');
select is(public.check_handle('ana👩‍💻'), 'ok', 'emoji are allowed, joined ones included');
select is(public.check_handle('ab'), 'too_short', 'two characters are too few');
select is(public.check_handle(repeat('a', 31)), 'too_long', 'thirty-one characters are too many');
select is(public.check_handle('lia' || U&'\200B' || 'writes'), 'invisible_characters',
  'a zero-width space is refused, because it fakes names');
select is(public.check_handle('lia' || U&'\202E' || 'writes'), 'invisible_characters',
  'a direction override is refused');
select is(public.check_handle('lia' || U&'\200D' || 'writes'), 'invisible_characters',
  'a joiner between ordinary letters is refused');
select is(public.check_handle('lia writes'), 'spaces', 'a username has no spaces');

-- 2. Staff, brand and app addresses.
select is(public.check_handle('аdmin'), 'looks_like_staff', 'admin with a Cyrillic а imitates staff');
select is(public.check_handle('lia.mod'), 'looks_like_staff', 'a short staff word is refused as a word of the name');
select is(public.check_handle('lia.modern'), 'ok', 'a short staff word inside an ordinary word is fine');
select is(public.check_handle('moderatorul'), 'looks_like_staff', 'a long staff word is refused anywhere');
select is(
  public.check_handle(translate((select word from brand_word), 'o', '0') || '_fan'),
  'looks_like_staff',
  'the brand name, with 0 for o, is refused anywhere (read from settings, never written in code)'
);
select is(public.check_handle('settings'), 'reserved', 'one of the app''s own addresses can''t be a username');
select is(public.check_handle('my.settings'), 'ok', 'an app address inside a longer name is fine');
select is(public.check_pen_name('Settings'), 'ok', 'a pen name has no address, so an app word is fine there');

-- 3. Swearwords.
select is(public.check_handle('f.u.c.k'), 'not_allowed', 'a listed word split by dots is refused');
select is(public.check_handle('sh1tlord'), 'not_allowed', 'a listed word with a digit for a letter is refused');
select is(public.check_handle('pizdă'), 'not_allowed', 'a Romanian listed word with a diacritic is refused');
select is(public.check_handle('peacock'), 'ok', 'a whole-word entry inside an ordinary word is fine');
select is(public.check_handle('populara'), 'ok', 'a Romanian whole-word entry inside an ordinary word is fine');
select is(public.check_pen_name('Ana Muie'), 'not_allowed', 'pen names get the same swearword check');
select is(public.check_pen_name('The Moderator'), 'looks_like_staff', 'pen names get the same staff check');

-- 4. Look-alikes and the web address.
select is(public.check_handle('TEEN_I7'), 'taken', 'a name that looks like teen_17 is taken');
select is(public.check_handle('adult_writer'), 'ok', 'your own username is yours');
select is(public.name_slug('Ștefan.Mаria'), 'stefan.maria', 'the web address folds diacritics and look-alikes');
reset role;
select throws_ok(
  $$ update public.profiles set handle = 'TEEN_I7' where id = '00000000-0000-4000-8000-000000000001' $$,
  '23505', null, 'the database itself refuses two usernames that look the same'
);

-- 5. Choosing and changing, as pending_check with no username yet.
update public.profiles set handle = null, pen_name = null where id = '00000000-0000-4000-8000-000000000005';
select is(public.account_state('00000000-0000-4000-8000-000000000005')::text, 'handle_missing',
  'until a username is chosen, the account can read but not write');
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000005", "role": "authenticated"}';
select is(public.set_my_handle('first.choice'), 'ok', 'the first username is saved');
select is(public.set_my_handle('second.choice'), 'ok', 'the first change after setup is allowed straight away');
select is(public.set_my_handle('third.choice'), 'too_soon', 'another change within 30 days is refused');
select is(public.set_my_pen_name('  Lia   Prima  '), 'ok', 'the first pen name is saved');
select is((select pen_name from public.profiles where id = (select auth.uid())), 'Lia Prima',
  'a pen name is stored trimmed, with single spaces');
select is(public.set_my_pen_name('Lia Doua'), 'ok', 'the first pen name change is allowed');
select is(public.set_my_pen_name(''), 'too_soon', 'removing it within 30 days is a change too, so it waits');
reset role;
select is(public.account_state('00000000-0000-4000-8000-000000000005')::text, 'active',
  'with a username, the adult account can write');
select results_eq(
  $$ select action, coalesce(before_values ->> 'handle', before_values ->> 'pen_name')
     from public.audit_log where target_user_id = '00000000-0000-4000-8000-000000000005' order by created_at, action $$,
  $$ values ('profile.handle_changed', 'first.choice'), ('profile.pen_name_changed', 'Lia Prima') $$,
  'the old username and pen name are kept in the audit log; the first choices aren''t logged as changes'
);

-- 6. Approving a false hit.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000011", "role": "authenticated"}';
select throws_ok(
  $$ select public.admin_approve_username('00000000-0000-4000-8000-000000000001', 'handle', 'Scunthorpe', 'A town') $$,
  '42501', null, 'support can''t approve a name'
);
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000010", "role": "authenticated"}';
select lives_ok(
  $$ select public.admin_approve_username('00000000-0000-4000-8000-000000000001', 'handle', 'Scunthorpe', 'A town in England, a false hit') $$,
  'a moderator approves one exact name refused by mistake'
);
select isnt_empty(
  $$ select id from public.username_approvals where approved_name = 'Scunthorpe' $$,
  'allowed: username_approvals_select_staff: a moderator reads the approval'
);
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}';
select is(public.check_handle('scunthorpe'), 'ok', 'the person can now take the approved name');
select is(public.check_handle('scunthorpes'), 'not_allowed', 'the approval covers that exact name only');
select is_empty(
  $$ select id from public.username_approvals $$,
  'denied: username_approvals_select_staff: a member reads no approvals'
);

-- 7. Who reads the name rules.
select is_empty($$ select id from public.reserved_names $$,
  'denied: reserved_names_select_admin: a member reads no reserved names');
select is_empty($$ select id from public.username_word_lists $$,
  'denied: username_word_lists_select_admin: a member reads no swearword lists');
select is_empty($$ select id from public.confusable_characters $$,
  'denied: confusable_characters_select_admin: a member reads no look-alike table');
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-000000000009", "role": "authenticated"}';
select isnt_empty($$ select id from public.reserved_names $$,
  'allowed: reserved_names_select_admin: an admin reads the reserved names');
select isnt_empty($$ select id from public.username_word_lists $$,
  'allowed: username_word_lists_select_admin: an admin reads the swearword lists');
select isnt_empty($$ select id from public.confusable_characters $$,
  'allowed: confusable_characters_select_admin: an admin reads the look-alike table');

select * from finish();

rollback;
