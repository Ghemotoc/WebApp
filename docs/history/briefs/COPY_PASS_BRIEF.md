# Brief: English copy pass on Ghemotoc (16 Oct 2026, evening)

Robert asked: before anything is translated to Romanian, run the English copy through three skills: **copywriting**, **copy-editing** and **ux-copy**. This brief condenses them. Apply it to the files you are given. You edit the copy only (visible text, button labels, aria-labels, alt text, placeholder text, tooltips, demo data strings in renderVals). Layout, styles, logic, ids, data shapes and doodles stay as they are.

## Who it's for and how it sounds
- Ghemotoc is a free, writer-first place to write and read stories, poems, essays and articles. Writers keep their rights. No tracking ads. Readers comment on paragraphs. Forums, spaces, private class spaces for schools, a First Chapter contest. Anyone 13+ (age check by Yoti; parent's consent under 16). Launching in English and Romanian. "An app by The Magic Coffin".
- Readers of the copy: mostly 13 to 25-year-old writers and readers, plus teachers, parents and (on staff screens) our moderators.
- Voice: warm, plain, direct, a little dry; never corporate, never cutesy. Talk to "you". Short sentences. British English (colour, organise, licence as noun), no Oxford commas, no em dashes (use a full stop, comma or colon), typographic apostrophes (’). No exclamation marks except in a genuinely celebratory success message (max one per screen).

## Rules (from the three skills)
1. **Clarity first** (copy-editing sweep 1): one idea per sentence; front-load the point; no jargon ("leverage", "seamless", "robust", "utilise", "facilitate", "empower", "unlock", "journey"); cut filler (very, really, just, actually, basically, in order to).
2. **So what** (sweep 3): marketing lines say what the reader gets, not only what the feature is.
3. **Prove it, honestly** (sweep 4 + copywriting rule "honest over sensational"): NEVER invent statistics, testimonials, user counts, awards or press quotes. If a claim has no proof, soften it or cut it. Demo numbers that are obviously example data on app screens (reads, followers) are fine.
4. **Specific** (sweep 5): concrete nouns and numbers we actually have (13+, one chapter at a time, two working days, 30 days); no vague "improve your writing journey".
5. **Zero risk near CTAs** (sweep 7): next to sign-up/join buttons, answer the obvious worry in a few words where there's room (free, no tracking ads, you keep your rights, you can delete your account).
6. **UX copy patterns** (ux-copy):
   - CTAs start with a verb and say the outcome: "Create account", "Publish chapter", "Send report", not "Submit", "OK", "Click here", "Learn more" (fine only as a secondary link with an aria-label that says more).
   - Errors: what happened + how to fix, no blame, no "Oops".
   - Empty states: what this is + why it's empty + how to start.
   - Confirmations: name the action ("Delete chapter 3?"), state consequences ("You can't undo this"), buttons named after the action ("Delete chapter" / "Keep chapter").
   - Tooltips: short, never obvious.
   - Same term for the same thing everywhere (glossary below).
7. **Safety, legal and policy text**: keep the meaning EXACTLY. You may shorten and simplify wording, but never change a rule, an age, a time limit, a legal reference or a promise. If a legal line is unclear, simplify it and keep any OPEN markers.
8. **Fit**: new copy must fit the same space. Don't make buttons or headings much longer. Keep character counts of headings within about 10% unless the old one was clearly too long.
9. **Localisation-friendly** (ux-copy, because Romanian comes next): avoid idioms, puns and wordplay that won't translate; avoid stacking nouns; don't split one sentence across two elements; leave room for 20 to 30% longer Romanian text in buttons.

## Glossary (use exactly)
story (not "book" or "work" on app screens), chapter, writer, reader, pen name, handle (@name, staff screens only; users see "username"), Discover, Library, forums, thread, space, class space, Teacher badge, invite code, Messages, report (verb and noun), moderator, age check (not "age verification" except in legal text), parent or guardian, Settings, Writer dashboard, First Chapter contest, certificate, drawn cover, App only (setting) / "on the web and in the app", Mature (rating), staff (not "admins" in user-facing text).

## Robert's own wording is final (do NOT change)
- Website hero: "Write stories. Get read." and "Post your stories, poems, essays and articles, one chapter at a time, and find the people who want to read them."
- Website: "Community-led writing", "An app by The Magic Coffin", "Yoti does the age check. We only get the result, never a photo."
- Story bible content (/home/claude/demo/_STORY_BIBLE.md): story titles, blurbs and chapter text. Don't rewrite fiction; only fix typos.
- Names: Ghemotoc, The Magic Coffin, Yoti.

## How to work
1. Plain read of the artifact url first (Artifact action "read", url only), then read your files with `path` into /home/claude/work/<group>/project/ (fresh copies; other people edited them today).
2. For each screen: list the copy, run the sweeps, then edit in place. Keep the file skeleton (support.js line, x-dc block, `class Component extends DCLogic`, `$preview`). Check the markup still parses and the script still compiles (node `new Function`).
3. Publish ONLY your files: Artifact publish with url, root=/home/claude/work/<group>, file_path = one of your files (absolute), files = the rest. Others publish at the same time; on "haven't viewed the latest version", plain-read the url, check your files weren't changed upstream (re-apply on the fresh copy if they were), and publish again.
4. Write a short change log for your group to /home/claude/work/<group>/COPY_CHANGES.md: per screen, the most important before → after lines (max 8 per screen) and anything you deliberately left alone.

## Report back (short)
Per screen: number of copy changes and the 1 or 2 most important ones. Any claims you cut for lack of proof. Any place where you weren't sure the meaning stayed the same.
