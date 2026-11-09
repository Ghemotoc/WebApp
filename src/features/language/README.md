# Language

The English / Română drop-downs and saving the interface language. Built by S1-E1-04.

- `components/LanguageSelect.tsx`: the drop-down. AppLayout puts it in the footer (label shown); the top bar has none (Robert, 9 Nov 2026, bundle FIX-3).
- `components/LanguageSettingsSection.tsx`: the Language panel in Settings (/settings#language), one row of radio buttons that saves to the account like the footer's drop-down (bundle FIX-3).
- `hooks/useInterfaceLanguage.ts`: the language on screen and changing it: switch the screen, remember it in this browser, then save it to the account when someone is signed in.
- `hooks/useAccountLanguage.ts`: when someone is signed in, shows their account's language as the app opens and after each sign-in, so the choice follows them to every device.
- `api/profileLocale.ts`: reads `profiles.locale` (own row only, `profiles_select_own`) and saves through `set_my_locale()`.

Which language is shown, in order (decided 17 Oct 2026, 11:48):
1. a signed-in person's account language;
2. otherwise the language last chosen in this browser (`src/lib/language-preference.ts`);
3. otherwise Romanian. The browser's own language is never read.

Related: `src/lib/i18n.ts` (translations), `src/lib/romanian-text.ts` (ş and ţ become ș and ț in every text field), `supabase/migrations/20261017160001_s1_e1_04_profile_locale.sql` (the column and the function).
