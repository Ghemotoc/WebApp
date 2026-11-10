-- g9a_writers_hub: what the Writers' hub and the Resources page read from the database.
--
-- Story: bundle G9 WRITING, part a (the liquid glass redesign; boards WritersHub and
-- PhoneAppResources). Robert, 9 Nov 2026, 12:09 UTC: a separate Resources page from the avatar
-- menu, with the writer's rights and how to use the platform as questions and answers. 12:11 UTC:
-- step-by-step how-to guides inside Resources, about using the platform, not about how to write.
-- Who calls it: Supabase applies it with the other migrations (locally on `npx supabase db reset`,
-- on staging through the GitHub integration when main changes).
-- What it changes:
--   1. writers_hub_contests(): the contests a signed-in writer can enter today, for the hub's
--      "Open now" card. Members can't read the contests table (contests_select_staff), so the hub
--      asks this one function, which uses the same checks as entering (S1-E11-15).
--   2. Fifteen how-to guides and a rights page, seeded as published CMS help pages for the
--      Romanian market in English and Romanian (CLAUDE.md rule 4: help text comes only from the
--      CMS, so admins can edit every word from Staff › Website without a release).

/* ---------- 1. The open contests on the Writers' hub ---------- */

/**
 * writers_hub_contests: the contests the signed-in writer can enter today.
 * Inputs: none; the writer is the caller (auth.uid()).
 * Returns: one row per contest that is open, inside its entry window and whose age groups and
 *   markets include the caller, with the landing page's address (/c/<page_slug>) and the dates and
 *   limits the hub shows. Soonest closing first. Nothing for a visitor who isn't signed in.
 * Errors: none. Where it fits: the Writers' hub (src/features/hub/) calls it through
 *   useHubContests(); writers enter from their story's settings (contest_entry_options()).
 */
create or replace function public.writers_hub_contests()
returns table (
  contest_id uuid,
  name_ro text,
  name_en text,
  page_slug text,
  entries_close_on date,
  word_limit integer,
  prize_ro text,
  prize_en text
)
language sql
stable
security definer
set search_path = ''
as $$
  select contests.id, contests.name_ro, contests.name_en, pages.slug,
    contests.entries_close_on, contests.word_limit, contests.prize_ro, contests.prize_en
  from public.contests
  join public.landing_pages as pages on pages.id = contests.landing_page_id
  -- Step 1: only signed-in writers; a visitor sees the contest on its landing page instead.
  where (select auth.uid()) is not null
    -- Step 2: the contest takes entries today and its landing page still shows.
    and public.contest_takes_entries_today(contests)
    and pages.archived_at is null
    -- Step 3: the writer's age group and market are among the contest's (criterion 1).
    and public.contest_writer_fits(contests)
  order by contests.entries_close_on, contests.name_en;
$$;

comment on function public.writers_hub_contests() is
  'The contests the signed-in writer can enter today, for the Writers'' hub (G9a; S1-E11-15 rules).';
revoke execute on function public.writers_hub_contests() from public, anon;
grant execute on function public.writers_hub_contests() to authenticated;

/* ---------- 2. The how-to guides and the rights page ---------- */

-- The same helper as the CMS seed (20261101100004): one published version of an entry for the
-- Romanian market, live from 16 Oct 2026. Visitors from a market with no page of its own see these
-- (decided 17 Oct 2026, 19:16).
create function pg_temp.seed_help_page(page_key text, language_code text, page_title text,
  page_section text, page_body text)
returns void
language sql
as $$
  insert into public.cms_versions
    (content_kind, entry_key, market_code, language_code, content, status, show_from, published_at)
  values ('help_page', page_key, 'RO', language_code,
    jsonb_build_object('title', page_title, 'section', page_section, 'isLegal', false,
      'body', page_body),
    'published', date '2026-10-16', now());
$$;

-- Start a story and publish a chapter.
select pg_temp.seed_help_page('how-to-start-a-story', 'en', 'Start a story and publish a chapter',
  'How-to guides', $markdown$A story starts as a private draft. Nobody sees it until a chapter is published.

## Start the story

1. Open [Write](/write) and choose **+ New story**.
2. Give it a title and, if you like, a blurb: a few lines readers see before they open it.
3. Choose the language of the story, a category and up to a few tags.
4. Pick a rating. [Ratings and labels](/help/how-to-ratings-and-labels) explains each one.
5. Choose a cover, or leave the automatic one. [Covers and pictures](/help/how-to-covers-and-pictures) has the choices.
6. Press **Create and write chapter one**.

## Write and publish chapter one

1. Write the chapter. The draft saves as you type; wait for "Saved" before you leave.
2. Under **Publish**, keep **Publish now** and press **Publish chapter**.
3. The story is now public, and followers get a notification.

## Add more chapters

Open the story's **Manage chapters** from [Write](/write) and choose **New chapter**. To publish a chapter later instead, see [Schedule chapters](/help/how-to-schedule-chapters).
$markdown$);

