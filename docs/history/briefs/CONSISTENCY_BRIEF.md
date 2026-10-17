# Consistency pass brief (17 Oct 2026)

Robert asked: "go through all files and ensure they match, including all project files." Five agents split the work by file ownership. Only touch the files you own. English only: do NOT start any Romanian translation (Robert reviews the English first).

## The source of truth, in order
1. Robert's decisions: /home/claude/demo/_ANSWERS_16OCT.md (answers to the 71 questions, then the "RESOLVED"/"DECIDED" notes at the end, which override earlier text). Also in the master plan "Decisions made" tab: https://claude.ai/code/artifact/ee6be53c-3f3e-4a3b-b459-094b2f7a8add
2. The CTO pack, updated last night: /home/claude/project-upload/cto-pack.md (change log at the top; section 1.13 March MVP; section 5 open questions; section 6 "For the lawyer before March").
3. The comment audit: /home/claude/work/audit/COMMENT_AUDIT.md ("Still to do" items and "Also noticed").

## Decisions most likely to be out of date somewhere
- App name Ghemotoc; "An app by The Magic Coffin"; ghemotoc.com, @ghemotoc.
- Website headline "Write stories. Get read." Lead line "Post your stories, poems and essays, one chapter at a time, and find the people who want to read them." The sign-up hero uses the same headline.
- No journalism or articles at launch: categories are fiction, poetry and nonfiction essays. Remove "Journalism" as a genre or category and "articles" from copy everywhere (Stage 2 newsroom stays as a later stage in plans and decks).
- Messaging: adults and under-16s can never message each other; for 16 and 17-year-olds it is off by default and only the teen can turn it on. One wording everywhere. Teachers follow the same rule.
- No new-chat limit for new accounts (remove the "10 new chats a day in the first 7 days" card and any mention).
- Ratings: All ages, 13+, 16+, 18+, each hidden from anyone younger. Replaces the single "Mature" label.
- Age: year of birth; when the year leaves the age unclear at 13 or 16, a month field appears and the age is worked out from both. Yoti does the age check; "We only get the result, never a photo."
- Country comes from the connection; it is never asked (Onboarding has no country question; Settings may show it).
- Usernames: any character, but swearwords, staff look-alikes and confusable characters are blocked.
- Picture uploads on from launch; every picture is checked on upload (nudity check plus known-abuse-image matching); a flagged picture waits for a moderator. Moderation is in-house and report-based.
- One web form for all reports, which is also the contact point for authority removal orders (one-hour removal).
- "Ad" marks ad-network ads (non-personalised only, for everyone); "Sponsored" marks our direct sponsors. "No tracking ads" stays true. No ads, sponsored items or sponsor credits inside class spaces.
- Copy protection: "makes copying harder", never "blocks screenshots". On the web, right-click and copy are off; signed-in readers can read full chapters on the web until the apps exist.
- Language picker: a drop-down (English, Română) in the top bar and in the footer.
- Example contest copy names no announcement date.
- Spaces: anyone can create one; spaces of under-16s take only under-16s; spaces of people 16+ take only 16+; class spaces are the exception and include the teacher.
- Class spaces lock at the end of the academic year (no new posts) and members can still read them for as long as they have an account.
- Certificates: signed by Ghemotoc and the teacher leading the contest (not "Head teacher").
- Staff log in with company single sign-on; staff never edit a writer's words (they may hide, restrict, fix settings and details, remove unlawful parts).
- Data exports are Word (.docx) files.
- Deleted accounts: forum posts stay as "Deleted user"; stories are deleted with the account.
- Contact us form in Settings, answered through a ready-made EU helpdesk.
- Every story shelf is ONE horizontally scrollable line of at most 20 items; when there are more, the row ends with a "View more" card that opens a See all page with every item (for example Romanian classics, world classics, Trending). Rows fade out on the cut-off side only (CSS mask, already built on Website-Home and Discover).
- Gold underline lines always sit behind the text (`isolation: isolate` on the wrapper, `z-index: -1` on the line).
- Doodles: SVG only; never on the chapter reader, sharing, reporting or staff screens.
- Covers: 16 drawn backgrounds; the full title always fits (titleSize helper).

## Writing rules
British English, no Oxford commas, no em dashes, plain and warm, typographic apostrophes. Glossary in /home/claude/demo/_COPY_PASS_BRIEF.md (story, chapter, writer, pen name, username, class space, Teacher badge, age check, parent or guardian, staff…). Never invent statistics.

## Canvas mechanics (canvas agents)
- Canvas: https://claude.ai/artifact/PMdGAYUPHUff27xJd1tGco. Plain-read first (Artifact action "read", url only), then read your files with `path` and `out_dir` into /home/claude/work/<your-folder>/project/.
- Keep each file's skeleton: the support.js head line, the `<x-dc>` block, `<script type="text/x-dc" data-dc-script data-props='…'>` with `class Component extends DCLogic`, `$preview`. `{{holes}}` are dotted lookups only. `url(...)` only inside `<helmet><style>`. Close every element, quote every attribute.
- After editing: check markup balance and that the script compiles (node `new Function`).
- Publish only your files: `url`, `root` = your folder, `file_path` = absolute path of one file, `files` = the rest by `project/<Name>.dc.html`. Do NOT send `project/canvas.json` unless your brief says you own it. If refused because the canvas changed, plain-read again, re-read your files, re-apply and publish again.
- If a board's content height changes a lot, update its `$preview` height and report the new height (the lead updates canvas.json).

## Added 17 Oct 2026, morning (Robert, chat), all decided
- March 2027 is web only; desktop and phone apps come after (replaces desktop first). The stories keep the best functional MVP; hours or date decided in November.
- Staff single sign-on: Google Workspace.
- Under-16 spaces: adults can read one only if its owner made it public to everybody; a member who turns 16 stays in groups joined before but can't start or join under-16 groups.
- Class spaces are invitation-based and follow the people in the room: any age mix (15, 16, 17, older classmates), never split at 16.
- NEVER any advertising of any kind in class spaces (no ads, sponsored items, sponsor credits).
- Schools own only the data the teacher provides (materials, grades, feedback); the teacher grades assignments; the final work belongs to the pupil.
- School model: state high schools use class spaces free; universities and private schools pay a yearly licence; paid extras for every school (contests run for the school with guest judges, printed class anthologies, teacher workshops with training credits through a partner), shown very clearly; prices "[price to be set]" until research lands.
- Support: every support email (support@ghemotoc.com), Contact us message and in-app message becomes a ticket inside the admin site (story S1-E11-13 in the pack); a ready-made external helpdesk runs behind our screens through its API. Users see "Your support requests" in Settings.
- DESIGN: every page board shows the WHOLE page top to bottom, including its footer. Public website pages and the signed-in web app pages both end with a footer (Help, Legal, Contact us, the language drop-down English / Română, "An app by The Magic Coffin"). Staff pages end with a slim staff footer. Set each board's `$preview` height to the full content height and report it; the lead resizes the frames in canvas.json.
- The canvas was partly updated by an earlier run that stopped mid-way: always read fresh and continue from what is there; don't redo or undo finished work.
