-- Staging top-up for CMS-1a (S1-E11-05): the staff already on staging read Română and English,
-- so both languages keep moderators on the rota. Safe to run twice; adds no accounts.
-- Paste into Supabase dashboard > staging project > SQL Editor > Run.
insert into public.staff_languages (user_id, language_code)
select staff_roles.user_id, languages.code
from public.staff_roles cross join public.languages
where languages.code in ('ro', 'en')
on conflict (user_id, language_code) do nothing;

-- Expect one row: languages_with_moderators 2.
select count(distinct staff_languages.language_code) as languages_with_moderators
from public.staff_languages;
