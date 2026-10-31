> Added 31 Oct 2026 at Robert's request (builder thread, 07:58). Robert's own story numbers (US-1.1 to US-10.2) are kept in brackets.

#### S1-E17 Story Atlas: the writer's private planning workspace

Story Atlas is the private planning side of every Ghemotoc story. It complements the writer section that already exists (S1-E3): a story the writer creates with "New story" (S1-E3-01) is the same story they plan in Story Atlas, and its chapters are the same chapters they write in the chapter editor (S1-E3-02) and publish (S1-E3-03). Story Atlas adds what a writer needs around the text: the story at a glance, characters, connections (relationship map and family tree), the story bible, the storyline (board, timeline, POV lanes), planning fields on each chapter, questions and ideas, marketing notes, and search with cross-links (Robert, 31 Oct 2026, 08:00: "intertwined with what we already have for the writer section when they start a new story, so it should complement it").

**Back end and build order:** new tables for the planning data (characters, relationships, bible, events, scenes, ideas, marketing notes, custom fields), each pointing at `stories.id` and owned by the writer (`user_id`), readable and writable only by them; private planning columns on `chapters` (act, planning status, POV, word target, in-world date, location, characters present, summary). Bundle ATLAS in the full-app plan.

**Principles (Robert, 31 Oct 2026)**

- Every change saves by itself. There is no Save button to forget.
- Nothing is deleted without a second, confirming click.
- Fields are generous by default, and the writer can add their own.
- Images are blank by default. Only the writer's own uploads appear.
- No AI suggestions, generation or analysis anywhere in Story Atlas.
- Private to the writer: nobody else, staff included, reads it through the app.

**Non-functional requirements**

- Privacy: only the owner can read or edit their Story Atlas, enforced in RLS (CLAUDE.md rule 1).
- Saving: changes save within about a second; a failed save says so in plain words and keeps the text.
- Looks: matches Ghemotoc (plum ink on warm paper, Bricolage Grotesque headings, Inter body text, Cutive labels, pill buttons), in light and night themes.
- Devices: laptop first, fully usable at 390 px, no sideways page scrolling (CLAUDE.md rule 21).
- Accessibility: WCAG 2.2 AA; real buttons and labels, visible focus, 44 px tap targets, contrast, no meaning by colour alone; every drag has a button alternative.

**Notes for the build (proposals, to confirm in the plan)**

- **How it fits the writer section.** One story, two sides: readers see the published story and chapters; only the writer sees the plan. Planning data is never shown on a public screen, in a link preview or to staff through the app, even when the story is published. A chapter planned in Atlas is an ordinary draft chapter until the writer publishes it, and the manuscript is written in the existing chapter editor (S1-E3-02), with the planning fields beside it.
- **Story Atlas in the menus.** "Plan" sits beside "Write" on each of the writer's stories (the writer dashboard and the story's own pages), and the Story Atlas switcher lists the same stories.
- **Order of chapters.** Moving a published chapter on the board changes the order readers see, exactly as Manage chapters (S1-E3-04) does, so the board asks first when a move would renumber published chapters. Acts are private groupings and never shown to readers.
- **Reporting (CLAUDE.md rule 6).** Nobody but its owner can see Atlas content, so there is nothing for another person to report and it gets no Report button; uploaded images still pass the picture check (rule 19).
- **Data rights.** Atlas content is in Download my data (S1-E13-02) and goes with the account (S1-E13-03).
- **Minors.** Any member can use it, minors included: it is private and has no contact with other people.

##### S1-E17-01 Create a story with its plan (US-1.1)

As a writer, I want every new story to come with its plan, so that I can keep separate books in one place.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E3-01
- **Acceptance criteria:**
  - Given "New story" (S1-E3-01, from the writer section or from Story Atlas), when I create a story with a title, then it is one story: a draft in the writer section and a plan in Story Atlas. Stories created before Story Atlas get their plan the first time it is opened.
  - Given a new story, when it is created, then its plan has the default bible sections (S1-E17-17), three acts (Act I, Act II, Act III), a word target of 90,000 and no characters.
  - Given I created the story from Story Atlas, when it is saved, then it opens straight away on its at-a-glance page; from the writer section, the usual next step stays, with "Plan this story" beside it.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-02 Switch between stories (US-1.2)

