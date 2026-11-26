/*
 * Migration: the three "Guides for a first story" on an empty Write page (board D04, user story
 * 5.4; Robert's ask of 25 Nov 2026 that every widget a board draws is built and can be changed
 * from the admin site).
 *
 * What it adds: three CMS help pages, each the shared page every country sees (no market_code,
 * LOCALISE-1), in English and Romanian, published from 16 Oct 2026 like the other seeded help
 * pages (g9a_writers_hub):
 *   first-story-1-first-chapter     "Your first chapter in 5 steps"    section Guide
 *   first-story-2-show-then-tell    "Show, then tell (a little)"       section Guide
 *   first-story-3-keeping-it-yours  "Keeping the work yours"           section Rights
 * Each carries a search description, which the Write page shows as the row's one line.
 * The empty Write page lists every live help page whose address starts with "first-story-", in
 * address order (src/features/writing/lib/firstStoryGuides.ts), so staff add, edit, reorder or
 * remove a guide in Staff › Website › Help (admin_* functions that write the audit log) with no
 * release. The pages also open at /help/<address> like every help page.
 * Rights wording follows decisions Q14 (16 Oct 2026: staff never edit a writer's words) and the
 * terms (S1-E14-01: a licence to show the work, nothing more); {{productName}} is filled from the
 * brand settings when the page is drawn, so a rename needs no change here.
 * Safe to run twice: each version is added only when that page has no version in that language.
 */
create function pg_temp.seed_guide(page_key text, language_code text, page_title text,
  page_section text, page_line text, page_body text)
returns void
language sql
as $$
  insert into public.cms_versions
    (content_kind, entry_key, market_code, language_code, content, status, show_from, published_at)
  select 'help_page', page_key, null, language_code,
    jsonb_build_object('title', page_title, 'section', page_section, 'isLegal', false,
      'body', page_body,
      'search', jsonb_build_object('title', '', 'description', page_line, 'hidden', false)),
    'published', date '2026-10-16', now()
  where not exists (
    select 1 from public.cms_versions existing
    where existing.content_kind = 'help_page'
      and existing.entry_key = page_key
      and existing.language_code = seed_guide.language_code
  );
$$;

/* ---------- 1. Your first chapter in 5 steps ---------- */

select pg_temp.seed_guide('first-story-1-first-chapter', 'en', 'Your first chapter in 5 steps',
  'Guide', 'Start late, end early, and give readers one question to carry.',
$markdown$A first chapter has one job: to make a reader want the second. These five steps get you there without a plan of the whole book.

## 1. Start late

Open as close to the moment things change as you can. Skip the alarm clock, the weather report and the drive to work, unless something goes wrong on the way. If your first page explains who everyone is, try cutting it and starting on page two. Readers forgive a little confusion; they don't forgive waiting.

## 2. Give readers one person to follow

Pick one character and stay with them. Let the reader see what this person wants right now, even if it is small: a seat on the bus, an answer to a letter, five minutes alone. A want gives every scene a direction.

## 3. Put something in the way

A want with nothing against it is a list of errands. Add one thing that pushes back: another person, a rule, a secret, the clock. The first chapter doesn't need the book's big problem yet, only a sign that trouble has started.

## 4. Leave out what the reader can work out

Trust readers with gaps. Show a cold cup of tea and a coat still on, and they will guess she has been sitting there a long time. Every line of explanation you cut leaves room for the reader to take part.

## 5. End early, on a question

Stop the chapter before the scene settles. End on a choice not yet made, a door not yet opened, a line that changes what came before. The question a reader carries into chapter two is the reason they come back.

## Before you publish

- Read the chapter out loud once. Where you stumble, readers will too.
- Cut the first paragraph and see if anything is lost. Often nothing is.
- Check the last line. Would you turn the page?

When you're ready, publish the chapter from the editor, or schedule it for later. Only you can see the story until then.
$markdown$);

