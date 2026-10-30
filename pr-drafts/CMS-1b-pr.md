<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #104
Closes #108
Closes #110
Closes #53

Bundle CMS-1, part (b) of four, from Robert's full-app plan (30 Oct 2026). It builds the website CMS core and the home page editor (S1-E11-06), notice banners (S1-E11-10), help pages and questions (S1-E11-12) and the public home page that reads them (S1-E5-08). Part (a), settings and markets, merged as #210. Part (c) is interface text and email templates (S1-E11-18, S1-E11-19); part (d) is the seasonal doodles (S1-E11-11, S1-E5-07) and the second half of the S1-E5 epic check.

## What changed

### The store (architecture 1.8.6, B31)

- **Database** (`…100003_s1_e11_06_website_cms.sql`):
  - One table, `cms_versions`, for all four kinds of website content (home page, notice, help page, question). It holds one draft per entry per market and language, published versions with a "show from" date (and a "show until" date for notices) and removals. Kind `platform`; RLS on; owner and admin read it (`cms_versions_select_staff`); nobody writes it directly.
  - `website_content(kind, country, language)`: the one public read, granted to visitors. It returns only live published rows for the visitor's market and language. A country with no content of its own gets Romania in English, and a language the market lacks gets the market's first language (decided 17 Oct 2026, 19:16).
  - `admin_save_cms_draft()`, `admin_publish_cms_version()`, `admin_restore_cms_version()` and `admin_remove_cms_entry()`. Each checks the `website_cms` staff area (owner and admin) and writes the audit log in the same transaction (`website.published`, `website.restored`, `website.removed`, with the market, language, go-live date and the before and after copy).
  - Publishing is refused while a field is empty, too long, links to one of our pages that doesn't exist, or (for a notice) is missing one of its market's languages or would come down before it goes up. The fields come back in the error's hint, and the editor shows each under its field.
  - A version goes live at 00:00 Romanian time on its "show from" date, with no scheduled job: the read picks the latest live version.
