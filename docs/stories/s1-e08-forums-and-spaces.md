> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E8 Forums and spaces

**Back end and build order:** section 1.7, group E (screens 5.1 to 5.4), wave 4.

Goal: classic forum basics that the research found missing, plus user-created spaces. Decided: no auto-archive, private downvotes, owners can switch on members-only posting. Decided 16 Oct 2026 (late evening, Q26): anybody can create a space; under-16 spaces take only under-16s and 16+ spaces only people 16 or over; class spaces are the exception. The earlier rule that anyone can read every space is narrowed for under-16 spaces: adults can read one only if its owner made it public to everybody; a member who turns 16 stays in groups joined before but can't start or join under-16 groups (decided 17 Oct 2026, 34p). Forums move after the March MVP (section 1.13).

##### S1-E8-01 Forum categories and subforums

As a user, I want forums organised into categories and subforums so that I can find the right place to talk.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E1-02, S1-E11-03
- **Acceptance criteria:**
  - Given admin, when staff create a category or subforum, then they set name, description, order and parent, up to two levels deep (proposal).
  - Given the forum index, when it opens, then the starting categories are pinned at the top in the order staff set, and each forum shows thread count, post count and the latest post (decided 16 Oct 2026, late evening, Q45).
  - Given a thread with no replies for any length of time, when time passes, then it is never archived or closed automatically.
- **Legal and compliance:** none beyond the global checklist.

##### S1-E8-02 Threads and posts with safe formatting

As a user, I want to start threads and reply with simple formatting so that discussions are readable and safe.

