/*
 * Migration: the rules walkthrough for under-18s (bundle MUST-1, part c; IDEA-20261108-7,
 * "A short rules walkthrough before a teen's first comment or post").
 *
 * How it works: the first time someone under 18 presses Post on a comment or a forum post, four
 * short cards come up under the box (kindness, privacy, ratings, how to report or block), each
 * with Next and a way to skip. Whatever was typed stays in the box. Once the person reaches the
 * end or skips, the walkthrough never shows again.
 * What it adds:
 * - profiles.rules_walkthrough_seen_at: when the person finished or skipped it; null until then.
 * - needs_rules_walkthrough(): true for a signed-in person under 18 who hasn't seen it and may
 *   post (an account that can't post yet is told so by the box instead).
 * - finish_rules_walkthrough(): records that the signed-in person saw it (a second call keeps the
 *   first time).
 * - The four cards' text, as help pages in the CMS (entry keys rules-walkthrough-1-kindness to
 *   rules-walkthrough-4-report, section "Community rules"), in English and Romanian for the
 *   Romanian market, so staff edit them in Website › Help like any other help page (CLAUDE.md
 *   rule 4: website text comes only from the CMS). The walkthrough links to the full community
 *   guidelines (/legal/guidelines).
 * Who calls it: src/features/safety/ (useRulesWalkthrough and RulesWalkthrough, shown by the
 *   comment box and the forum reply and new thread forms).
 * Tests: supabase/tests/database/348-rules-walkthrough.test.sql.
 */

alter table public.profiles add column rules_walkthrough_seen_at timestamptz;
comment on column public.profiles.rules_walkthrough_seen_at is
  'When the person finished or skipped the rules walkthrough shown to under-18s before a first comment or post; null until then (MUST-1c).';

/*
 * needs_rules_walkthrough(): whether the signed-in person should see the rules walkthrough before
 * posting. Inputs: none (the caller). Returns true for someone under 18 (or of unknown age) who
 * hasn't finished or skipped it and may post (is_active_member(): a read-only account would only
 * reach "can't comment yet" after the cards, so it gets the box's own answer first); false for
 * adults, for anyone who has seen it, for a read-only account and when signed out.
 * Raises nothing. Called by the comment and forum post boxes before their first send.
 */
create function public.needs_rules_walkthrough()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select public.message_age_group(profiles) <> 'adult' and profiles.rules_walkthrough_seen_at is null
            and public.is_active_member()
     from public.profiles
     where profiles.id = (select auth.uid())),
    false);
$$;
comment on function public.needs_rules_walkthrough() is
  'True when the signed-in person is under 18, may post and hasn''t seen the rules walkthrough yet (MUST-1c).';
revoke all on function public.needs_rules_walkthrough() from public, anon;
grant execute on function public.needs_rules_walkthrough() to authenticated;

/*
 * finish_rules_walkthrough(): records that the signed-in person reached the end of the rules
 * walkthrough or skipped it, so it never shows again. Inputs: none. Returns nothing. Errors:
 * insufficient_privilege when signed out (require_live_profile). A second call keeps the first
 * time. Called by the walkthrough's Done and Skip buttons.
 */
create function public.finish_rules_walkthrough()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
begin
  -- Step 1: keep the first time; nothing else about the walkthrough is stored.
  update public.profiles
  set rules_walkthrough_seen_at = now()
  where profiles.id = caller_id
    and profiles.rules_walkthrough_seen_at is null;
end;
$$;
comment on function public.finish_rules_walkthrough() is
  'Records that the signed-in person finished or skipped the rules walkthrough (MUST-1c).';
revoke all on function public.finish_rules_walkthrough() from public, anon;
grant execute on function public.finish_rules_walkthrough() to authenticated;

/* ---------- The four cards, as help pages ---------- */