As a writer, I want a story switcher that is always visible, so that I can move between projects in one click.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E17-01
- **Acceptance criteria:**
  - Given I have several stories, when I open the switcher in the Story Atlas top bar, then it lists every story I write (drafts and published) by title.
  - Given I switch stories, when the new one loads, then I see only that story's characters, bible, chapters, ideas and marketing notes, and nothing from the others.
  - Given I come back on the same device, when Story Atlas opens, then it opens the story I had open last.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-03 Edit story details (US-1.3)

As a writer, I want to edit a story's title, series name, genre, audience, word target and writing status, so that the at-a-glance page stays accurate.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E17-01, S1-E3-05
- **Acceptance criteria:**
  - Given the at-a-glance page, when I change any of these fields, then the change saves by itself.
  - Given the title, genre and audience, when I change them in Story Atlas, then they are the story's own title, category and rating from the writer section (S1-E3-01, S1-E3-06), changed in one place for both; series name, word target and writing status are the plan's own and stay private.
  - Given I change the title, when it saves, then the switcher and the story's public pages show the new title.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-04 Link to another project (US-1.4)

As a writer, I want to store a link to a related project outside Ghemotoc (a shared drive, a mood board), so that I can jump between my story and my other work. Links between the plan and the story itself are built in ("Write" and "Plan" sit side by side).

- **Priority:** Should · **Size:** S · **Depends on:** S1-E17-03
- **Acceptance criteria:**
  - Given the story details, when I fill in "Linked project" (a label and a web address), then it saves.
  - Given a linked project, when I view the at-a-glance page, then "Open <label>" appears and opens in a new tab with `rel="noopener"`.
  - Given an address that isn't http or https, when I try to save it, then it is refused with a plain message.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-05 Delete a story (US-1.5)

As a writer, I want to delete a story I've abandoned, so that my switcher stays tidy.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E17-01
- **Acceptance criteria:**
  - Given a story, when I choose Delete, then a second, confirming click is needed and the message says clearly that everything in the story will go.
  - Given I confirm, when the story is deleted, then it is the same deletion as in the writer section (S1-E3-05): the story, its chapters and text, and its whole plan (characters, entries, ideas, relationships, events and uploaded images) go together.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-06 The whole story on one page (US-2.1)

As a writer, I want a home page that summarises the story, so that I can remind myself what it is and where I'm up to.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E17-03, S1-E17-23, S1-E17-28
- **Acceptance criteria:**
  - Given a story, when I open its at-a-glance page, then it shows the title, logline, genre, audience and publishing route.
  - Given chapters with text, when the page shows, then the total words written show against the story target as a number and a progress bar with a text equivalent.
  - Given chapters at different statuses, when the page shows, then it counts the chapters at each status (Idea, Outlined, Drafting, Drafted, Revising, Done).
  - Given open questions and ideas, when the page shows, then their number shows, with the five most recent tickable in place.
  - Given a cast and recent edits, when the page shows, then the cast count and the recently edited chapters and entries show, each linking to its item.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-07 Check my plan against my target (US-2.2)

As a writer, I want to see whether my chapter targets add up to my story target, so that I know if my outline is long enough.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E17-06
- **Acceptance criteria:**
  - Given chapters with targets, when I view the at-a-glance page, then it says "Chapter targets add up to X of Y words".
  - Given the chapter targets are more than 10% short of or over the story target, when the page shows, then the gap is called out in words, not by colour alone.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-08 Create and browse characters (US-3.1)

As a writer, I want a list of all my characters, grouped by role, so that I can find anyone quickly.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E17-01
- **Acceptance criteria:**
  - Given the Characters page, when I choose "New character", then a character is created and its sheet opens.
  - Given characters, when I view the list, then they are grouped by role (Protagonist, Deuteragonist, Antagonist, Supporting, Minor, Mentioned only) and I can filter them by typing.
  - Given I select a character, when the sheet opens, then it sits beside the list on a laptop and below it on a phone.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-09 Rich character sheets (US-3.2)

