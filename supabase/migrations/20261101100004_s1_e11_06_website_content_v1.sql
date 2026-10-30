/*
 * Migration: version 1 of the website's content, for the Romanian market in Română and English
 * (stories S1-E11-06 criterion 3, S1-E11-12 criterion 3; S1-E5-08).
 *
 * What it seeds, all published from 16 Oct 2026 (the day the copy went live) with no admin (user_id null marks version 1):
 *   - the home page: the hero live on 16 Oct 2026 ("Write stories. Get read."), the three short
 *     points, "Why write here", the safety lines and the questions heading (board Website-Home);
 *   - the eight questions from the same board, "What is a class space?" included, shown on the
 *     home page and in Help;
 *   - two help pages: "Getting started" and "Reporting and safety".
 * The product name is the {{productName}} placeholder, filled from the brand config when shown,
 * so a rename stays one change (decided 17 Oct 2026, 12:47).
 * The Romanian text is a first draft for Robert to read (Definition of Done). The answers about
 * the Yoti check and parental consent describe the public launch: an admin edits them before a
 * test where those aren't live yet (docs/board-fixes.md; S1-E11-12 legal note).
 * Staging gets this with the migration; nothing to run by hand.
 */

/**
 * seed_cms_version: one published version 1. A temporary function, gone when the migration's session ends.
 * Inputs: the kind, the entry, the language and the content.
 */
create function pg_temp.seed_cms_version(seeded_kind text, seeded_key text, seeded_language text, seeded_content jsonb)
returns void
language sql
as $$
  insert into public.cms_versions (content_kind, entry_key, market_code, language_code, content, status, show_from, published_at)
  values (seeded_kind, seeded_key, 'RO', seeded_language, seeded_content, 'published', date '2026-10-16', now());
$$;

/* ---------- The home page ---------- */

select pg_temp.seed_cms_version('home_page', 'home', 'en', jsonb_build_object(
  'eyebrow', 'Your stories. Your rights. Your readers.',
  'headlineFirst', 'Write stories.',
  'headlineSecond', 'Get read.',
  'underlinedWord', 'read',
  'lede', 'Post your stories, poems and essays, one chapter at a time, and find the people who want to read them.',
  'primaryButton', 'Start writing',
  'secondaryButton', 'Start reading',
  'points', jsonb_build_array('You keep your rights', 'No tracking ads', 'Free to read and write'),
  'whyHeading', 'You own your work. You decide where it goes.',
  'whyCards', jsonb_build_array(
    jsonb_build_object('title', 'You keep your rights',
      'body', 'Everything you write belongs to you. {{productName}} only gets permission to show it, and you can publish it anywhere else.'),
    jsonb_build_object('title', 'You choose where it’s read',
      'body', 'Share a story on the web and in the app, or in the app only for more privacy. Use a pen name if you don’t want to show your real name.'),
    jsonb_build_object('title', 'No tracking ads',
      'body', 'We don’t track what you read to choose ads. The few banners we show match the page and are the same for everyone.'),
    jsonb_build_object('title', 'Community-led writing',
      'body', 'Readers comment on paragraphs and writers help each other in forums and spaces. After launch, we plan to add an optional supporter plan so readers can choose to fund the writers they love.')),
  'safetyHeading', 'How we keep people safe',
  'safetyLines', jsonb_build_array(
    'Yoti does the age check. We only get the result, never a photo.',
    'Adults can never message anyone under 16. If you’re 16 or 17, messages from adults are off unless you turn them on.'),
  'questionsHeading', 'Before you join'));

