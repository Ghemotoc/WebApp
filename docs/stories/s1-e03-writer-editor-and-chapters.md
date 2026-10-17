> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E3 Writer editor and chapters

**Back end and build order:** section 1.7, group D (screens 4.1 to 4.4), wave 2; S1-E3-01 to 03 are on the build chain (section 1.7.8).

Goal: publishing a chapter is the core flow of the March test.

##### S1-E3-01 Create a story

As a writer, I want to create a story with a title, blurb, category, tags, language and cover so that readers can find it.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E2-01, S1-E1-02; S1-E11-05 for the open languages (seeded in a migration for March, section 1.7.9); S1-E10-05 for uploaded covers
- **Updated:** 16 Oct 2026 (late evening): owner by user ID; uploads on from launch with the picture check; categories without journalism.
- **Acceptance criteria:**
  - Given the new story form, when it is shown, then category is chosen from the fixed list: fiction, poetry and nonfiction essays, with up to 10 tags (decided 16 Oct 2026, late evening, Q52: no journalism or articles at launch).
  - Given tags, when they are saved, then they are lower-cased, trimmed and diacritic-normalised so "Fantezie" and "fantezie" are one tag.
  - Given a cover image, when it is uploaded, then only JPEG, PNG or WebP up to 5 MB is accepted, location data (EXIF) is stripped and the picture check runs on upload (S1-E10-05): a clean picture shows straight away and a flagged one stays private until a moderator decides. Picture uploads are on from launch (decided 16 Oct 2026, late evening, Q18).
  - Given the cover step, when the writer chooses to upload, then it asks first for the tall cover (1600 × 2560 pixels, 5 wide by 8 high, smallest 800 × 1280) used on story cards and the story page, and says to keep words away from the edges; as soon as the tall cover is added, the square step opens by itself (Robert, canvas comments, 16 and 17 Oct 2026).
  - Given the square step, when it opens, then its main action is "Crop from your tall cover" and its optional one is "Or upload a different square picture" (1600 × 1600, smallest 800 × 800); the square cover is used for link previews, search results and notifications.
  - Given the writer chooses to crop, when the crop tool opens, then it shows the tall cover with a square frame that starts in the middle and that they can drag to any position and zoom (keyboard arrows and +/- work too), warns that words outside the square are cut, and saves only when they confirm; they can reopen it later to reposition; until a square cover exists, the middle of the tall cover is used. Both pictures go through the picture check (S1-E10-05).
  - Given a writer uploads their own cover picture, when the cover is shown anywhere (story card, story page, shelves, the preview while setting up), then we add no title, pen name or bar on top of it: the picture shows exactly as uploaded, and the title and pen name appear as text under or beside the cover (and in its alt text). The upload step tells the writer to put the title and name on the picture themselves if they want them on the cover. Drawn and automatic covers keep the title on top (Robert, canvas comment, 17 Oct 2026).
  - Given the cover step, when it is shown, then the writer can draw a cover, upload a picture, design it in Canva later (S1-E3-12, after the March test) or skip it and get an automatic cover (S1-E3-13).
  - Given "Draw a cover", when the writer picks one of the 16 approved drawn backgrounds (9 plain, 7 patterns), then they can change its background and its pattern or accent colour within the 9-colour palette. We add the title and pen name and choose dark or light text so it always reaches 4.5:1 contrast (16 Oct 2026).
  - Given a drawn cover at any size (the picker tiles, the preview, the story page, cards and thumbnails), when the title is drawn, then the full title is visible with no ellipsis or clipping and its size steps down with its length (Definition of Done, design rules).
  - Given a story with no published chapter, when anyone other than the writer looks for it, then it is not visible.
  - Given a new story, when it is saved, then it stores the writer's user ID as its owner (`user_id`), and it stays linked to that ID if the writer's handle or pen name changes.
- **Legal and compliance:** writers own their work and can publish anywhere (Q58, Q60). The terms grant Ghemotoc only a licence to host and display it. Drawn covers are our own artwork, so they need no picture rights and no image check and show straight away. CTO note: the drawn cover picker makes this story larger; if it grows past M, split it into 01a (the story form and upload) and 01b (the drawn cover picker) before building (proposal).

##### S1-E3-02 Chapter editor with autosave

As a writer, I want a simple editor that saves as I type so that I never lose a chapter.