As a writer, I want a detailed sheet for each character, so that I never contradict myself.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E17-08
- **Acceptance criteria:**
  - Given a character, when I open the sheet, then it has four groups: Basics (name, also known as, role, species or kind, pronouns, age or year born, status such as alive, dead or undead, occupation, origin); Look and voice (appearance, distinguishing marks, voice and mannerisms); Inside (personality, what they want, what they need, fear or wound, secrets, values and code); In the story (backstory, arc, first appearance picked from the chapters, key lines and quotes, notes).
  - Given I type in any field, when I pause, then it saves by itself within about a second.
  - Given a long field, when I write, then the box grows with the text.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-10 My own character fields (US-3.3)

As a writer, I want to add custom fields to every character sheet in a story, so that I can track things specific to this book (for example "Turned by" or "Phoenix stage").

- **Priority:** Must · **Size:** M · **Depends on:** S1-E17-09
- **Acceptance criteria:**
  - Given the story details, when I define a custom field once, then it appears on every character's sheet in that story.
  - Given a custom field with values, when I remove it, then it is hidden but the values already written are kept, and bringing it back shows them again.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-11 Character image (US-3.4)

As a writer, I want to upload a portrait or mood image, so that I can picture the character.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E17-08, S1-E10-05
- **Acceptance criteria:**
  - Given a character with no image, when the sheet shows, then the initials show instead (images are blank by default).
  - Given I upload an image file, when it passes the picture check, then it shows on the sheet; I can remove it later, and removing it deletes the file.
- **Legal and compliance:** Every upload goes through the picture check (CLAUDE.md rule 19, S1-E10-05), even though only the writer sees it: hash matching against known child abuse images applies to every stored picture. The image needs alt text, which the writer can edit.

##### S1-E17-12 See where a character appears (US-3.5)

As a writer, I want each sheet to show the chapters a character is in, and where they're mentioned, so that I can trace them through the book.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E17-09, S1-E17-24, S1-E17-31
- **Acceptance criteria:**
  - Given chapters where the character is the POV or marked present, when I view the sheet, then "Appears in" lists them.
  - Given bible entries, chapters, ideas or other sheets that link to the character with [[their name]] or an alias, when I view the sheet, then "Mentioned in" lists them.
  - Given either list, when I choose an item, then it opens with one click.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-13 Delete a character (US-3.6)

As a writer, I want to delete a character I no longer need, so that my cast list stays tidy.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E17-08
- **Acceptance criteria:**
  - Given a character, when I choose Delete, then a second, confirming click is needed.
  - Given I confirm, when the character is deleted, then their relationships and image go with them.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-14 Record relationships (US-4.1)

As a writer, I want to record how two characters are connected, so that I can keep track of loyalties, romances and grudges.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E17-08
- **Acceptance criteria:**
  - Given a character sheet or the Connections page, when I pick another character, a relationship type and an optional note, then the relationship is saved.
  - Given the type list, when I open it, then it offers: parent of, sibling of, partner or spouse of, loves, turned or made, friend of, ally of, mentors, works for, enemy of, resents, killed, and custom (with my own label).
  - Given a relationship, when I view either character's sheet, then it is listed on both, and I can delete it.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-15 Relationship map (US-4.2)

As a writer, I want a visual web of my cast, so that I can see the shape of the story's relationships.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E17-14
- **Acceptance criteria:**
  - Given relationships, when I open the map, then characters show as nodes and relationships as labelled lines.
  - Given the categories family, love, lineage (makers), allies, conflict and other, when lines are drawn, then each category differs in both colour and line style (conflict dashed, lineage dotted), so meaning never relies on colour alone.
  - Given the category switches, when I turn one off, then its lines are hidden.
  - Given a node, when I choose it, then that character's sheet opens; every node is a real, focusable control.
  - Given a phone, when the map is wider than the screen, then the map itself scrolls sideways and the page doesn't.
  - Given a screen reader, when it reaches the map, then the same relationships are available as a list.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-16 Family tree (US-4.3)

As a writer, I want a family tree built from the parent and partner relationships, so that I can see bloodlines and generations.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E17-14
- **Acceptance criteria:**
  - Given parent and partner relationships, when I open the tree, then generations are laid out top to bottom, partners side by side, with lines from parents to children.
  - Given the "Include turned or made" option, when I switch it on, then makers count as lineage (for vampire and maker bloodlines).
  - Given characters with no family links, when the tree shows, then they are left off and a note says how many.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-17 Customisable bible sections (US-5.1)

