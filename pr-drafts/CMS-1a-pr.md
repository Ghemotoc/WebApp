<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #101
Closes #103

Bundle CMS-1, part (a) of three, from Robert's full-app plan (30 Oct 2026). It covers content settings and flags (S1-E11-03) and markets and languages (S1-E11-05). Part (b) is the website CMS: the home page, notices, help, seasonal doodles and the public home page. Part (c) is every email through one sender with editable text. I split the bundle so each pull request stays reviewable.

## What changed

### S1-E11-03: Staff › Settings

- **Database** (`…100001_s1_e11_03_settings_admin.sql`):
  - `admin_set_flag()` and `admin_set_setting()`. The second refuses a value of another shape and gives a reason word (wrong_kind, below_zero, bad_item, repeated_item, changed_parts).
  - `admin_move_category()`.
  - `admin_add_reserved_name()` and `admin_remove_reserved_name()`. Names the system relies on can't be removed.
  - `admin_add_name_word()` and `admin_remove_name_word()`.
  - Each function checks the `settings` staff area (owner and admin) and writes the audit log with the before and after values in the same transaction.
- **Screen** `/staff/settings`, as a new menu item between Roles and Metrics. It holds:
  - flags as switches, each saved at once;
  - named settings in groups (content, ranking, spam and abuse, moderation, notifications, retention, March targets);
  - an editor for the Discover mix;
  - a rate-limit editor per action;
  - the category order with up and down buttons;
  - reserved names and the username word lists, 50 per page with a search;
  - a link to the audit log filtered to settings changes.
- **Within a minute:** the app now reads flags and public settings again every 60 seconds, so a change reaches open screens within a minute (criterion 1).

### S1-E11-05: markets and languages

- **Database** (`…100002_s1_e11_05_markets_and_languages.sql`):
  - `languages` (status closed, coming or open; whether the interface is in it). Seeded with ro and en, both open.
  - `staff_languages`: the languages each staff member reads.
  - `markets` gains `status` (closed, ready, open) and `legal_check`. Romania is set to open/done and Singapore is added. A trigger keeps `is_open` in step with the status.
  - `admin_set_language_status()`: a language opens only when a moderator reads it, and an interface language stays open.
  - `admin_set_market()`: a market opens only with its legal check done and an open language, and only the owner opens it.
  - `admin_set_staff_languages()`.
  - `story_language_choices()`.
- **Screens:**
  - "Markets and languages" on Staff › Settings.
  - "Languages they read" on each card in Staff › Roles.
  - New story shows closed languages as greyed chips ("Hungarian: coming once we have moderators who read it").

## Acceptance criteria

| Criterion | Test |
| --- | --- |
| **S1-E11-03** An admin changes a flag or a value; it applies within a minute and is logged with before and after values | `170`; `e2e/settings-admin.spec.ts` |
| A value of another shape is refused with a reason | `170`; `settingValue.test.ts`; `e2e/settings-admin.spec.ts` |
| Categories, reserved names and word lists can be changed and each change is logged | `170`; `e2e/settings-admin.spec.ts` |
| Moderators, support and content editors are refused, in the database and on screen | `170`; `e2e/settings-admin.spec.ts` |
| **S1-E11-05** A language opens only when a moderator reads it | `171`; `e2e/settings-admin.spec.ts` |
| A market opens only after its legal check, with an open language, and only by the owner | `171`; `e2e/settings-admin.spec.ts` |
| Writers pick only open languages | `171` |
| Policies `languages_select_public` and `staff_languages_select_admin`: allowed and denied | `171` |

## Definition of Done

