# Known board mismatches

The boards in design/boards are the source of truth for layout, but where a board disagrees with docs/decisions.md or the story, **the decision and the story win**. Build the corrected version and mention the mismatch in the pull request.

## Still open

| Board | Element | Change |
| --- | --- | --- |
| Website-Home | The FAQ answers and the prize line say under-16s need a parent's consent and everyone does a Yoti age check | Right for the public launch. For the March test (invited adults only, decided 17 Oct 2026, 12:44) the public home page (S1-E5-08) says the test is for invited adults; the consent and age check copy goes live with S1-E2-03 and S1-E2-08, before minors join (architecture 1.7.9) |
| AdminSettings, AdminPages | The "Website home page" editor says the website reads the copy from its own database and has no market picker | For March the CMS content is stored in the app's database behind the `WebsiteContentStore` contract, and staff pick the market and language before editing; the editor sits under Website (decided 17 Oct 2026, 19:14 and 19:16; S1-E11-06) |
| States (7.4), card 2 | The offline line says "Your writing is saved on this device and uploads when you're back online", and "back online" adds "Your changes are saved" | Until the chapter editor keeps unsaved text (S1-E3-02), the banner says only that pages needing the internet won't load; the saved-text promise comes with S1-E3-02. "Back online" uses the success tone from the tokens (light and night) instead of the board's solid green (S1-E1-05) |
| States (7.4), card 3 | "We expect to be back by 14:00, Romanian time" | No setting holds a return time yet, so the page says "for a short while"; a time can come with the settings screen (S1-E11-03) (S1-E1-05) |
| States (7.4), cards 3 and 4 | Desk-lamp and storm-cloud doodles and the round icons | Left out until a story sets up doodles with token colours for night mode (the SVGs in design/assets use fixed colours); no screen uses doodles yet (S1-E1-05) |
| States (7.4), card 4 | "What we send to error tracking: the error code, the page and the app version" | Our own error log (decided 18 Oct 2026, 10:46) also keeps the error's type and the browser family; the page says so. The code shows only when the report was stored |
| Teaser | Six widget doodles | Keep a few around the edges and none touching the chapter text; this page is the exception to the no-doodle rule for sharing screens (decided 18 Oct 2026, 10:46; S1-E4-04) |

## Fixed on the boards (17 Oct 2026)

The end-to-end check found these; the boards were corrected the same day, so build what the board now shows.

| Board | What the board now shows |
| --- | --- |
| Onboarding, Settings, AdminSettings, Website-Home | Romanian by default for everyone; Romania opens first, English-speaking countries follow one by one after their legal check (decided 17 Oct 2026, 11:48) |
| ModCase | A "Safety contacts for Romania" panel built from `content/safety-contacts.json` (S1-E10-13) |
| Settings | Account › Signed-in devices (device, last active, Sign out, "Sign out of all other devices", no IP or location; S1-E2-05). Download my data: one ZIP with a JSON data file plus every story as a Word file (decided 17 Oct 2026, 12:34) |
| AdminUsers (8.5) | Manual age checks panel showing the year of birth with the age group (S1-E2-08b; decided 17 Oct 2026, 12:34) and a Users › Invites tab (S1-E11-17, decided 17 Oct 2026, 13:01) |
| AdminMetrics | Return rate from daily totals only; aggregated metrics kept 3 years; class certificates with a real name deleted 30 days after the class is archived |
| AdminPages, Contest, AdminContests, AdminSponsors, Forums, ClassSpace, AdminSchools, Discover, AdFormats, Website-Home | The First Chapter contest is gone (decided 17 Oct 2026, 12:34): placeholders "[Contest name]" and the age groups 13 to 15, 16 to 17 and 18 and over. AdminPages' notice strip shows on the website and the app (decided 17 Oct 2026, 12:44) |
| Certificate-Participation, Certificate-Winner, AdminSchools | Online contest certificates print the pen name; class certificates may print the real name with the school and are deleted 30 days after the class is archived (decided 17 Oct 2026, 12:44) |
| AdminClassics (8.16) | Only staff with the admin role manage Classics (decided 17 Oct 2026, 12:44) |
| AdFormats | Two ads can be in view on wide screens, never the same ad twice (decided 17 Oct 2026, 12:44) |
| Doodle CSS on every board | Only `tmc-dd-wide` (hides under 1000 px) and `tmc-dd-hide` (hides under 600 px), as in the DoD; doodles that overlapped text or links were moved or removed (Search, Legal, AppOnly, Thread, Discover) |

