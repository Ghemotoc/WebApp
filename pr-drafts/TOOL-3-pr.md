<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

No story issue: TOOL-3 is a staging top-up, not a story (lanes/01-replan-24-oct.md). It finishes the demo content that #188 and TOOL-2 started.

## What changed

- **`supabase/staging-topups/demo-content-2b.sql`**: demo content part 2b. Run after part 2a, it makes the 36 demo stories and 20 classics look read for the January demo:
  - 50 writer follows
  - 66 story follows
  - 517 chapter likes
  - 181 comments, plus 69 writer replies and 14 spoilers
  - 408 emoji reactions
  - 3,400 daily read totals covering the last 30 days

  These counts are from a fresh local database with 2a loaded.
- **Who acts:** only the active adult test accounts (adult_writer, teacher, blocker and the five demo writers).
  - No minor, staff or sanctioned persona does anything, and no account is created.
  - Nobody likes their own chapter, and nobody acts across a block in either direction.
  - Comments only appear on demo stories that have comments on. The classics get likes and reads only.
- **Safe to run twice:**
  - Comments have fixed ids made from their chapter and writer. Likes, reactions, follows and reads are one row per pair or per day.
  - So a second run inserts nothing and fires no second notification.
  - Every "random" choice is an md5 of the story, chapter and person, so every run makes the same choices.
- **Never production:** it refuses a database without the 16 seed personas, and one without part 2a.
- **One file, no parts:** it is 22 KB, well under the 450,000-byte part limit, so the SQL Editor takes it whole.
- **Notifications:** the follow and reaction triggers fire, so the demo writers' bells show "new followers" and "reactions". Comments don't queue the comment notification job, so bells aren't flooded with one row per comment.
- **Tests:**
  - `scripts/demo-content-2b.test.ts` checks the file's shape: size, one transaction, both guards, no account inserts, only inserts that skip existing rows, ș and ț.
  - `npm run demo:check-2b` (`scripts/check-demo-content-2b.ts`) runs on the local database only. It resets the database, runs 2a's parts, runs 2b twice, then confirms nothing changed on the second run and every rule holds. It resets again at the end.
- `scripts/compare-demo-parts.ts` now exports its local-database helpers so the new check reuses them.
- Docs: the `supabase/staging-topups/README.md` part 2b section and the code tour's Demo content section.

## Local check run

Clean start on c6dba55 (`npm ci`, fresh Supabase, build, `npm run checks`, functions build):
- Vitest: 91 files, 563 tests passed
- pgTAP: 62 files, 1,345 tests, PASS
- Playwright: 725 passed, 1 skipped
- lint, typecheck, types:check, i18n:check, migrations:check: passed
- `wrangler pages functions build`: compiled
- Cloudflare Pages: Deployed successfully

`npm run demo:check-2b`: after 2b again, "no change", and "Part 2b keeps its rules" (8 rules, all with 0 rows breaking them).

No screen changed, so there are no screenshots this time.

## Decisions taken

- **Hand-written, not generated.** 2b is set-based SQL with a small pool of comment lines, so there's nothing to generate, and one readable file is easier to review than a builder.
- **One file instead of parts:** it is 22 KB.
- **Only adults act.** The March test is invited adults only (17 Oct 2026, 12:44), so no minor persona likes or comments. Adults do like and comment on teen_17's and blocked's stories. Those writers don't reply, because minors are read-only in March.
- **No comments on the classics:** lines like "can't wait for the next chapter" read oddly under a classic.
- **Read totals stop at yesterday** (Romanian date), so live reads on staging are never overwritten.
- **Popularity:** each story gets a fixed popularity from 20 to 85 from its slug, so the shelves and PEOPLE-3's ranking have something to sort.
- **Reactions:** heart and star are the most common, and "sad" isn't used on these general comments.

<details><summary>New Romanian lines (comments and replies, for Robert to read)</summary>