- **Code:** strict TypeScript, no `any`. ESLint limits and Prettier pass. Header and doc comments on every file and function.
- **Types:** regenerated (`types:check` passes).
- **Tests:** every criterion has a test, and every new policy has an allowed and a denied pgTAP test.
- **Accessibility:** axe passes on `/staff/settings` at 390, 768 and 1440 px, light and night, ro and en. The switches use `role="switch"`, and every Save button is named after its setting.
- **Design rules:** staff screens have no doodles, and drop-downs follow the one style.
- **Privacy:** the only new personal data is which languages a staff member reads, visible to owner and admin.
- **Security:** every change goes through an `admin_*` function that checks the role in the database and writes the audit log. RLS and explicit grants are on both new tables.
- **i18n:** every string is in ro and en, with ș and ț.
- **Docs:** code tour, epic report, supabase README and the flags README.

## Local check run

Full quality pass on c5290da (`npm run checks` from a fresh `supabase start` and build), then the two failing browser specs rerun on 9e8bfaa:

| Check | Result |
| --- | --- |
| Lint and Prettier | passed |
| Type check | passed |
| Database types match (`types:check`) | passed |
| Unit tests (Vitest) | 102 files, 655 tests passed |
| Database reset and pgTAP | 81 files, 1729 tests passed |
| Browser tests (Playwright and axe) | 930 passed, 2 failed, 1 skipped; see below |
| i18n check | passed |
| Migrations check | passed |
| Functions build (wrangler) | compiled |

The two browser failures:

- `country.spec.ts` › under-16 in Australia: the test opened Australia by setting `is_open`, which now follows the market's status (S1-E11-05). Fixed in 9e8bfaa by opening it through `status` and `legal_check`; rerun with the whole spec: 16 passed.
- `reader-performance.spec.ts` › first paragraph within 2 seconds on a throttled phone: 2346 ms here, and 2367 ms on `main` built on the same machine, so it isn't this pull request's. The cloud machine was running two builds at once. Follow-up below.

## Screenshots

Taken at 390, 768 and 1440 px but not attached, because the session can't upload images.

- `/staff/settings` as the owner shows:
  - the jump list;
  - the switches with On or Off;
  - the value groups in two or three columns;
  - the Discover mix and rate-limit editors;
  - categories with up and down buttons;
  - reserved names and word lists;
  - markets and languages as cards with their status buttons.
- At 390 px everything stacks.

## Decisions taken

- **One settings page with a jump list**, not a page per section.
- **Settings without a translated name** show their key, so a new setting is editable the day it lands.
- **Opening a market is owner-only**, as section 1.8.3 proposes. An admin can mark the legal check done and set the market "ready".
- **Languages are per moderator.** Staff › Roles records which languages each person reads. Seed staff and staging staff read ro and en.
- **The markets and languages admin screen lives inside Settings** for now.

<details><summary>New Romanian lines (for Robert to read)</summary>

"Setările conținutului" · "Schimbă felul în care funcționează platforma fără o versiune nouă. Schimbările se aplică în cel mult un minut și fiecare e înregistrată cu cine, ce, când și valorile de dinainte și de după." · "Salvat. Se aplică în cel mult un minut." · "Doar proprietarul și administratorii pot schimba setările." · "Valoarea nouă trebuie să fie de același fel ca cea veche (un număr rămâne număr)." · "Încă nu e de serviciu niciun moderator care citește această limbă. Notează întâi limbile pe care le citește echipa în Echipă › Roluri." · "Verificarea juridică a acestei piețe nu e gata." · "Doar proprietarul deschide o piață." · "Comutatoarele ne lasă să pornim ceva mai târziu, fără cod nou. Fiecare comutator se salvează imediat." · "{{language}}: vine când avem moderatori care o citesc"

The rest are in `src/locales/ro/settings.json` and `staff.json` › `languages`.

</details>

## By hand

- **Staging:** run `supabase/staging-topups/CMS-1a.sql` once. It gives every staff account ro and en in "languages they read" and is safe to run twice.

## Follow-ups

- The reader speed test measured about 2.35 s against its 2 s budget on `main` too, on a busy cloud machine. Worth a look on a quiet machine and on staging before the March test.

- A separate markets screen (S1-E11-05's own page) if the Settings page grows too long.
- Interface languages beyond ro and en need their locale files first.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