select pg_temp.seed_guide('first-story-1-first-chapter', 'ro', 'Primul capitol în 5 pași',
  'Ghid', 'Începe târziu, termină devreme și lasă-i cititorului o întrebare de dus mai departe.',
$markdown$Un prim capitol are o singură treabă: să-l facă pe cititor să-l vrea pe al doilea. Acești cinci pași te duc acolo fără un plan al întregii cărți.

## 1. Începe târziu

Deschide cât mai aproape de momentul în care ceva se schimbă. Sari peste ceasul deșteptător, peste vreme și peste drumul spre serviciu, dacă nu se întâmplă ceva pe drum. Dacă prima pagină explică cine e fiecare, încearcă s-o tai și să începi cu pagina a doua. Cititorii iartă puțină confuzie; nu iartă așteptarea.

## 2. Dă-i cititorului un om de urmărit

Alege un personaj și rămâi cu el. Lasă-l pe cititor să vadă ce vrea omul acesta chiar acum, chiar dacă e ceva mic: un loc în autobuz, un răspuns la o scrisoare, cinci minute singur. O dorință dă fiecărei scene o direcție.

## 3. Pune ceva în cale

O dorință fără nimic împotrivă e o listă de treburi. Adaugă un lucru care se opune: alt om, o regulă, un secret, timpul. Primul capitol nu are nevoie încă de marea problemă a cărții, doar de un semn că necazul a început.

## 4. Lasă deoparte ce poate ghici cititorul

Ai încredere în cititori și lasă goluri. Arată un ceai rece și o haină încă pe umeri, iar ei vor ghici că ea stă acolo de mult. Fiecare rând de explicație pe care îl tai lasă loc cititorului să participe.

## 5. Termină devreme, cu o întrebare

Oprește capitolul înainte ca scena să se liniștească. Termină cu o alegere încă nefăcută, o ușă încă închisă, un rând care schimbă ce a fost înainte. Întrebarea pe care cititorul o duce în capitolul doi e motivul pentru care se întoarce.

## Înainte să publici

- Citește capitolul o dată cu voce tare. Unde te împiedici tu, se vor împiedica și cititorii.
- Taie primul paragraf și vezi dacă se pierde ceva. De multe ori, nu se pierde nimic.
- Verifică ultimul rând. Ai da pagina?

Când ești gata, publică capitolul din editor sau programează-l pentru mai târziu. Până atunci, doar tu vezi povestea.
$markdown$);

/* ---------- 2. Show, then tell (a little) ---------- */

select pg_temp.seed_guide('first-story-2-show-then-tell', 'en', 'Show, then tell (a little)',
  'Guide', 'When telling is fine, and when a scene does it better.',
$markdown$"Show, don't tell" is the most repeated writing advice there is, and it is only half right. Good stories do both. The skill is knowing which one a moment needs.

## Show the moments that matter

When something changes for a character, slow down and let the reader be there. Give them what the character sees, hears and does, and let them feel the change for themselves.

Telling: *Mara was furious with her brother.*

Showing: *Mara set the plate down so hard the fork jumped. "Fine," she said. "Keep it."*

The second asks the reader to notice, and noticing is what makes a scene stay with someone.

## Tell the parts in between

Not every hour deserves a scene. Travel, waiting, the three weeks before the exam: tell them in a line and move on. *They drove north for two days and barely spoke.* That sentence does in nine words what a scene would take pages to do, and the reader is grateful.

## Tell a little after you show

Sometimes one line of telling, right after a scene, makes it land. The reader has seen the moment; a short reflection gives it weight.

*Mara set the plate down so hard the fork jumped. "Fine," she said. "Keep it." It was the last thing she gave him for a year.*

The last sentence tells, but only because the scene earned it.

## A quick test

Look at a paragraph and ask: is this a moment that changes something? If yes, show it. If it only gets us from one moment to the next, tell it, briefly. If you're not sure, try both and read them out loud.
$markdown$);

