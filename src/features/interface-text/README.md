# interface-text

Staff › Website › Interface text and Email templates: admins override the app's own text and the
Auth emails' wording without an engineer (stories S1-E11-18 and S1-E11-19; architecture 1.8.6,
B34). The locale files in `src/locales/` stay the default and what CI checks; an override is
stored on top, one version per key and BCP 47 locale.

- `lib/localeCatalogue.ts`: every key from the bundled locale files (staff chunk only), the search,
  the legal-wording check and the placeholder reader.
- `api/interfaceTextStore.ts` and `hooks/useInterfaceTextEditor.ts`: the versions of one key and
  the save, publish, restore and reset actions (the `admin_*_interface_text` functions).
- `components/InterfaceTextTab.tsx`: the searchable list; `TextKeyEditor.tsx` with one
  `LocaleTextPanel.tsx` per language, `TextPreview.tsx` (placeholders as chips) and
  `EarlierTexts.tsx` (Restore).

Where the overrides are used: `src/lib/interface-text-overrides.ts` lays them over the files in the
app, and `server/send-email.ts` (the Supabase Auth Send Email hook) uses the `email:` keys.
