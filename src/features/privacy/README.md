# Privacy

Settings › Privacy and online status. Built by S1-E13-01 (bundle PRIVACY, part a). Board: `design/boards/Settings.dc.html` (6.3, the Privacy tab).

- `components/PrivacySettingsSection.tsx`: the Privacy panel on `/settings` (id `privacy`): who can see your profile and your library (`AudienceRadios`), who can message you (a line with Change to the Messages panel, which owns that choice), "Show when I'm online" (`OnlineStatusSwitch`) and "Suggest me and my stories to other people" (`SuggestMeSwitch`, LOOK-4c: with "Ask my parent" for 13 to 15-year-olds). Every choice saves at once; under-18s read that each started at its most private value.
- `components/PresenceHeartbeat.tsx`: mounted once in `AppLayout`; while the switch is on it calls `note_i_am_online()` every minute the tab is in front (`hooks/useOnlineStatus.ts`).
- `components/OnlineDot.tsx` and `useOnlineHandles()`: the dot by a name, with the word "Online" for screen readers, on the profile header, the chat header and the chat list.
- `components/LibraryVisibilityLine.tsx`: "Private / Shared / Public" with Change on the Library page.
- `api/privacy.ts` and `hooks/usePrivacySettings.ts`: `my_privacy_settings()` and the setters (`set_suggest_me()` from LOOK-4c); a save refreshes the profiles and the story lists.
- The profile's library shelf is `src/features/people/components/ProfileLibrary.tsx`; its See all page is the story list `reader_library` at `/u/:readerHandle/library`.
- Text: `src/locales/{ro,en}/privacy.json` (`registerPrivacyTranslations.ts`).
- The database side: `supabase/migrations/…_s1_e13_01_privacy_settings.sql`; tests `209` and `e2e/privacy-settings.spec.ts`.