select pg_temp.seed_help_page('how-to-start-a-story', 'ro', 'Începe o poveste și publică un capitol',
  'Ghiduri pas cu pas', $markdown$O poveste începe ca ciornă privată. Nimeni nu o vede până nu publici un capitol.

## Începe povestea

1. Deschide [Scrie](/write) și alege **+ Poveste nouă**.
2. Dă-i un titlu și, dacă vrei, o descriere scurtă: câteva rânduri pe care cititorii le văd înainte s-o deschidă.
3. Alege limba poveștii, o categorie și câteva etichete.
4. Alege o clasificare. [Clasificări și etichete](/help/how-to-ratings-and-labels) explică fiecare variantă.
5. Alege o copertă sau păstrează coperta automată. [Coperte și imagini](/help/how-to-covers-and-pictures) arată variantele.
6. Apasă **Creează și scrie primul capitol**.

## Scrie și publică primul capitol

1. Scrie capitolul. Ciorna se salvează pe măsură ce scrii; așteaptă „Salvat” înainte să pleci.
2. La **Publicare**, lasă **Publică acum** și apasă **Publică capitolul**.
3. Povestea e acum publică, iar cei care te urmăresc primesc o notificare.

## Adaugă alte capitole

Deschide **Gestionează capitolele** pentru poveste, din [Scrie](/write), și alege **Capitol nou**. Ca să publici un capitol mai târziu, citește [Programează capitole](/help/how-to-schedule-chapters).
$markdown$);

-- Schedule chapters.
select pg_temp.seed_help_page('how-to-schedule-chapters', 'en', 'Schedule chapters',
  'How-to guides', $markdown$Write ahead and let chapters go live on their own, on the day and at the time you pick.

## Schedule a chapter

1. Open the chapter in the editor.
2. Under **Publish**, choose **Schedule for later**.
3. Pick the date and the time. Times are Romania time, and the chapter goes live within 5 minutes of it.
4. Press **Schedule chapter**.

The chapter shows as **Scheduled** in **Manage chapters**, with the time it goes live. You can schedule up to a year ahead.

## Change or cancel it

Open the chapter again. Pick a new time and schedule it again, or press **Cancel schedule** to keep it as a draft.

## Change the order

In **Manage chapters**, drag a chapter by its handle or use the up and down arrows. Chapter numbers follow the order.
$markdown$);

select pg_temp.seed_help_page('how-to-schedule-chapters', 'ro', 'Programează capitole',
  'Ghiduri pas cu pas', $markdown$Scrie din timp și lasă capitolele să apară singure, în ziua și la ora pe care le alegi.

## Programează un capitol

1. Deschide capitolul în editor.
2. La **Publicare**, alege **Programează pentru mai târziu**.
3. Alege data și ora. Orele sunt ora României, iar capitolul apare în cel mult 5 minute după ora aleasă.
4. Apasă **Programează capitolul**.

Capitolul apare ca **Programat** în **Gestionează capitolele**, cu ora la care se publică. Poți programa cu cel mult un an înainte.

## Schimbă sau anulează programarea

Deschide din nou capitolul. Alege altă oră și programează-l din nou, sau apasă **Anulează programarea** ca să rămână ciornă.

## Schimbă ordinea

În **Gestionează capitolele**, trage capitolul de mâner sau folosește săgețile în sus și în jos. Numerele capitolelor urmează ordinea.
$markdown$);

-- Covers and pictures.
select pg_temp.seed_help_page('how-to-covers-and-pictures', 'en', 'Covers and pictures',
  'How-to guides', $markdown$Every story has a cover, and chapters can hold pictures. Every picture is checked before anyone else sees it.

## Choose a cover

- **Automatic cover**: made for you from the title. Nothing to do.
- **Draw a cover**: pick one of the backgrounds, then **Change the colours** if you like. A drawn cover needs no picture rights and shows straight away.
- **Upload a picture**: save the story first, then upload the picture in **Story settings**.
- **Canva**: in **Story settings**, connect your own Canva account and design a cover there. It comes back here when you press Return in Canva.

You can change the cover at any time in **Story settings**.

## Add a picture to a chapter

1. In the chapter editor, put the cursor where the picture should go.
2. Press **Insert**, choose **Picture** and pick the file.
3. Write its alt text: a short description for readers who can't see it. Alt text is required.

## What's allowed

- Pictures of places and things, drawings and designs are fine.
- Never a picture of a real person.
- Only pictures you made or have the right to use.

## The picture check

Every picture is checked automatically when it's uploaded. A moderator also looks at every picture in an All ages or 13+ story, and at every picture a writer under 16 uploads, before anyone else sees it. Until then readers see "Picture being checked".
$markdown$);