- **Priority:** Must · **Size:** L · **Depends on:** S1-E3-01
- **Acceptance criteria:**
  - Given the editor, when the writer types, then the draft saves every 10 seconds (canvas 4.3) and when the editor loses focus, with a visible "Saved" status.
  - Given the connection drops, when the writer keeps typing, then the draft is kept on the device and syncs when the connection returns, with a warning if the server copy changed meanwhile.
  - Given text pasted from Word or Google Docs, when it lands in the editor, then only the allowed formatting survives (headings, bold, italic, quote, lists, scene break, links).
  - Given a keyboard-only or screen reader user, when they use the toolbar, then every button has a label, a visible focus state and a keyboard shortcut.
- **Legal and compliance:** writers can write in the browser (Q5). Content is stored as sanitised structured text so no script can be injected. WCAG 2.2 AA.

##### S1-E3-03 Publish, unpublish and schedule chapters

As a writer, I want to publish, unpublish or schedule a chapter so that I control when readers see it.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E3-02
- **Acceptance criteria:**
  - Given a draft chapter, when the writer publishes it, then it becomes visible, the story's "last updated" date changes and followers are notified (S1-E7-01; until it exists, the `chapter_published` event is stored and nothing is sent).
  - Given a published chapter, when the writer unpublishes it, then readers can no longer open it and its comments are hidden but kept.
  - Given a scheduled time in Europe/Bucharest (or the writer's time zone), when that time passes, then the chapter publishes within five minutes (proposal).
  - Given publishing, when it happens, then a `chapter_published` event is stored for notifications (S1-E7-01); no automated text check runs and nothing is held before it goes live (decided 16 Oct 2026, late evening, Q42 and Q43).
- **Legal and compliance:** moderation acts on reports (S1-E10-01, S1-E10-02). Pictures in the chapter are still checked on upload (S1-E10-05).

##### S1-E3-04 Manage chapters

As a writer, I want to reorder, edit and delete chapters so that my story reads the way I intend.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E3-03
- **Acceptance criteria:**
  - Given the chapter list, when the writer reorders chapters, then "Move up" and "Move down" buttons work as well as dragging.
  - Given a published chapter is edited, when it is saved, then readers see an "Edited on" date.
  - Given a chapter is deleted, when the writer confirms, then it is hidden at once and permanently deleted after 30 days, with an undo option until then.
- **Legal and compliance:** WCAG 2.2 criterion 2.5.7 (dragging movements need a single-pointer alternative).

##### S1-E3-05 Story status and settings

As a writer, I want to mark a story as ongoing or completed and control comments so that readers know what to expect.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E3-01
- **Acceptance criteria:**
  - Given story settings, when the writer sets "Completed" or "Ongoing", then the status shows on the story card and works as a filter.
  - Given comments are switched off, when a reader opens a chapter, then existing comments are hidden and new ones can't be added.
  - Given a story is deleted, when the writer confirms twice, then the story and all chapters follow the 30-day soft delete.
- **Legal and compliance:** none beyond the global checklist.

##### S1-E3-06 Ratings and labels: age rating, fan fiction, parody and AI assistance

As a writer, I want to rate and label my story honestly so that readers know what they are reading and younger readers only see what suits them.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E3-01
- **Updated:** 16 Oct 2026, late evening: movie-style ratings replace the Mature label (Q17); the AI rule (Q24).
- **Acceptance criteria:**
  - Given the story form, when the writer saves, then they must pick one rating, All ages, 13+, 16+ or 18+, each with a one-line description of what fits it; the rating shows on the card and the story page.
  - Given a rated story, when anyone younger than its rating looks for it, then it is hidden everywhere (lists, shelves, search, profiles, links and shares) and can't be opened (S1-E5-01); 18+ needs an "18 or over" age check result, and signed-out visitors and the public website see only All ages and 13+ stories (proposal).
  - Given a moderator thinks a rating is too low, when they raise it, then the writer gets a statement of reasons (S1-E10-04); staff never lower a rating the writer chose.
  - Given the story form, when the writer marks that the story deals with abuse or coercion, then the story must be rated 16+ or 18+ and shows a content note on the card and story page (decided 17 Oct 2026, 10:36, chat). The decision says "stories with these themes", so whether a story with a relationship between 16 or 17-year-old characters also needs 16+ is **OPEN**.
  - Given a report that a story describes sexual activity involving anyone under 18, real or fictional, in an explicit or eroticised way, when a moderator confirms it, then the content is removed straight away under the Community guidelines (S1-E10-06); abuse as a theme, relationships between 16 and 17-year-old characters and saying that something happened are allowed (decided 17 Oct 2026, chat).
  - Given the story form, when the work is fan fiction or parody, then the writer must tick the matching label, shown on the card and story page (Q87).
  - Given the AI disclosure field, when the writer saves, then they choose "No AI", "AI for brainstorming or outlining" or "Partly AI-written", shown as a label.
  - Given reports that a story is AI-written without saying so, when moderators confirm several of them as true (from different accounts; the number is a setting, proposal 3), then the story gets an "AI-written, not disclosed" label and the writer a warning with a statement of reasons; nothing happens on reports alone and no AI-detector score is used (decided 16 Oct 2026, late evening, Q24).
- **Legal and compliance:** ratings follow the "same parental guidance like movies" answer (Q17); the exact descriptions for each rating are on the lawyer's list (section 6). A 2023 study found detectors wrongly flagged 61% of non-native English essays (stress tests, master-plan/02; primary study to verify), so detector-based action is ruled out.

##### S1-E3-07 Writer dashboard

As a writer, I want to see how my chapters are doing so that I know what readers respond to.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E3-03, S1-E15-02
- **Acceptance criteria:**
  - Given the dashboard, when a writer opens it, then they see reads, read-through rate, likes, comments and followers per story and chapter.
  - Given any count from fewer than five readers, when it is shown, then it displays as "fewer than 5".
  - Given the dashboard, when it is viewed, then it never lists which individual readers read a chapter.
- **Legal and compliance:** aggregated data only, which protects minor readers.


##### S1-E3-08 Where a story can be read: web and app, or app only

As a writer, I want to choose whether people can read my story in a browser or only in the app so that I have more privacy and control over my work.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E3-01, S1-E3-05, S1-E4-04
- **Added:** 16 Oct 2026, Robert's decision (chat).
- **Acceptance criteria:**
  - Given story creation and story settings, when the writer sets "Where can people read this story?", then the options are "On the web and in the app" (default) and "In the app only", each with a one-line explanation.
  - Given an app-only story on the web, when anyone opens it, then they see the cover, title, blurb, writer and chapter list, but no chapter text, and opening a chapter shows the app-only notice (S1-E4-09).
  - Given an app-only story, when a link is shared or a teaser requested, then no chapter text appears in the teaser, the link preview or search results.
  - Given the writer switches a story between the two options, when they save, then it takes effect within a minute (proposal) and readers' library entries stay.
- **Legal and compliance:** copy says "makes copying harder" (Q9), never "can't be copied" (screenshots still work, S1-E4-06). This story needs an app, so it moves after March with the desktop app (section 1.13); until then signed-in readers read full chapters on the web and writers are told (decided 16 Oct 2026, late evening, Q35).

##### S1-E3-09 Pictures in chapters

As a writer, I want to add pictures to a chapter so that I can show maps, scenes or illustrations.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E3-02, S1-E10-05
- **Added:** 16 Oct 2026, Robert's request (chat).
- **Acceptance criteria:**
  - Given the editor's Insert menu, when the writer picks Picture, then they can upload JPEG, PNG or WebP up to 5 MB and must write alt text before it is inserted.
  - Given an uploaded picture, when it is saved, then location and camera data are removed and it is resized for reading.
  - Given a new picture, when it is uploaded, then the picture check runs on upload (S1-E10-05): a clean picture shows straight away and a flagged one shows "Picture being checked" to readers until a moderator decides. Picture uploads are on from launch (decided 16 Oct 2026, late evening, Q18).
  - Given any picture, when a reader opens its menu, then they can report it (S1-E10-01).
- **Legal and compliance:** every picture goes through Sightengine (nudity, gore) and Arachnid Shield (known child abuse images) on upload (S1-E10-05); copyright: the writer confirms they have the right to use the picture (notice and action applies).

##### S1-E3-10 Music and video from other services

As a writer, I want to add a song from Spotify or Apple Music, or a video from YouTube, Vimeo or Loom, so that readers can hear or see what inspired the chapter.

- **Priority:** Could · **Size:** M · **Depends on:** S1-E3-02
- **Added:** 16 Oct 2026, Robert's request (chat). "Lumo" is Loom (confirmed 16 Oct 2026, late evening, Q22).
- **Acceptance criteria:**
  - Given the Insert menu, when the writer pastes a link, then it is accepted only from the allowed list (Spotify, Apple Music, YouTube, Vimeo, Loom) and turned into an embed card using the service's oEmbed data fetched by our server.
  - Given a reader, when the chapter loads, then nothing loads from the other service; they see a card with title, service name and "Plays from YouTube. YouTube may use cookies." until they press play.
  - Given YouTube, when a reader presses play, then we use the privacy-enhanced (no-cookie) player; Vimeo with do-not-track (both: check before relying on it).
  - Given any embed, when a reader opens its menu, then they can report it; moderators can disable one embed without unpublishing the chapter.
- **Legal and compliance:** click-to-load keeps us within the no-cookie, no-tracking promise until the reader chooses; the third party's own terms and age rules apply after play, and the card says so. Embeds count as content we host links to, so notice and action applies.

##### S1-E3-11 Drawings in chapters

As a writer, I want to draw a simple sketch inside the editor so that I can add a map or a doodle without other software.

- **Priority:** Could · **Size:** M · **Depends on:** S1-E3-09
- **Added:** 16 Oct 2026, Robert's request (chat).
- **Acceptance criteria:**
  - Given the Insert menu, when the writer picks Drawing, then a sketch pad opens with pen, eraser, a few brand colours, undo and clear.
  - Given a finished drawing, when the writer inserts it, then it is saved as a picture and follows every rule in S1-E3-09, including alt text and the image check.
- **Legal and compliance:** same as S1-E3-09.

##### S1-E3-12 Design a cover in Canva

As a writer, I want to design my cover in Canva and bring it straight back so that I get a good-looking cover without other software.

- **Priority:** Could (idea for after the March test) · **Size:** M · **Depends on:** S1-E3-01, S1-E10-05
- **Added:** 16 Oct 2026, Robert's canvas comment ("maybe we can even have an integration with Canva").
- **Acceptance criteria:**
  - Given the cover step, when the writer presses "Design it in Canva", then Canva opens in a new tab with a blank design at 1600 × 2560 pixels, through the Canva Connect API (OAuth with the writer's own Canva account; check before relying on it).
  - Given the writer presses Return in Canva, when they come back, then we verify Canva's return token, export the design as PNG and attach it as the cover.
  - Given the imported cover, when it is saved, then every rule in S1-E3-01 applies: location data removed, private until the image check passes.
  - Given a writer without a Canva account, when they press the button, then Canva asks them to sign up there; nothing is shared with Canva before they connect.
- **Legal and compliance:** Canva's own terms and age rules apply on Canva's side, and the button says so. Connecting is optional and the writer can disconnect in Settings. Needs a registered Canva developer app; Canva likely reviews public integrations (unconfirmed, 16 Oct 2026). Add Canva to the privacy notice as a service the writer chooses to connect.

##### S1-E3-13 Automatic covers

As a writer, I want my story to get a good-looking cover automatically if I skip the cover step so that it never looks empty and I can still change it later.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E3-01
- **Added:** 16 Oct 2026, Robert's decision (canvas, New story and Discover).
- **Acceptance criteria:**
  - Given the cover step, when it is shown, then it says "Skip this and we’ll give your story one of these covers automatically. You can change it any time.", shows which design the story would get and offers "Use the automatic cover".
  - Given a story without its own cover, when its cover is shown, then it gets one of the 16 approved drawn designs, picked from the story's id, so it is the same design on every screen and does not change when the title or anything else changes.
  - Given a row of story cards (shelves, lists, search results, library), when two neighbouring cards would show the same design, then the card with an automatic cover moves to another design for that row, so two neighbours in a row never share a design; a design the writer chose is never changed.
  - Given an automatic cover, when it is drawn, then it carries the full title and pen name with no ellipsis or clipping, the title size steps down with its length and the text colour is chosen for 4.5:1 contrast (Definition of Done, design rules).
  - Given story settings, when the writer opens the cover, then they can pick another drawn design, recolour it, upload a picture or go back to the automatic cover at any time.
  - Given a story uses the automatic cover, when it is saved, then no cover file is stored; the cover is drawn from the story's id and title.
- **Legal and compliance:** our own artwork, so no picture rights and no image check. Each cover is shown as real text plus a decorative background, so screen readers read the title once. OPEN: the "never changes" rule and the neighbour rule can clash in a row; proposal: the story page and the writer's own screens always show the id design, and only lists move a clashing card, using a second choice that is also taken from the id so the same row always looks the same.

---
