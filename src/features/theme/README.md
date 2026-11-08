# Theme

Light and night mode, and the colour looks members pick. Built by S1-E1-03; looks added in bundle G2 THEMES (liquid glass redesign, 7 Nov 2026).

- `lib/appearanceStore.ts`: the one copy of the member's three choices on this page (mode, year-round look, seasonal switch), kept on this device too.
- `hooks/useAppearance.ts`: reads the choices and changes them; a change shows at once and is saved on the account for a signed-in member.
- `hooks/useAccountAppearance.ts`: run once by AppLayout and StaffLayout. Shows the choices on `<html>` (`data-theme`, `data-look`) and, at sign-in, takes the choices saved on the account.
- `api/appearance.ts`: reads `profiles.look`, `colour_mode`, `seasonal_looks` and `appearance_saved_at`; saves through `set_my_appearance()`.
- `components/AppearanceSettingsSection.tsx`: Settings › Appearance, with `LookTiles.tsx` (the six themes) and `ModeChoice.tsx` (Light, Night, Match my device) and the Seasonal themes switch.
- `components/ThemeSelect.tsx`: the Mode drop-down in the footer (Device, Light or Night); it changes the same mode as Settings.

How it fits together:
1. `public/theme-init.js` runs before the page draws and sets `data-theme` and `data-look` on `<html>` from what this device remembers, so there is no white flash and no flash of the default look.
2. `src/styles/tokens.css` has the Lilac mist day colours, one block per other look (day only), the monochrome night colours with cobalt buttons and the galaxy background (the same with every look; NIGHT-1) and the staff set, which ignores looks.
3. `src/lib/theme.ts` and `src/lib/looks.ts` hold the shared logic: modes, the ten looks, the seasonal windows (public setting `seasonal_look_dates`) and what the device remembers.
4. A member who never saved a choice keeps each device's own choice at sign-in (`appearance_saved_at` is empty); once they save, every device they sign in on shows it.

Decisions: night mode follows the device by default (Robert, 17 Oct 2026); six year-round themes, Lilac mist by default, seasonal looks off unless turned on, night mode the same with every theme, logo and wordmark in the look's accent (Robert, 7 Nov 2026; handoff "Design tokens and themes").