Comments on fiction:
- Am citit capitolul în autobuz și era să-mi scap stația.
- Îmi place cum descrii locurile. Parcă am fost și eu acolo.
- Finalul capitolului m-a prins complet nepregătită.
- Dialogul sună foarte natural. Exact așa vorbesc oamenii.
- Abia aștept capitolul următor!
- Personajul principal îmi amintește de cineva din familie.
- Am râs cu voce tare la scena din bucătărie.
- Mi-a plăcut ritmul: nici prea repede, nici prea încet.
- Ce atmosferă! Am citit tot cu sufletul la gură.
- Detaliul cu lumina de la fereastră e superb.
- Recunosc, am recitit ultimul paragraf de trei ori.
- Povestea asta merită mult mai mulți cititori.
- Mă întreb ce ascunde vecinul. Am o bănuială...
- Scrii foarte frumos despre lucrurile mărunte.
- Am trimis capitolul unei prietene. Mi-a cerut continuarea.
- Scena de la final m-a emoționat mai mult decât mă așteptam.
- Ador personajele secundare, mai ales pe cel mai tăcut.
- Aproape că am simțit mirosul de ploaie din descriere.
- Bine construit! Fiecare frază duce povestea mai departe.
- Nu mă așteptam la întorsătura asta. Bravo!
- Citesc seara, înainte de culcare, și aștept fiecare capitol.
- Mi-ar plăcea să aflu mai multe despre trecutul lor.
- Titlul capitolului are acum cu totul alt sens.
- Scurt și foarte bun. Mai vreau!

Comments on poetry:
- Versul al doilea mi-a rămas în minte toată ziua.
- Imaginile sunt atât de clare, parcă le văd.
- L-am citit cu voce tare. Sună și mai bine așa.
- Simplu și adevărat. Exact ce îmi trebuia azi.
- Mi-a plăcut cum se încheie, ca o ușă lăsată întredeschisă.
- Ritmul ăsta liniștit e foarte frumos.
- Am copiat ultimul vers în caiet.
- Poezia asta are ceva de cântec.
- Mă regăsesc în fiecare strofă.
- Puține cuvinte, multă emoție.
- Frumos cum transformi un lucru obișnuit în ceva special.
- O citesc a treia oară și găsesc mereu ceva nou.

Comments on essays:
- Textul ăsta m-a făcut să mă gândesc la casa bunicilor.
- Am recunoscut fiecare zgomot pe care îl descrii.
- Foarte bine observat. Nu m-am gândit niciodată așa.
- Scrii cu multă căldură despre lucruri pe care le trecem cu vederea.
- Am citit și am rămas câteva minute cu privirea pe fereastră.
- Mi-a plăcut tonul: sincer, fără să se plângă.
- Mi-ai amintit de o vară de demult.
- Un text care te face să încetinești. Mulțumesc.
- Paragraful despre dimineți e preferatul meu.
- Aș citi o carte întreagă scrisă așa.

Spoilers (behind "Show spoiler"):
- Nu-mi vine să cred cine era de fapt la ușă!
- Știam eu că scrisoarea nu se pierduse!
- Deci de asta nu voia să spună nimic. Ce final!
- Am bănuit de la primul capitol că el era. Și am avut dreptate!

Writer replies:
- Mulțumesc mult! Mă bucur că ți-a plăcut.
- Ce bine că ai observat detaliul ăsta. L-am pus acolo special.
- Mulțumesc! Următorul capitol vine curând.
- M-ai făcut să zâmbesc toată dimineața. Mulțumesc!
- Bănuiala ta s-ar putea să fie bună... nu spun mai mult.
- Mulțumesc că ai citit până la capăt!
- Mă bucur că ai simțit asta. Am scris scena de mai multe ori.
- Mulțumesc frumos! Comentariile ca ăsta mă țin să scriu.

</details>

## By hand

On staging, after part 2a has run:
1. Supabase dashboard > staging project > SQL Editor > New query.
2. Paste `supabase/staging-topups/demo-content-2b.sql` from main, then click Run.
3. Expect one row, `after_top_up_2b`, with counts near the ones above. The like and comment counts will be a little lower if someone has blocked a demo account on staging.

If part 2a hasn't been run on staging yet, the file stops and says "Run part 2a first". Run `demo-content-2a/part-01.sql` to `part-07.sql` first, in order.

## Follow-ups

- The like and follow counts are capped by the eight adult test accounts (at most seven likes per chapter). If the demo needs bigger numbers, it would need more synthetic reader accounts, and that is Robert's call: top-ups don't create accounts beyond 2a's agreed exception.
- PEOPLE-3 (the `popular` sort and `story_like_total()`) will use these likes and reads.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