select pg_temp.seed_cms_version('home_page', 'home', 'ro', jsonb_build_object(
  'eyebrow', 'Poveștile tale. Drepturile tale. Cititorii tăi.',
  'headlineFirst', 'Scrie povești.',
  'headlineSecond', 'Fii citit.',
  'underlinedWord', 'citit',
  'lede', 'Publică povești, poezii și eseuri, câte un capitol pe rând, și găsește oamenii care vor să le citească.',
  'primaryButton', 'Începe să scrii',
  'secondaryButton', 'Începe să citești',
  'points', jsonb_build_array('Îți păstrezi drepturile', 'Fără reclame care urmăresc', 'Gratuit la citit și scris'),
  'whyHeading', 'Ce scrii e al tău. Tu decizi unde ajunge.',
  'whyCards', jsonb_build_array(
    jsonb_build_object('title', 'Îți păstrezi drepturile',
      'body', 'Tot ce scrii îți aparține. {{productName}} primește doar permisiunea de a-l arăta, iar tu îl poți publica oriunde altundeva.'),
    jsonb_build_object('title', 'Tu alegi unde e citit',
      'body', 'Pune o poveste pe web și în aplicație sau doar în aplicație, pentru mai multă intimitate. Folosește un pseudonim dacă nu vrei să-ți arăți numele real.'),
    jsonb_build_object('title', 'Fără reclame care te urmăresc',
      'body', 'Nu urmărim ce citești ca să alegem reclame. Puținele bannere pe care le arătăm se potrivesc cu pagina și sunt la fel pentru toți.'),
    jsonb_build_object('title', 'O comunitate care scrie împreună',
      'body', 'Cititorii comentează pe paragrafe, iar scriitorii se ajută între ei în forumuri și spații. După lansare plănuim un abonament opțional de susținător, ca cititorii să-i poată sprijini pe scriitorii preferați.')),
  'safetyHeading', 'Cum avem grijă de toți',
  'safetyLines', jsonb_build_array(
    'Yoti face verificarea vârstei. Noi primim doar rezultatul, niciodată o fotografie.',
    'Adulții nu pot trimite niciodată mesaje cuiva sub 16 ani. Dacă ai 16 sau 17 ani, mesajele de la adulți sunt oprite până le pornești tu.'),
  'questionsHeading', 'Înainte să te înscrii'));

/* ---------- The questions ---------- */

