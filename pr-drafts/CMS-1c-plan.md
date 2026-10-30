# CMS-1c plan: interface text and email templates

Stories: S1-E11-18 (edit interface text, issue #179) and S1-E11-19 (edit email templates; find its issue before the PR). Builds on the CMS-1b editor pattern (`src/features/website/components/staff/`).

## One table for both: `interface_text_overrides`

Migration `…_s1_e11_18_interface_text.sql`:

- Columns: `id`, `text_key` (namespace-qualified, "common:nav.help", "email:confirmation.body"), `locale` (BCP 47, references `languages.code`), `text`, `status` (draft, published), `is_reset` (a reset version: the file text shows again), `show_from date`, `user_id` (not null, references profiles; the admin who saved it), `published_at`, `created_at`, `updated_at`. One draft per key and locale. Kind `staff` (user_id not null).
- RLS: `interface_text_overrides_select_admin` (website_cms view) on the table; the public read is `published_interface_text(locale)`, security definer, granted to anon and authenticated: key and text of the live, non-reset version per key. Visitors never see drafts.
- Writes: `admin_save_interface_text(key, locale, text, show_from)`, `admin_publish_interface_text(id)`, `admin_restore_interface_text(id)`, `admin_reset_interface_text(key, locale)`. Each checks `website_cms` act and logs `interface_text.published|restored|reset` with before and after text.
- Placeholder check: the server can't read the locale files, so the client sends the file text's placeholders with the save, and the database refuses when the set differs (`placeholders:changed`), when the text is empty (`text:empty`), or when it contains the literal product name from `settings` (`text:product_name`). Cedilla ş/ţ (and Ş/Ţ) are replaced with ș/ț in the save function, and the editor says so.
- Live rule as in CMS-1b: latest published version whose `show_from` has come; a reset version means "file text".

## App side

- `src/lib/interface-text-overrides.ts`: after i18next starts, fetch `published_interface_text(language)` once per language per visit (cached), and `addResource()` each override onto its namespace. A failed read is ignored (file text stays). Never blocks first paint. Overrides whose key isn't in the files are skipped.
- An override for a namespace that loads later (registered on page open) is applied when that namespace registers: keep the fetched map and apply it in the register helpers' common path.

## Staff › Website › Interface text

- A fourth tab at `/staff/website/interface-text`: search by key or by the words on screen (en and ro), 50 per page. The key list is built from the bundled locale JSON (import.meta.glob of `src/locales/*/*.json`, loaded lazily in the staff chunk only), flattened to `namespace:path`. Plural keys (`_one`, `_few`, `_other`) show as their own rows.
- Editing a key: ro and en side by side, the file text as the default beside each, a preview with placeholders shown as chips, the legal-wording reminder for keys under legal, consent, privacy, reporting and messaging namespaces, "show from", Publish, Earlier versions with Restore, and "Reset to default".

## S1-E11-19: email templates

- A fifth tab, Email templates, lists the email types from `email.json` (confirmation, magicLink, recovery, passwordChanged, emailChange) with their fields; edits are overrides on `email:<type>.<field>` in the same table, with a preview of the finished email (the HTML builder from `scripts/build-auth-email-templates.ts`, moved into `server/auth-email.ts` so both use it).
- Placeholders ({{productName}}, {{link}}, {{code}}) are locked: shown as chips, and a save that drops one is refused.
- `server/send-email.ts` + `functions/api/send-email.ts`: the Supabase Auth Send Email HTTP hook. It verifies the standard-webhooks signature with `SEND_EMAIL_HOOK_SECRET`, picks the template by `email_action_type` and the user's locale (`user_metadata`, else ro), reads the published overrides through `published_interface_text()` (anon key), fills the placeholders with Supabase's token and link, and sends through the existing `SendEmail` (Brevo on Cloudflare, Mailpit locally). Errors return 500 with a plain message; nothing personal is logged.
- `supabase/config.toml`: the hook stays off locally by default (local auth keeps using the generated templates, so nothing else breaks); a unit test covers the handler with a signed fixture. Turning it on for staging is a GO-LIVE step: `BREVO_API_KEY`, `SEND_EMAIL_HOOK_SECRET` on Cloudflare, and Authentication › Hooks › Send Email pointing at `/api/send-email`.
- `decision-emails.ts` and `contact.ts` move their words into `email.json` so they become editable too (follow-up if it grows the PR too much).

## Tests

- pgTAP `173-interface-text.test.sql`: allowed and denied for the select policy; refusals (role, placeholders, empty, product name); cedilla fix; schedule, restore, reset; audit rows.
- Vitest: override merging, key flattening, the send-email handler (signature, template choice, placeholder fill, Brevo failure).
- e2e `interface-text.spec.ts`: an admin overrides the footer Help label, a visitor sees it, the admin resets it; a moderator is refused; axe on the new tabs.

## Then

CMS-1d: S1-E11-11 and S1-E5-07 seasonal doodles, S1-E5-QA part two, and S1-E11-QA (the epic check now that 06, 10, 12, 18 and 19 are in).
