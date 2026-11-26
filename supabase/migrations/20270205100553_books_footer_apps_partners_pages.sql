/*
 * Migration: the footer's "About the apps" and "For partners" pages, as two landing pages staff
 * edit in the page builder (Robert, 25 Nov 2026, 09:50 UTC: "ensure that there are no missing
 * widgets between the pages from the canvas versus the one on the live site … and also how they
 * could be editable from the backend").
 *
 * Why: every board's footer draws "About the apps" under Read and "For partners" under Write and
 * talk; the live footer left both out because no page existed for them (src/app/navigation.ts).
 * Website page text comes only from the CMS (CLAUDE.md rule 4), so each page is a landing page of
 * type "information" at /c/apps and /c/partners, with draft copy in Romanian and English that
 * staff rewrite in Website › Landing pages (S1-E11-14, S1-E11-34). The copy names no product, so
 * a rename needs no change here.
 * What it adds: the two pages and one published version of each, live from 25 Nov 2026. Nothing
 * else changes: the public read is landing_page(), as for every other landing page.
 * Safe to run twice: a page that already exists keeps its own versions.
 * Who reads it: src/features/landing-pages (LandingPageScreen), linked from the footer.
 * Tests: supabase/tests/database/412-footer-pages.test.sql.
 */

/**
 * seed_information_page: adds one information landing page with a published version, unless a
 * page with that address already exists. Internal to this migration (dropped at the end).
 * Inputs: page_slug (the address after /c/) and page_content (the theme and blocks).
 * Errors: raises check_violation when the content would not pass the publish checks, so a copy
 * mistake stops the migration instead of reaching the site.
 */
create function pg_temp.seed_information_page(page_slug text, page_content jsonb)
returns void
language plpgsql
as $$
declare
  new_page_id uuid;
  content_problems text[];
begin
  -- Step 1: the same checks as Publish in the editor; nothing goes live with a problem.
  content_problems := public.landing_page_problems('information', page_content);
  if cardinality(content_problems) > 0 then
    raise exception 'The % page has problems: %', page_slug, content_problems
      using errcode = 'check_violation';
  end if;
  -- Step 2: the page itself, unless staff (or an earlier run) already made one at this address.
  insert into public.landing_pages (slug, page_type)
  values (page_slug, 'information')
  on conflict (slug) do nothing
  returning id into new_page_id;
  if new_page_id is null then
    return;
  end if;
  -- Step 3: one published version, live from the day the footer links arrive.
  insert into public.landing_page_versions (page_id, content, status, show_from, published_at)
  values (new_page_id, page_content, 'published', date '2026-11-25', now());
end;
$$;

/* ---------- About the apps (/c/apps) ---------- */

select pg_temp.seed_information_page('apps', $json${"theme": "plum", "blocks": [
  {"id": "apps-hero", "kind": "hero",
   "ro": {"title": "Aplicațiile", "intro": "Deocamdată suntem un site. Aplicațiile pentru telefon, tabletă și calculator vin după lansarea site-ului."},
   "en": {"title": "The apps", "intro": "For now we’re a website. Apps for phones, tablets and computers come after the web launch."}},
  {"id": "apps-cards", "kind": "cards",
   "ro": {"heading": "La ce să te aștepți", "entries": [
     {"title": "Un singur cont", "body": "Contul făcut pe site merge și în aplicații."},
     {"title": "Aceleași povești", "body": "Tot ce scrii sau salvezi pe site găsești și în aplicații."}]},
   "en": {"heading": "What to expect", "entries": [
     {"title": "One account", "body": "The account made on the website works in the apps too."},
     {"title": "The same stories", "body": "Everything written or saved on the website is there in the apps."}]}},
  {"id": "apps-start", "kind": "call_to_action",
   "ro": {"heading": "Începe pe site", "body": "Citește și scrie din browser, de azi.", "button_label": "Începe să citești"},
   "en": {"heading": "Start on the website", "body": "Read and write in a browser, from today.", "button_label": "Start reading"},
   "link": "/discover"}]}$json$::jsonb);

/* ---------- For partners (/c/partners) ---------- */

select pg_temp.seed_information_page('partners', $json${"theme": "plum", "blocks": [
  {"id": "partners-hero", "kind": "hero",
   "ro": {"title": "Lucrează cu noi", "intro": "Școli, biblioteci, edituri și sponsori: spune-ne ce ai în minte."},
   "en": {"title": "Work with us", "intro": "Schools, libraries, publishers and sponsors: tell us what you have in mind."}},
  {"id": "partners-cards", "kind": "cards",
   "ro": {"heading": "Cu cine lucrăm", "entries": [
     {"title": "Școli", "body": "Spații private pentru clase, unde elevii scriu și se citesc între ei, cu un profesor care le coordonează."},
     {"title": "Biblioteci și festivaluri", "body": "Luni ale scrisului, teme și concursuri pentru cititori."},
     {"title": "Sponsori", "body": "Reclame potrivite paginii, aceleași pentru toți, niciodată în mijlocul unei povești."}]},
   "en": {"heading": "Who we work with", "entries": [
     {"title": "Schools", "body": "Private class spaces where students write and read each other’s work, with a teacher in charge."},
     {"title": "Libraries and festivals", "body": "Writing months, prompts and contests for readers."},
     {"title": "Sponsors", "body": "Ads that match the page, the same for everyone, never inside a story."}]}},
  {"id": "partners-contact", "kind": "call_to_action",
   "ro": {"heading": "Scrie-ne", "body": "Fiecare mesaj e citit de un om.", "button_label": "Contactează-ne"},
   "en": {"heading": "Get in touch", "body": "A person reads every message.", "button_label": "Contact us"},
   "link": "/contact"}]}$json$::jsonb);

drop function pg_temp.seed_information_page(text, jsonb);
