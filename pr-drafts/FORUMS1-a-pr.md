<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #67

Bundle 9 FORUMS-1, part a: forum categories, forums and subforums (S1-E8-01).

## What changed
- **Forums in one table, three levels.** `forums` holds categories, the forums inside them and subforums inside a forum. That is "up to two levels deep" below a category (the story's proposal); a fourth level is refused. `forum_names` gives each one a name and a description in every interface language, as tags have: forum names are staff content, not locale-file text.
- **The starting forums from board 5.1.** Writing craft, Reading, Essays and true stories and Community are pinned in the board's order, with their 11 forums and the 4 subforums under First chapters and Feedback swap. Each has a colour and a doodle. The English names are the board's; the Romanian ones are my drafts (list below).
- **The forum index, `/forums`.** It is in the top bar for everyone, signed out included ("Anyone can read the forums"). Each category is a card with its colour bar, name, "4 forums" and doodle. Each forum shows its name, description, subforum links, Threads, Posts and the latest post. Pinned categories come first in staff's order; the rest follow by latest activity (Q45). The line under the list says threads never close on their own. "Forum rules in short" sits beside the list.
- **One forum, `/forums/<address>`.** It shows the breadcrumb, the name and description, and the subforums inside it. Threads arrive in part b, so for now it says "No threads here yet."
- **Staff › Forums, `/staff/forums`.** The owner and admins (the Settings area) add a category, add a forum inside a category or forum, change one (names and descriptions in Romanian and English, address, where it sits, order, and for a category the pin, colour and doodle) and remove an empty one with a reason. Every change is in the audit log.
- **Until part b,** every forum's numbers are 0 and the latest post says "No posts yet". `forum_index()` already returns the numbers and the latest post, so part b only fills them in.
- **Docs:** `docs/code-tour.md`, `supabase/README.md`, `docs/board-fixes.md` and the feature README.

## How it was tested
- `supabase/tests/database/221-forum-categories.test.sql` (26 tests):
  - the starting categories are pinned in order with their forums and subforums, all named in both languages;
  - anyone reads the live forums and names, and nobody writes them through the API (allowed and denied for both policies);
  - names fall back to Romanian;
  - an admin adds a category, a forum and a subforum, and a fourth level, a missing name, a bad or taken address and a pinned forum are each refused with the right field;
  - a moderator is refused;
  - every change is logged;
  - a forum with forums inside can't be removed or moved, and an empty one can, leaving the index;
  - no cron job touches forums.
- Test `021` lists the two new public tables.
- Unit: `forumTree.test.ts` (order, subforums, breadcrumb) and `forumForm.test.ts` (tree order, parent choices, starting values).
- `e2e/forums.spec.ts`:
  - a visitor reaches the index from the top bar and sees the categories, a forum row and the never-close line;
  - a forum and a subforum open with their breadcrumb, and a wrong address says so;
  - an admin adds a pinned category and a forum inside it, sees them first on the index in English, can't remove the category while the forum is inside, then removes the forum;
  - axe on `/forums`, `/forums/first-chapters` and `/staff/forums` in all 12 views, with the doodle check on the public pages.
- The staff menu lists in `staff-shell` and `epic-s1-e11` gain "Forums".

## Local check run
LOCALRUN

## By hand
- Nothing.

## Board mismatches
- **Not built yet.** New thread, search, Mark all as read, Mark as read, the unread dots, New for you, Spaces, Your class and the ad slots wait for the parts that build them (in `docs/board-fixes.md`).
- **Two changed phrases.** "meet other young writers" became "meet other writers", because March is invited adults only. "Questions about Ghemotoc" became "Questions about the app", because the product name is never written in SQL. Both are editable.
- **Doodles.** The category doodles are the nearest ones the app has: fountain pen, owl with reading glasses, ideas notepad and heart balloon.

## Questions for Robert (OPEN or not in the story, built as proposals)
- **"Two levels deep"** is the story's own proposal: category, then forum, then subforum. Say if you want more or fewer levels.
- **The Romanian forum names are drafts.** Please read them:
  - Meșteșugul scrisului: Primele capitole (Începuturi fantasy și SF; Școala și viața de zi cu zi), Construirea lumilor, Ajutor cu limba, Schimb de păreri (Schimburi de poezie; Texte lungi (peste 3.000 de cuvinte))
  - Lectură: Despre cărți, Lecturi școlare
  - Eseuri și povești adevărate: Povești adevărate și memorii, Eseuri și opinii
  - Comunitate: Prezentări, Ajutor și idei, Concursuri
  - You can change any of them on Staff › Forums.
- **Who manages forums.** Owner and admin, as the Settings area in architecture 1.8.3; moderators can't. Say if moderators should too.

## Follow-ups
- Part b (S1-E8-02) fills in the numbers and the latest post, and refuses to remove a forum that has threads.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