As a writer, I want to organise my world-building into sections I control, so that the bible fits any genre.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E17-01
- **Acceptance criteria:**
  - Given a new story, when its bible opens, then it has the default sections: Premise and themes, World and places, Magic and rules, Cosmology and belief, Factions and organisations, History, Glossary.
  - Given the sections, when I add, rename or reorder one, then it saves; reordering also works with buttons, not only by dragging.
  - Given a section, when I try to delete it, then only an empty section can be deleted, after a second confirming click.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-18 Bible entries (US-5.2)

As a writer, I want entries with a title, tags and free text inside each section, so that I can capture lore at any length.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E17-17, S1-E17-31
- **Acceptance criteria:**
  - Given an entry, when I open it, then it shows in reading mode with clickable links and an Edit toggle.
  - Given an entry, when I move it to another section, then it appears there.
  - Given an entry, when I delete it, then a second confirming click is needed.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-19 Chapter board (US-6.1)

As a writer, I want my chapters as cards in act columns, so that I can rearrange the structure.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E17-24
- **Acceptance criteria:**
  - Given chapters, when I open the board, then each card shows its label (Prologue, Chapter 3, Epilogue…), title, POV, status, words against target and in-world date.
  - Given a card, when I drag it within an act or to another act, then the order saves and chapter numbers update by themselves.
  - Given a card, when I use its move buttons (earlier, later, previous act, next act), then it moves the same way, by keyboard or on a phone.
  - Given a card, when I choose it, then it opens in the writing view.
  - Given a move that would renumber published chapters, when I make it, then the board asks first, because readers see the new order (S1-E3-04).
  - Given a card, when it shows, then a published chapter is marked "Published", so planning status and reader status are never confused.
  - Given an act column, when I choose "Add chapter", then a chapter is added at the end of that act.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-20 Timeline (US-6.2)

As a writer, I want an in-world timeline of events and chapters, so that dates and ages stay consistent.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E17-24
- **Acceptance criteria:**
  - Given the timeline, when I add an event with a title, a display date ("Spring 2055"), a sort value (2055.3) and a description, then it saves.
  - Given events and dated chapters, when the timeline shows, then they sort together by sort value, and chapters are marked differently from events (not by colour alone).
  - Given undated chapters, when the timeline shows, then they are listed separately so I can date them.
  - Given an event, when I edit or delete it, then the change saves (deleting after a second click).
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-21 POV lanes (US-6.3)

As a writer, I want a grid of chapters against POV characters, so that I can check the balance of voices.

- **Priority:** Should · **Size:** S · **Depends on:** S1-E17-24
- **Acceptance criteria:**
  - Given chapters with POVs, when I open POV lanes, then chapters run down the rows in book order, with one column per POV character.
  - Given a chapter, when it shows in its POV's column, then it is marked by status with colour and a text label.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-22 Toggle between storyline views (US-6.4)

As a writer, I want Board, Timeline and POV lanes one toggle away, so that I can look at the structure from each angle.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E17-19, S1-E17-20
- **Acceptance criteria:**
  - Given the storyline page, when I switch view, then Board, Timeline and POV lanes are one toggle away.
  - Given I come back, when the storyline opens, then it shows my last choice.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-23 Write chapters in the tool (US-7.1)

As a writer, I want to draft each chapter next to its plan, so that the manuscript lives with the plan.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E17-24, S1-E3-02
- **Acceptance criteria:**
  - Given the writing view, when it opens, then it is the existing chapter editor (S1-E3-02, with its autosave and draft and publish rules), with the chapter list on the left, the chapter on the right and the planning fields in a side panel (stacked on a phone).
  - Given I type, when I pause, then the text saves by itself and a "Saved" indicator confirms it; a failed save says so in plain words and keeps my text.
  - Given I type, when the words change, then a live count shows "words / target".
  - Given focus mode, when I turn it on, then the planning fields are hidden.
  - Given a chapter nearing the editor's limit for one chapter (about 40,000 words), when I write, then a warning suggests splitting it.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-24 Chapter planning fields (US-7.2)