- **Priority:** Must · **Size:** L · **Depends on:** S1-E8-01, S1-E10-01
- **Acceptance criteria:**
  - Given a post, when it is saved, then the Markdown subset is cleaned on the server and again before display, so no script, iframe or style can run.
  - Given a link in a post, when it is shown, then it has `rel="nofollow ugc noopener"`.
  - Given a thread, when it is shown, then every post has a number (#1, #2) and its own permalink.
  - Given a user edits their post, when they save, then an "Edited" note appears and moderators can see the previous version.
- **Legal and compliance:** whether pictures are allowed in posts is OPEN (if yes, they go through the picture check in S1-E10-05).

##### S1-E8-03 Quote, multi-quote and quick reply

As a user, I want to quote other posts and reply quickly so that conversations are easy to follow.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E8-02
- **Acceptance criteria:**
  - Given a post, when the user taps "Quote", then the reply box opens with the quoted text and a link to the original post.
  - Given several posts marked with "Multi-quote", when the user replies, then all of them are quoted in order.
  - Given the bottom of a thread, when the user types in the quick reply box, then they can post without leaving the page.
- **Legal and compliance:** none beyond the global checklist.

##### S1-E8-04 Read and unread tracking

As a user, I want to see which threads have new posts and mark everything as read so that I can keep up.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E8-02
- **Acceptance criteria:**
  - Given a thread with posts newer than the user's last visit, when lists are shown, then it is marked as unread.
  - Given an unread thread, when the user opens it, then they land on the first unread post.
  - Given "Mark all as read" on a forum or on the whole board, when it is tapped, then every thread in that scope shows as read.
- **Legal and compliance:** implementation note: the phpBB pattern (a per-user last mark, per-forum marks and per-thread marks) is confirmed by the research fact check.

##### S1-E8-05 Sticky and locked threads, reply without bumping

As a moderator, I want to pin and lock threads, and users want to reply without bumping, so that forums stay orderly.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E8-02, S1-E2-07
- **Acceptance criteria:**
  - Given a moderator, when they make a thread sticky, then it stays at the top of its forum.
  - Given a moderator locks a thread with a reason, when users open it, then they can read it but not reply, and the reason is shown.
  - Given a user ticks "Don't bump" on a reply, when it posts, then the thread's position in the list does not change.
- **Legal and compliance:** threads are ordered by latest activity and the starting categories stay pinned (decided 16 Oct 2026, late evening, Q45); no popularity ranking in forums.

##### S1-E8-06 User-created spaces

As a user, I want to create my own space so that I can host a community around a topic.

- **Priority:** Must · **Size:** L · **Depends on:** S1-E8-02, S1-E2-02
- **Updated:** 16 Oct 2026, late evening (Q26, Q50).
- **Acceptance criteria:**
  - Given any fully active account, when it creates a space, then it sets a unique name, description, rules and an optional banner (spaces are the only place banners appear, Q50) and becomes its owner; there is no minimum account age, no approval step and no limit per person beyond the spam limits (S1-E10-12).
  - Given a space created by someone under 16, when it is created, then it is an under-16 space: only under-16 accounts can join, post, be invited or moderate it.
  - Given a space created by someone 16 or over, when it is created, then it is a 16+ space: only accounts 16 or over can join, post, be invited or moderate it.
  - Given a class space (S1-E8-11), when it is set up, then it is the one exception: students of any age plus the teacher.
  - Given an open 16+ space, when anyone (signed in or not) opens it, then they can read it.
  - Given an under-16 space, when someone 16 or over or a signed-out visitor tries to open it, then it is hidden, unless its owner has made it public to everybody, in which case anyone can read it but only under-16s can join or post (decided 17 Oct 2026, 34p).
  - Given a member of an under-16 space turns 16, when their age changes, then they stay in the under-16 groups they joined before, but can no longer start or join any under-16 group (decided 17 Oct 2026, 34p).
  - Given the owner switches on members-only posting, when a non-member tries to post, then they are asked to join and the owner's approval rule applies.
  - Given a space name that uses a brand or author name, when it is created, then it is allowed (Q26) and any trademark complaint goes through notice and action.
- **Legal and compliance:** keeping under-16s and adults apart in spaces matches the messaging rule (S1-E9-03) and DSA Art 28. Decided 17 Oct 2026 (34p): adults read an under-16 space only if its owner made it public; members who turn 16 keep the groups they joined before but can't start or join under-16 groups. **OPEN:** what happens when the owner of an under-16 space turns 16 (proposal: they hand the space to another under-16 member or a moderator).

##### S1-E8-07 Space moderators and permissions

As a space owner, I want to appoint moderators with specific powers so that I can share the work.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E8-06, S1-E2-07
- **Acceptance criteria:**
  - Given a space, when the owner appoints a moderator, then they choose permissions from posts, members, settings and mail.
  - Given a space moderator action, when it happens, then it is logged and visible to the owner and platform moderators.
  - Given a platform moderator, when they act in any space, then they override space-level settings.
- **Legal and compliance:** decided: build the permission model in Stage 1 and use it more later. Platform moderators keep legal responsibility.

##### S1-E8-08 Signatures and profile customisation limits

As a user, I want a short signature so that I can express myself without cluttering threads.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E8-02
- **Acceptance criteria:**
  - Given a signature, when it is saved, then it is at most 300 characters, three lines and one static image (canvas 6.1); animated images are refused.
  - Given a phone-width screen, when a thread is shown, then signatures are hidden (Q25).
  - Given an inappropriate signature or banner, when a moderator flags it, then the user is warned and it is removed if not changed within 24 hours (Q29).
- **Legal and compliance:** none beyond the global checklist.

##### S1-E8-09 Ranks and light reputation

As a writer, I want a rank that reflects what I've published so that my contribution is visible.

- **Priority:** Could · **Size:** M · **Depends on:** S1-E3-03
- **Acceptance criteria:**
  - Given a user's published chapters and words, when ranks are calculated, then the rank is based on those, never on post count.
  - Given the rank ladder, when ranks are calculated, then there are four, given automatically and recalculated each time a chapter is published or removed: New writer (first chapter), Writer (5 chapters), Storyteller (15 chapters or 30,000 words) and Novelist (100,000 words); staff never hand out ranks (decided 17 Oct 2026, canvas comment).
  - Given a rank, when the profile picture is shown, then the rank's own doodle sticker sits on it (New writer a pencil, Writer a quill and ink, Storyteller an open book with sparkles, Novelist a crown), as an SVG doodle, never an emoji, hidden from screen readers and never over text or controls; the rank name is in the text next to it.
  - Given the profile's rank panel, when it is shown, then it lists the four ranks with their stickers, the current one highlighted and the ones not reached faded, plus progress to the next.
  - Given a phone-width screen, when posts are shown, then a small avatar and rank chip appear next to the name.
- **Legal and compliance:** reputation weighting is deferred, as the research suggested. Ranks unlock nothing; they are recognition only.

##### S1-E8-10 Forum search

As a user, I want to search forum posts so that I can find past discussions.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E8-02
- **Acceptance criteria:**
  - Given a search term, when it is entered, then results include threads and posts, filterable by space and author, with Romanian stemming and diacritic-insensitive matching.
  - Given removed posts or blocked users, when results are shown, then they are excluded.
- **Legal and compliance:** none beyond the global checklist.


##### S1-E8-11 Private class spaces

As a teacher, I want a private space for my class so that my students can write, share and run a contest that only the class can see.

- **Priority:** Should (proposal: for the March test, staff set up class spaces by hand for the pilot schools; self-service teacher sign-up comes after March) · **Size:** L (split before building: 11a private visibility and invite codes, 11b the Class space option and teacher tools; the badge itself is S1-E2-11) · **Depends on:** S1-E8-06, S1-E8-07, S1-E2-08, S1-E2-03, S1-E2-11, S1-E11-01
- **Added:** 16 Oct 2026, at Robert's request (canvas comment on the Facebook group mock-up).
- **Acceptance criteria:**
  - Given an account with a Teacher badge (S1-E2-11, or approved by staff for a pilot school), when its profile is shown, then it carries a "Teacher" badge and the teacher can create class spaces.
  - Given the Create a space form, when an account with a Teacher badge opens it, then it asks "What kind of space?" with Open space and Class space ("like a school class online"), and the class space page explains the three steps to start one; for every other account there is no Class space option and no "What kind of space?" question at all, and every space they make is an open space (Robert, canvas comments, 16 Oct 2026).
  - Given a teacher creates a space and chooses "Private class", when anyone who is not a member looks for it, then it does not appear in search, discovery or public lists, and its posts and stories cannot be opened.
  - Given a private class space, when the teacher opens its settings, then they get an invite code and link that they can reset at any time and that stop working after the period the teacher sets.
  - Given a student uses an invite code, when they join, then they can see and post only once their account is fully active (age check passed and, for under-16s, parental consent given); a class space is the one space where students of any age and the teacher are together: it is by invitation, follows the people in the room and is never split at 16 (Q26; 17 Oct 2026).
  - Given a student shares a story with the class, when it is published, then only members can read it until the student makes it public; a teacher can never make it public for them.
  - Given a teacher moderates, when they remove a post or a member, then the action is logged (S1-E8-07); platform moderators can act in any class space, and reports from inside it go to the normal queue (S1-E10).
  - Given the academic year ends (or the teacher closes the space earlier), when the space is archived, then it locks: nobody can post, react, join or be invited, and every member keeps read access for as long as their own account exists (decided 16 Oct 2026, late evening, Q69); students keep their own stories and drafts.
  - Given any page inside a class space, when it is shown, then it carries no banners, ads, sponsored items or sponsor credits (decided 16 Oct 2026, late evening, Q70).
  - Given staff use the admin site, when they set up a class space for a pilot school, then they can approve the teacher from the Teacher checks queue (S1-E2-11), create the space, name the teacher as owner and print the invite code (manual pilot mode).
- **Legal and compliance:**
  - Minors: most members are under 18. The adult-to-minor messaging rules (S1-E9-03) apply to teachers too: teachers can never message under-16 students (decided 16 Oct 2026), and 16 and 17-year-olds only if the student has switched adult messages on.
  - Teacher checks: decided 16 Oct 2026, a school email or proof that you teach, checked by our staff and then deleted (S1-E2-11). The teacher moderates minors, so the school vouching for them matters; an avocat should check the process before launch.
  - GDPR and ownership (decided 17 Oct 2026): the school owns only the data the teacher provides (materials, grades and feedback); the teacher grades assignments, but the final work belongs to the pupil. How that maps to controller and processor roles, and whether a data processing agreement is needed, needs a Romanian lawyer before the pilot (school protocol, Annex 1).
  - Money (decided 17 Oct 2026): state high schools use class spaces free; universities and private schools pay a yearly licence; paid extras for every school are listed separately with prices to be set (research G3).
  - DSA Art 28: private spaces are still part of the platform; reporting, moderation and minors' protections must work inside them.
  - Ads: none at all inside class spaces, not even a sponsor's credit (decided 16 Oct 2026, late evening, Q70). Keeping posts readable for life while the member's account exists needs a line in the privacy notice and the school protocol (section 6).
  - Pilot (Q65 to Q68): maybe a first pilot around March, as a writing club (a contest is a campaign for later, decided 17 Oct 2026, 12:34); no inspectorate involvement until autumn 2027; a Romanian school protocol is being drafted for an avocat.

##### S1-E8-12 Writing certificates

As a student writer, I want a certificate when I take part in or win a contest or finish a class programme so that I can add it to my school portfolio.

- **Priority:** Could (proposal: for the March test, staff make the certificates by hand from a branded template and send them as PDFs; this story automates it later) · **Size:** M · **Depends on:** S1-E8-11, S1-E11-01, S1-E12-02
- **Added:** 16 Oct 2026, at Robert's request (canvas comment on the Facebook group mock-up).
- **Acceptance criteria:**
  - Given a contest or class programme, when staff or the teacher mark entrants as participant, finalist or winner, then each student gets a certificate under "My certificates" in their account.
  - Given a class certificate, when the student opens it the first time, then they may type their real name, which prints with the school name; the name is stored only with the certificate, never on the profile or anywhere else, and is deleted 30 days after the class is archived (decided 17 Oct 2026, 12:44). Every other certificate prints the pen name.
  - Given a class is archived, when it happens, then the teacher is told in the app and by email to keep their own copies of the class certificates within 30 days, before the printed names are deleted (decided 17 Oct 2026, 12:44). What a certificate shows after its name is deleted is not decided (proposal: the pen name; check with Robert).
  - Given a certificate is generated, when it is downloaded, then it is an A4 PDF in Romanian or English with the printed name, the contest or programme, the result, the date and a unique code, co-signed by Ghemotoc and the teacher leading the contest or class (decided 16 Oct 2026, late evening, Q23 and Q71); the PDF has real, tagged text, not an image.
  - Given a class contest or programme, when the teacher approves the list of results in the class space, then their name prints as the second signatory (how the teacher's signature is captured is OPEN; proposal: the approval itself, logged, with the printed name and "signed electronically").
  - Given someone has a certificate's code, when they enter it on the public verification page, then it shows only whether it is valid, the contest or programme, the result and the date, never the student's name.
  - Given staff revoke a certificate (an error or a rule breach), when its code is checked, then the page shows "revoked".
  - Given a student deletes their account, when the deletion runs, then their certificate records are deleted and the code shows "no longer available".
- **Legal and compliance:**
  - Data minimisation (GDPR Art 5(1)(c)): the real name is collected only for a class certificate, only if the student asks for one, and deleted 30 days after the class is archived. It is the one named exception to "store no legal names" (CLAUDE.md rule 5; decided 17 Oct 2026, 12:44); the privacy notice and the retention schedule say so.
  - Official recognition (research G1, 16 Oct 2026): only schools and other public education units can put a contest on the official calendars; a company can only be a partner (OMEC 6.727/2025, Annex 2, art. 9(1)). A first edition cannot enter the national or interjudețean calendars (OMEC 6.727/2025, Annex 2, art. 11(1) to (2)). Pupils taking part in an outside organisation's activity need a partnership agreement with their school (ROFUIP art. 97(3)). Diplomas for listed contests are signed by the organising school, the ISJ and the partners (OMEC 6.727/2025, Annex 2, art. 20(11)), and results go into the pupil's educational portfolio (Law 198/2023 art. 98). So for 2027 the certificate is co-issued with each pilot school under a partnership agreement, and the teacher signs for the school (Q71). Decided 16 Oct 2026: no county contest calendars for now; no inspectorate involvement until autumn 2027 (Q67).
  - ROFUIP art. 178(2): in partnerships with companies, the company may not advertise its products or services. How this applies to our own app inside a school partnership needs a Romanian lawyer. OPEN.
  - Contest rules must say who issues certificates and on what terms.
  - Partner or school logos go on a certificate only with their written permission.

##### S1-E8-QA Epic check: Forums and spaces

As the founder, I want every story in this epic tested together end to end so that the pieces work with each other, not just alone.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E8-01, S1-E8-02, S1-E8-03, S1-E8-04, S1-E8-05, S1-E8-06, S1-E8-07, S1-E8-08, S1-E8-09, S1-E8-10, S1-E8-11, S1-E8-12
- **Added:** 17 Oct 2026, 12:36 (Robert, chat): every epic ends with a quality-check story, and every prompt has a quality check built in. Every story in this epic comes after March, so this check does too; it covers all of them and comes last.
- **Main journeys:** forum categories, threads and posts, quoting, read marks, sticky and locked threads, user spaces with their moderators, signatures, ranks, forum search, class spaces and certificates.
- **Acceptance criteria:**
  - Given the epic's stories are merged, when the end-to-end suite runs, then Playwright tests walk the main journeys across those stories with the seed personas `adult_writer`, `teen_17`, `kid_14_ok` and `kid_14_waiting` and the staff personas the epic uses, and every journey passes.
  - Given a journey breaks where two stories meet, when it is found, then it is fixed in this pull request or ticketed as a GitHub issue that names the stories involved.
  - Given every screen in the epic, when axe runs at 390, 768 and 1440 px wide, then it reports no serious or critical issues.
  - Given the RLS tests, when they run as one suite (`npx supabase test db`), then every policy on every table the epic touches has an allowed and a denied test, with no gaps.
  - Given `docs/code-tour.md`, when it is read, then it covers the epic: where its screens, hooks, tables, functions and jobs live and how one main journey travels through them.
  - Given the check is finished, when the pull request is opened, then it includes a short epic report listing what works, the known gaps and every stub or mock still on (with the story that removes it, `docs/mocks.md`).
- **Legal and compliance:** minors' journeys are tested with the under-16 (`kid_14_ok`, `kid_14_waiting`) and 16 to 17 (`teen_17`) personas, so the age gate, ratings, blocks and under-18 defaults are proved across stories, not only inside each one. The test data is the seed personas only, never real user data (CLAUDE.md, Safety while building).

---