-- Each question: its key, its order, whether it is legal wording (S1-E11-12 criterion 6), and the
-- English and Romanian question and answer.
with questions (question_key, position, is_legal, question_en, answer_en, question_ro, answer_ro) as (
  values
  ('who-owns-my-story', 1, false,
   'Who owns my story?',
   'You do. You keep all the rights to your work. You give {{productName}} permission to show it here, nothing more. You can publish it anywhere else too.',
   'Cui îi aparține povestea mea?',
   'Ție. Îți păstrezi toate drepturile asupra a ce scrii. Îi dai lui {{productName}} doar permisiunea de a arăta textul aici, nimic mai mult. Îl poți publica și oriunde altundeva.'),
  ('is-it-free', 2, false,
   'Is {{productName}} free?',
   'Yes. Reading and writing are free for everyone, and you never have to pay for either. Sponsors and a few small banners pay for {{productName}}.',
   'E {{productName}} gratuit?',
   'Da. Cititul și scrisul sunt gratuite pentru toată lumea și nu trebuie să plătești niciodată pentru ele. {{productName}} e plătit de sponsori și de câteva bannere mici.'),
  ('who-can-join', 3, true,
   'Who can join?',
   'Everyone aged 13 or older is welcome. We’re starting with students, but you don’t need to be one. If you’re 13, 14 or 15, a parent or guardian gives consent before your account opens. From 16, you can sign up on your own.',
   'Cine se poate înscrie?',
   'Oricine are cel puțin 13 ani. Începem cu elevii și studenții, dar nu trebuie să fii unul dintre ei. Dacă ai 13, 14 sau 15 ani, un părinte sau tutore își dă acordul înainte să se deschidă contul. De la 16 ani te poți înscrie singur.'),
  ('how-do-ads-work', 4, false,
   'How do ads work?',
   'Ads match the page you’re on, not you. Everyone sees the same ones, and we don’t track you to choose them. Ads never appear inside the text and never fill the screen. In a chapter, one banner shows after the last line.',
   'Cum funcționează reclamele?',
   'Reclamele se potrivesc cu pagina pe care ești, nu cu tine. Toți văd aceleași reclame și nu te urmărim ca să le alegem. Reclamele nu apar niciodată în interiorul textului și nu umplu niciodată ecranul. Într-un capitol, un singur banner apare după ultimul rând.'),
  ('supporting-writers', 5, false,
   'Can readers support writers?',
   'Not yet. After launch, we plan to try an optional supporter plan. Reading and writing stay free. Any money paid to writers will come only from readers who choose to become supporters.',
   'Pot cititorii să-i sprijine pe scriitori?',
   'Încă nu. După lansare plănuim să încercăm un abonament opțional de susținător. Cititul și scrisul rămân gratuite. Banii pentru scriitori vor veni doar de la cititorii care aleg să devină susținători.'),
  ('age-check', 6, true,
   'How do you check my age?',
   'When you sign up, you give your year of birth, and the month if we need it to work out your age. Then you do a short age check with Yoti, an age check service. We only get the result (old enough or not), never a photo. You’ll still confirm your age if you sign up with Google, Apple or Microsoft. Google, Apple and Microsoft don’t tell us how old you are.',
   'Cum îmi verificați vârsta?',
   'La înscriere îți spui anul nașterii și luna, dacă avem nevoie de ea ca să-ți aflăm vârsta. Apoi faci o scurtă verificare a vârstei cu Yoti, un serviciu de verificare a vârstei. Noi primim doar rezultatul (ai vârsta potrivită sau nu), niciodată o fotografie. Îți confirmi vârsta și dacă te înscrii cu Google, Apple sau Microsoft, pentru că ei nu ne spun câți ani ai.'),
  ('keeping-safe', 7, true,
   'How do you keep people safe?',
   'The minimum age is 13. Everyone gives their year of birth and does a Yoti age check. Under-16s need consent from a parent or guardian. Adults can never message anyone under 16. If you’re 16 or 17, messages from adults are off unless you turn them on. Stories are rated All ages, 13+, 16+ or 18+, and nobody sees a story rated above their age. A person reads every report, decides what happens and tells you why. You can [report something even without an account](/report).',
   'Cum aveți grijă de siguranța oamenilor?',
   'Vârsta minimă e 13 ani. Toată lumea își spune anul nașterii și face verificarea vârstei cu Yoti. Cei sub 16 ani au nevoie de acordul unui părinte sau tutore. Adulții nu pot trimite niciodată mesaje cuiva sub 16 ani. Dacă ai 16 sau 17 ani, mesajele de la adulți sunt oprite până le pornești tu. Poveștile au o clasificare (Toate vârstele, 13+, 16+ sau 18+) și nimeni nu vede o poveste pentru o vârstă mai mare decât a lui. Un om citește fiecare raportare, decide ce se întâmplă și îți spune de ce. Poți [raporta ceva chiar și fără cont](/report).'),
  ('class-space', 8, false,
   'What is a class space?',
   'A private space for one school class. A teacher with a Teacher badge creates it and gets an invite code. Only students with that code can join and see it. The class can share stories, run a writing contest and get certificates. Teachers get the badge when they set up their account, with a school email address or proof that they teach. Nothing in a class space shows on the public site, and there are never any ads or sponsors in it.',
   'Ce e un spațiu de clasă?',
   'Un spațiu privat pentru o singură clasă. Un profesor cu insigna Profesor îl creează și primește un cod de invitație. Doar elevii care au codul pot intra și îl pot vedea. Clasa poate împărtăși povești, poate organiza un concurs de scris și poate primi diplome. Profesorii primesc insigna când își fac contul, cu o adresă de email de la școală sau cu o dovadă că predau. Nimic dintr-un spațiu de clasă nu apare pe site-ul public și nu are niciodată reclame sau sponsori.')
)
select pg_temp.seed_cms_version('question', questions.question_key, versions.language_code,
  jsonb_build_object('question', versions.question, 'answer', versions.answer,
    'position', questions.position, 'showOn', 'both', 'isLegal', questions.is_legal))