select pg_temp.seed_help_page('how-to-covers-and-pictures', 'ro', 'Coperte și imagini',
  'Ghiduri pas cu pas', $markdown$Fiecare poveste are o copertă, iar capitolele pot avea imagini. Fiecare imagine e verificată înainte s-o vadă altcineva.

## Alege o copertă

- **Coperta automată**: e făcută din titlu. Nu ai nimic de făcut.
- **Desenează o copertă**: alege unul dintre fundaluri, apoi **Schimbă culorile** dacă vrei. O copertă desenată nu are nevoie de drepturi pentru imagini și apare imediat.
- **Încarcă o imagine**: salvează mai întâi povestea, apoi încarcă imaginea din **Setările poveștii**.
- **Canva**: din **Setările poveștii**, conectează-ți contul Canva și fă coperta acolo. Se întoarce aici când apeși Return în Canva.

Poți schimba coperta oricând din **Setările poveștii**.

## Adaugă o imagine într-un capitol

1. În editorul de capitol, pune cursorul unde vrei imaginea.
2. Apasă **Inserează**, alege **Imagine** și alege fișierul.
3. Scrie-i textul alternativ: o descriere scurtă pentru cititorii care nu o pot vedea. Textul alternativ e obligatoriu.

## Ce e permis

- Imagini cu locuri și lucruri, desene și grafică.
- Niciodată imaginea unei persoane reale.
- Doar imagini făcute de tine sau pe care ai dreptul să le folosești.

## Verificarea imaginilor

Fiecare imagine e verificată automat la încărcare. Un moderator se uită și la fiecare imagine dintr-o poveste Toate vârstele sau 13+ și la fiecare imagine încărcată de un scriitor sub 16 ani, înainte s-o vadă altcineva. Până atunci, cititorii văd „Imaginea se verifică”.
$markdown$);

-- Ratings and labels.
select pg_temp.seed_help_page('how-to-ratings-and-labels', 'en', 'Ratings and labels',
  'How-to guides', $markdown$The rating says who a story is for. Nobody sees a story rated above their age.

## The four ratings

| Rating | Who can read it |
| --- | --- |
| All ages | Every reader, children included |
| 13+ | Readers 13 and over |
| 16+ | Readers 16 and over |
| 18+ | Adults only |

Writers under 16 can rate a story All ages or 13+.

## Choose the rating

1. When you start a story, or later in **Story settings**, find **Labels**.
2. Pick the **Rating**.
3. For 13+ and above, tick every reason that applies, for example strong language or dark themes. Readers see the reasons before they start.

## The other labels

- **Fan fiction** and **Parody**, when the story builds on someone else's work.
- **Deals with abuse or coercion**, so readers can choose.
- **Content note**: a few words of your own about what's in the story.
- **Did you use AI?**: say whether and how AI helped.

If a moderator thinks a rating is wrong, they can change it and tell you why. They never change the words of the story.
$markdown$);

select pg_temp.seed_help_page('how-to-ratings-and-labels', 'ro', 'Clasificări și etichete',
  'Ghiduri pas cu pas', $markdown$Clasificarea spune cui i se adresează povestea. Nimeni nu vede o poveste clasificată pentru o vârstă mai mare decât a lui.

## Cele patru clasificări

| Clasificare | Cine o poate citi |
| --- | --- |
| Toate vârstele | Orice cititor, inclusiv copii |
| 13+ | Cititori de 13 ani și peste |
| 16+ | Cititori de 16 ani și peste |
| 18+ | Doar adulți |

Scriitorii sub 16 ani pot alege pentru o poveste doar Toate vârstele sau 13+.

## Alege clasificarea

1. Când începi o poveste, sau mai târziu din **Setările poveștii**, găsește **Etichete**.
2. Alege **Clasificarea**.
3. De la 13+ în sus, bifează fiecare motiv care se potrivește, de exemplu limbaj vulgar sau teme întunecate. Cititorii văd motivele înainte să înceapă.

## Celelalte etichete

- **Fan fiction** și **Parodie**, când povestea pornește de la opera altcuiva.
- **Vorbește despre abuz sau constrângere**, ca cititorii să poată alege.
- **Notă de conținut**: câteva cuvinte proprii despre ce e în poveste.
- **Ai folosit AI?**: spune dacă și cum te-a ajutat AI.

Dacă un moderator crede că o clasificare nu e potrivită, o poate schimba și îți spune de ce. Nu schimbă niciodată cuvintele poveștii.
$markdown$);

-- Report something.
select pg_temp.seed_help_page('how-to-report-something', 'en', 'Report something',
  'How-to guides', $markdown$If something breaks the rules or the law, report it. A person on our moderation team reads every report.

## Report from the app

1. Find the **Report** button next to the story, chapter, comment, profile, picture, message, thread, post or space.
2. Under **What's wrong?**, pick the reason that fits best.
3. Add a few words under **Anything else? (optional)** if they help.
4. Press **Send report**.

The person you report isn't told who reported them.

## Without an account

Anyone can use the [public report form](/report). Authorities send removal orders through the same form.

## What happens next

A moderator decides what happens and tells you. Follow every report in [My reports and decisions](/my-reports). [Reporting and safety](/help/reporting-and-safety) explains decisions and appeals.

If you or someone else is in danger right now, call 112.
$markdown$);

