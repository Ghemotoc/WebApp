# Bundle 13 CONTESTS: plan (3 Nov 2026)

Stories S1-E11-14 (landing pages, L) and S1-E11-15 (contests, L). Both L, so split into four pull requests.

## Order and what each part holds

- **13a1 landing pages core.** `landing_pages` (type contest, campaign or information; slug checked against reserved names and in-use slugs; theme one of four; show_from, take_down_at, archived) and `landing_page_versions` (draft, scheduled, published; blocks as JSON, both languages). Blocks: Hero, Text, Key dates, Who can enter, Prize, How to enter, Rules, Questions and answers. `admin_*` functions for create, save draft, publish with the checks (both languages complete; a Contest page has key dates and a Rules link), restore and take down, each logged with before and after. Website › Landing pages: Romanian and English side by side, phone and desktop preview, Up and Down buttons, one heading order. Public page `/c/<slug>` with "This contest has ended" after take-down. Admin role and owner only (decided 17 Oct 2026, 19:19). No countdown timers.
- **13a2 pictures, featured stories, Remind me and sharing.** Pictures in Hero and Text with required alt text, through the picture check; Featured stories by hand or by tag, filtered to the youngest age group the page targets, dropping a moderated story at once; Remind me (one in-app notification when entries open; signed-out readers asked to sign in); the teaser preview for `/c/<slug>`; a notice banner can link to a page.
- **13b1 contests set-up and entries.** Staff › Contests: names in both languages, dates, who can enter (age groups, markets, languages), what counts, word limit, prize, judges, the landing page. Opening refused until the rules are published in both languages and linked. "Enter <contest>" in a story's settings in the window, one entry per writer, withdraw before closing; under-16 contests take All ages and 13+ only.
- **13b2 judging, results and certificates.** Entries for staff by pen name and age group only; disqualify with a statement of reasons (appealable); results by pen name only; Issue certificates through #281; Remind me fires when entries open. Then the admin epic check, round three, and the bundle's full test run.

## Waits for bundle 14

- The Sponsor block on a landing page and a contest's sponsor need approved sponsor campaigns (S1-E12-02, bundle 14b). The block type is left out until then and added in 14b, with the rule that only an approved campaign can be picked and an admin publishes the page.

## OPEN, not chosen here

- Ad-network ads on a landing page: none are built (the network itself is 14d). The story's proposal is "no"; 14d keeps landing pages out of the network unless Robert decides otherwise.
- Whether a sponsor-funded prize needs an ONJN opinion: a legal question before the first contest, not a build question.
