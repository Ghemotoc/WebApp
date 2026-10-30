# CMS-1b plan: the website CMS and the public home page

Stories: S1-E11-06 (CMS core and the home page editor), S1-E11-10 (notice banners), S1-E11-12 (help pages and questions) and S1-E5-08 (the public home page). Issues: look them up before the PR.

CMS-1 is split into three parts:
- CMS-1a: settings, markets and languages (PR open).
- CMS-1b: this part.
- CMS-1c: interface text (S1-E11-18) and email templates (S1-E11-19).
- CMS-1d: seasonal doodles (S1-E11-11, S1-E5-07) and S1-E5-QA part two.

## Database: `…_s1_e11_06_website_cms.sql`

### Table and enums

- One store table, `cms_versions`, for every website content type. Its columns:
  - `id`
  - `content_kind`: one of `home_page`, `help_page`, `question` or `notice`
  - `entry_key`: 'home', a help page's address, a question's key or a notice's key
  - `market_code`, which references `markets.country_code`
  - `language_code`, which references `languages.code`; it is null for a notice, which holds every language
  - `content jsonb`
  - `status`: `draft` or `published`
  - `is_removal`
  - `show_from date` and `show_until date` (notices only)
  - `user_id`: the admin who saved it
  - `published_at`, `created_at` and `updated_at`
- Live rule: the live version is the published version with the latest `show_from` that is no later than today in Romanian time (ties go to the latest `published_at`). Scheduled versions go live with no cron job. A removal version hides the entry.
- Each entry has one draft per market and language; a save updates it in place.

### Store functions

- `cms_content_problems(kind, content, market)`: returns `{field, problem}` pairs (empty, too_long, missing_language, broken_link, sponsor_word).
- `admin_save_cms_draft(...)`, `admin_publish_cms_version(id)`, `admin_restore_cms_version(id)` and `admin_remove_cms_entry(...)`:
  - each checks the staff area `website` (owner and admin act);
  - each writes the audit log with the before and after values;
  - publishing is refused with 23514 and a hint naming the fields.
- `website_content(kind, visitor_country, wanted_language)` is the public read (security definer, granted to anon). Fallback order:
  1. the market's own content in the wanted language;
  2. the market's first language;
  3. the Romanian market's English content, for a country with no content of its own.
- `admin_cms_entries(kind, market)` and `admin_cms_versions(kind, key, market, language)`: what the editors read.

### Seed (by migration, so staging gets it too)

- The home page, version 1: the RO market in ro and en, with the board copy.
- About 9 questions from the board, including "What is a class space?".
- Two help pages.
- No notice.

### Access and tests

- RLS: `cms_versions_select_staff` (website view). There are no direct writes.
- New pgTAP tests: `172-website-cms.test.sql` and `173-notices-help.test.sql`.

## Contract

- `src/schemas/websiteContent.ts` holds the zod schemas for the four content kinds and the field limits.
- `src/features/website/api/websiteContentStore.ts` holds the `WebsiteContentStore` interface and `appDatabaseStore(client)`, its only implementation for now.
- `websiteContentStore.test.ts` tests the contract against a fake client.

## Screens

- `/` becomes the website home page (S1-E5-08), with these sections:
  - the hero with its three points;
  - "Why write here" (four cards);
  - the safety block;
  - Trending and Completed shelves (the shared Shelf);
  - the questions in `details` and `summary`.
  - All of its text comes from the CMS. A failed read keeps the last answer through the query cache, and a localStorage copy of the last published version is saved in a try/catch.
- The notice strip goes in AppLayout above main. It is a region labelled "Notice", closing it is stored in session storage, and it shows only one notice.
- `/help` and `/help/:slug` render help pages with react-markdown (no raw HTML) and the help-centre questions.
- Staff › Website (`/staff/website`) has tabs for Home page, Notice banners and Help and questions. Each tab:
  - starts with a market and language picker;
  - shows fields with counters next to a live preview;
  - has Save draft, a "Show from" date and Publish;
  - lists earlier versions with Restore.

## Not in this part

The landing pages (S1-E11-14), the sample chapter, forums and apps sections of the board (their features come later).