- **Version 1** (`…100004_s1_e11_06_website_content_v1.sql`): the home page copy live on 16 Oct 2026 for Romania in ro and en, eight questions and two help pages, seeded by migration so staging gets them too. The product name in the copy is the `{{productName}}` placeholder, filled from `src/config/brand.ts`.
- **Contract:** `src/schemas/websiteContent.ts` (the shapes and the limits, shared by the counters and the database) and `src/features/website/api/websiteContentStore.ts` (the `WebsiteContentStore` interface and its March store, the app's database). When the website gets its own database, a second store replaces it and nothing else changes.

### Public pages

- `/` is now the website home page (S1-E5-08): the hero, "Why write here", the safety lines, the Popular and Completed shelves and the questions marked for the home page. Every word of the page copy comes from the CMS; the buttons, shelves and labels around it stay interface text. If a read fails, the page shows the last copy it saw. The old `src/features/home/` is gone.
- A notice strip above every page (S1-E11-10): one notice at a time, coloured by its type, closable for the visit.
- `/help` and `/help/:slug` (S1-E11-12): the help centre with its sections and questions, and each help page in the safe Markdown subset. Our own links stay in the app, and outside links get `rel="nofollow ugc noopener"`.
- The footer gains a Help link.

### Staff › Website

`/staff/website`, a new menu item for the owner and admins, with three tabs: Home page, Notice banners, and Help and questions. Each tab:

- starts with a market and language picker (the markets seeded in #210);
- shows each field with a counter that a screen reader reads;
- shows a live preview beside the fields;
- offers Save draft, a "Show from" date and Publish (or Schedule);
- lists earlier versions with Restore, which brings one back as a draft.

Legal wording (age, consent, privacy, reporting, messaging) has a reminder box on help pages and questions.

## Acceptance criteria

| Criterion | Test |
| --- | --- |
| **S1-E11-06** A visitor reads the home page for their market and language, with the fallbacks | `172`; `e2e/website-cms.spec.ts` |
| An admin edits a field with its counter and publishes; visitors see it and the audit log has before and after | `172`; `e2e/website-cms.spec.ts` |
| An empty or too-long field stops the publish and the field is named | `172`; `e2e/website-cms.spec.ts` |
| A future "show from" date waits and the current version stays up | `172` |
| Restore brings a version back as a draft and changes nothing until published | `172` |
| Only owner and admin edit: moderator, content editor, member and visitor are refused | `172`; `e2e/website-cms.spec.ts` |
| Policy `cms_versions_select_staff`: allowed and denied | `172` |
| **S1-E11-10** A notice needs every language of its market, shows on every page and can be closed | `172`; `e2e/website-cms.spec.ts` |
| A notice ends on its "show until" date and can't end before it starts | `172` |
| **S1-E11-12** Help lists the pages and opens one; a link to a help page that doesn't exist stops the publish | `172`; `e2e/website-cms.spec.ts` |
| A removed question stops showing | `172` |
| **S1-E5-08** The home page shows the CMS hero, safety lines, shelves and questions, and passes axe | `e2e/website-cms.spec.ts`, `e2e/home.spec.ts` |

## Definition of Done

- **Code:** strict TypeScript, no `any`. ESLint limits and Prettier pass. Header and doc comments on every file and function.
- **Types:** regenerated (`types:check` passes).
- **Tests:** every criterion has a test, and the new policy has an allowed and a denied pgTAP test. Unit tests for the headline split, version sorting and field paths.
- **Accessibility:** axe passes on `/`, `/help`, `/help/getting-started` and `/staff/website` at 390, 768 and 1440 px, light and night, ro and en. Questions use `details` and `summary`; the notice is a labelled region with a named close button; counters are linked with `aria-describedby`.
- **Design rules:** staff screens have no doodles; the home page uses the shared shelves (one line, "View more" card); drop-downs follow the one style.
- **Rule 4:** website page text is only in the CMS; interface text is in the ro and en locale files.
- **Privacy:** no new personal data. A version keeps the admin who saved it, which only owner and admin can read.
- **Security:** every change goes through an `admin_*` function that checks the role in the database and writes the audit log. RLS and explicit grants on the new table. Markdown is shown with raw HTML off.
- **i18n:** every string is in ro and en, with ș and ț.
- **Docs:** code tour (a new section, and the start-here list now points at the website feature) and a README for `src/features/website/`.

## Local check run

Run on `58277e9`'s parent `5687111` with the full `npm run checks`, then the failing files again after the fix commit `58277e9`:

| Check | Result |
| --- | --- |
| lint, typecheck, types:check | pass |
| Vitest | 664 passed |
| `supabase db reset` and pgTAP | 82 files, 1,761 tests, PASS |
| Playwright (full run) | 955 passed, 5 failed, 1 skipped, 39 not run (serial tests after a failure) |
| After `58277e9`: `accessibility-statement`, `staff-shell`, `epic-s1-e11` | 55 passed (the 4 failures were tests that didn't yet know the new Website menu item and the website's storage keys) |
| `reader-performance` | the 2 s throttled-load test fails here and on `main` too (machine speed, see #210); the other two pass |
| i18n:check, migrations:check | pass |
| Functions build (wrangler) | compiled |

## Screenshots

Taken at 390, 768 and 1440 px as the admin persona, but not attached, because the session can't upload images.

- `/` in English: the hero "Write stories. Get read." with the gold underline, the three points, the four "Why write here" cards, the safety lines and the questions. The shelves draw nothing until their list loads, so they aren't in the capture.
- `/help`.
- `/staff/website`: the market and language picker, the hero fields with counters beside the live preview, the section fields, Publish and the earlier versions.

## Decisions taken

- **One table for every kind of content**, so drafts, scheduling, restore and the audit log work the same way for all four.
- **No scheduled job for "show from":** the read picks the latest version whose date has come, so a version goes live at 00:00 Romanian time without cron.
- **Notices hold every language of their market in one version**, so a notice can't go live in one language and not the other.
- **The home page can be replaced but never removed;** help pages, questions and notices can be removed from today.
- **The content language picker is called "Language of the content"**, so it isn't confused with the interface language menu on the same page.

<details><summary>New Romanian lines (for Robert to read)</summary>

The home page copy (version 1) is in `…100004_s1_e11_06_website_content_v1.sql`; it is the copy live on 16 Oct 2026.

"Editează pagina principală a site-ului, anunțurile, paginile de ajutor și întrebările, pentru fiecare piață și limbă. Alege întâi piața și limba. O versiune apare la 00:00, ora României, în data de la care se afișează, iar fiecare publicare e în jurnalul de audit." · "Doar proprietarul și administratorii pot edita site-ul." · "Pagina principală poate fi înlocuită, dar nu scoasă." · "Linkul nu duce nicăieri: {{address}}" · "Alege o zi după cea în care apare." · "Nu am putut încărca textul acestei pagini. Verifică conexiunea și încearcă din nou." · "Închide anunțul" · "Limba conținutului"

The rest are in `src/locales/ro/websiteAdmin.json` and `common.json` › `website`.

</details>

## By hand

- Nothing on staging: version 1 of the content arrives with the migration.

## Follow-ups

- The footer shows both "Contact us" and "Contact"; one of them should go (outside this story).
- The reader's 2 s throttled-load test is too tight for this machine, on `main` too.

- The website's own database (set-up OPEN): a second `WebsiteContentStore` when it exists.
- Landing pages (S1-E11-14) can reuse the same table and editor.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
