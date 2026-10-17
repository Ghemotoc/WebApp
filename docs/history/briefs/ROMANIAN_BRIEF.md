# Brief: Romanian versions of Ghemotoc (16 Oct 2026, late evening)

Robert asked for Romanian versions of the design canvas screens and the four decks, as **separate copies**. The English versions are final: the comments are done and the English copy pass (copywriting, copy-editing, ux-copy) is done. Translate from the latest English files only.

## Where things are
- English design canvas: https://claude.ai/artifact/PMdGAYUPHUff27xJd1tGco (58 boards, `project/canvas.json` + `project/*.dc.html`).
- English decks (Slides): master https://claude.ai/artifact/MziBWGSeH993ndigxe3EjZ, investor https://claude.ai/artifact/5qtUqDgJtAuS2PAFJSWBbV, competition https://claude.ai/artifact/RoN8gEp3VyhXHFkaALuVVs, sponsors https://claude.ai/artifact/KDZ7FrpmdwD322vbyuys8q.
- Earlier briefs worth reading: `/home/claude/demo/_COPY_PASS_BRIEF.md` (voice and rules), `/home/claude/demo/_COVERS_BRIEF.md` (covers and title fit), `/home/claude/demo/_DOODLE_ASSETS.md`.
- Romanian hero copy that already exists (AdminSettings `live.ro`), use it as is:
  - eyebrow "POVEȘTILE TALE. DREPTURILE TALE. CITITORII TĂI."
  - "Scrie povești." / "Găsește-ți cititorii."
  - "Publică povești, poezii, eseuri și articole, câte un capitol pe rând, și găsește oamenii care vor să le citească."
  - buttons "Începe să scrii", "Începe să citești"; points "Drepturile rămân ale tale", "Fără reclame care te urmăresc", "Gratuit la citit și la scris".

## How the Romanian must read
- Natural, warm, plain Romanian written by a native speaker for 13 to 25-year-olds, teachers and parents. Not a word-for-word translation. Short sentences.
- Address the user with **tu** everywhere (including staff screens), consistently.
- Diacritics: always ș ț with comma below (U+0219, U+021B, U+0218, U+021A), never the cedilla forms ş ţ Ş Ţ. Always ă â î where needed.
- Quotation marks „like this”. Dates "16 octombrie 2026". Numbers 1.200 and 3,5. Money "5 €" or "5 euro" (keep euros).
- No em dashes. Use a comma, a full stop or a colon.
- Legal and safety text keeps its meaning EXACTLY (ages, time limits, legal references, promises, OPEN markers). Official names: GDPR stays "GDPR" (you may write "Regulamentul general privind protecția datelor (GDPR)" once on legal screens), DSA stays "DSA", ANSPDCP, ANCOM.
- Romanian is 20 to 30% longer than English. Make it fit the same space: shorten wording rather than let buttons wrap or headings overflow. Covers must still fit the full title (`titleSize` handles size; keep titles short).
- Brand names never change: Ghemotoc, The Magic Coffin, Yoti, Google, Apple, Microsoft, Spotify and so on. Pen names and @usernames stay as they are.
- Demo content (story titles, blurbs, chapter text, forum posts, messages) is translated into natural Romanian too, so the screens look like a real Romanian app. Keep the same meaning and length class.

## Glossary (use exactly, same term every time)
| English | Romanian |
|---|---|
| story / stories | poveste / povești |
| chapter | capitol |
| writer | scriitor (the author of a given story: autor) |
| reader | cititor |
| pen name | pseudonim |
| username | nume de utilizator |
| handle (staff screens only) | handle |
| Home | Acasă |
| Discover | Descoperă |
| Library | Bibliotecă |
| Forums / thread | Forumuri / discuție |
| space / class space | spațiu / spațiu de clasă |
| Teacher badge | insigna de profesor |
| invite code | cod de invitație |
| Messages | Mesaje |
| Notifications | Notificări |
| Settings | Setări |
| Writer dashboard | Panoul scriitorului |
| report (verb / noun) | raportează / raport |
| appeal | contestație |
| moderator / staff | moderator / echipa Ghemotoc (staff screens: echipa) |
| age check | verificarea vârstei |
| parent or guardian | părinte sau tutore |
| First Chapter contest | concursul Primul capitol |
| certificate | diplomă |
| drawn cover | copertă desenată |
| App only / on the web and in the app | Doar în aplicație / pe web și în aplicație |
| Mature (label) | Conținut matur |
| follow / followers | urmărește / urmăritori |
| comment / reactions | comentariu / reacții |
| draft / publish | ciornă / publică |
| Trending / Completed / New and rising | În trend / Finalizate / Noi și în creștere |
| Classics | Clasici |
| share / quote card | distribuie / card cu citat |
| block / mute | blochează / ignoră |
| Sign up / Log in / Log out | Creează cont / Intră în cont / Ieși din cont |
| Write stories. Get read. | Scrie povești. Găsește-ți cititorii. |
| Yoti does the age check. We only get the result, never a photo. | Yoti face verificarea vârstei. Noi primim doar rezultatul, niciodată o fotografie. |
| An app by The Magic Coffin | O aplicație The Magic Coffin |
| Community-led writing | Scris condus de comunitate |
| Sponsored / Ad | Sponsorizat / Reclamă |

If you need a new recurring term, add it to `/home/claude/demo/_RO_GLOSSARY_ADDITIONS.md` (one line: English | Romanian | why) so the other translators use the same one. Read that file before you start and again halfway through.

## What not to change
Layout, styles, logic, ids, data shapes, doodles, `$preview`, file names, the file skeleton (support.js line, x-dc block, `class Component extends DCLogic`). Only visible text, aria-labels, alt text, placeholders, tooltips, `lang="en"` → `lang="ro"`, and demo data strings in `renderVals()`. Where a screen has an English/Romanian language switch, the Romanian copy shows Romanian as the active language.

## Checks before publishing
- Markup still parses and every script compiles (node `new Function`).
- `grep -P '[şţŞŢ]'` finds nothing; `grep -P '\x{2014}'` finds nothing.
- No English left in visible text except brand names and things that stay English on purpose (list them in your report).