## Found while building S1-E1-03 (17 Oct 2026)

The app follows the decision or the DoD rule on the right; the boards still draw the left-hand version.

| Board | Element | What the app does |
| --- | --- | --- |
| Every board | Focus ring is gold (`#E6C24C`) everywhere, about 1.6:1 on paper, below the 3:1 WCAG 2.2 asks for | Plum on light backgrounds, gold on night (Robert, 17 Oct 2026) |
| Every board | No night mode | Night colours derived from the board colours (starting from the Reader's Night theme) and shown on /design (Robert, 17 Oct 2026) |
| Every public board | No theme control | A Device / Light / Night drop-down in the footer, beside the language drop-down; nothing in the top bar (Robert, 17 Oct 2026) |
| Every public board | Top bar shows Home, Discover, Library, Forums, Messages, the bell, Write and the account button; footer shows seven links | Only links to pages that exist are shown; each story adds its own (src/app/navigation.ts). /design shows the full board top bar |
| Discover, Search, Settings, AdminUsers, AdminSponsors | Drop-downs drawn at 40, 44 and 48 px | One 44 px drop-down everywhere (DoD drop-down rule) |
| Most boards | Text and search fields with a `#DED3E4` border (about 1.3:1 on white) | `#8E7B99` border (3:1, WCAG 2.2 1.4.11), as the AdminUsers Invites fields already use |
| Every board | Fonts loaded from Google Fonts | The same fonts served from our own site (no visitor IP sent to Google; CLAUDE.md rule 7) |
| AdminUsers vs Discover, Search | Two versions of the chip CSS | The fuller Discover/Search version (44 px touch area, tick icon) |

## Found while building S1-E1-04 (17 Oct 2026)

| Board | Element | What the app does |
| --- | --- | --- |
| Discover (top bar) | Language drop-down drawn 40 px tall with 13 px text and 12 px left padding | The one 44 px Select (14 px text, 16 px padding), as in the footer (DoD drop-down rule) |
| Discover (top bar) | Options without a `lang` attribute (the footer's have one) | Both drop-downs mark English as `lang="en"` and Română as `lang="ro"` (WCAG 2.2, 3.1.2) |
| Discover (footer) | English shown as the selected language | Romanian is selected on a first visit, whatever the device language (decided 17 Oct 2026, 11:48); the board's option order (English, Română) is kept |

## Found while building S1-E3-01 (23 Oct 2026)

| Board | Element | What the app does |
| --- | --- | --- |
| NewStory (4.2) | The "Draw a cover / Upload a picture" switch, the tall and square upload flow and the "Design it in Canva" button | Not shown: no picture uploads in the demo (decided 23 Oct 2026), the flag `picture_uploads` is off; Canva is S1-E3-12, after March |
| NewStory (4.2) | The dashed "coming" languages (Magyar, Deutsch, Français, Español) with "Coming once we have moderators who read it" | Only the open markets' languages are listed (`open_story_languages()`); the hint says more open once we have moderators who read them |
| NewStory (4.2) | Waves' default accent is #6E93BF, outside the 9-colour palette | Violet, the nearest palette colour |
| NewStory (4.2) | "Status and comments" on the new story form | Only in story settings (S1-E3-05): a new story starts Ongoing with comments on, as the board's defaults, and the intro says everything can be changed in story settings; "Where can people read this story?" is S1-E3-08 (after March) and "Labels" S1-E3-06 |
| Story (3.4) | The chapter list, "Continue chapter 14", Follow, Library, Like, Share, the stats row, the writer card's numbers and "See profile", the breadcrumb, the ad slot, "Web and app", the rating and content note | Each comes with its story: S1-E3-03 (chapters, "Start reading", "Updated"), S1-E6-05, S1-E4-03, S1-E6-03, S1-E4-05, S1-E5-05, S1-E5-01, S1-E12-01, S1-E3-08, S1-E3-06. The page (S1-E3-05) shows the cover, pills, title, writer, blurb, tags, the label rows (language, status, comments) and "Report this story" |
| Story (3.4) | "13+ (hidden from readers under 13)" in the label rows | Nobody under 13 can have an account, so the rating row (S1-E3-06) will say who it is hidden from without that line |
| Story (3.4) | Two columns (text left, the writer and label cards right) at tablet width | Two columns only from 1024 px (S1-E3-05): at 768 px the side cards would be about 220 px wide and their label rows would push the page sideways (CLAUDE.md rule 21), so the tablet view stacks the cards under the text, as the phone render does; the music-notes doodle sits beside the cover, because the pills and title below it move with the story's state |
| NewStory (4.2) | "Labels" has Fan fiction, Parody, the rating and the AI question only | S1-E3-06 adds "Deals with abuse or coercion" and a content note field, because a story with that theme must be 16+ or 18+ and carry a note (17 Oct 2026, 10:36); the board's 16+ guide row already mentions the note |
| NewStory (4.2) | The rating wording | Used as written (Robert, 23 Oct 2026); a proposal pending the lawyer (L14). The words are locale keys under `labels.guide` |
| Story (3.4) | The rating row | "16+ · hidden from readers under 16" and the same for 18+; "13+" alone (nobody under 13 has an account); "All ages" alone. The content note shows under the blurb, before the chapters, so readers see it before they open the story |
| Editor (4.3) | The Insert menu (picture, drawing, music, video) with its notes | Left out of S1-E3-02a: pictures, drawings and embeds are S1-E3-09, 10 and 11, after March; the toolbar has Bold, Italic, Heading, Quote, List, Link and Scene break, in board order |
| Editor (4.3) | "Compare versions" has no screen of its own | A dialog with both versions side by side (stacked on phones), each with its saved time and a "Keep this one" button (S1-E3-02b) |
| Editor (4.3) | "Published. We let your 147 followers know." | "Published <date and time>." Follows and notifications are S1-E6-05 and S1-E7-01; the line can name the followers once they exist |
| Editor (4.3) | A published chapter has only "Unpublish chapter" | Also "Preview" and "Update chapter" with its note, because edits to a published chapter reach readers only through Update (Robert, 23 Oct 2026, Q10) |
| Story (3.4) | Chapter rows are links with reading progress | A published chapter's title links to the reader (S1-E4-01a); no reading progress until the library (S1-E4-03, after March). The owner's preview also lists drafts and scheduled chapters with a pill, as plain text |
| Reader (3.5) | Reading settings, paragraph comment markers, pictures and video, Like, Share, the copy notice, the sponsor banner and comments | Each joins with its own story: S1-E4-02, S1-E6-06, S1-E3-09 to 11, S1-E6-03, S1-E4-05, S1-E4-06a, S1-E12-01 (the slot in S1-E4-01b), S1-E6-01. The text keeps the board's right-hand 80 px column free for the markers |
| Reader (3.5) | Previous and Next chapter on every chapter | Left out at the first and last chapter, so no link does nothing; after the last chapter: "That's the latest chapter so far." and "Back to the story" (S1-E4-01a) |
| Reader (3.5) | The writer's name links to their profile | Plain text until profiles exist (S1-E5-05) |
| Reader (3.5) | Signed-out visitors | They get the teaser page (board 3.8) instead of the reader (S1-E4-04) |
| Teaser (3.8) | A sample teaser of about 200 words | The first whole paragraphs up to 600 words, cut on the server (decided 23 Oct 2026); the text fades out only when the chapter goes on |
| Teaser (3.8) | "Join for free to read on", sign up with Google, Apple or Microsoft, the Yoti check, parents for under-16s, and a "Join for free" button | "Log in to read on" with the March wording: a test for invited adults, log in or join with the invitation's link; "Log in" and "Back to the story" (decided 17 Oct 2026, 12:44). The board's copy comes back with the public launch |
| Teaser (3.8) | "About the apps" link under the apps line | The line stays without the link until there is an apps page (S1-E16-01) |
| Teaser (3.8) | "15 chapters" and "1.2k reads" pills on the story card | Category and status only: public numbers wait for S1-E3-07 |
| Teaser (3.8) | The cover shows the title in a large size | The small cover size, so the full title fits at 112 px (DoD: never clipped); the pen name sits beside it |
| Teaser (3.8) | No copy notice | The S1-E4-06a notice under the prompt: the teaser is chapter text, so right-click and copying are off on it too |
| Teaser (3.8) | The 16+ or 18+ notice says visitors "see the title and blurb", with a lock icon, and hard-codes 18+ | The title only, no blurb (decided 23 Oct 2026, Q6: "only the title of 16+ and 18+ stories"); the notice names the story's real rating; no icon (a lock isn't one of the ordinary icons the DoD allows). The story page shows the same notice |
| Teaser (3.8) | The link preview card shows the cover with its title | A plain picture in the drawn cover's colour, with the title beside it as text (Q13 option B; see docs/mocks.md for why) |
| Teaser (3.8) | The design notes column (link preview, share a part, other states, open points) and the ad slot | Not built: the notes describe other stories (S1-E4-05, S1-E4-07, S1-E4-09); no ad on the teaser in the demo (S1-E12-01) |
| Editor (4.3) | Widget doodles on the Saving and Your stories panels show from 600 px | Shown from 1000 px (S1-E3-02a): under that width the aside stacks beneath the text and a doodle above a panel would sit on the paragraph before it (the overlap check) |
| Chapters (4.4) | "The whole story" (status, comments, delete) sits on the Manage chapters board | Lives on the story settings page (S1-E3-05), with the rest of the story's settings; Manage chapters (S1-E3-04) links to it |
| Chapters (4.4) | The arrows at the ends of the list are `disabled` | Drawn the same, but marked `aria-disabled` (S1-E3-04): a keyboard user who moves a chapter to the top keeps focus on the arrow instead of losing it to the page |
| Chapters (4.4) | "Draft · 228 words · saved yesterday" | "saved 23 Oct": the date, not a relative day (S1-E3-04); relative times can come with the notifications' time format (S1-E7-01) |
| Chapters (4.4) | Scheduled chapters show Edit, Rename and Delete only | The same (S1-E3-04); cancelling the schedule stays in the editor's Publish panel (S1-E3-03) |
| Chapters (4.4) | The breadcrumb reads "Writer dashboard" | The same words, leading to `/write` (Your writing until S1-E3-07) |
| NewStory (4.2) | "Right now: Sky, picked for you automatically" is fixed to Sky on the board | The design comes from the story's ID, which the form makes before the story exists (S1-E3-13) |
| Editor (4.3) | "Story details" panel: a rating select without the explanations, "Content notes" ticks and a "Visibility" select | Becomes a read-only summary with "Change in story settings" (S1-E3-06): ratings and labels are set in one place, always with the full guide; "Visibility" goes because the rule is "only you until the first chapter is published" (Robert, 23 Oct 2026, Q15) |
| WriterDashboard (4.1) | The statistics tiles, the followers chart, the drafts list and the latest comments | Built in S1-E3-07 (READ-4d). Until then `/write` showed the "Story by story" list only ("Your writing", Robert, 23 Oct 2026, Q15) |
| WriterDashboard (4.1) | "Comments: including 18 paragraph comments" | "From readers, on your chapters": paragraph comments don't exist yet (S1-E6-06, after March) |
| WriterDashboard (4.1) | "Reads: chapters 5 and 6 brought most of them" for the last 30 days | "Chapter openings in the last 30 days": a "most of them" line would point at small chapters' numbers |
| WriterDashboard (4.1) | "See all comments" beside "Latest on your chapters" | Left out until a page of all comments on a writer's chapters exists; each card's Reply goes to the comments under that chapter |
| WriterDashboard (4.1) | The time period as a two-button pill group | The ChoiceChips radio group every other screen uses for one-of-a-few choices |
| WriterDashboard (4.1) | Exact numbers above every bar of "Followers over time" | "< 5" above a week with 1 to 4 new followers and a short bar that never shows its real size; the chart's text alternative says "fewer than 5" (S1-E3-07, criterion 2) |
| WriterDashboard (4.1) | "Reschedule" on a scheduled chapter | Opens the chapter's editor, where the Publish panel changes the time (S1-E3-03) |
| WriterDashboard (4.1) | Draft pills in the old solid-gold style | The pill system's gold information pill |
| Every signed-in board | The "Write" pill's pen icon is the dark pen on the dark button | The icon is inverted with a CSS filter until Lane B's tokenised doodle icons land |
| Every signed-in board | Top bar links Home, Discover, Library, Forums, Messages and the bell | Still only the links to pages that exist (src/app/navigation.ts); "Write" joins them in S1-E3-01 |
| Notifications (6.2) | The bell marks unread with a dot | A gold bubble with the count, as the story asks (S1-E7-01, criterion 3); the bell's name says the number too |
| Notifications (6.2) | The Settings link, the "Your choices" card and "Unread only" | Left out until S1-E7-02 (notification settings, after March); every kind is on for March |
| Notifications (6.2) | Data download, certificate and mention rows; "with the reasons and how to appeal" and "My reports and decisions" on the decisions card | Their stories come later (S1-E13-02, S1-E8-12, S1-E8; S1-E10-04 and S1-E10-07 for the reasons, the appeal and the page) |
| Notifications (6.2) | Comment rows say "See comment" | "Open the chapter": a link can't jump to one comment yet, because the comments load after the chapter (follow-up) |
| Notifications (6.2) | Two background doodles in the header | Left out: at 768 px they would meet the heading or "Mark all as read"; the sleeping cat on the empty state stays |
| AdminMetrics (8.7) | "Signed-up readers" | Confirmed, live accounts that aren't staff (S1-E15-02): "opened a chapter" would need a record per reader, which we never keep (decided 17 Oct 2026, 12:34) |
| AdminMetrics (8.7) | Chapter reads drawn as a bar chart | A list of days and totals with a line between rows (S1-E15-02), so every number is real text; a chart can come later |
| AdminMetrics (8.7) | The page for moderators | Moderators hold the metrics area for queue numbers only (architecture 1.8.3), so the page tells them so and links to the queue |
| Story (3.4) | The stats row's reads | Likes, comments, chapters and the last update only (S1-E5-03): read totals stay with the writer (S1-E3-07) |
| SignUp (2.1), Onboarding (2.5) | The username chosen in onboarding, after the email is confirmed | Chosen on the sign-up form with the password, checked as it is typed (Robert, 25 Oct 2026); onboarding's step 1 is then only for older accounts without one, and the pen name moves to Settings |
| Settings (6.3) | No email address on the Account tab | An Email address panel for every account, minors included: the owner's own address, never public, and a change confirmed by links to both addresses (Robert, 25 Oct 2026) |
| MyReports (6.5) | "Appeal" button and an appeal form on each decision | "Challenge this decision" links to Contact us with the decision's reference filled in, and says a different moderator looks at it where possible (S1-E10-04): the appeal form and queue are S1-E10-07, after March |
| MyReports (6.5) | Each report row names the action taken on the other account | The reporter sees only removed, action taken or no action, never someone else's sanction (S1-E10-04; DSA art. 16(5) asks for the decision, not the penalty) |
| ModCase (8.3) | The statement of reasons preview before sending | The case page asks for "What we tell the person" in the Decision panel and shows the statement exactly as sent once the case is decided (S1-E10-04) |
| ModCase (8.3) | The safeguarding checklist as ticks | A numbered list of the steps from the runbook, then the contacts, the evidence pack and the referral log (S1-E10-10): ticks that save nothing would suggest a record we don't keep |
| Library (3.7) | The ad slot, "Your lists" (reading lists), "Downloaded to read offline", "Change" beside "Private" and "Notification settings" | Left out until their stories exist: the ad slot with S1-E12-01, offline downloads with the apps (S1-E4-08), the privacy settings with S1-E13-01, notification settings with S1-E7-02; no story builds reading lists yet (S1-E4-03) |
| Library (3.7) | Shelf chips above a grid of cards with Continue buttons | The chosen shelf is the shared Shelf (one line of at most 20, "View more" to `/library/<shelf>`); each card is one link to the story page with "Chapter n of N", and Continue lives on the "Continue reading" cards (S1-E4-03; CLAUDE.md rule 20) |
| Story (3.4) | "Library" as a button | A drop-down labelled Library (not in your library, Reading, Saved for later, Finished), so every shelf is one keyboard step away (S1-E4-03) |
| Reader (3.5) | "Later, in the apps: any font on your device" with a font search, inside Reading settings | Left out until the desktop and phone apps exist (APPS-1, APPS-2): a block about apps the reader can't get yet would only confuse; the browser fonts (Inter, Serif, Dyslexia-friendly) are the choices (S1-E4-02) |
| Reader (3.5) | Font, spacing, width and theme as radio buttons inside chips, each font label drawn in its own typeface | The shared ChoiceChips radiogroup (one tab stop, arrow keys) with plain labels; the text itself changes at once, which shows each font better than its label (S1-E4-02) |
| Reader (3.5) | Text size slider shows "19 px" only | It says "19 px, from your device" until the reader picks a size, and "Use my device's size" brings the device's size back (S1-E4-02, third criterion) |
| Share (3.6) | "Send in Messages" in Other ways | Left out until private messages exist (S1-E9-01) (S1-E4-05) |
| Share (3.6) | "Share a quote" as a button in the share dialog | A hint instead ("select up to 280 characters, then press Share quote"), because a card starts from text selected in the chapter (S1-E4-05, S1-E4-07) |
| Share (3.6) | The chat preview with the story's blurb and cover | The preview shows the website, "<story> · by <pen name>" and the chapter, because the reader has no blurb at hand; the real preview comes from the link-preview function (S1-E4-04) |
| Share (3.6) | "Story cover" and "Your own picture" as quote card backgrounds | Left out for now: the card offers Purple and the nine palette colours. Pictures need blurring and the image check (S1-E10-05) on the card itself; they come with S1-E4-11 (S1-E4-07, fourth criterion, follow-up) |
| Share (3.6) | "[Logo]" on the card and "Download image" | The product's name from the brand config stands in for the logo until the name and logo are final; the button says "Save image" (S1-E4-07) |
| Share (3.6) | "Menu for selected text" beside the selection | A bar fixed to the bottom of the screen with "Share quote" and the character count, so it never covers the text and works at every width (S1-E4-07) |
| Reader (3.5) | Reading settings for everyone | Only signed-in readers see the button, because the settings are saved to the account; signed-out visitors get the teaser (S1-E4-04) |
