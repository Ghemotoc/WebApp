<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #179

S1-E11-19 (edit email templates) has no issue of its own in this repository, so this pull request is linked only to #179 for the interface text part. I haven't opened an issue for S1-E11-19 (CLAUDE.md: new issues only when Robert asks).

This is part (c) of the CMS-1 bundle in Robert's full-app plan (30 Oct 2026). It lets the owner and admins change any interface text (S1-E11-18) and the wording of every Auth email (S1-E11-19) from Staff › Website, without an engineer.

- Part (a) merged as #210.
- Part (b) merged as #211.
- Part (d) comes next: seasonal doodles and the epic checks.
- Part (e) is tags.

## What changed

### Database (`…100005_s1_e11_18_interface_text.sql`)

- **`interface_text_overrides`**, one table for interface and email text.
  - Each row has a key with its namespace (`common:nav.help`, `email:confirmation.body`), a BCP 47 locale from `languages`, the text, draft or published, a "show from" date, a reset flag and the admin who saved it.
  - There is one draft per key and locale.
  - Kind `staff`, with RLS on. Only owner and admin can read it (`interface_text_overrides_select_admin`), and nobody writes to it directly.
- **`published_interface_text(locale)`** is the one public read, granted to visitors and members.
  - It returns the live override for each key: the latest published version whose date has come, in Romanian time.
  - Resets are left out, so the file text shows again.
  - A regional locale (`en-GB`) with nothing of its own falls back to its base language.
- **`admin_save_interface_text()`, `admin_publish_interface_text()`, `admin_restore_interface_text()` and `admin_reset_interface_text()`** each check the `website_cms` area (owner and admin) and write the audit log in the same transaction: `interface_text.published`, `.restored` or `.reset`, with the key, locale, date and the before and after text.
- **A save is refused, with the reason in the hint, when:**
  - the text is empty;
  - its `{{placeholders}}` differ from the file text's (the editor sends them, because the database can't read the locale files);
  - it types the literal product or company name instead of the placeholder.
- **Cedilla ş and ţ** are saved as comma-below ș and ț.

### The app

- **`src/lib/interface-text-overrides.ts`**, started from `src/main.tsx`:
  - it fetches the published overrides for the current language once per visit and lays them over the locale files;
  - namespaces that load later get their overrides as soon as they are added;
  - it never blocks the first screen, and if the read fails the file text stays;
  - an override for a key the files no longer have is ignored, because keys exist only in the files.
- **Staff › Website › Interface text** (`/staff/website/interface-text`):
  - search by key or by the words on screen, 50 at a time;
  - Romanian and English side by side, each with the file text as its default;
  - a preview that shows placeholders as chips;
  - a reminder on legal wording;
  - Save draft, "Show from", Publish, earlier versions with Restore, and "Reset to default".
- **Staff › Website › Email templates** (`/staff/website/emails`): the same editor, limited to the `email` namespace. Each email in `email.json` now has a `subject` too.

### Auth emails (S1-E11-19)

- **`server/send-email.ts` and `functions/api/send-email.ts`** are the Supabase Auth Send Email hook.
  - It checks the Standard Webhooks signature, keyed with `SEND_EMAIL_HOOK_SECRET`, and refuses calls more than 5 minutes old.
  - It picks the email by Supabase's action type and the person's language: Romanian unless they chose English.
  - It lays the published `email:` overrides over `email.json` and fills in the link, or the code that Supabase made.
  - It sends through the existing Brevo sender.
- **Two codes for a change of email:** the hook sends one to each address.
- **Answers:** 401 when unsigned, 400 for an unknown email type, 500 when the send fails, and 503 on Cloudflare until the secrets are set. Nothing personal is logged.
- **Locally the hook stays off,** so Auth keeps using `supabase/templates/`. Switching it on is a GO-LIVE step (By hand).

## Acceptance criteria

