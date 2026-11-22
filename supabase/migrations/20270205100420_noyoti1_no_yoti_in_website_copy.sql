/*
 * Migration: takes Yoti out of the website's version 1 copy (bundle NO-YOTI-1; Robert, 22 Nov 2026,
 * 17:20 UTC: "remove any mentions of yoti until we get it").
 *
 * Why: the invited adults' test has no age check (decided 17 Oct 2026, 12:44), and Yoti isn't
 * signed yet, so the home page's safety line and two answers in the questions must not promise it.
 * What changes, in English and Romanian:
 *   - the home page's first safety line: the year of birth only, never a full date or a photo;
 *   - the answer to "How do you check my age?": the year of birth, no Yoti step;
 *   - the answer to "How do you keep people safe?": the Yoti sentence becomes the year of birth.
 * Only version 1 changes (user_id null: seeded, never saved by an admin), and only the exact
 * seeded sentences are swapped, so any wording staff already wrote stays as it is. Running it on
 * a database where the sentences are gone changes nothing.
 * When Yoti goes live (S1-E2-08), an admin writes the age check back into these texts in the
 * website CMS; no migration is needed for that.
 * Who reads the result: the home page and the questions (S1-E5-08, S1-E11-12) through the
 * published CMS views. Staging gets this with the migration; nothing to run by hand.
 */

/**
 * pg_temp.swap_seeded_sentence: replaces one exact sentence in every version 1 of one entry.
 * A temporary function, gone when the migration's session ends.
 * Inputs: the content kind, the entry key, the sentence as seeded and the new sentence.
 * The JSON is edited as text so the sentence is found wherever it sits (a line or an answer);
 * neither sentence holds a quote mark or a backslash, so the JSON stays valid.
 */
create function pg_temp.swap_seeded_sentence(
  swapped_kind text,
  swapped_key text,
  seeded_sentence text,
  new_sentence text
)
returns void
language sql
as $$
  update public.cms_versions
  set content = replace(content::text, seeded_sentence, new_sentence)::jsonb,
      updated_at = now()
  where content_kind = swapped_kind
    and entry_key = swapped_key
    and user_id is null
    and strpos(content::text, seeded_sentence) > 0;
$$;

/* ---------- 1. The home page's safety line ---------- */

select pg_temp.swap_seeded_sentence('home_page', 'home',
  'Yoti does the age check. We only get the result, never a photo.',
  'We ask only for your year of birth, never your full date of birth or a photo.');

select pg_temp.swap_seeded_sentence('home_page', 'home',
  'Yoti face verificarea vârstei. Noi primim doar rezultatul, niciodată o fotografie.',
  'Îți cerem doar anul nașterii, niciodată data completă a nașterii sau o fotografie.');

/* ---------- 2. "How do you check my age?" ---------- */

select pg_temp.swap_seeded_sentence('question', 'age-check',
  ' Then you do a short age check with Yoti, an age check service. We only get the result (old enough or not), never a photo. You’ll still confirm your age if you sign up with Google, Apple or Microsoft. Google, Apple and Microsoft don’t tell us how old you are.',
  ' We never ask for your full date of birth or a photo. You give your year of birth even if you sign up with Google, Apple or Microsoft, because they don’t tell us how old you are.');

select pg_temp.swap_seeded_sentence('question', 'age-check',
  ' Apoi faci o scurtă verificare a vârstei cu Yoti, un serviciu de verificare a vârstei. Noi primim doar rezultatul (ai vârsta potrivită sau nu), niciodată o fotografie. Îți confirmi vârsta și dacă te înscrii cu Google, Apple sau Microsoft, pentru că ei nu ne spun câți ani ai.',
  ' Nu îți cerem niciodată data completă a nașterii sau o fotografie. Îți spui anul nașterii și dacă te înscrii cu Google, Apple sau Microsoft, pentru că ei nu ne spun câți ani ai.');

/* ---------- 3. "How do you keep people safe?" ---------- */

select pg_temp.swap_seeded_sentence('question', 'keeping-safe',
  'Everyone gives their year of birth and does a Yoti age check.',
  'Everyone gives their year of birth.');

select pg_temp.swap_seeded_sentence('question', 'keeping-safe',
  'Toată lumea își spune anul nașterii și face verificarea vârstei cu Yoti.',
  'Toată lumea își spune anul nașterii.');