select pg_temp.seed_help_page('how-to-report-something', 'ro', 'Raportează ceva',
  'Ghiduri pas cu pas', $markdown$Dacă ceva încalcă regulile sau legea, raportează. Un om din echipa de moderare citește fiecare raportare.

## Raportează din aplicație

1. Găsește butonul **Raportează** lângă poveste, capitol, comentariu, profil, imagine, mesaj, discuție, postare sau spațiu.
2. La **Ce nu e în regulă?**, alege motivul care se potrivește cel mai bine.
3. Adaugă câteva cuvinte la **Altceva? (opțional)**, dacă ajută.
4. Apasă **Trimite raportarea**.

Persoana raportată nu află cine a raportat-o.

## Fără cont

Oricine poate folosi [formularul public de raportare](/report). Autoritățile trimit ordinele de eliminare prin același formular.

## Ce se întâmplă apoi

Un moderator decide ce se întâmplă și îți spune. Îți urmărești raportările în [Raportările și deciziile mele](/my-reports). [Raportări și siguranță](/help/reporting-and-safety) explică deciziile și contestațiile.

Dacă tu sau altcineva sunteți în pericol chiar acum, sună la 112.
$markdown$);

-- Block someone.
select pg_temp.seed_help_page('how-to-block-someone', 'en', 'Block someone',
  'How-to guides', $markdown$Blocking is instant, and the other person isn't told.

## Block from a profile

1. Open the person's profile.
2. Under **Something wrong here?**, press **Block** with their name.
3. Press **Block** again to confirm.

## Block from a chat

In **Messages**, open the chat and press **Block**.

## What a block does

- You won't see each other's profiles, stories or chapters.
- Neither of you can follow the other, and any follow between you ends.
- They can't message you.

## Unblock

Press **Unblock** on their profile, or open **Blocked accounts** in [Settings](/settings#privacy).

If someone is breaking the rules, [report them](/help/how-to-report-something) too, so a moderator can act.
$markdown$);

select pg_temp.seed_help_page('how-to-block-someone', 'ro', 'Blochează pe cineva',
  'Ghiduri pas cu pas', $markdown$Blocarea are loc imediat, iar cealaltă persoană nu află.

## Blochează de pe profil

1. Deschide profilul persoanei.
2. La **Ceva nu e în regulă aici?**, apasă **Blochează** cu numele ei.
3. Apasă din nou **Blochează** ca să confirmi.

## Blochează dintr-o conversație

În **Mesaje**, deschide conversația și apasă **Blochează**.

## Ce face blocarea

- Nu vă mai vedeți unul altuia profilurile, poveștile sau capitolele.
- Niciunul nu-l poate urmări pe celălalt, iar urmăririle dintre voi se încheie.
- Nu-ți mai poate scrie.

## Deblochează

Apasă **Deblochează** pe profilul persoanei sau deschide **Conturi blocate** din [Setări](/settings#privacy).

Dacă cineva încalcă regulile, [raportează-l](/help/how-to-report-something) și pe el, ca un moderator să poată interveni.
$markdown$);

-- Follow writers.
select pg_temp.seed_help_page('how-to-follow-writers', 'en', 'Follow writers and stories',
  'How-to guides', $markdown$Follow a writer or a story to hear when something new comes out.

## Follow a writer

1. Open the writer's profile, from their name on a story or a comment.
2. Press **Follow**. The button now says **Following**.
3. You get a notification when they publish a new chapter. Press **Following** again to stop.

## Follow a story

1. Open the story's page.
2. Press **Follow story**. You hear about new chapters of that story only.

## Notifications

New chapters show under the bell in the top bar. Choose which ones also come by email under **Notifications** in [Settings](/settings#notifications).

$markdown$);

select pg_temp.seed_help_page('how-to-follow-writers', 'ro', 'Urmărește scriitori și povești',
  'Ghiduri pas cu pas', $markdown$Urmărește un scriitor sau o poveste ca să afli când apare ceva nou.

## Urmărește un scriitor

1. Deschide profilul scriitorului, de la numele lui de pe o poveste sau un comentariu.
2. Apasă **Urmărește**. Butonul arată acum **Urmărești**.
3. Primești o notificare când publică un capitol nou. Apasă din nou **Urmărești** ca să te oprești.

## Urmărește o poveste

1. Deschide pagina poveștii.
2. Apasă **Urmărește povestea**. Afli doar despre capitolele noi ale acelei povești.

## Notificări

Capitolele noi apar la clopoțelul din bara de sus. Alege care vin și pe email la **Notificări**, în [Setări](/settings#notifications).

$markdown$);

-- Comments and reactions.
select pg_temp.seed_help_page('how-to-comments-and-reactions', 'en', 'Comments, likes and reactions',
  'How-to guides', $markdown$Tell writers what you thought. Be kind: every report is read by a person.

## Like a chapter

At the end of a chapter, press **Like this chapter**.

## Comment

1. Under the chapter, write in **Add a comment**.
2. If it gives something away, tick **Hide as a spoiler**.
3. Press **Post comment**.

To talk about one paragraph, choose **Comment on this paragraph** beside it. To answer someone, press **Reply** under their comment.

## React

Press **Add a reaction** on a comment and pick one: Heart, Fire, Laugh, Wow, Sad or Star. Press it again to take it back.

## Writers

Writers can turn comments off for a story in **Story settings**. Comments that break the rules can be [reported](/help/how-to-report-something).
$markdown$);

select pg_temp.seed_help_page('how-to-comments-and-reactions', 'ro', 'Comentarii, aprecieri și reacții',
  'Ghiduri pas cu pas', $markdown$Spune-le scriitorilor ce ți-a plăcut. Fii blând: fiecare raportare e citită de un om.

## Apreciază un capitol

La sfârșitul capitolului, apasă **Apreciază capitolul**.

## Comentează

1. Sub capitol, scrie la **Adaugă un comentariu**.
2. Dacă dezvăluie ceva din poveste, bifează **Ascunde ca spoiler**.
3. Apasă **Publică comentariul**.

Ca să vorbești despre un singur paragraf, alege **Comentează acest paragraf** lângă el. Ca să-i răspunzi cuiva, apasă **Răspunde** sub comentariul lui.

## Reacționează

Apasă **Adaugă o reacție** la un comentariu și alege una: Inimă, Foc, Râs, Uau, Trist sau Stea. Apasă din nou ca s-o retragi.

## Pentru scriitori

Scriitorii pot opri comentariile la o poveste din **Setările poveștii**. Comentariile care încalcă regulile pot fi [raportate](/help/how-to-report-something).
$markdown$);

-- Forums and spaces.
select pg_temp.seed_help_page('how-to-forums-and-spaces', 'en', 'Forums and spaces',
  'How-to guides', $markdown$Forums are for talking about writing and reading. Spaces are smaller groups that members start themselves.

## Start a thread

1. Open **Forums** in the top bar and choose a forum.
2. Choose **New thread**, give it a title and write the first post.
3. Press **Post the thread**.

Answer a thread with **Reply** at the bottom.

## Join a space

Open a space and press **Join space**. Some spaces let you in straight away; in others the owner approves new members.

## Create a space

1. Open **Forums**, then **Spaces** in the side column, and choose **Create a space**.
2. Give it a name, a description and, if you like, rules. Choose who can read, who can post and how people join.
3. Press **Create space**. You become its owner and can choose moderators to help.

Spaces keep age groups apart: a space started by someone under 16 takes only under-16s, and a space started by someone 16 or over takes only people 16 and over.
$markdown$);

select pg_temp.seed_help_page('how-to-forums-and-spaces', 'ro', 'Forumuri și spații',
  'Ghiduri pas cu pas', $markdown$Forumurile sunt pentru discuții despre scris și citit. Spațiile sunt grupuri mai mici, pornite chiar de membri.

## Pornește o discuție

1. Deschide **Forumuri** din bara de sus și alege un forum.
2. Alege **Discuție nouă**, dă-i un titlu și scrie prima postare.
3. Apasă **Publică discuția**.

Răspunde într-o discuție cu **Răspuns**, în partea de jos.

## Intră într-un spațiu

Deschide un spațiu și apasă **Intră în spațiu**. Unele spații te primesc imediat; în altele, proprietarul aprobă membrii noi.

## Creează un spațiu

1. Deschide **Forumuri**, apoi **Spații** din coloana laterală, și alege **Creează un spațiu**.
2. Dă-i un nume, o descriere și, dacă vrei, reguli. Alege cine poate citi, cine poate posta și cum intră oamenii.
3. Apasă **Creează spațiul**. Devii proprietarul lui și poți alege moderatori care să te ajute.

Spațiile țin grupele de vârstă separat: un spațiu pornit de cineva sub 16 ani primește doar membri sub 16 ani, iar unul pornit de cineva de 16 ani sau peste primește doar oameni de 16 ani și peste.
$markdown$);

-- Messages.
select pg_temp.seed_help_page('how-to-messages', 'en', 'Messages',
  'How-to guides', $markdown$Private messages are between two people. Moderators read them only when one of you reports a message.

## Start a chat

1. Open **Messages** and choose **Start a new chat**, or press **Message** on someone's profile.
2. Type their username: the name after @ on the profile.
3. Press **Open chat**, write and press **Send**.

## Message requests

A first message from someone you don't follow arrives under **Requests**. They can't send more until you press **Accept request**. **Delete request** removes it without telling them; **No thanks** sends a short, kind reply for you.

## Who can message you

Choose it under **Who can message you** in [Settings](/settings#messages).

- Adults can never message anyone under 16.
- At 16 or 17, messages from adults stay off unless you turn them on.

## Something wrong?

Press **Report** on a message, or **Block** to stop the chat. See [Block someone](/help/how-to-block-someone).
$markdown$);

select pg_temp.seed_help_page('how-to-messages', 'ro', 'Mesaje',
  'Ghiduri pas cu pas', $markdown$Mesajele private sunt între două persoane. Moderatorii le citesc doar când unul dintre voi raportează un mesaj.

## Începe o conversație

1. Deschide **Mesaje** și alege **Începe o conversație nouă**, sau apasă **Mesaj** pe profilul cuiva.
2. Scrie numele de utilizator: numele de după @ de pe profil.
3. Apasă **Deschide conversația**, scrie și apasă **Trimite**.

## Cereri de mesaj

Primul mesaj de la cineva pe care nu-l urmărești ajunge la **Cereri**. Nu-ți poate trimite altele până nu apeși **Acceptă cererea**. **Șterge cererea** o elimină fără să afle; **Nu, mulțumesc** îi trimite în numele tău un răspuns scurt și politicos.

## Cine îți poate scrie

Alegi asta la **Cine îți poate scrie**, în [Setări](/settings#messages).

- Adulții nu pot trimite niciodată mesaje cuiva sub 16 ani.
- La 16 sau 17 ani, mesajele de la adulți rămân oprite până le pornești.

## Ceva nu e în regulă?

Apasă **Raportează** la un mesaj sau **Blochează** ca să oprești conversația. Vezi [Blochează pe cineva](/help/how-to-block-someone).
$markdown$);

-- A class space.
select pg_temp.seed_help_page('how-to-class-space', 'en', 'Join or run a class space',
  'How-to guides', $markdown$A class space is a private space for one school class. Nothing in it shows on the public site, and it never has ads or sponsors.

## Join as a student

1. Open the link the teacher shared, or open **Forums** and choose **Join a class** in the Spaces card.
2. Type the **Class code** the teacher gave you. The dashes are optional.
3. Press **Find the class**, then **Join the class**.

New here? The class code is also an invitation: make an account with it and you join the class as soon as the account is made.

## Run one as a teacher

1. Get the Teacher badge when you set up the account, with a school email address or proof that you teach.
2. Create the class space and make a class code.
3. Share the code or print the invite sheet for the class.

The teacher moderates the class space. The class can share stories, run a writing contest and get certificates.
$markdown$);

select pg_temp.seed_help_page('how-to-class-space', 'ro', 'Intră într-un spațiu de clasă sau conduce unul',
  'Ghiduri pas cu pas', $markdown$Un spațiu de clasă e un spațiu privat pentru o singură clasă. Nimic din el nu apare pe site-ul public și nu are niciodată reclame sau sponsori.

## Intră ca elev

1. Deschide linkul primit de la profesor sau deschide **Forumuri** și alege **Intră într-o clasă** din cardul Spații.
2. Scrie **Codul clasei** primit de la profesor. Liniuțele sunt opționale.
3. Apasă **Găsește clasa**, apoi **Intră în clasă**.

Ești nou aici? Codul clasei e și o invitație: fă-ți cont cu el și intri în clasă imediat ce e gata contul.

## Condu unul ca profesor

1. Primește insigna Profesor când îți faci contul, cu o adresă de email de la școală sau cu o dovadă că predai.
2. Creează spațiul de clasă și fă un cod al clasei.
3. Trimite codul sau tipărește foaia de invitație pentru clasă.

Profesorul moderează spațiul de clasă. Clasa poate împărtăși povești, poate organiza un concurs de scris și poate primi diplome.
$markdown$);

-- Reading settings.
select pg_temp.seed_help_page('how-to-reading-settings', 'en', 'Reading settings',
  'How-to guides', $markdown$Make chapters easier on the eyes. The choices follow you to every chapter and every device you log in on.

## Change them

1. Open any chapter.
2. Press **Reading settings** (the **Aa** button).
3. Change what you like. The chapter changes as you go, and the choices save on their own.

## What you can change

- **Font**: Inter, Serif, Dyslexia-friendly or Atkinson Hyperlegible.
- **Text size**: bigger or smaller, or **Use the device's size**.
- **Line spacing**: Compact, Normal or Wide.
- **Line width**: Narrow, Medium or Wide.
- **Theme**: Light, Sepia or Night, or **Night by the clock** between two times you pick.
- **Reading ruler**: a band that follows the line you're reading.

The day and night switch in the footer changes the rest of the app.
$markdown$);

select pg_temp.seed_help_page('how-to-reading-settings', 'ro', 'Setări de citire',
  'Ghiduri pas cu pas', $markdown$Fă capitolele mai ușor de citit. Alegerile te urmează la fiecare capitol și pe fiecare dispozitiv pe care intri în cont.

## Schimbă-le

1. Deschide orice capitol.
2. Apasă **Setări de citire** (butonul **Aa**).
3. Schimbă ce vrei. Capitolul se schimbă pe loc, iar alegerile se salvează singure.

## Ce poți schimba

- **Font**: Inter, Serif, Pentru dislexie sau Atkinson Hyperlegible.
- **Mărimea textului**: mai mare sau mai mic, sau **Folosește mărimea dispozitivului**.
- **Spațiul dintre rânduri**: Strâns, Normal sau Larg.
- **Lățimea rândului**: Îngust, Mediu sau Lat.
- **Temă**: Luminos, Sepia sau Noapte, ori **Noapte după ceas**, între două ore alese de tine.
- **Riglă de citire**: o bandă care urmează rândul pe care îl citești.

Comutatorul de zi și noapte din subsol schimbă restul aplicației.
$markdown$);

-- Story Atlas.
select pg_temp.seed_help_page('how-to-story-atlas', 'en', 'Plan a story with Story Atlas',
  'How-to guides', $markdown$Story Atlas keeps each story's plan beside its chapters. Only you see it.

## Open it

1. Open [Write](/write).
2. Press **Plan** on the story's card.
3. Pick a section from the list and start filling it in. It saves as you type.

## The sections

- **At a glance**: what the story is about, how long it should be and where you are with it.
- **Characters**: everyone in the story, with notes and pictures.
- **Connections**: how characters are related. Add a connection on one character and it shows on both.
- **Story world**: places, objects, groups and rules.
- **Storyline**: the plan of the chapters, in order.
- **Ideas**: notes to come back to.
- **Marketing**: the pitch, a back-cover blurb and launch notes.
- **Readers**: what readers can see.

Everything in the plan is private until you turn an area on under **Readers**; an area you turn on shows with the story once it's published. A story's plan goes with it when you [download your data](/help/how-to-download-data).
$markdown$);

select pg_temp.seed_help_page('how-to-story-atlas', 'ro', 'Plănuiește o poveste cu Story Atlas',
  'Ghiduri pas cu pas', $markdown$Story Atlas (Atlasul poveștii) ține planul fiecărei povești lângă capitolele ei. Doar tu îl vezi.

## Deschide-l

1. Deschide [Scrie](/write).
2. Apasă **Plănuiește** pe cardul poveștii.
3. Alege o secțiune din listă și începe s-o completezi. Se salvează pe măsură ce scrii.

## Secțiunile

- **Pe scurt**: despre ce e povestea, cât de lungă ar trebui să fie și unde ai ajuns.
- **Personaje**: toți cei din poveste, cu note și imagini.
- **Legături**: cum sunt legate personajele. Adaugi o legătură la un personaj și apare la amândouă.
- **Lumea poveștii**: locuri, obiecte, grupuri și reguli.
- **Firul poveștii**: planul capitolelor, în ordine.
- **Idei**: note la care să revii.
- **Marketing**: prezentarea, textul de pe coperta a patra și notele de lansare.
- **Cititori**: ce pot vedea cititorii.

Tot planul e privat până pornești o zonă la **Cititori**; o zonă pornită apare lângă poveste după ce o publici. Planul unei povești pleacă împreună cu ea când [descarci datele](/help/how-to-download-data).
$markdown$);

-- Download data.
select pg_temp.seed_help_page('how-to-download-data', 'en', 'Download data and stories',
  'How-to guides', $markdown$You can take everything with you at any time, from 13.

## Download everything

1. Open [Settings](/settings#download-my-data) and find **Download data**.
2. Press **Request data**. We tell you when the file is ready.
3. Press **Download ZIP** while you're logged in.

The ZIP holds every story as a Word file and a PDF, plus a data file (JSON) other apps can read: chapters and drafts, comments, the messages you sent, library shelves, the account and settings.

## Download one story

Under **Download stories** in [Settings](/settings#download-my-stories), choose a story and press **Download Word file**, or pick another format.

The download link works only while you're logged in, and stops working after a few days. Make a new copy whenever you need one.
$markdown$);

select pg_temp.seed_help_page('how-to-download-data', 'ro', 'Descarcă datele și poveștile',
  'Ghiduri pas cu pas', $markdown$Poți lua totul cu tine oricând, de la 13 ani.

## Descarcă tot

1. Deschide [Setări](/settings#download-my-data) și găsește **Descarcă datele**.
2. Apasă **Cere datele**. Îți spunem când e gata fișierul.
3. Apasă **Descarcă ZIP-ul** cât timp ești în cont.

Fișierul ZIP are fiecare poveste ca fișier Word și PDF, plus un fișier de date (JSON) pe care îl pot citi alte aplicații: capitole și ciorne, comentarii, mesajele trimise, rafturile din bibliotecă, contul și setările.

## Descarcă o singură poveste

La **Descarcă poveștile**, în [Setări](/settings#download-my-stories), alege povestea și apasă **Descarcă fișierul Word** sau alege alt format.

Linkul de descărcare merge doar cât timp ești în cont și nu mai merge după câteva zile. Fă o copie nouă oricând ai nevoie.
$markdown$);

-- Delete the account.
select pg_temp.seed_help_page('how-to-delete-account', 'en', 'Delete the account',
  'How-to guides', $markdown$You can delete the account in the app or on the website, at any time.

## Before you start

[Download data and stories](/help/how-to-download-data) first if you want to keep them. Stories, chapters, drafts, comments and messages are deleted with the account.

## Delete it

1. Open [Settings](/settings#delete-account) and find **Delete account**.
2. Press **Delete account**.
3. **Log in again to confirm**, so nobody else can do it on a device you left signed in.
4. Press **Delete account** once more.

The account closes straight away and nobody can see the profile. We delete it for good 14 days later.

## Changed your mind?

Log in within those 14 days and cancel. After that the account can't come back.

Forum posts stay so conversations still make sense, shown under "Deleted user". Delete any post you want gone before you delete the account.
$markdown$);

select pg_temp.seed_help_page('how-to-delete-account', 'ro', 'Șterge contul',
  'Ghiduri pas cu pas', $markdown$Poți șterge contul din aplicație sau de pe site, oricând.

## Înainte să începi

[Descarcă datele și poveștile](/help/how-to-download-data) mai întâi, dacă vrei să le păstrezi. Poveștile, capitolele, ciornele, comentariile și mesajele se șterg odată cu contul.

## Șterge-l

1. Deschide [Setări](/settings#delete-account) și găsește **Șterge contul**.
2. Apasă **Șterge contul**.
3. **Conectează-te din nou ca să confirmi**, ca nimeni altcineva să nu poată face asta pe un dispozitiv pe care ai rămas conectat.
4. Apasă încă o dată **Șterge contul**.

Contul se închide imediat și nimeni nu mai vede profilul. Îl ștergem definitiv după 14 zile.

## Te-ai răzgândit?

Conectează-te în cele 14 zile și anulează. După aceea, contul nu mai poate fi recuperat.

Postările din forumuri rămân, ca discuțiile să aibă sens, sub „Utilizator șters”. Șterge orice postare pe care nu vrei s-o lași înainte să ștergi contul.
$markdown$);

-- The writer's rights, as questions and answers (Robert, 9 Nov 2026, 12:09 UTC).
select pg_temp.seed_help_page('writers-rights', 'en', 'Writers'' rights', 'Rights', $markdown$Stories stay with the people who write them. The [terms](/legal/terms) say this in full; here are the short answers.

## Who owns what I write?

You do. You keep the copyright in your stories, poems, essays, comments, posts and pictures, and your rights as an author: to be named the way you choose and to have your work kept whole.

## What does publishing here let you do?

Only show the work to readers, where you choose. We can't sell it, print it, translate it, use it in our advertising outside the app or give it to anyone else. If we ever want to, we ask you first, separately and in writing.

## Can staff change my words?

No, not even if you ask. If part of a story breaks the law or the rules, a moderator can hide the story or cut out that exact passage, leaving "[Removed by the moderation team]", and tells you why. You can [appeal the decision](/help/reporting-and-safety).

## Who decides who can read a story?

You do. In **Story settings**, choose **Public**, **Unlisted** (only people with the link) or **Private**.

## Can I take my stories with me?

Yes, at any time: [Download data and stories](/help/how-to-download-data) gives every story as a Word file and a PDF.

## Can I delete everything?

Yes. [Delete the account](/help/how-to-delete-account) and the stories go with it.
$markdown$);

select pg_temp.seed_help_page('writers-rights', 'ro', 'Drepturile scriitorilor', 'Drepturi', $markdown$Poveștile rămân ale celor care le scriu. [Termenii](/legal/terms) spun asta pe larg; aici sunt răspunsurile scurte.

## Cui îi aparține ce scriu?

Ție. Păstrezi drepturile de autor asupra poveștilor, poeziilor, eseurilor, comentariilor, postărilor și imaginilor tale, precum și drepturile morale de autor: să fii numit cum alegi și ca opera să rămână întreagă.

## Ce vă permite publicarea aici?

Doar să arătăm opera cititorilor, acolo unde alegi. Nu o putem vinde, tipări, traduce, folosi în reclamele noastre în afara aplicației și nici da altcuiva. Dacă vom vrea vreodată asta, te întrebăm înainte, separat și în scris.

## Pot angajații să-mi schimbe cuvintele?

Nu, nici dacă le ceri. Dacă o parte dintr-o poveste încalcă legea sau regulile, un moderator poate ascunde povestea sau poate tăia exact acel pasaj, lăsând „[Eliminat de echipa de moderare]”, și îți spune de ce. Poți [contesta decizia](/help/reporting-and-safety).

## Cine decide cine poate citi o poveste?

Tu. În **Setările poveștii**, alegi **Publică**, **Nelistată** (doar cine are linkul) sau **Privată**.

## Îmi pot lua poveștile cu mine?

Da, oricând: [Descarcă datele și poveștile](/help/how-to-download-data) îți dă fiecare poveste ca fișier Word și PDF.

## Pot șterge tot?

Da. [Șterge contul](/help/how-to-delete-account) și poveștile pleacă odată cu el.
$markdown$);
