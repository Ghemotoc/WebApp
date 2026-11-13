# Theme

Light and night mode, the colour looks members pick, the "Less motion" switch and the "High contrast" switch. Built by S1-E1-03; looks added in bundle G2 THEMES (liquid glass redesign, 7 Nov 2026); less motion in bundle MOTION-1 and high contrast in bundle CONTRAST-1 (both 13 Nov 2026).

- `lib/appearanceStore.ts`: the one copy of the member's five choices on this page (mode, year-round look, seasonal switch, "Less motion" switch, "High contrast" switch), kept on this device too.
- `hooks/useAppearance.ts`: reads the choices and changes them; a change shows at once and is saved on the account for a signed-in member.
- `hooks/useAccountAppearance.ts`: run once by AppLayout and StaffLayout. Shows the choices on `<html>` (`data-theme`, `data-look`, `data-motion`, `data-contrast`) and, at sign-in, takes the choices saved on the account.
- `api/appearance.ts`: reads `profiles.look`, `colour_mode`, `seasonal_looks`, `less_motion`, `high_contrast` and `appearance_saved_at`; saves through `set_my_appearance()`.
- `components/AppearanceSettingsSection.tsx`: Settings › Appearance, with `LookTiles.tsx` (the six themes) `ModeChoice.tsx` (Light, Night, Match my device), the Seasonal themes switch, `LessMotionRow.tsx` (the "Less motion" switch; on and fixed when the device already asks for reduced motion) and `HighContrastRow.tsx` (the "High contrast" switch; on and fixed when the device already asks for more contrast).
- `registerAppearanceTranslations.ts`: the section's text (`src/locales/<language>/appearance.json`), added when the section first renders so it stays out of the first page's download (MOTION-1).
- `components/ThemeSelect.tsx`: the Mode drop-down in the footer (Device, Light or Night); it changes the same mode as Settings.

How it fits together:
1. `public/theme-init.js` runs before the page draws and sets `data-theme`, `data-look`, `data-motion` and `data-contrast` on `<html>` from what this device remembers (and, for contrast, from the device's own setting), so there is no white flash, no flash of the default look, nothing sliding in for a member who asked for less motion and no pastel glass for one who needs high contrast.
2. `src/styles/tokens.css` has the Lilac mist day colours, one block per other look (day only), the monochrome night colours with cobalt buttons and the galaxy background (the same with every look; NIGHT-1) and the staff set, which ignores looks.
3. `src/lib/theme.ts`, `src/lib/looks.ts`, `src/lib/motion.ts` and `src/lib/highContrast.ts` hold the shared logic: modes, the ten looks, the seasonal windows (public setting `seasonal_look_dates`), less motion (`wantsLessMotion()` is true when the switch is on or the device asks), high contrast (the colours are in `src/styles/tokens.css` under `data-contrast="more"`: plain white or black pages, each theme kept as its deep accent) and what the device remembers.
4. A member who never saved a choice keeps each device's own choice at sign-in (`appearance_saved_at` is empty); once they save, every device they sign in on shows it.

Decisions: night mode follows the device by default (Robert, 17 Oct 2026); six year-round themes, Lilac mist by default, seasonal looks off unless turned on, night mode the same with every theme, logo and wordmark in the look's accent (Robert, 7 Nov 2026; handoff "Design tokens and themes"); a "Less motion" switch, off by default, with the device's own setting always counting (Robert, 13 Nov 2026); a "High contrast" switch on the same rule, with plain white pages and the theme kept in its accent (Robert, 13 Nov 2026: "Build, plain white pages").
