# Language

The language menus and saving the interface language. Built by S1-E1-04; the Nordic languages and the first-visit language by country came with MARKETS-2a.

- `components/LanguageSelect.tsx`: the drop-down. AppLayout puts it in the footer (label shown); the top bar has none (Robert, 9 Nov 2026, bundle FIX-3).
- `components/LanguageSettingsSection.tsx`: the Language panel in Settings (/settings#language), one row of radio buttons that saves to the account like the footer's drop-down (bundle FIX-3).
- `hooks/useInterfaceLanguage.ts`: the language on screen and changing it: switch the screen, remember it in this browser, then save it to the account when someone is signed in.
- `hooks/useAccountLanguage.ts`: when someone is signed in, shows their account's language as the app opens and after each sign-in, so the choice follows them to every device.
- `hooks/useOpenInterfaceLanguages.ts`: which of the five interface languages (`src/schemas/interfaceLanguages.ts`: en, ro, sv, da, nb) staff have opened; a closed one shows in no menu. Romanian and English are always open.
- `hooks/useLanguageOptions.ts`: the menus' choices, one per open language, each named in its own language (the footer, Settings and onboarding all use it).
- `hooks/useFirstVisitLanguage.ts` and `lib/firstVisitLanguage.ts`: on a first visit, the language for the connection's country (Sweden, Denmark and Norway get their own language once it is open, English while it is closed; Romania and Moldova Romanian; other countries English; unknown, no change). It never saves its answer.
- `api/profileLocale.ts`: reads `profiles.locale` (own row only, `profiles_select_own`) and saves through `set_my_locale()`.

Which language is shown, in order (decided 17 Oct 2026, 11:48; step 3 added by MARKETS-2a):
1. a signed-in person's account language;
2. otherwise the language last chosen in this browser (`src/lib/language-preference.ts`);
3. otherwise, on a first visit, the language for the connection's country (`lib/firstVisitLanguage.ts`);
4. otherwise Romanian. The browser's own language is never read.

A Nordic language with no translation file yet reads in English, key by key (`src/lib/i18n.ts`); emails, legal texts and support replies use `writtenLanguageFor()`, which gives Swedish, Danish and Norwegian readers English. Translations land as files in `src/locales/sv/`, `da/` or `nb/`; `npm run i18n:check` warns about what is still missing.

Related: `src/lib/i18n.ts` (translations), `src/lib/romanian-text.ts` (ş and ţ become ș and ț in every text field), `supabase/migrations/20261017160001_s1_e1_04_profile_locale.sql` (the column and the function), `supabase/migrations/20270205100200_markets2a_nordic_languages.sql` (the Nordic rows and the one database list, `interface_language_codes()`).
