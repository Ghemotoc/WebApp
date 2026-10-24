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
| Story (3.4) | Chapter rows are links with reading progress | Plain rows (number, title, published and edited dates) until the reader exists (S1-E4-01a); the owner's preview also lists drafts and scheduled chapters with a pill |
| Editor (4.3) | The breadcrumb's story link goes to Manage chapters | Goes to story settings until Manage chapters exists (S1-E3-04) |
| Editor (4.3) | Widget doodles on the Saving and Your stories panels show from 600 px | Shown from 1000 px (S1-E3-02a): under that width the aside stacks beneath the text and a doodle above a panel would sit on the paragraph before it (the overlap check) |
| Chapters (4.4) | "The whole story" (status, comments, delete) sits on the Manage chapters board | Lives on the story settings page (S1-E3-05), with the rest of the story's settings; Manage chapters (S1-E3-04) links to it |
| NewStory (4.2) | "Right now: Sky, picked for you automatically" is fixed to Sky on the board | The design comes from the story's ID, which the form makes before the story exists (S1-E3-13) |
| Editor (4.3) | "Story details" panel: a rating select without the explanations, "Content notes" ticks and a "Visibility" select | Becomes a read-only summary with "Change in story settings" (S1-E3-06): ratings and labels are set in one place, always with the full guide; "Visibility" goes because the rule is "only you until the first chapter is published" (Robert, 23 Oct 2026, Q15) |
| WriterDashboard (4.1) | The statistics tiles, the followers chart, the drafts list and the latest comments | S1-E3-07 (after March); `/write` shows the "Story by story" list only ("Your writing", Robert, 23 Oct 2026, Q15) |
| WriterDashboard (4.1) | Draft pills in the old solid-gold style | The pill system's gold information pill |
| Every signed-in board | The "Write" pill's pen icon is the dark pen on the dark button | The icon is inverted with a CSS filter until Lane B's tokenised doodle icons land |
| Every signed-in board | Top bar links Home, Discover, Library, Forums, Messages and the bell | Still only the links to pages that exist (src/app/navigation.ts); "Write" joins them in S1-E3-01 |