-- The same helper as the CMS seed (20261101100004): one published version of an entry for the
-- Romanian market, live from 16 Oct 2026. Visitors from a market with no page of its own see these
-- (decided 17 Oct 2026, 19:16). isLegal is true: the cards speak about privacy and reporting, so
-- the editor reminds staff that the wording has legal weight.
create function pg_temp.seed_rules_card(page_key text, language_code text, page_title text,
  page_section text, page_body text)
returns void
language sql
as $$
  insert into public.cms_versions
    (content_kind, entry_key, market_code, language_code, content, status, show_from, published_at)
  values ('help_page', page_key, 'RO', language_code,
    jsonb_build_object('title', page_title, 'section', page_section, 'isLegal', true,
      'body', page_body),
    'published', date '2026-10-16', now());
$$;

select pg_temp.seed_rules_card('rules-walkthrough-1-kindness', 'en', 'Be kind', 'Community rules',
  $markdown$Every story here was written by a real person. Say what worked for you and what didn’t, about the writing, never about the writer.

No insults, threats or pile-ons. If you wouldn’t say it to someone’s face, don’t post it.$markdown$);
select pg_temp.seed_rules_card('rules-walkthrough-1-kindness', 'ro', 'Fii amabil', 'Regulile comunității',
  $markdown$Fiecare poveste de aici e scrisă de un om real. Spune ce ți-a plăcut și ce nu, despre text, niciodată despre autor.

Fără insulte, amenințări sau atacuri în grup. Dacă n-ai spune-o cuiva în față, n-o posta.$markdown$);

select pg_temp.seed_rules_card('rules-walkthrough-2-privacy', 'en', 'Keep personal details private', 'Community rules',
  $markdown$Don’t share your phone number, email address, home address or school, and don’t ask anyone else for theirs.

If someone asks to move the chat somewhere else or to meet, tell an adult you trust and report it.$markdown$);
select pg_temp.seed_rules_card('rules-walkthrough-2-privacy', 'ro', 'Păstrează datele personale private', 'Regulile comunității',
  $markdown$Nu da numărul de telefon, adresa de e-mail, adresa de acasă sau școala și nu le cere altcuiva.

Dacă cineva îți cere să vorbiți în altă parte sau să vă întâlniți, spune unui adult în care ai încredere și raportează.$markdown$);

select pg_temp.seed_rules_card('rules-walkthrough-3-ratings', 'en', 'Ratings keep stories in the right place', 'Community rules',
  $markdown$Every story has a rating: All ages, 13+, 16+ or 18+. You only see stories rated for your age.

When you write, pick the rating that fits. If a story looks rated wrongly, report it.$markdown$);
select pg_temp.seed_rules_card('rules-walkthrough-3-ratings', 'ro', 'Clasificările țin poveștile la locul lor', 'Regulile comunității',
  $markdown$Fiecare poveste are o clasificare: Toate vârstele, 13+, 16+ sau 18+. Vezi doar poveștile potrivite vârstei tale.

Când scrii, alege clasificarea potrivită. Dacă o poveste pare clasificată greșit, raporteaz-o.$markdown$);

select pg_temp.seed_rules_card('rules-walkthrough-4-report', 'en', 'Report or block when something feels wrong', 'Community rules',
  $markdown$Every story, comment, post, message and profile has **Report**. The moderation team reads every report, and the person you report isn’t told who sent it.

**Block** means you don’t see each other’s stories, and they can’t find your profile, follow you or send you messages. They aren’t told.$markdown$);
select pg_temp.seed_rules_card('rules-walkthrough-4-report', 'ro', 'Raportează sau blochează când ceva nu e în regulă', 'Regulile comunității',
  $markdown$Fiecare poveste, comentariu, postare, mesaj și profil are **Raportează**. Echipa de moderare citește fiecare raport, iar persoana raportată nu află cine l-a trimis.

**Blochează** înseamnă că nu vă mai vedeți poveștile, iar persoana blocată nu-ți mai găsește profilul, nu te mai poate urmări și nu-ți poate trimite mesaje. Nu află că ai blocat-o.$markdown$);