select pg_temp.seed_guide('first-story-2-show-then-tell', 'ro', 'Arată, apoi spune (puțin)',
  'Ghid', 'Când e bine să spui și când o scenă face treaba mai bine.',
$markdown$„Arată, nu spune” e cel mai repetat sfat despre scris și e adevărat doar pe jumătate. Poveștile bune fac amândouă. Meșteșugul e să știi de care are nevoie fiecare moment.

## Arată momentele care contează

Când ceva se schimbă pentru un personaj, încetinește și lasă-l pe cititor să fie acolo. Dă-i ce vede, aude și face personajul și lasă-l să simtă singur schimbarea.

Spus: *Mara era furioasă pe fratele ei.*

Arătat: *Mara a pus farfuria jos atât de tare, încât furculița a sărit. „Bine”, a zis. „Păstreaz-o.”*

A doua variantă îi cere cititorului să observe, iar observația e ce face o scenă să rămână cu cineva.

## Spune ce e între ele

Nu fiecare oră merită o scenă. Drumurile, așteptarea, cele trei săptămâni dinaintea examenului: spune-le într-un rând și mergi mai departe. *Au condus spre nord două zile și aproape că n-au vorbit.* Fraza aceasta face în câteva cuvinte ce ar lua pagini întregi unei scene, iar cititorul îți mulțumește.

## Spune puțin după ce arăți

Uneori, un singur rând spus, imediat după o scenă, o face să cântărească. Cititorul a văzut momentul; o reflecție scurtă îi dă greutate.

*Mara a pus farfuria jos atât de tare, încât furculița a sărit. „Bine”, a zis. „Păstreaz-o.” A fost ultimul lucru pe care i l-a dat timp de un an.*

Ultima frază spune, dar doar pentru că scena a meritat-o.

## Un test rapid

Uită-te la un paragraf și întreabă-te: e un moment care schimbă ceva? Dacă da, arată-l. Dacă doar ne duce de la un moment la altul, spune-l, pe scurt. Dacă nu ești sigur, încearcă-le pe amândouă și citește-le cu voce tare.
$markdown$);

/* ---------- 3. Keeping the work yours ---------- */

select pg_temp.seed_guide('first-story-3-keeping-it-yours', 'en', 'Keeping the work yours',
  'Rights', 'What {{productName}} may do with a story, and what it never can.',
$markdown$Before you publish, it helps to know where you stand. The short version: the story stays yours.

## What {{productName}} may do

- **Show it to readers**, where you choose: everyone, only people with the link, or nobody yet.
- **Make a preview** of it when you share a link, so the link shows the title and the opening lines.
- **Hide it or cut out one passage** if it breaks the law or the [community guidelines](/legal/guidelines). A moderator leaves "[Removed by the moderation team]" where the passage was, and tells you why. You can appeal.

## What {{productName}} never can

- **Change your words.** Staff never edit a writer's text, not even if you ask. You make every change yourself.
- **Sell, print or translate it**, or give it to anyone else. If that ever comes up, you are asked first, separately and in writing, and you can say no.
- **Claim it.** You keep the copyright and your rights as an author: to be named the way you choose and to have the work kept whole.

## What you can always do

- **Change who can read it** in Story settings, at any time.
- **Take it with you**: download every story as a file whenever you like.
- **Delete it.** A deleted story stays in Recently deleted for 30 days, then it is gone for good.

The full answers are on [Writers' rights](/help/writers-rights), and the [terms](/legal/terms) say it in legal words.
$markdown$);

select pg_temp.seed_guide('first-story-3-keeping-it-yours', 'ro', 'Opera rămâne a ta',
  'Drepturi', 'Ce poate face {{productName}} cu o poveste și ce nu poate niciodată.',
$markdown$Înainte să publici, e bine să știi unde te afli. Pe scurt: povestea rămâne a ta.

## Ce poate face {{productName}}

- **O arată cititorilor**, unde alegi tu: tuturor, doar celor care au linkul sau nimănui deocamdată.
- **Face o previzualizare** când trimiți un link, ca linkul să arate titlul și primele rânduri.
- **O ascunde sau taie un singur pasaj** dacă încalcă legea sau [regulile comunității](/legal/guidelines). Un moderator lasă „[Eliminat de echipa de moderare]” în locul pasajului și îți spune de ce. Poți contesta decizia.

## Ce nu poate face {{productName}} niciodată

- **Să-ți schimbe cuvintele.** Echipa nu editează niciodată textul unui scriitor, nici dacă o rogi. Fiecare schimbare o faci tu.
- **Să o vândă, să o tipărească sau să o traducă** ori să o dea altcuiva. Dacă se pune vreodată problema, ești întrebat întâi, separat și în scris, și poți spune nu.
- **Să și-o însușească.** Păstrezi drepturile de autor și drepturile morale: să fii numit cum alegi și ca opera să rămână întreagă.

## Ce poți face oricând

- **Schimbi cine o poate citi**, din Setările poveștii, oricând.
- **O iei cu tine**: descarci fiecare poveste ca fișier oricând vrei.
- **O ștergi.** O poveste ștearsă stă 30 de zile în Șterse recent, apoi dispare definitiv.

Răspunsurile complete sunt în [Drepturile scriitorilor](/help/writers-rights), iar [termenii](/legal/terms) le spun în limbaj juridic.
$markdown$);