As a writer, I want each chapter to carry its planning details, so that the board, timeline and lanes fill themselves.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E17-01, S1-E3-04
- **Acceptance criteria:**
  - Given a chapter of the story (the same chapters as Manage chapters, S1-E3-04), when I open it, then it has: type (Chapter, Prologue, Interlude, Epilogue), title, planning status, POV, act, word target, in-world date and sort value, location, characters present (toggle chips) and summary, all saving by themselves.
  - Given a planned chapter with no text yet, when I add it, then it is an ordinary draft chapter that readers never see until I publish it.
  - Given the planning fields, when the chapter is published, then none of them shows to readers; the title is the chapter's own title.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-25 Scenes inside a chapter (US-7.3)

As a writer, I want to break a chapter into scenes, so that I can plan beats in more detail.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E17-24
- **Acceptance criteria:**
  - Given a chapter, when I add, reorder (with buttons) or delete a scene, then it saves; deleting needs a second click.
  - Given a scene, when I edit it, then it has a title, POV, status and summary.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-26 Word-count tracking (US-7.4)

As a writer, I want targets per chapter and for the whole story, with progress for both, so that I can pace the book.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E17-23
- **Acceptance criteria:**
  - Given a chapter target, when I view the chapter, its board card or the chapter list, then its progress shows there.
  - Given a story target, when I view the at-a-glance page, then the story's progress shows.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-27 Capture questions and ideas quickly (US-8.1)

As a writer, I want to jot down a question or idea in one line, so that nothing gets lost while I'm working.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E17-01
- **Acceptance criteria:**
  - Given the quick-add box with a type (Question, Idea, To-do, Decision), when I type a line and press Enter, then the item is added and the box clears.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-28 Tick off and record what I decided (US-8.2)

As a writer, I want to tick items off and record what I decided, so that I have a log of decisions.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E17-27, S1-E17-31
- **Acceptance criteria:**
  - Given an item, when I view it, then it has a done tick-box, editable text and an "Action or outcome" field.
  - Given I tick it, when it saves, then the date it was done is recorded.
  - Given the list, when I choose Open, Done or All, then it filters.
  - Given an item, when I write [[name]], then it links to a character, entry or chapter.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-29 Marketing notes (US-9.1)

As a writer, I want one place for my logline, back-cover blurb, genre, audience, comparable titles, hooks and keywords, query pitch, publishing route and launch notes, so that I'm ready to pitch or publish.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E17-01
- **Acceptance criteria:**
  - Given the Marketing page, when I edit any field, then it saves by itself.
  - Given "Back cover", when I open the preview, then the title, logline, blurb and comps are laid out like a book's back cover, as real text.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-30 Search everything (US-10.1)

As a writer, I want one search box across the whole story, so that I can find any detail in seconds.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E17-09, S1-E17-18, S1-E17-23
- **Acceptance criteria:**
  - Given any Story Atlas page, when I look at the top bar, then the search box is there.
  - Given a search, when it runs, then it searches characters (all fields, custom ones too), bible entries, chapters (including the manuscript), scenes, ideas, timeline events and marketing notes of the open story only.
  - Given results, when they show, then they are grouped by type with a snippet and the match highlighted (not by colour alone), and each opens its item.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-31 Cross-links with [[Name]] (US-10.2)

As a writer, I want to type [[Name]] anywhere to link to a character, bible entry or chapter, so that my notes connect to each other.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E17-09, S1-E17-18
- **Acceptance criteria:**
  - Given [[text]], when it is read, then it resolves by name, alias or title, ignoring capitals, within the open story.
  - Given reading views, when a link resolves, then it is clickable; under editing fields, the detected links show as chips I can choose.
  - Given a link with no match, when it shows, then it reads "not found yet", so I can see what still needs creating.
- **Legal and compliance:** private to the writer; no new kind of public content.

##### S1-E17-QA Epic check: Story Atlas

As the founder, I want Story Atlas tested end to end once its stories are merged, so that I know it works as one tool.

- **Priority:** Should · **Size:** S · **Depends on:** every S1-E17 story
- **Acceptance criteria:**
  - Given a writer with two stories, when they create, link, move, search and delete items across every area, then nothing from one story shows in the other and every change survives a reload.
  - Given another member and a staff account, when they try to read the writer's Atlas through the app or the database, then they get nothing (an allowed and a denied test per policy).
  - Given every Atlas screen, when checked at 390, 768 and 1440 px in light and night themes, then axe finds no serious issues and nothing scrolls sideways.
- **Legal and compliance:** none beyond the global checklist.