| Criterion | Test |
| --- | --- |
| **S1-E11-18** An admin finds a text by key or by its words and edits Romanian and English side by side | `e2e/interface-text.spec.ts`; `localeCatalogue.test.ts` |
| Publishing shows the new text to visitors; a future date waits | `173`; `e2e/interface-text.spec.ts` |
| Restore brings an earlier text back as a draft and changes nothing until it is published | `173` |
| Reset to default brings the file text back | `173`; `e2e/interface-text.spec.ts` |
| A text that changes a placeholder, is empty or types the product name is refused, with the problem named | `173`; `e2e/interface-text.spec.ts` |
| If the overrides can't be read, the file text stays; an override for a key the files don't have is ignored | `interface-text-overrides.test.ts` |
| Cedilla letters are saved as comma-below ones | `173` |
| Only owner and admin edit; moderator, content editor and member are refused | `173`; `e2e/interface-text.spec.ts` |
| Every publish, restore and reset is in the audit log with before and after | `173` |
| Policy `interface_text_overrides_select_admin`: allowed and denied | `173` |
| **S1-E11-19** Email templates list the emails with their locked placeholders as chips | `e2e/interface-text.spec.ts` |
| An email text that drops a placeholder is refused | `173`; `e2e/interface-text.spec.ts` |
| The hook refuses an unsigned or old call, picks the email and language, uses the overrides, and sends two codes for a change of email | `server/send-email.test.ts` |

## Definition of Done

- **Readable code:**
  - every new file has a header saying what it is for, who calls it and what it calls next;
  - every exported function and SQL function has a doc comment;
  - ESLint passes with the complexity limits.
- **Accessibility:** axe passes on both new tabs at 390, 768 and 1440 px, light and night, ro and en. Every field has a label, and placeholder chips are real text.
- **Design rules:** staff screens have no doodles, and drop-downs follow the shared style.
- **Rule 4:** keys still arrive only in the locale files, and CI still checks the files. Overrides sit on top of them.
- **Rule 12:** the hook logs no address, code, link or text.
- **Privacy:** no new personal data. A version keeps the admin who saved it, and only owner and admin can read it.
- **Security:**
  - every change goes through an `admin_*` function that checks the role in the database and writes the audit log;
  - the hook uses the public anon key to read overrides, never the service key;
  - the table has RLS and explicit grants.
- **i18n:** every new string is in ro and en, with ș and ț.
- **Docs:** a code tour section and a README for `src/features/interface-text/`.

## Local check run

RESULTS

## Screenshots

Taken at 390, 768 and 1440 px as the admin persona, but not attached, because the session can't upload images.

- `/staff/website/interface-text`: search, the key list and the side-by-side editor.
- `/staff/website/emails`: the email keys with their placeholder chips.

## Decisions taken

- **One table for interface text and emails:** an email's words are interface text in the `email` namespace, so drafts, scheduling, restore, reset and the audit log work the same way.
- **The editor sends the file text's placeholders with each save,** because the database can't read the locale files. The database still makes the final check.
- **`published_at` uses `clock_timestamp()`,** so two publishes in one transaction keep their order.
- **Auth emails go out as plain text** through the hook (the HTML templates in `supabase/templates/` stay as Auth's own fallback). An HTML version can follow if the plain one reads badly in mail apps.

<details><summary>New Romanian lines (for Robert to read)</summary>

"Textele aplicației" · "Șabloane de email" · "Păstrează aceleași variabile (bulinele din previzualizare) ca textul implicit." · "Nu scrie numele produsului sau al companiei: folosește aceeași variabilă ca textul implicit, ca o redenumire să-l schimbe peste tot." · "De azi apare din nou textul implicit." · "Revino la textul implicit" · "Caută după cuvintele de pe ecran, în oricare limbă, sau după cheie." · the Email templates intro · subjects: "Confirmă-ți adresa de email" and the others in `src/locales/ro/email.json`.

The rest are in `src/locales/ro/websiteAdmin.json` › `interfaceText`.

</details>

## By hand

- **Nothing on staging now.** Overrides work as soon as this merges.
- **GO-LIVE (listed in the by-hand file):** switch on the Send Email hook so Auth emails use the admins' wording.
  1. Cloudflare Pages › `ghemotoc` › Settings › Variables: add `SEND_EMAIL_HOOK_SECRET` and `BREVO_API_KEY`.
  2. Supabase › Authentication › Hooks › Send Email: point it at `https://<site>/api/send-email` with the same secret.
  3. Send yourself a test of each email, including a change of email, which sends two codes.

## Follow-ups

- **S1-E11-19 has no issue in this repository.** Open one if you want it tracked.
- **Emails from moderation decisions and Contact us** still build their words in code (`decision-emails.ts`, `contact.ts`). Moving them into `email.json` would make them editable too.
- **An HTML version of the Auth emails** sent by the hook.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