from questions
cross join lateral (
  values ('en', questions.question_en, questions.answer_en), ('ro', questions.question_ro, questions.answer_ro)
) as versions (language_code, question, answer);

/* ---------- The help pages ---------- */

select pg_temp.seed_cms_version('help_page', 'getting-started', 'en', jsonb_build_object(
  'title', 'Getting started',
  'section', 'Start here',
  'isLegal', false,
  'body', $markdown$## Your account

Join with your email address and choose a username. You can add a pen name later if you'd rather not use your username on your stories.

## Writing your first story

1. Open **Write** and choose **New story**.
2. Give it a title, a category, a language and a rating.
3. Write chapter one. Your draft saves as you type, and nobody sees it until you publish.

## Reading

Open [Discover](/discover) to find stories by category, by what's popular or by what's new. Follow a writer to hear when they publish a new chapter.

## Need something else?

Read [how reporting works](/help/reporting-and-safety) or [write to us](/contact).
$markdown$));

select pg_temp.seed_cms_version('help_page', 'getting-started', 'ro', jsonb_build_object(
  'title', 'Primii pași',
  'section', 'Începe de aici',
  'isLegal', false,
  'body', $markdown$## Contul tău

Înscrie-te cu adresa de email și alege un nume de utilizator. Poți adăuga mai târziu un pseudonim, dacă nu vrei să apară numele de utilizator pe poveștile tale.

## Prima ta poveste

1. Deschide **Scrie** și alege **Poveste nouă**.
2. Dă-i un titlu, o categorie, o limbă și o clasificare.
3. Scrie primul capitol. Ciorna se salvează pe măsură ce scrii și nimeni nu o vede până nu o publici.

## Cititul

Deschide [Descoperă](/discover) ca să găsești povești după categorie, după ce e popular sau după ce e nou. Urmărește un scriitor ca să afli când publică un capitol nou.

## Ai nevoie de altceva?

Citește [cum funcționează raportările](/help/reporting-and-safety) sau [scrie-ne](/contact).
$markdown$));

select pg_temp.seed_cms_version('help_page', 'reporting-and-safety', 'en', jsonb_build_object(
  'title', 'Reporting and safety',
  'section', 'Safety',
  'isLegal', true,
  'body', $markdown$## Report something

Every story, chapter, comment and profile has a **Report** button. Choose what's wrong, add a few words if you like, and send it. A person on our moderation team reads every report.

You can also [report something without an account](/report). Authorities send removal orders through the same form.

## What happens next

A moderator decides what happens and tells you why. If we hide or remove something, the person who posted it gets a statement of reasons and can appeal. You can follow your reports in [My reports and decisions](/my-reports).

## If you're in danger

If you or someone else is in danger right now, call 112.
$markdown$));

select pg_temp.seed_cms_version('help_page', 'reporting-and-safety', 'ro', jsonb_build_object(
  'title', 'Raportări și siguranță',
  'section', 'Siguranță',
  'isLegal', true,
  'body', $markdown$## Raportează ceva

Fiecare poveste, capitol, comentariu și profil are un buton **Raportează**. Alege ce nu e în regulă, adaugă câteva cuvinte dacă vrei și trimite. Un om din echipa de moderare citește fiecare raportare.

Poți [raporta ceva și fără cont](/report). Autoritățile trimit ordinele de eliminare prin același formular.

## Ce se întâmplă apoi

Un moderator decide ce se întâmplă și îți spune de ce. Dacă ascundem sau eliminăm ceva, persoana care l-a publicat primește o motivare a deciziei și o poate contesta. Îți poți urmări raportările în [Raportările și deciziile mele](/my-reports).

## Dacă ești în pericol

Dacă tu sau altcineva sunteți în pericol chiar acum, sună la 112.
$markdown$));
