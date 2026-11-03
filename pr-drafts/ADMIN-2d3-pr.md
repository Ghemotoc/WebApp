<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


No story issue: Robert asked for this in the project thread on 2 Nov 2026, 22:09 to 22:11, as part 12d3 of bundle 12 ADMIN-2. It changes comments from S1-E6-01 and S1-E6-06.

## What changed
- **Longer chapter comments, shorter paragraph comments.** A comment on the whole chapter, and its replies, may now be 3,000 characters (was 2,000). A comment on one paragraph, and every reply in its thread, may be 500. Both are settings staff can change on Staff › Settings (`comment_max_characters`, new `paragraph_comment_max_characters`). The database applies them (`check_comment_text()` and a new trigger that runs after a reply takes its comment's paragraph), and the comment box's counter and `maxlength` read the same settings, so "0 / 3,000" and "0 / 500" always match what the server allows. The comments table's own check is now only a 10,000-character safety ceiling, so raising a setting never meets a hidden wall.
- **The kind-words nudge.** Before a comment is sent, the commenter's own browser checks it against two short lists (Romanian and English, both checked whatever the language). On a match, a gentle box under the text asks "We’re a supportive place. Still want to send this?" with **Edit** (back to the text, nothing sent) and **Send anyway** (sends it exactly as typed). Phrases match as whole words, ignoring capitals, accents and the old cedilla letters ("idiot" doesn't match "idiotproof"). Nothing is blocked, kept, logged or reported, and the server never learns the box showed, so rule 19 holds.
- **Staff › Settings › Kind-words nudge.** Owner and admin find, add and remove phrases per language (up to 60 characters each), every change in the audit log (`admin_add_nudge_word()`, `admin_remove_nudge_word()`). The new table `comment_nudge_words` is readable by anyone signed in (the check runs in their browser) and by nobody signed out. The first lists are drafts in the migration.
- The composer's state moved into `hooks/useCommentComposer.ts` to keep the component short; replies inside a paragraph's thread get the shorter limit.

## How it was tested
- Database: `246-comment-lengths-and-nudge` (22 tests: 3,000 allowed and 3,001 refused on the chapter; 500 allowed and 501 refused on a paragraph and in its replies, with the limit in the hint; the list readable signed in and not signed out; nobody writes it directly; only owner and admin change it, logged; empty, repeated and unknown-language phrases refused). `149-comments` now checks 3,000 and 3,001; `021` lists the new table.
- Unit: `lib/kindWords.test.ts` (whole words, case, accents and cedillas, apostrophes, no match inside longer words, empty lists).
- End to end: `comment-lengths-and-nudge` (the two counters and `maxlength`; a kind comment posts at once; a hurtful one shows the nudge with focus on its question, passes axe, Edit sends nothing, Send anyway posts it as typed; an admin adds a phrase on Settings and the comment box nudges on it). The comments, paragraph comments, reactions, comments epic check and Settings specs (with axe on Settings at every width) pass as before.

## Local check run
LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand
- Nothing on staging: the migration arrives with the merge.
- Please read the first word lists (Staff › Settings › Kind-words nudge, or the end of the migration) and add or remove what you like; they are my drafts. Optional: the new Romanian lines (`nudge` in `comments.json` and `settings.json`).

## Board mismatches
- Board 3.5 has no nudge; it uses the info notice colours and sits between the text box and the Post button. The counter on the board says "0 / 2,000"; it now follows the setting.

## Questions for Robert
1. **Inline, not a pop-up window.** The question appears in a soft box right under the comment, with the focus moved to it, rather than a separate window over the page. It keeps the comment in view while the person decides and is easier with a keyboard and screen reader. Happy with that?
2. **Words that can also be kind.** A few draft entries ("trash", "mori", "taci", "stupid") also appear in friendly comments ("I'm trash at guessing endings"). That only costs one extra tap, but you may want to trim them.

## Follow-ups
- The nudge could also run in forum posts and private messages, if you want it there too.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
