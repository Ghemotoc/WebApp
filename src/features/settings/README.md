# settings

Staff › Settings at `/staff/settings`: the owner and admins change how the platform works without a
new release (stories S1-E11-03 and S1-E11-05; board AdminSettings, 8.6). Every change goes through an
`admin_*` function that checks the settings area and writes the audit log with the before and after
values; the page links to those log lines (`/staff/audit-log?action=settings.`).

- `components/SettingsPage.tsx`: the page and its "On this page" links.
- `components/FlagsSection.tsx` and `SwitchButton.tsx`: the feature flags. `SwitchButton` is also the switch of every member setting, through `SettingSwitchRow.tsx` (a setting's name, its explanation and the switch; Settings › Privacy and Messages, G11b).
- `components/ValueSettingsSection.tsx` and `ValueSettingRow.tsx`: every named setting, grouped by
  `lib/settingGroups.ts`; `lib/settingValue.ts` reads a typed field back into a value.
- `components/DiscoverMixEditor.tsx` and `RateLimitsEditor.tsx`: the two settings with their own
  editors (`discover_shelves`, `rate_limits`).
- `components/CategoriesSection.tsx`: the order of the categories.
- `components/ReservedNamesSection.tsx` and `NameWordsSection.tsx`: the name rules (S1-E2-04).
- `components/NudgeWordsSection.tsx`, `hooks/useNudgeWords.ts`, `api/nudgeWords.ts` (ADMIN-2d3): the kind-words nudge lists, Romanian and English, which the comment box checks in the browser before sending; `admin_add_nudge_word()` and `admin_remove_nudge_word()` (owner and admin, logged).
- `components/MarketsSection.tsx`, `LanguagesList.tsx` and `MarketsList.tsx`: markets and languages
  (S1-E11-05); `lib/marketNames.ts` holds what the two lists share.
- `api/` and `hooks/`: one file per kind of data. `hooks/settingsFailure.ts` turns an error into
  the words the page shows.

The texts are the `settings` namespace, registered when the page opens
(`registerSettingsTranslations.ts`). The languages a staff member reads are set on Staff › Roles
(`features/staff/components/StaffLanguages.tsx`).

Age rules by country (MARKETS-1, S1-E2-21): `components/AgeRulesSection.tsx` and `AgeRuleEditor.tsx`, `hooks/useAgeRulesAdmin.ts`, `api/ageRulesAdmin.ts` (`admin_save_age_rule()`).
